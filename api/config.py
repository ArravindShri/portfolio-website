"""Environment configuration loaded once at import time.

Two Fabric Warehouses are wired in: P1 (Investment Portfolio) and P3
(Energy Security). They share Service Principal credentials but live in
different workspaces, so each gets its own SQL endpoint + database name.
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
    # Project 1 — Investment Portfolio warehouse (pyodbc inputs)
    fabric_sql_endpoint_p1: str = os.getenv("FABRIC_SQL_ENDPOINT_P1", "")
    fabric_database_p1: str = os.getenv("FABRIC_DATABASE_P1", "")
    # Fabric REST API fallback inputs (workspace + warehouse GUIDs)
    fabric_workspace_id_p1: str = os.getenv("FABRIC_WORKSPACE_ID_P1", "")
    fabric_warehouse_id_p1: str = os.getenv("FABRIC_WAREHOUSE_ID_P1", "")

    # Project 3 — Energy Security warehouse (pyodbc inputs)
    fabric_sql_endpoint_p3: str = os.getenv("FABRIC_SQL_ENDPOINT_P3", "")
    fabric_database_p3: str = os.getenv("FABRIC_DATABASE_P3", "")
    # Fabric REST API fallback inputs (workspace + warehouse GUIDs)
    fabric_workspace_id_p3: str = os.getenv("FABRIC_WORKSPACE_ID_P3", "")
    fabric_warehouse_id_p3: str = os.getenv("FABRIC_WAREHOUSE_ID_P3", "")

    # Shared Service Principal credentials
    fabric_client_id: str = os.getenv("FABRIC_CLIENT_ID", "")
    fabric_client_secret: str = os.getenv("FABRIC_CLIENT_SECRET", "")
    fabric_tenant_id: str = os.getenv("FABRIC_TENANT_ID", "")

    cors_origins: tuple[str, ...] = tuple(
        _split_csv(os.getenv("CORS_ORIGINS")) or ("http://localhost:5173",)
    )
    connection_mode: str = os.getenv("FABRIC_CONNECTION_MODE", "auto").lower()
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))

    @property
    def _credentials_set(self) -> bool:
        return all(
            (self.fabric_client_id, self.fabric_client_secret, self.fabric_tenant_id)
        )

    @property
    def portfolio_configured(self) -> bool:
        return (
            self._credentials_set
            and bool(self.fabric_sql_endpoint_p1)
            and bool(self.fabric_database_p1)
        )

    @property
    def energy_configured(self) -> bool:
        return (
            self._credentials_set
            and bool(self.fabric_sql_endpoint_p3)
            and bool(self.fabric_database_p3)
        )


settings = Settings()
