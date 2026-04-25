"""Shared helpers for the Fabric-backed routers."""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Response

import cache
from database import fabric


def build_query(base: str, filters: dict[str, Any]) -> tuple[str, list[Any]]:
    """Build a parameterised WHERE clause for a base SELECT.

    Only includes filters whose value is not None. Returns (sql, params).
    """
    where: list[str] = []
    params: list[Any] = []
    for column, value in filters.items():
        if value is None:
            continue
        where.append(f"{column} = ?")
        params.append(value)
    sql = base
    if where:
        sql = f"{base} WHERE {' AND '.join(where)}"
    return sql, params


def serve_query(
    response: Response,
    cache_key: str,
    sql: str,
    params: list[Any] | None = None,
) -> Any:
    """Run a Fabric query through the cache, attach data-source headers."""
    def loader() -> Any:
        return fabric.query(sql, params or [])

    try:
        data, meta = cache.get_or_load(cache_key, loader)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail={
                "error": True,
                "message": f"Database connection unavailable: {exc}",
                "cached": False,
            },
        ) from exc

    response.headers["X-Data-Source"] = meta["source"]
    response.headers["X-Last-Updated"] = meta["cached_at"]
    return data
