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
from datetime import date, datetime, timezone
from decimal import Decimal

import pyodbc
from msal import ConfidentialClientApplication

# ----------------------------------------------------------------------------
# Auth — single shared token used for both warehouses.
# ----------------------------------------------------------------------------
client_id = os.environ["AZURE_CLIENT_ID"]
tenant_id = os.environ["AZURE_TENANT_ID"]
client_secret = os.environ["AZURE_CLIENT_SECRET"]

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
    return pyodbc.connect(
        conn_str, attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct}
    )


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


def export_table(conn, sql: str, output_path: str) -> int:
    """Run ``sql`` against ``conn`` and write the result set to JSON.

    Renamed from "table" to reflect that the input is now a full SQL
    statement — most callers still pass ``SELECT *`` but the crisis
    table needs ``SELECT DISTINCT`` to drop duplicate rows.
    """
    cur = conn.cursor()
    cur.execute(sql)
    cols = [d[0] for d in cur.description]
    rows = []
    for row in cur.fetchall():
        rows.append({col: sanitize_value(val) for col, val in zip(cols, row)})
    cur.close()

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, separators=(",", ":"), default=str)

    print(f"  -> {output_path} ({len(rows)} rows)")
    return len(rows)


# Explicit column list used wherever we read gold_crisis_analysis. SELECT *
# returns every duplicate row that exists in the warehouse — DISTINCT on
# the full column tuple collapses them to one per unique fact.
CRISIS_COLUMNS = (
    "crisis_id, crisis_name, is_ongoing, crisis_duration_days, start_date, "
    "ticker, company_name, country_id, asset_type, category, "
    "pre_crisis_date, post_crisis_date, crisis_low, crisis_high, "
    "pre_crisis_price, post_crisis_price, country_name, energy_role, "
    "crisis_return_pct, max_drawdown_pct, has_recovered, recovery_days"
)
CRISIS_DISTINCT_ALL = (
    f"SELECT DISTINCT {CRISIS_COLUMNS} FROM gold_crisis_analysis"
)
CRISIS_DISTINCT_BY_COUNTRY = (
    f"SELECT DISTINCT {CRISIS_COLUMNS} "
    "FROM gold_crisis_analysis WHERE country_name = ?"
)


# ----------------------------------------------------------------------------
# Energy Security (P3 warehouse).
# ----------------------------------------------------------------------------
print("Connecting to Energy warehouse (P3)...")
p3_server = os.environ["FABRIC_SQL_ENDPOINT_P3"]
conn_p3 = connect(p3_server, "energy_dw")

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
        CRISIS_DISTINCT_ALL,
        "public/static/energy/crisis.json",
    ),
    "gold_stock_performance": (
        "SELECT * FROM gold_stock_performance",
        "public/static/energy/stocks.json",
    ),
}

total_rows = 0
for table, (sql, path) in energy_tables.items():
    print(f"  {table}")
    total_rows += export_table(conn_p3, sql, path)

# Per-country slices for the country deep-dive — one JSON per country
# containing the four buckets the page reads.
cur = conn_p3.cursor()
cur.execute(
    "SELECT DISTINCT country_name FROM gold_energy_overview "
    "WHERE country_name IS NOT NULL"
)
countries = [row[0] for row in cur.fetchall()]
cur.close()

# Keys mirror the bucket names produced by the previous version of this
# script (``table.replace("gold_energy_", "").replace("gold_", "")``)
# so downstream consumers see no shape change.
country_queries = {
    "overview": "SELECT * FROM gold_energy_overview WHERE country_name = ?",
    "import_export_analysis": (
        "SELECT * FROM gold_import_export_analysis WHERE country_name = ?"
    ),
    "crisis_analysis": CRISIS_DISTINCT_BY_COUNTRY,
    "stock_performance": (
        "SELECT * FROM gold_stock_performance WHERE country_name = ?"
    ),
}

for country in countries:
    safe_name = country.lower().replace(" ", "_")
    country_data: dict[str, list] = {}

    for bucket, sql in country_queries.items():
        c = conn_p3.cursor()
        c.execute(sql, country)
        cols = [d[0] for d in c.description]
        rows = []
        for row in c.fetchall():
            rows.append({col: sanitize_value(val) for col, val in zip(cols, row)})
        c.close()
        country_data[bucket] = rows

    out_path = f"public/static/energy/country/{safe_name}.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(country_data, f, separators=(",", ":"), default=str)
    country_rows = sum(len(v) for v in country_data.values())
    total_rows += country_rows
    print(f"  country/{safe_name}.json ({country_rows} total rows)")

conn_p3.close()
print(f"Energy export complete: {total_rows} rows\n")

# ----------------------------------------------------------------------------
# Investment Portfolio (P1 warehouse).
# ----------------------------------------------------------------------------
print("Connecting to Portfolio warehouse (P1)...")
p1_server = os.environ["FABRIC_SQL_ENDPOINT_P1"]
conn_p1 = connect(p1_server, "warehouse_investment_portfolio")

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
    p1_rows += export_table(conn_p1, sql, path)

conn_p1.close()
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
