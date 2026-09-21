from __future__ import annotations

from datetime import datetime

from services.cache.freshness import apply_freshness
from services.cache.keys import ARRIVALS_STALE_TTL_SECONDS, arrivals_key, arrivals_last_key
from services.cache.live import publish_stop_arrivals
from services.cache.models import CachedStopArrivals
from services.cache.store import CacheStore
from services.cache.transform import transform_arrivals
from services.lta.bus_arrivals import get_bus_arrivals
from services.lta.client import LTAClient, LTARequestError


def _read_cached(store: CacheStore, bus_stop_code: str) -> CachedStopArrivals | None:
    raw = store.get_text(arrivals_key(bus_stop_code)) or store.get_text(
        arrivals_last_key(bus_stop_code)
    )
    if raw is None:
        return None
    return CachedStopArrivals.model_validate_json(raw)


def cache_stop_arrivals(
    client: LTAClient,
    store: CacheStore,
    bus_stop_code: str,
    *,
    ttl_seconds: int,
    now: datetime | None = None,
    stale_after_seconds: int = 90,
) -> CachedStopArrivals:
    key = arrivals_key(bus_stop_code)
    try:
        payload = get_bus_arrivals(client, bus_stop_code)
        cached = transform_arrivals(payload, now=now, stale=False)
        store.set_json(key, cached, ttl_seconds)
        store.set_json(arrivals_last_key(bus_stop_code), cached, ARRIVALS_STALE_TTL_SECONDS)
        try:
            publish_stop_arrivals(store.redis, cached)
        except Exception:
            pass
        return apply_freshness(cached, now=now, stale_after_seconds=stale_after_seconds)
    except LTARequestError:
        cached = _read_cached(store, bus_stop_code)
        if cached is None:
            raise
        return apply_freshness(
            cached,
            now=now,
            stale_after_seconds=stale_after_seconds,
            force_stale=True,
        )


def get_cached_arrivals(
    client: LTAClient,
    store: CacheStore,
    bus_stop_code: str,
    *,
    ttl_seconds: int,
    now: datetime | None = None,
    stale_after_seconds: int = 90,
) -> CachedStopArrivals:
    raw = store.get_text(arrivals_key(bus_stop_code))
    if raw is not None:
        cached = CachedStopArrivals.model_validate_json(raw)
        return apply_freshness(cached, now=now, stale_after_seconds=stale_after_seconds)
    return cache_stop_arrivals(
        client,
        store,
        bus_stop_code,
        ttl_seconds=ttl_seconds,
        now=now,
        stale_after_seconds=stale_after_seconds,
    )
