"""Fabric Warehouse connection managers.

Two warehouses are wired in:

- `fabric_portfolio` — Project 1 (Investment Portfolio), env *_P1
- `fabric_energy`    — Project 3 (Energy Security),     env *_P3

They share Service Principal credentials but live in different workspaces.
Each manager picks pyodbc as primary and azure-identity + REST as the
auto-fallback when ODBC is unavailable (e.g. on Vercel).
"""
from __future__ import annotations

import logging
import threading
from typing import Any, Iterable, Sequence

import requests

from config import settings

log = logging.getLogger("fabric.db")


class FabricRestError(RuntimeError):
    """Raised by RestBackend with structured detail for /api/health.

    `str(err)` includes status code, URL, and a body snippet so operators
    can diagnose Fabric REST issues straight from the health endpoint
    without digging through Vercel logs.
    """

    def __init__(
        self,
        message: str,
        *,
        url: str | None = None,
        status_code: int | None = None,
        body: str | None = None,
    ) -> None:
        self.url = url
        self.status_code = status_code
        self.body = body
        parts = [message]
        if status_code is not None:
            parts.append(f"status={status_code}")
        if url is not None:
            parts.append(f"url={url}")
        if body:
            parts.append(f"body={body}")
        super().__init__(" | ".join(parts))


# ----------------------------------------------------------------------------
# Backend implementations — instances are bound to a single (endpoint, db).
# ----------------------------------------------------------------------------


