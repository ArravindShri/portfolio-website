"""FastAPI app entry point.

Exports `app`. Use `uvicorn main:app --reload` locally, or import this
module from a serverless wrapper (see `api/index.py`).
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import cache
from config import settings
from database import fabric_energy, fabric_portfolio
from routers import contact, defense, energy, portfolio

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("portfolio.api")

app = FastAPI(
    title="Shri Arravindhar — Portfolio API",
    version="1.1.0",
    description="Live data from two Microsoft Fabric warehouses (P1 + P3) for the React portfolio frontend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Data-Source", "X-Last-Updated", "X-Warehouse"],
)

app.include_router(energy.router)
app.include_router(portfolio.router)
app.include_router(defense.router)
app.include_router(contact.router)


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    body = detail if isinstance(detail, dict) else {"error": True, "message": str(detail)}
    return JSONResponse(status_code=exc.status_code, content=body)


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "portfolio-api",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health() -> dict[str, Any]:
    """Show per-warehouse connection status, active method, and cache stats."""
    # Probe lazily so the response reflects current reality.
    for mgr in (fabric_portfolio, fabric_energy):
        if mgr.configured:
            try:
                mgr.backend()
            except Exception:  # noqa: BLE001
                pass

    portfolio_status = fabric_portfolio.status()
    energy_status = fabric_energy.status()
    cache_stats = cache.stats()

    return {
        "status": "healthy",
        "warehouses": {
            "portfolio": portfolio_status,
            "energy": energy_status,
        },
        "cache_entries": cache_stats["cache_entries"],
        "last_refresh": cache_stats["last_refresh"],
        "cors_origins": list(settings.cors_origins),
        "projects": {
            "energy": "live" if energy_status["configured"] else "unconfigured",
            "portfolio": "live" if portfolio_status["configured"] else "unconfigured",
            "defense": "static",
        },
    }
