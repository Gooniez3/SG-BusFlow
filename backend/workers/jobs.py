from __future__ import annotations

import logging
import time

from services.cache.arrivals import cache_stop_arrivals
from services.cache.static import cache_bus_services, cache_bus_stops
from services.lta.client import LTAError

logger = logging.getLogger("workers")


def ingest_static(client, store, settings) -> None:
    stop_count = cache_bus_stops(
        client, store, ttl_seconds=settings.static_cache_ttl_seconds
    )
    service_count = cache_bus_services(
        client, store, ttl_seconds=settings.static_cache_ttl_seconds
    )
    logger.info("cached %s bus stops and %s services", stop_count, service_count)


def ingest_arrivals(client, store, settings, stop_codes: list[str]) -> None:
    if not stop_codes:
        logger.warning("no stop codes provided; set LTA_WATCH_STOPS or pass --stops")
        return
    for code in stop_codes:
        try:
            cached = cache_stop_arrivals(
                client,
                store,
                code,
                ttl_seconds=settings.arrival_cache_ttl_seconds,
            )
            logger.info(
                "cached arrivals for %s (%s services, stale=%s)",
                code,
                len(cached.services),
                cached.stale,
            )
        except LTAError:
            logger.exception("failed to cache arrivals for %s", code)


def run_arrivals_loop(client, store, settings, stop_codes: list[str]) -> None:
    while True:
        ingest_arrivals(client, store, settings, stop_codes)
        time.sleep(settings.arrival_poll_interval_seconds)
