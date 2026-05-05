"""Refresh public/static/energy/crisis.json from gold_crisis_analysis.

Standalone weekly job. Decoupled from the main daily export workflow
(scripts/export_fabric_to_json.py + .github/workflows/export-data.yml)
because gold_crisis_analysis was originally materialized as a VIEW that
took 15-30 minutes to query. After the May 2026 deduplication fix
(bronze mode("append") → mode("overwrite")), the query now returns ~75
rows in under a second.

Why bother refreshing at all (vs. snapshotting once and forgetting):

silver_crisis_events.csv contains 4 crises:
  1. Saudi Oil Facility Attack (2019, resolved)
  2. COVID-19 Demand Collapse (2020, resolved)
  3. Russia-Ukraine Energy Crisis (2022-2023, resolved)
  4. Iran-Israel Tensions (2024-, ONGOING — end_date is NULL)

For the resolved 3, the analysis window is closed in the past and their
metrics are mathematically frozen — daily refresh changes nothing for
them. For Iran-Israel (ongoing), int_crisis_prices uses
DATEADD(DAY, 30, COALESCE(end_date, GETDATE())) so the window stretches
to today + 30d. Each new trading day adds rows to silver_stock_prices
that fall inside the window, which means crisis_high, crisis_low,
post_crisis_price, crisis_return_pct, max_drawdown_pct, has_recovered,
and recovery_days all drift daily for that one crisis.

Weekly refresh keeps Iran-Israel staleness bounded at ≤7 days — fine
for "crisis-to-date" reporting, no impact on the resolved 3.

Run cadence: Sundays at 05:00 IST (cron in
.github/workflows/refresh-crisis.yml). Run on-demand via
workflow_dispatch from the GitHub Actions UI.
"""
from __future__ import annotations

import json
import os
import struct
import time
from datetime import date, datetime
from decimal import Decimal

import pyodbc
from msal import ConfidentialClientApplication

# 5-minute query timeout. After the May 2026 deduplication fix, the
# query returns ~75 rows in under a second. If it takes longer than
# 5 minutes, something is wrong — fail fast rather than burn CUs.
QUERY_TIMEOUT_SECONDS = 300

# Explicit column list matching CRISIS_COLUMNS in export_fabric_to_json.py.
# Keeps the JSON shape stable between manual snapshots and weekly refreshes.
CRISIS_COLUMNS = (
    "crisis_id, crisis_name, is_ongoing, crisis_duration_days, start_date, "
    "ticker, company_name, country_id, asset_type, category, "
    "pre_crisis_date, post_crisis_date, crisis_low, crisis_high, "
    "pre_crisis_price, post_crisis_price, country_name, energy_role, "
    "crisis_return_pct, max_drawdown_pct, has_recovered, recovery_days"
)
CRISIS_QUERY = f"SELECT {CRISIS_COLUMNS} FROM gold_crisis_analysis"

OUTPUT_PATH = "public/static/energy/crisis.json"

SQL_COPT_SS_ACCESS_TOKEN = 1256


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


def main() -> None:
    print("[1/4] Reading credentials from environment...")
    client_id = os.environ["AZURE_CLIENT_ID"]
    tenant_id = os.environ["AZURE_TENANT_ID"]
    client_secret = os.environ["AZURE_CLIENT_SECRET"]
    p3_server = os.environ["FABRIC_SQL_ENDPOINT_P3"]

    print("[2/4] Acquiring AAD token from Microsoft identity platform...")
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
    token_bytes = result["access_token"].encode("utf-16-le")
    token_struct = struct.pack(
        f"<I{len(token_bytes)}s", len(token_bytes), token_bytes
    )

    print(
        "[3/4] Connecting to Energy warehouse (P3) and querying "
        "gold_crisis_analysis..."
    )
    print(
        f"      (query timeout is {QUERY_TIMEOUT_SECONDS}s)"
    )
    conn_str = (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={p3_server};DATABASE=energy_dw;"
    )
    conn = pyodbc.connect(
        conn_str,
        attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct},
        timeout=60,  # login timeout
    )
    conn.timeout = QUERY_TIMEOUT_SECONDS

    started = time.time()
    cur = conn.cursor()
    try:
        cur.execute(CRISIS_QUERY)
    except pyodbc.Error as e:
        error_msg = str(e)
        if '24801' in error_msg:
            print("ERROR: Fabric capacity throttled (error 24801). Exiting early to preserve CUs.")
            conn.close()
            raise SystemExit(1)
        elif 'HYT00' in error_msg:
            print("ERROR: Query timed out (HYT00). Exiting early.")
            conn.close()
            raise SystemExit(1)
        else:
            raise
    cols = [d[0] for d in cur.description]

    # Dedupe defensively client-side via a set of sanitized tuples —
    # bounded memory at ~75 tuples, matches the export script's safety net.
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
    conn.close()

    elapsed = time.time() - started
    rows = [dict(zip(cols, t)) for t in seen]
    print(
        f"      Query completed in {elapsed:.1f}s — "
        f"{len(rows)} unique rows from {raw_count} raw rows"
    )

    print(f"[4/4] Writing {OUTPUT_PATH}...")
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(rows, f, separators=(",", ":"), default=str)
    print(f"      Wrote {len(rows)} rows.")


if __name__ == "__main__":
    main()
