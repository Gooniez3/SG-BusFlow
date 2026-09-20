from __future__ import annotations

import logging
import time

from services.cache.arrivals import cache_stop_arrivals
from services.cache.live import resolve_watch_codes
from services.lta.client import LTAError

logger = logging.getLogger("workers")


def ingest_static(client, store, settings) -> None:
    from app.core.db import SessionLocal
    from app.journey.graph import clear_graph_cache
    from app.repositories.network import upsert_bus_network
    from app.repositories.stops import upsert_bus_stops
    from services.lta.bus_stops import list_bus_stops
    from services.lta.routes import list_bus_routes, list_bus_services
    from services.cache.keys import SERVICES_KEY, STOPS_KEY

    stops = list_bus_stops(client)
    store.set_json(
        STOPS_KEY,
        [stop.model_dump(mode="json") for stop in stops],
        settings.static_cache_ttl_seconds,
    )
    services = list_bus_services(client)
    store.set_json(
        SERVICES_KEY,
        [service.model_dump(mode="json") for service in services],
        settings.static_cache_ttl_seconds,
    )
    routes = list_bus_routes(client)
    with SessionLocal() as db:
        db_count = upsert_bus_stops(db, stops)
        network = upsert_bus_network(db, services, routes)
        db.commit()
    clear_graph_cache()
    logger.info(
        "cached %s bus stops and %s services; upserted %s stops, %s routes, %s route stops into PostGIS",
        len(stops),
        len(services),
        db_count,
        network["routes"],
        network["route_stops"],
    )


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
        codes = resolve_watch_codes(store.redis, stop_codes)
        ingest_arrivals(client, store, settings, codes)
        time.sleep(settings.arrival_poll_interval_seconds)
