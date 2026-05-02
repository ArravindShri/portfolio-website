"""Export Fabric Gold tables to /public/static/*.json.

Runs from a GitHub Action (.github/workflows/export-data.yml). On a fresh
Ubuntu runner with msodbcsql18 + pyodbc + msal installed, it:

1. Acquires an AAD access token via Service Principal (MSAL).
2. Connects to both Fabric warehouses (P1 portfolio, P3 energy) over TDS.
3. Dumps each gold table to a flat JSON array under public/static/.
4. Builds per-country slices for the Energy country deep-dive.
5. Writes public/static/data_meta.json with last_export timestamp + counts.

Decimal/datetime/date/bytes are coerced to JSON-friendly primitives so the
frontend's existing toNum/isNum logic continues to work unchanged.

Note: gold_crisis_analysis contains thousands of duplicate rows per
(crisis_id, ticker) tuple. We use ``SELECT DISTINCT`` with explicit
columns to collapse them — without this, individual country files
exceeded GitHub's 100 MB hard limit (Australia hit 136 MB; the global
crisis.json hit 634 MB).
"""
from __future__ import annotations

import json
import os
import struct
import time
from datetime import date, datetime, timezone
from decimal import Decimal

import pyodbc
from msal import ConfidentialClientApplication

# Transient Fabric error markers. All are retried; everything else
# propagates immediately so we don't mask real bugs (auth, syntax,
# missing tables).
#
# 3961  — Snapshot isolation conflict with a concurrent DDL (dbt rebuild
#         touching the same table mid-export).
# 08S01 — TCP-level "Communication link failure". The connection itself
#         succeeded but the channel died — usually a brief network blip
#         or a side-effect of capacity throttling.
# 24801 — "Your organization's Fabric compute capacity has exceeded its
#         limits. Try again later." This is the canonical capacity-
#         throttle error and is explicitly transient — Fabric tells you
#         to retry. Recovery time depends on what else is using the
#         capacity (a long dbt run can hold it down for minutes).
# HYT00 — ODBC "Query timeout expired". The query exceeded
#         QUERY_TIMEOUT_SECONDS. On a freshly-recovered Fabric trial, the
#         crisis DISTINCT scan can run slow until the warehouse warms up;
#         a retry with a fresh connection usually succeeds.
TRANSIENT_ERROR_MARKERS = ("3961", "08S01", "24801", "HYT00")

# Per-query hard cap. The crisis DISTINCT scan deduplicates thousands of
# duplicate rows down to ~67 — on a cold or smoothing-recovering Fabric
# trial that scan can stretch past 5 minutes, so 900 s gives it enough
# headroom while still failing fast on a runaway DDL block (which is
# what produced the 1h 38m run).
QUERY_TIMEOUT_SECONDS = 900

# ----------------------------------------------------------------------------
# Auth — single shared token used for both warehouses.
# ----------------------------------------------------------------------------
print("[1/3] Reading credentials from environment...")
client_id = os.environ["AZURE_CLIENT_ID"]
tenant_id = os.environ["AZURE_TENANT_ID"]
client_secret = os.environ["AZURE_CLIENT_SECRET"]

print("[2/3] Acquiring AAD token from Microsoft identity platform...")
app = ConfidentialClientApplication(
    client_id,
    authority=f"https://login.microsoftonline.com/{tenant_id}",
    client_credential=client_secret,
)
result = app.acquire_token_for_client(
    scopes=["https://database.windows.net/.default"],
)
if "access_token" not in result:
    raise RuntimeError(
        f"Auth failed: {result.get('error_description', 'Unknown')}"
    )
print("[3/3] Token acquired.")

token = result["access_token"]
token_bytes = token.encode("utf-16-le")
token_struct = struct.pack(
    f"<I{len(token_bytes)}s", len(token_bytes), token_bytes
)
SQL_COPT_SS_ACCESS_TOKEN = 1256


