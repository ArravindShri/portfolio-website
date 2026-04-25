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
from database import fabric
from routers import defense, energy, portfolio

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("portfolio.api")

app = FastAPI(
    title="Shri Arravindhar — Portfolio API",
    version="1.0.0",
    description="Live data from Microsoft Fabric for the React portfolio frontend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
    expose_headers=["X-Data-Source", "X-Last-Updated"],
)

app.include_router(energy.router)
app.include_router(portfolio.router)
app.include_router(defense.router)


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):
        body = detail
    else:
        body = {"error": True, "message": str(detail)}
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
    """Show fabric connection status and which method is active."""
    if settings.fabric_configured:
        try:
            fabric.backend()  # ensure built / probed
        except Exception:  # noqa: BLE001
            pass
    fabric_status = fabric.status()
    cache_stats = cache.stats()

    return {
        "status": "healthy",
        "fabric_connected": fabric_status["connected"],
        "fabric_method": fabric_status["method"],
        "fabric_reason": fabric_status["reason"],
        "fabric_configured": settings.fabric_configured,
        "cache_entries": cache_stats["cache_entries"],
        "last_refresh": cache_stats["last_refresh"],
        "cors_origins": list(settings.cors_origins),
        "projects": {
            "energy": "live",
            "portfolio": "live",
            "defense": "static",
        },
    }
