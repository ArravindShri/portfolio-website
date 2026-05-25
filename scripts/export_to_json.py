"""Export BigQuery gold tables to /public/static/*.json.

Runs from a GitHub Action (.github/workflows/export-data.yml). On a fresh
Ubuntu runner with google-cloud-bigquery installed, it:
1. Builds a BigQuery client (service-account key in CI, else ADC).
2. Reads gold tables from two datasets: Energy -> `gold`, Portfolio ->
   `gold_portfolio`.
3. Dumps each table to a flat JSON array under public/static/.
4. Builds per-country slices for the Energy country deep-dive.
5. Writes public/static/data_meta.json with last_export timestamp + counts.

Post-migration note: this replaces export_fabric_to_json.py. All the Fabric
scar tissue is gone — no MSAL token struct, no pyodbc, no transient-error
retry loop (3961/24801/08S01/HYT00 were Fabric capacity-throttle markers),
no reconnect-capable Warehouse class, and no "crisis loaded from disk"
workaround. gold_crisis_analysis now queries live in <1s on BigQuery, so it
joins the normal export loop, and SELECT DISTINCT works fine (no client-side
dedup needed).

Auth: GCP_SERVICE_ACCOUNT_KEY (JSON) in CI, else Application Default Creds.
"""
from __future__ import annotations

import json
import os
from datetime import date, datetime, timezone
from decimal import Decimal

from google.cloud import bigquery


def sanitize_value(val):
    """Coerce BigQuery-native types to JSON-friendly primitives.

    BigQuery returns Decimal for NUMERIC/BIGNUMERIC and date/datetime objects
    for DATE/TIMESTAMP. The frontend's toNum/isNum logic does
    ``typeof v === 'number'`` checks, so numeric columns MUST be JSON numbers,
    not strings. Without this, json.dump(..., default=str) would stringify
    every Decimal (e.g. "48.39") and the frontend would silently drop rows.
    This matches the old Fabric export's sanitize_value behaviour.
    """
    if val is None:
        return None
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    return val


def sanitize_row(row: dict) -> dict:
    return {k: sanitize_value(v) for k, v in row.items()}

PROJECT = os.environ.get("GCP_PROJECT_ID", "arravind-portfolio")
ENERGY_DATASET = "gold"
PORTFOLIO_DATASET = "gold_portfolio"


def _client() -> bigquery.Client:
    key = os.environ.get("GCP_SERVICE_ACCOUNT_KEY", "")
    if key:
        from google.oauth2 import service_account

        creds = service_account.Credentials.from_service_account_info(json.loads(key))
        return bigquery.Client(project=PROJECT, credentials=creds)
    return bigquery.Client(project=PROJECT)


client = _client()


def export_table(dataset: str, table: str, output_path: str, *, distinct: bool = False) -> list[dict]:
    """Query a gold table, write rows to JSON, return them for reuse."""
    select = "SELECT DISTINCT *" if distinct else "SELECT *"
    sql = f"{select} FROM `{PROJECT}.{dataset}.{table}`"
    rows = [sanitize_row(dict(r)) for r in client.query(sql).result()]
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, separators=(",", ":"), default=str)
    print(f"  -> {output_path} ({len(rows)} rows)")
    return rows


# ----------------------------------------------------------------------------
# Energy Security (dataset: gold)
# ----------------------------------------------------------------------------
print("Exporting Energy (dataset: gold)...")

energy_rows: dict[str, list[dict]] = {}
total_rows = 0

energy_tables = {
    "gold_energy_overview": "public/static/energy/overview.json",
    "gold_energy_prices": "public/static/energy/prices.json",
    "gold_import_export_analysis": "public/static/energy/imports.json",
    "gold_stock_performance": "public/static/energy/stocks.json",
}
for table, path in energy_tables.items():
    print(f"  {table}")
    rows = export_table(ENERGY_DATASET, table, path)
    energy_rows[table] = rows
    total_rows += len(rows)

# Crisis: now queries live (DISTINCT to collapse the join fan-out duplicates).
# On Fabric this timed out at 15-30 min; on BigQuery it's sub-second.
print("  gold_crisis_analysis (live)")
crisis_rows = export_table(
    ENERGY_DATASET, "gold_crisis_analysis",
    "public/static/energy/crisis.json", distinct=True,
)
energy_rows["gold_crisis_analysis"] = crisis_rows
total_rows += len(crisis_rows)

# Per-country slices for the deep-dive. Bucket names match the frontend's
# CountrySection (data.overview / imports / crisis / stocks).
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
    country_data = {
        bucket: [r for r in energy_rows[table] if r.get("country_name") == country]
        for bucket, table in COUNTRY_BUCKET_TO_TABLE.items()
    }
    out_path = f"public/static/energy/country/{safe_name}.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(country_data, f, separators=(",", ":"), default=str)
    country_rows = sum(len(v) for v in country_data.values())
    total_rows += country_rows
    print(f"  country/{safe_name}.json ({country_rows} total rows)")

print(f"Energy export complete: {total_rows} rows\n")

# ----------------------------------------------------------------------------
# Investment Portfolio (dataset: gold_portfolio)
# ----------------------------------------------------------------------------
print("Exporting Portfolio (dataset: gold_portfolio)...")

portfolio_tables = {
    "gold_stock_performance": "public/static/portfolio/stocks.json",
    "gold_currency_adjusted_returns": "public/static/portfolio/currency_returns.json",
    "gold_category_performance": "public/static/portfolio/categories.json",
    "gold_region_performance": "public/static/portfolio/regions.json",
    "gold_dividend_analysis": "public/static/portfolio/dividends.json",
    "gold_correlation_matrix": "public/static/portfolio/correlation.json",
}
p1_rows = 0
for table, path in portfolio_tables.items():
    print(f"  {table}")
    p1_rows += len(export_table(PORTFOLIO_DATASET, table, path))

print(f"Portfolio export complete: {p1_rows} rows\n")

# ----------------------------------------------------------------------------
# Metadata
# ----------------------------------------------------------------------------
meta = {
    "last_export": datetime.now(timezone.utc).isoformat(),
    "energy_tables": len(energy_rows),
    "energy_countries": len(countries),
    "portfolio_tables": len(portfolio_tables),
    "total_rows": total_rows + p1_rows,
}
with open("public/static/data_meta.json", "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)
print(f"Export complete: {meta}")