def connect(server: str, database: str) -> pyodbc.Connection:
    conn_str = (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={server};DATABASE={database};"
    )
    conn = pyodbc.connect(
        conn_str,
        attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct},
        timeout=60,  # login timeout
    )
    # SQL_ATTR_QUERY_TIMEOUT — every cursor on this connection inherits the cap.
    conn.timeout = QUERY_TIMEOUT_SECONDS
    return conn


class Warehouse:
    """Lazy, reconnect-capable handle for a Fabric warehouse.

    A 08S01 (Communication link failure) error means the channel is dead —
    further queries on the same pyodbc.Connection will keep failing.
    :func:`with_retry` calls :meth:`reset` on transport errors so the
    next attempt opens a fresh connection.
    """

    def __init__(self, server: str, database: str):
        self._server = server
        self._database = database
        self._conn: pyodbc.Connection | None = None

    def get(self) -> pyodbc.Connection:
        if self._conn is None:
            self._conn = connect(self._server, self._database)
        return self._conn

    def reset(self) -> None:
        if self._conn is not None:
            try:
                self._conn.close()
            except Exception:
                pass
        self._conn = None

    def close(self) -> None:
        self.reset()


def _is_transient(exc: BaseException) -> bool:
    msg = str(exc)
    return any(marker in msg for marker in TRANSIENT_ERROR_MARKERS)


def with_retry(fn, wh: Warehouse, *args, attempts: int = 3, **kwargs):
    """Run ``fn(wh.get(), *args, **kwargs)`` with retry on transient errors.

    On a snapshot-isolation conflict (3961) the same connection is fine —
    the warehouse just rebuilt a table and we wait for it to settle.

    On a communication-link failure (08S01) the channel itself is dead,
    so we drop the connection and let the next attempt reconnect.

    All other pyodbc errors propagate immediately — we don't want to mask
    syntax errors, auth failures, or query timeouts. Backoff is linear
    (60 s, 120 s, 180 s) — long enough for Fabric capacity throttling to
    recover when an upstream dbt build is still consuming CUs.
    """
    last_err = None
    for i in range(attempts):
        try:
            return fn(wh.get(), *args, **kwargs)
        except (pyodbc.ProgrammingError, pyodbc.OperationalError) as e:
            last_err = e
            if not _is_transient(e):
                raise
            # Channel dead, capacity throttled, or query cancelled by
            # timeout — drop the connection so the next attempt opens a
            # fresh one. Capacity throttling frequently leaves the
            # connection in a bad state, and pyodbc's behavior after
            # SQLCancel (HYT00) is also undefined.
            err_msg = str(e)
            if any(m in err_msg for m in ("08S01", "24801", "HYT00")):
                wh.reset()
            if i < attempts - 1:
                wait = 60 * (i + 1)
                print(
                    f"  ! transient Fabric error: {e}; "
                    f"retry {i + 2}/{attempts} in {wait}s"
                )
                time.sleep(wait)
    raise last_err


def sanitize_value(val):
    if val is None:
        return None
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return val.isoformat()
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    return val


def _run_and_dump(conn, sql: str, output_path: str) -> list[dict]:
    """Run ``sql``, write rows to ``output_path``, return rows for reuse."""
    cur = conn.cursor()
    cur.execute(sql)
    cols = [d[0] for d in cur.description]
    rows = [
        {col: sanitize_value(val) for col, val in zip(cols, row)}
        for row in cur.fetchall()
    ]
    cur.close()

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, separators=(",", ":"), default=str)

    print(f"  -> {output_path} ({len(rows)} rows)")
    return rows


def export_table(wh: Warehouse, sql: str, output_path: str) -> list[dict]:
    """Run ``sql``, write to JSON, return the rows for in-memory reuse.

    Wrapped in :func:`with_retry` so transient errors (concurrent dbt
    rebuild, brief Fabric capacity blip) don't fail the whole workflow.
    Returning rows lets the caller build derived slices (e.g. per-country
    files for the energy deep-dive) by filtering this list instead of
    re-querying the warehouse — eliminates ~740 per-country queries per
    run, drops Energy_dw CU consumption ~10×.
    """
    return with_retry(_run_and_dump, wh, sql, output_path)


