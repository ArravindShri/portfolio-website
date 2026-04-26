"""1-hour in-memory cache with last-good fallback semantics."""
from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from config import settings

_lock = threading.Lock()
_store: dict[str, dict[str, Any]] = {}

# Bound the in-memory cache so query result blobs can't grow without limit.
# When the cache is full and a new key arrives, the oldest entry by
# insertion time is evicted (LRU-by-insertion, which is fine for our
# workload — every endpoint refreshes every cache_ttl_seconds anyway).
MAX_CACHE_ENTRIES = 50


def _now() -> datetime:
    return datetime.now(timezone.utc)


def make_key(endpoint: str, params: dict[str, Any] | None = None) -> str:
    if not params:
        return endpoint
    parts = sorted((k, v) for k, v in params.items() if v is not None)
    suffix = "&".join(f"{k}={v}" for k, v in parts)
    return f"{endpoint}?{suffix}" if suffix else endpoint


def get_fresh(key: str) -> dict[str, Any] | None:
    """Return cached entry if still within TTL, else None."""
    with _lock:
        entry = _store.get(key)
        if not entry:
            return None
        ttl = timedelta(seconds=settings.cache_ttl_seconds)
        if _now() - entry["time"] < ttl:
            return entry
        return None


def get_any(key: str) -> dict[str, Any] | None:
    """Return cached entry regardless of staleness — used as a fallback."""
    with _lock:
        return _store.get(key)


def put(key: str, data: Any) -> dict[str, Any]:
    entry = {"data": data, "time": _now()}
    with _lock:
        # Evict the oldest entry by timestamp before inserting a new key.
        # Refreshing an existing key is free (it just replaces the value).
        if key not in _store and len(_store) >= MAX_CACHE_ENTRIES:
            oldest_key = min(_store, key=lambda k: _store[k]["time"])
            _store.pop(oldest_key, None)
        _store[key] = entry
    return entry


def get_or_load(
    key: str,
    loader: Callable[[], Any],
) -> tuple[Any, dict[str, Any]]:
    """Returns (data, meta). meta = {'source': 'cache'|'live'|'stale-cache',
    'cached_at': iso}. Raises ConnectionError if loader fails AND no cache exists."""
    fresh = get_fresh(key)
    if fresh is not None:
        return fresh["data"], {
            "source": "cache",
            "cached_at": fresh["time"].isoformat(),
        }

    try:
        data = loader()
    except Exception as exc:  # noqa: BLE001
        stale = get_any(key)
        if stale is not None:
            return stale["data"], {
                "source": "stale-cache",
                "cached_at": stale["time"].isoformat(),
                "error": str(exc),
            }
        raise

    entry = put(key, data)
    return data, {
        "source": "live",
        "cached_at": entry["time"].isoformat(),
    }


def stats() -> dict[str, Any]:
    with _lock:
        if not _store:
            return {"cache_entries": 0, "last_refresh": None}
        last = max(entry["time"] for entry in _store.values())
        return {
            "cache_entries": len(_store),
            "last_refresh": last.isoformat(),
        }


def clear() -> None:
    with _lock:
        _store.clear()
