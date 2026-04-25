"""Project 1 — Investment Portfolio endpoints (live Fabric)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Response

import cache
from routers._helpers import serve_query

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/stocks")
def stocks(response: Response) -> Any:
    return serve_query(
        response,
        cache.make_key("portfolio.stocks"),
        "SELECT * FROM gold_stock_performance",
    )


@router.get("/currency-returns")
def currency_returns(response: Response) -> Any:
    return serve_query(
        response,
        cache.make_key("portfolio.currency_returns"),
        "SELECT * FROM gold_currency_adjusted_returns",
    )


@router.get("/categories")
def categories(response: Response) -> Any:
    return serve_query(
        response,
        cache.make_key("portfolio.categories"),
        "SELECT * FROM gold_category_performance",
    )


@router.get("/regions")
def regions(response: Response) -> Any:
    return serve_query(
        response,
        cache.make_key("portfolio.regions"),
        "SELECT * FROM gold_region_performance",
    )


@router.get("/dividends")
def dividends(response: Response) -> Any:
    return serve_query(
        response,
        cache.make_key("portfolio.dividends"),
        "SELECT * FROM gold_dividend_analysis",
    )


@router.get("/correlation")
def correlation(response: Response) -> Any:
    return serve_query(
        response,
        cache.make_key("portfolio.correlation"),
        "SELECT * FROM gold_correlation_matrix",
    )