def _run_with_client_dedup(conn, sql: str, output_path: str) -> list[dict]:
    """Stream rows for ``sql`` and dedupe client-side via a set of tuples.

    Used for gold_crisis_analysis: the table has millions of structural
    duplicates per (crisis_id, ticker) tuple but only ~67 truly unique
    facts. Server-side ``SELECT DISTINCT`` consistently times out after
    15 min on Fabric F4 trial because the sort/hash aggregate is too
    heavy. A plain ``SELECT`` just emits rows (no sort step) and we
    dedupe in Python via a ``set`` — memory stays bounded at ~67 tuples
    regardless of how many raw rows arrive.
    """
    cur = conn.cursor()
    cur.execute(sql)
    cols = [d[0] for d in cur.description]

    seen: set[tuple] = set()
    raw_count = 0
    while True:
        batch = cur.fetchmany(50000)
        if not batch:
            break
        raw_count += len(batch)
        for row in batch:
            seen.add(tuple(sanitize_value(val) for val in row))
    cur.close()

    rows = [dict(zip(cols, t)) for t in seen]

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, separators=(",", ":"), default=str)

    print(
        f"  -> {output_path} "
        f"({len(rows)} unique rows, deduped from {raw_count} raw rows)"
    )
    return rows


def export_table_dedup(wh: Warehouse, sql: str, output_path: str) -> list[dict]:
    """Like :func:`export_table` but dedupes rows in Python after fetch.

    Use only for tables whose server-side DISTINCT is too heavy to
    finish within QUERY_TIMEOUT_SECONDS — currently just
    gold_crisis_analysis. For everything else, prefer
    :func:`export_table` (lighter, no extra Python work).
    """
    return with_retry(_run_with_client_dedup, wh, sql, output_path)


# Explicit column list used wherever we read gold_crisis_analysis. The
# table has millions of structural duplicates per (crisis_id, ticker)
# tuple but only ~67 truly unique facts. We used to dedupe via
# ``SELECT DISTINCT`` in SQL, but that scan consistently exceeds 15 min
# on Fabric F4 trial — so we now SELECT the full column list (no
# DISTINCT) and dedupe in Python via :func:`_run_with_client_dedup`.
CRISIS_COLUMNS = (
    "crisis_id, crisis_name, is_ongoing, crisis_duration_days, start_date, "
    "ticker, company_name, country_id, asset_type, category, "
    "pre_crisis_date, post_crisis_date, crisis_low, crisis_high, "
    "pre_crisis_price, post_crisis_price, country_name, energy_role, "
    "crisis_return_pct, max_drawdown_pct, has_recovered, recovery_days"
)
CRISIS_SELECT_ALL = (
    f"SELECT {CRISIS_COLUMNS} FROM gold_crisis_analysis"
)


# ----------------------------------------------------------------------------
# Energy Security (P3 warehouse).
# ----------------------------------------------------------------------------
print("Connecting to Energy warehouse (P3)...")
p3_server = os.environ["FABRIC_SQL_ENDPOINT_P3"]
p3 = Warehouse(p3_server, "energy_dw")

# Each entry is (sql, output_path). Keys are the source-of-truth gold
# table names (kept for legibility / log traces).
energy_tables = {
    "gold_energy_overview": (
        "SELECT * FROM gold_energy_overview",
        "public/static/energy/overview.json",
    ),
    "gold_energy_prices": (
        "SELECT * FROM gold_energy_prices",
        "public/static/energy/prices.json",
    ),
    "gold_import_export_analysis": (
        "SELECT * FROM gold_import_export_analysis",
        "public/static/energy/imports.json",
    ),
    "gold_crisis_analysis": (
        CRISIS_SELECT_ALL,
        "public/static/energy/crisis.json",
    ),
    "gold_stock_performance": (
        "SELECT * FROM gold_stock_performance",
        "public/static/energy/stocks.json",
    ),
}

