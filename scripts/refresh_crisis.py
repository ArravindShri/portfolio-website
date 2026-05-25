"""Refresh public/static/energy/crisis.json from gold_crisis_analysis.

Standalone weekly job (cron in .github/workflows/refresh-crisis.yml,
Sundays 05:00 IST; also workflow_dispatch).

Why refresh at all: silver_crisis_events has 4 crises; 3 are resolved
(metrics frozen) but Iran-Israel Tensions is ongoing (end_date NULL), so
int_crisis_prices' window = end_date or CURRENT_DATE() + 30d keeps drifting
daily. Weekly refresh bounds its staleness at <=7 days.

Post-migration note: this query timed out at 15-30 min on Fabric F4 (CU
throttling). On BigQuery it returns ~75 rows in under a second, so all the
old timeout/throttle guards are gone.

Auth: GCP_SERVICE_ACCOUNT_KEY (JSON) in CI, else Application Default Creds.
"""
from __future__ import annotations

import json
import os
from datetime import date, datetime
from decimal import Decimal

from google.cloud import bigquery


def sanitize_value(val):
    """Coerce BigQuery Decimal/date types to JSON-friendly primitives so the
    frontend's numeric checks (typeof === 'number') keep working. Without
    this, json.dump(default=str) stringifies Decimals and rows get dropped."""
    if val is None:
        return None
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    return val

PROJECT = os.environ.get("GCP_PROJECT_ID", "arravind-portfolio")
DATASET = "gold"

CRISIS_COLUMNS = (
    "crisis_id, crisis_name, is_ongoing, crisis_duration_days, start_date, "
    "ticker, company_name, country_id, asset_type, category, "
    "pre_crisis_date, post_crisis_date, crisis_low, crisis_high, "
    "pre_crisis_price, post_crisis_price, country_name, energy_role, "
    "crisis_return_pct, max_drawdown_pct, has_recovered, recovery_days"
)
CRISIS_QUERY = (
    f"SELECT DISTINCT {CRISIS_COLUMNS} "
    f"FROM `{PROJECT}.{DATASET}.gold_crisis_analysis`"
)
OUTPUT_PATH = "public/static/energy/crisis.json"


def _client() -> bigquery.Client:
    key = os.environ.get("GCP_SERVICE_ACCOUNT_KEY", "")
    if key:
        from google.oauth2 import service_account

        creds = service_account.Credentials.from_service_account_info(json.loads(key))
        return bigquery.Client(project=PROJECT, credentials=creds)
    return bigquery.Client(project=PROJECT)


def main() -> None:
    print("[1/3] Connecting to BigQuery...")
    client = _client()

    print("[2/3] Querying gold_crisis_analysis...")
    rows = [
        {k: sanitize_value(v) for k, v in dict(r).items()}
        for r in client.query(CRISIS_QUERY).result()
    ]
    print(f"      {len(rows)} rows.")

    print(f"[3/3] Writing {OUTPUT_PATH}...")
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(rows, f, separators=(",", ":"), default=str)
    print(f"      Wrote {len(rows)} rows.")


if __name__ == "__main__":
    main()
