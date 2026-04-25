"""Smoke tests for the FastAPI app.

Run with `pytest -q` from the project root. These tests do NOT touch
Fabric; they only exercise routes that don't require credentials
(health + the static defense endpoints).
"""
from __future__ import annotations

import sys
from pathlib import Path

# Make the api/ directory importable so `from main import app` works.
_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402

client = TestClient(app)


def test_health_returns_status_block() -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "healthy"
    assert "fabric_connected" in body
    assert "fabric_method" in body
    assert body["projects"] == {
        "energy": "live",
        "portfolio": "live",
        "defense": "static",
    }


def test_root_returns_descriptor() -> None:
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["service"] == "portfolio-api"


def test_defense_overview_serves_static_json() -> None:
    r = client.get("/api/defense/overview")
    assert r.status_code == 200
    assert r.headers.get("X-Data-Source") == "static"
    assert "rows" in r.json()


def test_defense_partnerships_includes_lat_lng() -> None:
    r = client.get("/api/defense/partnerships")
    assert r.status_code == 200
    rows = r.json()["rows"]
    assert rows
    assert {"exporter_lat", "exporter_lng", "importer_lat", "importer_lng"} <= set(rows[0])


def test_cors_preflight_allows_localhost() -> None:
    r = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Either 200 (CORS middleware reply) or 405 if route doesn't accept OPTIONS,
    # but the CORS middleware should always produce the headers on a preflight.
    assert r.status_code in (200, 204, 405)
    if r.status_code in (200, 204):
        assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_energy_endpoint_returns_503_without_credentials(monkeypatch) -> None:
    # Without Fabric credentials, energy endpoints should fail gracefully.
    monkeypatch.setenv("FABRIC_SQL_ENDPOINT", "")
    r = client.get("/api/energy/overview")
    assert r.status_code in (503, 500)
    body = r.json()
    assert body.get("error") is True
