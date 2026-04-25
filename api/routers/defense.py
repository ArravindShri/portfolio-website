"""Project 2 — Defense Intelligence endpoints (static JSON).

When Project 2 migrates to Fabric, swap each endpoint to use `serve_query`
with the appropriate `gold_*` table; the response shapes match.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Response

router = APIRouter(prefix="/api/defense", tags=["defense"])


def _resolve_static_dir() -> Path:
    """Find public/static/defense across local + Vercel layouts.

    - Local (uvicorn run from project root): repo_root/public/static/defense
    - Vercel: bundled via vercel.json includeFiles; same path works because
      the function's working dir is the project root.
    """
    here = Path(__file__).resolve()
    for candidate in (
        here.parents[2] / "public" / "static" / "defense",
        here.parents[1] / "public" / "static" / "defense",
        Path.cwd() / "public" / "static" / "defense",
    ):
        if candidate.exists():
            return candidate
    return here.parents[2] / "public" / "static" / "defense"


STATIC_DIR = _resolve_static_dir()


def _serve_static(response: Response, filename: str) -> Any:
    path = STATIC_DIR / filename
    if not path.exists():
        raise HTTPException(
            status_code=503,
            detail={
                "error": True,
                "message": f"Static file missing: {filename}",
            },
        )
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail={"error": True, "message": f"Invalid JSON in {filename}: {exc}"},
        ) from exc

    mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()
    response.headers["X-Data-Source"] = "static"
    response.headers["X-Last-Updated"] = mtime
    return data


@router.get("/overview")
def overview(response: Response) -> Any:
    return _serve_static(response, "trade_overview.json")


@router.get("/imports")
def imports(response: Response) -> Any:
    return _serve_static(response, "imports_analysis.json")


@router.get("/exports")
def exports(response: Response) -> Any:
    return _serve_static(response, "exports_analysis.json")


@router.get("/partnerships")
def partnerships(response: Response) -> Any:
    return _serve_static(response, "partnerships.json")


@router.get("/conflict")
def conflict(response: Response) -> Any:
    return _serve_static(response, "conflict_events.json")


@router.get("/companies")
def companies(response: Response) -> Any:
    return _serve_static(response, "top100_companies.json")
