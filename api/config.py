"""Environment configuration loaded once at import time."""
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
    fabric_sql_endpoint: str = os.getenv("FABRIC_SQL_ENDPOINT", "")
    fabric_database: str = os.getenv("FABRIC_DATABASE", "")
    fabric_client_id: str = os.getenv("FABRIC_CLIENT_ID", "")
    fabric_client_secret: str = os.getenv("FABRIC_CLIENT_SECRET", "")
    fabric_tenant_id: str = os.getenv("FABRIC_TENANT_ID", "")
    cors_origins: tuple[str, ...] = tuple(
        _split_csv(os.getenv("CORS_ORIGINS"))
        or ("http://localhost:5173",)
    )
    connection_mode: str = os.getenv("FABRIC_CONNECTION_MODE", "auto").lower()
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))

    @property
    def fabric_configured(self) -> bool:
        return all(
            (
                self.fabric_sql_endpoint,
                self.fabric_database,
                self.fabric_client_id,
                self.fabric_client_secret,
                self.fabric_tenant_id,
            )
        )


settings = Settings()
