"""Fabric Warehouse connection managers.

Two warehouses are wired in:

- `fabric_portfolio` — Project 1 (Investment Portfolio), env *_P1
- `fabric_energy`    — Project 3 (Energy Security),     env *_P3

Both share Service Principal credentials but live in different workspaces.

Backend strategy (pyodbc primary, Fabric REST fallback):

1. **PyodbcTokenBackend** (preferred). We acquire an Entra ID access token
   via ``ClientSecretCredential`` for scope
   ``https://database.windows.net/.default`` and inject it into pyodbc using
   the ``SQL_COPT_SS_ACCESS_TOKEN`` connection attribute. The connection
   string deliberately does NOT include an ``Authentication=`` clause — the
   token is the auth.

2. **FabricRestApiBackend** (fallback) — only used when pyodbc/the ODBC
   driver is unavailable (e.g. on Vercel's stock Python runtime). Uses the
   Fabric REST API at
   ``https://api.fabric.microsoft.com/v1/workspaces/{wid}/warehouses/{whid}``
   which addresses warehouses by GUID, not name, so it requires extra env
   vars. The current public Fabric REST surface exposes warehouse
   *metadata* but not a SQL execution endpoint, so this backend can verify
   connectivity (healthcheck) and surface a clear error from ``query()``.
"""
from __future__ import annotations

import logging
import struct
import threading
import time as _time
from decimal import Decimal
from typing import Any, Iterable, Sequence

import requests

from config import settings

log = logging.getLogger("fabric.db")

# Silence noisy Azure / MSAL HTTP debug logs. These otherwise emit a full
# request+response trace on every token operation, which on Railway's 1 GB
# Docker instance accumulates into multi-MB stderr buffers and a steady
# memory leak via the logging machinery's record retention.
for _noisy in ("azure", "azure.identity", "azure.core.pipeline", "msal"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)


# Microsoft-specific pyodbc connection attribute for AAD access tokens.
# https://learn.microsoft.com/sql/connect/odbc/using-azure-active-directory
_SQL_COPT_SS_ACCESS_TOKEN = 1256