class FabricBackend:
    name: str = "base"

    def query(self, sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        raise NotImplementedError

    def healthcheck(self) -> tuple[bool, str | None]:
        """Returns (ok, error_message). The message is None on success and
        carries the full exception detail on failure so the /api/health
        endpoint can surface it to the operator."""
        try:
            self.query("SELECT 1 AS ok")
            return True, None
        except Exception as exc:  # noqa: BLE001
            log.warning("Fabric healthcheck failed: %s", exc)
            return False, str(exc)


class PyodbcBackend(FabricBackend):
    """ODBC Driver 18 + Service Principal auth, scoped to one warehouse."""

    name = "pyodbc"

    def __init__(self, sql_endpoint: str, database: str) -> None:
        import pyodbc  # noqa: PLC0415

        self._pyodbc = pyodbc
        self._conn_str = (
            "Driver={ODBC Driver 18 for SQL Server};"
            f"Server={sql_endpoint};"
            f"Database={database};"
            "Authentication=ActiveDirectoryServicePrincipal;"
            f"UID={settings.fabric_client_id};"
            f"PWD={settings.fabric_client_secret};"
            "Encrypt=yes;TrustServerCertificate=no;"
        )
        # Probe once so callers can fail-over early.
        with self._pyodbc.connect(self._conn_str, timeout=10):
            pass

    def query(self, sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        with self._pyodbc.connect(self._conn_str, timeout=15) as conn:
            cur = conn.cursor()
            cur.execute(sql, params or [])
            cols = [c[0] for c in cur.description] if cur.description else []
            return [dict(zip(cols, row)) for row in cur.fetchall()]


class RestBackend(FabricBackend):
    """azure-identity Service Principal token + Fabric warehouse REST query."""

    name = "rest"

    def __init__(self, sql_endpoint: str, database: str) -> None:
        from azure.identity import ClientSecretCredential  # noqa: PLC0415

        self._sql_endpoint = sql_endpoint
        self._database = database
        self._credential = ClientSecretCredential(
            tenant_id=settings.fabric_tenant_id,
            client_id=settings.fabric_client_id,
            client_secret=settings.fabric_client_secret,
        )
        self._scope = "https://database.windows.net/.default"
        # Validate credential up front.
        self._credential.get_token(self._scope)

    def _token(self) -> str:
        return self._credential.get_token(self._scope).token

    def _query_url(self) -> str:
        return f"https://{self._sql_endpoint}/v1.0/warehouses/{self._database}/query"

    def query(self, sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        url = self._query_url()
        bound_sql = _bind_inline_params(sql, params or [])

        # 1) Acquire token. Surface azure-identity's auth message verbatim.
        try:
            token = self._token()
        except Exception as exc:  # noqa: BLE001
            log.error("REST: token acquisition failed for %s: %s", self._database, exc)
            raise FabricRestError(
                f"token acquisition failed: {exc}",
                url=url,
            ) from exc

        # 2) POST the query.
        try:
            resp = requests.post(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={"query": bound_sql},
                timeout=20,
            )
        except requests.RequestException as exc:
            log.error("REST: network error POST %s: %s", url, exc)
            raise FabricRestError(f"network error: {exc}", url=url) from exc

        # 3) Surface non-2xx with the body included — Fabric returns useful
        #    error JSON we want operators to see in /api/health.
        if not resp.ok:
            body_snippet = (resp.text or "")[:600].replace("\n", " ")
            log.error(
                "REST: HTTP %s from %s — body=%s", resp.status_code, url, body_snippet
            )
            raise FabricRestError(
                f"HTTP {resp.status_code} {resp.reason or ''}".strip(),
                url=url,
                status_code=resp.status_code,
                body=body_snippet,
            )

        # 4) Parse JSON. If the response wasn't JSON, include the text.
        try:
            payload = resp.json()
        except ValueError as exc:
            body_snippet = (resp.text or "")[:600].replace("\n", " ")
            log.error("REST: non-JSON response from %s: %s", url, body_snippet)
            raise FabricRestError(
                f"non-JSON response: {exc}",
                url=url,
                status_code=resp.status_code,
                body=body_snippet,
            ) from exc

        # 5) Normalize to list[dict].
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict) and "rows" in payload and isinstance(payload["rows"], list):
            cols = payload.get("columns")
            if cols and payload["rows"] and not isinstance(payload["rows"][0], dict):
                return [dict(zip(cols, row)) for row in payload["rows"]]
            return payload["rows"]
        if isinstance(payload, dict) and "results" in payload and payload["results"]:
            r0 = payload["results"][0]
            cols = r0.get("columns") or []
            rows = r0.get("rows") or []
            if rows and not isinstance(rows[0], dict):
                return [dict(zip(cols, row)) for row in rows]
            return rows
        # Unexpected shape — surface a snippet so it's debuggable.
        snippet = str(payload)[:300]
        raise FabricRestError(
            f"unexpected response shape: {snippet}",
            url=url,
            status_code=resp.status_code,
            body=snippet,
        )


def _bind_inline_params(sql: str, params: Iterable[Any]) -> str:
    """Replace `?` placeholders with safely-quoted literals for REST submission."""
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
# Manager — one per warehouse. Lazily picks pyodbc → REST.
# ----------------------------------------------------------------------------


class FabricManager:
    """Owns the active backend for a single (sql_endpoint, database) pair."""

    def __init__(self, name: str, sql_endpoint: str, database: str) -> None:
        self.name = name
        self._sql_endpoint = sql_endpoint
        self._database = database
        self._lock = threading.Lock()
        self._backend: FabricBackend | None = None
        self._reason: str = "not initialized"

    @property
    def configured(self) -> bool:
        return bool(
            self._sql_endpoint
            and self._database
            and settings.fabric_client_id
            and settings.fabric_client_secret
            and settings.fabric_tenant_id
        )

    def _build(self) -> FabricBackend:
        if not self.configured:
            raise ConnectionError(
                f"Fabric credentials/endpoint not set for {self.name} — "
                "see .env.example."
            )

        mode = settings.connection_mode
        errors: list[str] = []

        if mode in ("auto", "pyodbc"):
            try:
                backend = PyodbcBackend(self._sql_endpoint, self._database)
                log.info("Fabric[%s] backend = pyodbc", self.name)
                return backend
            except ImportError as e:
                errors.append(f"pyodbc unavailable: {e}")
            except Exception as e:  # noqa: BLE001
                errors.append(f"pyodbc connect failed: {e}")
            if mode == "pyodbc":
                raise ConnectionError("; ".join(errors))

        if mode in ("auto", "rest"):
            try:
                backend = RestBackend(self._sql_endpoint, self._database)
                log.info("Fabric[%s] backend = rest", self.name)
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
            return {
                "name": self.name,
                "configured": self.configured,
                "connected": False,
                "method": None,
                "reason": self._reason,
            }
        ok, err = backend.healthcheck()
        return {
            "name": self.name,
            "configured": self.configured,
            "connected": ok,
            "method": backend.name,
            "reason": "ok" if ok else (err or "healthcheck failed"),
        }

    def reset(self) -> None:
        with self._lock:
            self._backend = None
            self._reason = "reset"


# Module-level singletons — routers import these directly.
fabric_portfolio = FabricManager(
    "portfolio",
    settings.fabric_sql_endpoint_p1,
    settings.fabric_database_p1,
)
fabric_energy = FabricManager(
    "energy",
    settings.fabric_sql_endpoint_p3,
    settings.fabric_database_p3,
)
