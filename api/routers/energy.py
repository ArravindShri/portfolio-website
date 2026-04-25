"""Project 3 — Energy Security endpoints (live Fabric, P3 warehouse)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Response

import cache
from database import fabric_energy
from routers._helpers import build_query, serve_query

router = APIRouter(prefix="/api/energy", tags=["energy"])


@router.get("/overview")
def overview(
    response: Response,
    product: str | None = Query(None),
    year: int | None = Query(None),
    country: str | None = Query(None),
) -> Any:
    sql, params = build_query(
        "SELECT * FROM gold_energy_overview",
        {"energy_product": product, "year": year, "country_id": country},
    )
    key = cache.make_key(
        "energy.overview", {"product": product, "year": year, "country": country}
    )
    return serve_query(response, key, sql, params, manager=fabric_energy)


@router.get("/prices")
def prices(
    response: Response,
    product: str | None = Query(None),
    start_year: int | None = Query(None),
    end_year: int | None = Query(None),
) -> Any:
    where: list[str] = []
    params: list[Any] = []
    if product is not None:
        where.append("energy_product = ?")
        params.append(product)
    if start_year is not None:
        where.append("year >= ?")
        params.append(start_year)
    if end_year is not None:
        where.append("year <= ?")
        params.append(end_year)
    sql = "SELECT * FROM gold_energy_prices"
    if where:
        sql = f"{sql} WHERE {' AND '.join(where)}"
    key = cache.make_key(
        "energy.prices",
        {"product": product, "start_year": start_year, "end_year": end_year},
    )
    return serve_query(response, key, sql, params, manager=fabric_energy)


@router.get("/imports")
def imports(
    response: Response,
    country: str | None = Query(None),
    product: str | None = Query(None),
    year: int | None = Query(None),
) -> Any:
    sql, params = build_query(
        "SELECT * FROM gold_import_export_analysis",
        {"country_id": country, "energy_product": product, "year": year},
    )
    key = cache.make_key(
        "energy.imports", {"country": country, "product": product, "year": year}
    )
    return serve_query(response, key, sql, params, manager=fabric_energy)


@router.get("/crisis")
def crisis(
    response: Response,
    crisis_id: str | None = Query(None),
    asset_type: str | None = Query(None),
) -> Any:
    sql, params = build_query(
        "SELECT * FROM gold_crisis_analysis",
        {"crisis_id": crisis_id, "asset_type": asset_type},
    )
    key = cache.make_key(
        "energy.crisis", {"crisis_id": crisis_id, "asset_type": asset_type}
    )
    return serve_query(response, key, sql, params, manager=fabric_energy)


@router.get("/stocks")
def stocks(
    response: Response,
    asset_type: str | None = Query(None),
    category: str | None = Query(None),
) -> Any:
    sql, params = build_query(
        "SELECT * FROM gold_stock_performance",
        {"asset_type": asset_type, "category": category},
    )
    key = cache.make_key(
        "energy.stocks", {"asset_type": asset_type, "category": category}
    )
    return serve_query(response, key, sql, params, manager=fabric_energy)


@router.get("/country/{country_name}")
def country_deep_dive(country_name: str, response: Response) -> Any:
    """Aggregate the Energy slice for a single country in one round-trip-safe call.

    Joins on ``country_name`` instead of ``country_id`` because the gold
    tables don't share a consistent country_id key — the overview view
    uses one numbering, but crisis/stocks use a different one. Names are
    stable across views.
    """
    key = cache.make_key("energy.country", {"country_name": country_name})

    def loader() -> dict[str, Any]:
        return {
            "overview": fabric_energy.query(
                "SELECT * FROM gold_energy_overview WHERE country_name = ?",
                [country_name],
            ),
            "imports": fabric_energy.query(
                "SELECT * FROM gold_import_export_analysis WHERE country_name = ?",
                [country_name],
            ),
            "crisis": fabric_energy.query(
                "SELECT * FROM gold_crisis_analysis WHERE country_name = ?",
                [country_name],
            ),
            "stocks": fabric_energy.query(
                "SELECT * FROM gold_stock_performance WHERE country_name = ?",
                [country_name],
            ),
        }

    try:
        data, meta = cache.get_or_load(key, loader)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail={
                "error": True,
                "message": f"Database connection unavailable (energy): {exc}",
                "cached": False,
            },
        ) from exc

    response.headers["X-Data-Source"] = meta["source"]
    response.headers["X-Last-Updated"] = meta["cached_at"]
    response.headers["X-Warehouse"] = fabric_energy.name
    return data
