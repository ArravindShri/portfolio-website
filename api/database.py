"""BigQuery connection managers (migrated from Fabric warehouses).

Public interface is UNCHANGED from the Fabric version so routers and helpers
need no edits:

  - module singletons ``fabric_portfolio`` and ``fabric_energy``
  - class ``FabricManager`` with ``.query(sql, params)``, ``.status()``,
    ``.name``, ``.reset()``
  - rows returned as list[dict] with JSON-friendly primitives

What changed under the hood:
  - pyodbc + MSAL (Entra ID token) + Fabric REST fallback  ->  one
    google-cloud-bigquery Client.
  - Two Fabric warehouses (separate SQL endpoints) -> one GCP project with a
    default dataset per manager (gold_portfolio for P1, gold for P3), so the
    routers' bare table names (e.g. ``gold_crisis_analysis``) still resolve.
  - ``?`` placeholders are inline-bound (same helper as before) since the
    BigQuery client uses named params, not positional ``?``.

Auth: service-account JSON from GCP_SERVICE_ACCOUNT_KEY (CI/Vercel), else
Application Default Credentials (local dev).
"""
from __future__ import annotations

import json
import logging
import threading
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Iterable, Sequence

from config import settings

log = logging.getLogger("bq.db")

_client: Any = None
_client_lock = threading.Lock()


def _get_client() -> Any:
    """Lazily build a single shared BigQuery client (reused forever)."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                from google.cloud import bigquery  # noqa: PLC0415

                if settings.gcp_service_account_key:
                    from google.oauth2 import service_account  # noqa: PLC0415

                    info = json.loads(settings.gcp_service_account_key)
                    creds = service_account.Credentials.from_service_account_info(info)
                    _client = bigquery.Client(
                        project=settings.gcp_project, credentials=creds
                    )
                    log.info("BigQuery client built from service-account key")
                else:
                    # Application Default Credentials (local: gcloud auth ADC)
                    _client = bigquery.Client(project=settings.gcp_project)
                    log.info("BigQuery client built from ADC")
    return _client


def _sanitize_row(row: dict[str, Any]) -> dict[str, Any]:
    """Coerce BigQuery-native types into JSON-friendly primitives.

    BigQuery returns Decimal for NUMERIC, and date/datetime objects for
    DATE/TIMESTAMP. The frontend expects numbers for numeric columns and
    ISO strings for dates, matching the old Fabric/pyodbc behaviour.
    """
    out: dict[str, Any] = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            out[k] = float(v)
        elif isinstance(v, (datetime, date)):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _quote_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    s = str(value).replace("\\", "\\\\").replace("'", "\\'")
    return f"'{s}'"


def _bind_inline_params(sql: str, params: Iterable[Any]) -> str:
    """Replace ``?`` placeholders with safely-quoted BigQuery literals."""
    out_parts: list[str] = []
    iterator = iter(params)
    for chunk in sql.split("?"):
        out_parts.append(chunk)
        try:
            value = next(iterator)
        except StopIteration:
            return "".join(out_parts)
        out_parts.append(_quote_literal(value))
    return "".join(out_parts)


class FabricManager:
    """Owns BigQuery access for one logical warehouse (a default dataset).

    Name kept as ``FabricManager`` for import compatibility with the routers
    and ``_helpers`` (which type-hint against it). It now wraps BigQuery.
    """

    def __init__(self, name: str, dataset: str) -> None:
        self.name = name
        self._dataset = dataset
        self._lock = threading.Lock()
        self._reason = "not initialized"

    @property
    def configured(self) -> bool:
        return bool(settings.gcp_project and self._dataset)

    def query(self, sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        if params:
            sql = _bind_inline_params(sql, params)
        client = _get_client()
        from google.cloud import bigquery  # noqa: PLC0415

        # Default dataset so bare table names (gold_crisis_analysis) resolve
        # to this manager's dataset (gold_portfolio or gold).
        job_config = bigquery.QueryJobConfig(
            default_dataset=f"{settings.gcp_project}.{self._dataset}"
        )
        with self._lock:
            job = client.query(sql, job_config=job_config)
            rows = [_sanitize_row(dict(r)) for r in job.result()]
            self._reason = "ok"
            return rows

    def healthcheck(self) -> tuple[bool, str | None]:
        try:
            self.query("SELECT 1 AS ok")
            return True, None
        except Exception as exc:  # noqa: BLE001
            log.warning("BigQuery[%s] healthcheck failed: %s", self.name, exc)
            return False, str(exc)

    def status(self) -> dict[str, Any]:
        ok, err = self.healthcheck()
        return {
            "name": self.name,
            "configured": self.configured,
            "connected": ok,
            "method": "bigquery",
            "reason": "ok" if ok else (err or "healthcheck failed"),
        }

    def reset(self) -> None:
        # Force the shared client to rebuild on next use.
        global _client
        with _client_lock:
            _client = None
        self._reason = "reset"


# Module-level singletons — routers import these directly. Names unchanged.
fabric_portfolio = FabricManager("portfolio", settings.portfolio_dataset)
fabric_energy = FabricManager("energy", settings.energy_dataset)
