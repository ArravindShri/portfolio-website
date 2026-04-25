"""Vercel serverless entry point.

`@vercel/python` will invoke this file for every `/api/*` request — see
`vercel.json` at the repo root. We re-export the FastAPI `app` so the
runtime can wrap it as an ASGI handler.

This file also makes the sibling Python modules importable both when
running locally (`uvicorn api.main:app`) and when imported by Vercel
from inside the `api/` directory.
"""
from __future__ import annotations

import sys
from pathlib import Path

_API_DIR = Path(__file__).resolve().parent
if str(_API_DIR) not in sys.path:
    sys.path.insert(0, str(_API_DIR))

from main import app  # noqa: E402,F401