# Run each gold-table SELECT once, capture the rows in memory, and reuse
# them for the per-country slices below. Previously the country deep-dive
# was built by issuing 4 filtered queries per country × ~185 countries =
# ~740 round-trips to Energy_dw — that single loop accounted for ~62 % of
# all CU consumption on this Fabric capacity. Reading the full tables once
# and filtering in Python is functionally identical (same SELECT *, same
# DISTINCT for crisis) and ~10× cheaper.
total_rows = 0
energy_rows: dict[str, list[dict]] = {}
for table, (sql, path) in energy_tables.items():
    print(f"  {table}")
    # gold_crisis_analysis has millions of duplicate rows that only
    # collapse to ~67 unique facts. Server-side DISTINCT exceeds the
    # 15-minute query timeout on F4; stream the raw rows and dedupe
    # in Python instead.
    if table == "gold_crisis_analysis":
        rows = export_table_dedup(p3, sql, path)
    else:
        rows = export_table(p3, sql, path)
    energy_rows[table] = rows
    total_rows += len(rows)

# Per-country slices for the country deep-dive — one JSON per country
# containing the four buckets the page reads. Bucket names match what
# the frontend's CountrySection reads (data.overview / data.imports /
# data.crisis / data.stocks); renaming anything here breaks the page
# silently.
COUNTRY_BUCKET_TO_TABLE = {
    "overview": "gold_energy_overview",
    "imports": "gold_import_export_analysis",
    "crisis": "gold_crisis_analysis",
    "stocks": "gold_stock_performance",
}

countries = sorted({
    r["country_name"]
    for r in energy_rows["gold_energy_overview"]
    if r.get("country_name")
})

for country in countries:
    safe_name = country.lower().replace(" ", "_")
    country_data: dict[str, list] = {
        bucket: [
            r for r in energy_rows[table] if r.get("country_name") == country
        ]
        for bucket, table in COUNTRY_BUCKET_TO_TABLE.items()
    }

    out_path = f"public/static/energy/country/{safe_name}.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(country_data, f, separators=(",", ":"), default=str)
    country_rows = sum(len(v) for v in country_data.values())
    total_rows += country_rows
    print(f"  country/{safe_name}.json ({country_rows} total rows)")

p3.close()
print(f"Energy export complete: {total_rows} rows\n")

# ----------------------------------------------------------------------------
# Investment Portfolio (P1 warehouse).
# ----------------------------------------------------------------------------
print("Connecting to Portfolio warehouse (P1)...")
p1_server = os.environ["FABRIC_SQL_ENDPOINT_P1"]
p1 = Warehouse(p1_server, "warehouse_investment_portfolio")

portfolio_tables = {
    "gold_stock_performance": (
        "SELECT * FROM gold_stock_performance",
        "public/static/portfolio/stocks.json",
    ),
    "gold_currency_adjusted_returns": (
        "SELECT * FROM gold_currency_adjusted_returns",
        "public/static/portfolio/currency_returns.json",
    ),
    "gold_category_performance": (
        "SELECT * FROM gold_category_performance",
        "public/static/portfolio/categories.json",
    ),
    "gold_region_performance": (
        "SELECT * FROM gold_region_performance",
        "public/static/portfolio/regions.json",
    ),
    "gold_dividend_analysis": (
        "SELECT * FROM gold_dividend_analysis",
        "public/static/portfolio/dividends.json",
    ),
    "gold_correlation_matrix": (
        "SELECT * FROM gold_correlation_matrix",
        "public/static/portfolio/correlation.json",
    ),
}

p1_rows = 0
for table, (sql, path) in portfolio_tables.items():
    print(f"  {table}")
    p1_rows += len(export_table(p1, sql, path))

p1.close()
print(f"Portfolio export complete: {p1_rows} rows\n")

# ----------------------------------------------------------------------------
# Metadata.
# ----------------------------------------------------------------------------
meta = {
    "last_export": datetime.now(timezone.utc).isoformat(),
    "energy_tables": len(energy_tables),
    "energy_countries": len(countries),
    "portfolio_tables": len(portfolio_tables),
    "total_rows": total_rows + p1_rows,
}
with open("public/static/data_meta.json", "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)
print(f"Export complete: {meta}")