class FabricRestError(RuntimeError):
    """Structured error surfaced by REST/HTTP backends.

    ``str(err)`` includes status code, URL, and a body snippet so operators
    can diagnose Fabric issues straight from ``/api/health`` without digging
    through Vercel logs.
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
# Backend implementations — instances are bound to a single warehouse.
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
            self._healthcheck_impl()
            return True, None
        except Exception as exc:  # noqa: BLE001
            log.warning("Fabric[%s] healthcheck failed: %s", self.name, exc)
            return False, str(exc)

    def _healthcheck_impl(self) -> None:
        """Default healthcheck runs ``SELECT 1``. Subclasses can override."""
        self.query("SELECT 1 AS ok")


# Single shared ClientSecretCredential — both warehouses use the same SP.
# Constructing a new one per call re-initializes the full MSAL stack (tens
# of MB), so we lazily build one and reuse it forever.
_credential: Any = None
_credential_lock = threading.Lock()


def _get_credential() -> Any:
    global _credential
    if _credential is None:
        with _credential_lock:
            if _credential is None:
                from azure.identity import ClientSecretCredential  # noqa: PLC0415

                _credential = ClientSecretCredential(
                    tenant_id=settings.fabric_tenant_id,
                    client_id=settings.fabric_client_id,
                    client_secret=settings.fabric_client_secret,
                )
    return _credential


def _aad_token(scope: str) -> str:
    """Acquire a Service-Principal access token for the requested scope.

    Uses the shared :func:`_get_credential` instance. The credential caches
    token responses internally per-scope, so subsequent calls within a
    token lifetime are essentially free.
    """
    return _get_credential().get_token(scope).token


def _encode_token_attr(token: str) -> bytes:
    """Pack an AAD token for the SQL_COPT_SS_ACCESS_TOKEN connection attribute.

    ODBC expects a length-prefixed UTF-16-LE byte string here.
    """
    raw = token.encode("utf-16-le")
    return struct.pack(f"=I{len(raw)}s", len(raw), raw)


class PyodbcTokenBackend(FabricBackend):
    """ODBC Driver 18 + AAD access token (SQL_COPT_SS_ACCESS_TOKEN).

    Caches a single connection between queries to avoid re-paying the cost
    of TLS handshake + token attach on every request. The connection is
    closed and recreated if it has been idle longer than ``_IDLE_SECONDS``
    (Azure SQL evicts idle TDS connections server-side around the same
    boundary, so reusing a stale one would fail anyway).

    pyodbc connections are not thread-safe, so all queries through a given
    backend instance are serialized via ``self._lock``.
    """

    name = "pyodbc-token"

    # The token scope for SQL Server / Fabric warehouse TDS endpoints.
    _SCOPE = "https://database.windows.net/.default"
    # Reconnect if the cached connection has been idle longer than this.
    # 30 minutes ≈ Azure SQL gateway's typical idle timeout.
    _IDLE_SECONDS = 1800

    def __init__(self, sql_endpoint: str, database: str) -> None:
        import pyodbc  # noqa: PLC0415

        self._pyodbc = pyodbc
        self._conn_str = (
            "Driver={ODBC Driver 18 for SQL Server};"
            f"Server={sql_endpoint},1433;"
            f"Database={database};"
            "Encrypt=yes;TrustServerCertificate=no;"
        )
        # Fully lazy — no startup probe. The connection is opened on the
        # first query() or healthcheck() call. This avoids holding an open
        # connection (and its server-side memory) for warehouses that may
        # never be queried during a given request lifecycle.
        self._conn: Any = None
        self._last_used: float = 0.0
        self._lock = threading.Lock()

    def _open(self):
        token_struct = _encode_token_attr(_aad_token(self._SCOPE))
        return self._pyodbc.connect(
            self._conn_str,
            timeout=15,
            attrs_before={_SQL_COPT_SS_ACCESS_TOKEN: token_struct},
        )

    def _ensure_conn_locked(self):
        """Return a usable connection. Caller must hold ``self._lock``."""
        now = _time.monotonic()
        if self._conn is not None and (now - self._last_used) > self._IDLE_SECONDS:
            try:
                self._conn.close()
            except Exception:  # noqa: BLE001
                pass
            self._conn = None
        if self._conn is None:
            self._conn = self._open()
        return self._conn

    def query(self, sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        with self._lock:
            conn = self._ensure_conn_locked()
            cur = conn.cursor()
            try:
                cur.execute(sql, params or [])
                cols = [c[0] for c in cur.description] if cur.description else []
                rows = [_sanitize_row(dict(zip(cols, row))) for row in cur.fetchall()]
            finally:
                # Release the cursor immediately so SQL Server can reclaim
                # its server-side resources even though we keep the
                # connection cached for the next query.
                cur.close()
            self._last_used = _time.monotonic()
            return rows


def _sanitize_row(row: dict[str, Any]) -> dict[str, Any]:
    """Coerce pyodbc-native types into JSON-friendly primitives.

    pyodbc returns ``decimal.Decimal`` for SQL numeric/decimal columns.
    FastAPI / Starlette's default JSON encoder serializes ``Decimal`` as a
    string (e.g. ``"71.974091"``) which then fails ``typeof v === 'number'``
    checks on the frontend, causing rows to be silently filtered out. We
    convert to float here so the JSON shape is consistent across backends.
    """
    out: dict[str, Any] = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            out[k] = float(v)
        else:
            out[k] = v
    return out


class FabricRestApiBackend(FabricBackend):
    """Fabric REST API fallback (workspace + warehouse GUIDs).

    Uses ``https://api.fabric.microsoft.com/v1/workspaces/{wid}/warehouses/{whid}``.
    The current public Fabric REST surface exposes warehouse *metadata* but
    not arbitrary SQL execution, so this backend:

    - implements ``_healthcheck_impl`` against the warehouse GET endpoint
      (verifies SP auth + correct GUIDs + reachability),
    - raises a clear :class:`FabricRestError` from ``query`` until/unless a
      query endpoint becomes available — at which point only ``query`` needs
      to change.
    """

    name = "fabric-rest"

    _SCOPE = "https://api.fabric.microsoft.com/.default"
    _BASE = "https://api.fabric.microsoft.com/v1"

    def __init__(self, workspace_id: str, warehouse_id: str) -> None:
        if not workspace_id or not warehouse_id:
            raise FabricRestError(
                "Fabric REST fallback needs workspace + warehouse GUIDs "
                "(FABRIC_WORKSPACE_ID_*, FABRIC_WAREHOUSE_ID_*)"
            )
        self._workspace_id = workspace_id
        self._warehouse_id = warehouse_id
        # Validate token acquisition up front so the manager can pick a
        # different backend if the SP isn't allowed Fabric API scope.
        _aad_token(self._SCOPE)

    def _warehouse_url(self) -> str:
        return f"{self._BASE}/workspaces/{self._workspace_id}/warehouses/{self._warehouse_id}"

    def _request(self, method: str, url: str, **kwargs: Any) -> requests.Response:
        try:
            token = _aad_token(self._SCOPE)
        except Exception as exc:  # noqa: BLE001
            raise FabricRestError(
                f"token acquisition failed (Fabric scope): {exc}", url=url
            ) from exc

        headers = kwargs.pop("headers", {}) or {}
        headers.setdefault("Authorization", f"Bearer {token}")
        try:
            resp = requests.request(method, url, headers=headers, timeout=20, **kwargs)
        except requests.RequestException as exc:
            raise FabricRestError(f"network error: {exc}", url=url) from exc

        if not resp.ok:
            body_snippet = (resp.text or "")[:600].replace("\n", " ")
            raise FabricRestError(
                f"HTTP {resp.status_code} {resp.reason or ''}".strip(),
                url=url,
                status_code=resp.status_code,
                body=body_snippet,
            )
        return resp

    def _healthcheck_impl(self) -> None:
        # GET warehouse metadata — proves SP auth + correct workspace/warehouse IDs.
        self._request("GET", self._warehouse_url())

    def query(self, sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        # The Fabric REST API does not currently expose a public SQL
        # execution endpoint on warehouses — only metadata operations. Until
        # one ships, we surface a precise reason instead of returning empty
        # results that look successful.
        raise FabricRestError(
            "Fabric REST API has no SQL execution endpoint; "
            "use pyodbc (ODBC Driver 18) or pre-materialize results to JSON",
            url=self._warehouse_url(),
        )


def _bind_inline_params(sql: str, params: Iterable[Any]) -> str:
    """Replace ``?`` placeholders with safely-quoted literals."""
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
# Manager — one per warehouse. Lazily picks pyodbc-token → fabric-rest.
# ----------------------------------------------------------------------------


class FabricManager:
    """Owns the active backend for a single warehouse."""

    def __init__(
        self,
        name: str,
        sql_endpoint: str,
        database: str,
        *,
        workspace_id: str = "",
        warehouse_id: str = "",
    ) -> None:
        self.name = name
        self._sql_endpoint = sql_endpoint
        self._database = database
        self._workspace_id = workspace_id
        self._warehouse_id = warehouse_id
        self._lock = threading.Lock()
        self._backend: FabricBackend | None = None
        self._reason: str = "not initialized"

    @property
    def configured(self) -> bool:
        # We consider the warehouse "configured" if EITHER the pyodbc inputs
        # (sql_endpoint+database) OR the Fabric REST inputs (workspace_id+
        # warehouse_id) are present, plus the shared SP credentials.
        creds = bool(
            settings.fabric_client_id
            and settings.fabric_client_secret
            and settings.fabric_tenant_id
        )
        pyodbc_ready = bool(self._sql_endpoint and self._database)
        rest_ready = bool(self._workspace_id and self._warehouse_id)
        return creds and (pyodbc_ready or rest_ready)

    def _build(self) -> FabricBackend:
        if not self.configured:
            raise ConnectionError(
                f"Fabric credentials/endpoint not set for {self.name} — "
                "see .env.example."
            )

        mode = settings.connection_mode
        errors: list[str] = []

        if mode in ("auto", "pyodbc") and self._sql_endpoint and self._database:
            try:
                backend = PyodbcTokenBackend(self._sql_endpoint, self._database)
                log.info("Fabric[%s] backend = pyodbc-token", self.name)
                return backend
            except ImportError as e:
                errors.append(f"pyodbc unavailable: {e}")
            except Exception as e:  # noqa: BLE001
                errors.append(f"pyodbc connect failed: {e}")
            if mode == "pyodbc":
                raise ConnectionError("; ".join(errors))

        if mode in ("auto", "rest"):
            try:
                backend = FabricRestApiBackend(self._workspace_id, self._warehouse_id)
                log.info("Fabric[%s] backend = fabric-rest", self.name)
                return backend
            except Exception as e:  # noqa: BLE001
                errors.append(f"fabric-rest fallback failed: {e}")

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
    workspace_id=settings.fabric_workspace_id_p1,
    warehouse_id=settings.fabric_warehouse_id_p1,
)
fabric_energy = FabricManager(
    "energy",
    settings.fabric_sql_endpoint_p3,
    settings.fabric_database_p3,
    workspace_id=settings.fabric_workspace_id_p3,
    warehouse_id=settings.fabric_warehouse_id_p3,
)
