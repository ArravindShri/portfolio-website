"""Fabric Warehouse connection manager.

Tries pyodbc first (preferred — full TDS, full SQL surface). Falls back to
an azure-identity + REST client when pyodbc is unavailable or its connection
fails — useful for serverless environments where the ODBC driver is absent.

Both implementations expose the same `query(sql, params=None) -> list[dict]`
contract so callers don't care which one they got.
"""
from __future__ import annotations

import logging
import threading
from typing import Any, Iterable, Sequence

import requests

from config import settings

log = logging.getLogger("fabric.db")

# ----------------------------------------------------------------------------
# Backend implementations
# ----------------------------------------------------------------------------


class FabricBackend:
    """Common interface."""

    name: str = "base"

    def query(self, sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        raise NotImplementedError

    def healthcheck(self) -> bool:
        try:
            self.query("SELECT 1 AS ok")
            return True
        except Exception:  # noqa: BLE001
            return False


class PyodbcBackend(FabricBackend):
    """Primary backend — uses the ODBC Driver 18 for SQL Server."""

    name = "pyodbc"

    def __init__(self) -> None:
        import pyodbc  # noqa: PLC0415  — local import so absence triggers fallback

        self._pyodbc = pyodbc
        self._conn_str = (
            "Driver={ODBC Driver 18 for SQL Server};"
            f"Server={settings.fabric_sql_endpoint};"
            f"Database={settings.fabric_database};"
            "Authentication=ActiveDirectoryServicePrincipal;"
            f"UID={settings.fabric_client_id};"
            f"PWD={settings.fabric_client_secret};"
            "Encrypt=yes;TrustServerCertificate=no;"
        )
        # Eagerly attempt a connection once so caller can fall back early.
        with self._pyodbc.connect(self._conn_str, timeout=10):
            pass

    def query(self, sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        with self._pyodbc.connect(self._conn_str, timeout=15) as conn:
            cur = conn.cursor()
            cur.execute(sql, params or [])
            cols = [c[0] for c in cur.description] if cur.description else []
            return [dict(zip(cols, row)) for row in cur.fetchall()]


class RestBackend(FabricBackend):
    """Fallback backend — azure-identity Service Principal token + Fabric REST.

    Fabric's Warehouse exposes a query REST surface scoped to the SQL
    analytics endpoint. We acquire an access token for `database.windows.net`
    and POST the query. If the REST path is unavailable in your tenant,
    deploy the backend to Railway/Render where pyodbc is supported.
    """

    name = "rest"

    def __init__(self) -> None:
        from azure.identity import ClientSecretCredential  # noqa: PLC0415

        self._credential = ClientSecretCredential(
            tenant_id=settings.fabric_tenant_id,
            client_id=settings.fabric_client_id,
            client_secret=settings.fabric_client_secret,
        )
        self._scope = "https://database.windows.net/.default"
        # Sanity-check the credential up front.
        self._credential.get_token(self._scope)

    def _token(self) -> str:
        return self._credential.get_token(self._scope).token

    def _query_url(self) -> str:
        # Fabric warehouse REST query endpoint.
        host = settings.fabric_sql_endpoint
        db = settings.fabric_database
        return f"https://{host}/v1.0/warehouses/{db}/query"

    def query(self, sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        bound_sql = _bind_inline_params(sql, params or [])
        resp = requests.post(
            self._query_url(),
            headers={
                "Authorization": f"Bearer {self._token()}",
                "Content-Type": "application/json",
            },
            json={"query": bound_sql},
            timeout=20,
        )
        resp.raise_for_status()
        payload = resp.json()
        # Fabric REST query surface returns either {"rows":[...]} or
        # {"results":[{"rows":[...], "columns":[...]}]} depending on version;
        # normalize to list[dict].
        if isinstance(payload, list):
            return payload
        if "rows" in payload and isinstance(payload["rows"], list):
            cols = payload.get("columns")
            if cols and payload["rows"] and not isinstance(payload["rows"][0], dict):
                return [dict(zip(cols, row)) for row in payload["rows"]]
            return payload["rows"]
        if "results" in payload and payload["results"]:
            r0 = payload["results"][0]
            cols = r0.get("columns") or []
            rows = r0.get("rows") or []
            if rows and not isinstance(rows[0], dict):
                return [dict(zip(cols, row)) for row in rows]
            return rows
        return []


def _bind_inline_params(sql: str, params: Iterable[Any]) -> str:
    """Replace `?` placeholders with safely-quoted literals for REST submission.

    Only used by RestBackend. The SQL we issue is internal and never derived
    from request bodies; query-string filter values are bound through this
    function to keep them out of the SQL string.
    """
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


def _quote_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    s = str(value).replace("'", "''")
    return f"'{s}'"


# ----------------------------------------------------------------------------
# Manager — chooses the active backend, caches it, allows re-probe.
# ----------------------------------------------------------------------------


class FabricManager:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._backend: FabricBackend | None = None
        self._reason: str = "not initialized"

    def _build(self) -> FabricBackend:
        if not settings.fabric_configured:
            raise ConnectionError(
                "Fabric credentials not set — see .env.example. Falling back "
                "to cache-only mode for live endpoints."
            )

        mode = settings.connection_mode
        errors: list[str] = []

        if mode in ("auto", "pyodbc"):
            try:
                backend = PyodbcBackend()
                log.info("Fabric backend = pyodbc")
                return backend
            except ImportError as e:
                errors.append(f"pyodbc unavailable: {e}")
            except Exception as e:  # noqa: BLE001
                errors.append(f"pyodbc connect failed: {e}")
            if mode == "pyodbc":
                raise ConnectionError("; ".join(errors))

        if mode in ("auto", "rest"):
            try:
                backend = RestBackend()
                log.info("Fabric backend = rest")
                return backend
            except Exception as e:  # noqa: BLE001
                errors.append(f"rest fallback failed: {e}")

        raise ConnectionError("; ".join(errors) or "no backend available")

    def backend(self) -> FabricBackend:
        with self._lock:
            if self._backend is not None:
                return self._backend
            try:
                self._backend = self._build()
                self._reason = "ok"
            except Exception as e:  # noqa: BLE001
                self._reason = str(e)
                raise
            return self._backend

    def query(self, sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        return self.backend().query(sql, params)

    def status(self) -> dict[str, Any]:
        with self._lock:
            backend = self._backend
        if backend is None:
            return {"connected": False, "method": None, "reason": self._reason}
        ok = backend.healthcheck()
        return {
            "connected": ok,
            "method": backend.name,
            "reason": "ok" if ok else "healthcheck failed",
        }

    def reset(self) -> None:
        with self._lock:
            self._backend = None
            self._reason = "reset"


fabric = FabricManager()
