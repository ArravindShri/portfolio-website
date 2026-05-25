"""Environment configuration loaded once at import time.

Migrated from two Fabric warehouses (P1 Investment Portfolio, P3 Energy
Security) to a single BigQuery project with two datasets:

  - Portfolio (P1) gold tables live in dataset `gold_portfolio`
  - Energy (P3)    gold tables live in dataset `gold`

Auth: a GCP service account. In CI / Vercel set GCP_SERVICE_ACCOUNT_KEY to the
full JSON key content. For local dev, leave it unset and rely on Application
Default Credentials (gcloud auth application-default login).
"""
from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    # GCP project that holds all datasets.
    gcp_project: str = os.getenv("GCP_PROJECT_ID", "arravind-portfolio")

    # Service-account key JSON (full content) for headless/CI auth.
    # Empty -> fall back to Application Default Credentials (local dev).
    gcp_service_account_key: str = os.getenv("GCP_SERVICE_ACCOUNT_KEY", "")

    # Default BigQuery datasets per logical "warehouse".
    portfolio_dataset: str = os.getenv("BQ_PORTFOLIO_DATASET", "gold_portfolio")
    energy_dataset: str = os.getenv("BQ_ENERGY_DATASET", "gold")

    cors_origins: tuple[str, ...] = tuple(
        _split_csv(os.getenv("CORS_ORIGINS")) or ("http://localhost:5173",)
    )
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))

    @property
    def credentials_available(self) -> bool:
        # Either an explicit SA key, or we trust ADC to be present locally.
        return bool(self.gcp_service_account_key) or bool(
            os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        ) or True  # ADC may exist without env var (gcloud login)

    @property
    def portfolio_configured(self) -> bool:
        return bool(self.gcp_project and self.portfolio_dataset)

    @property
    def energy_configured(self) -> bool:
        return bool(self.gcp_project and self.energy_dataset)


settings = Settings()
