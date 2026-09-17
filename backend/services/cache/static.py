from __future__ import annotations

from services.cache.keys import SERVICES_KEY, STOPS_KEY
from services.cache.store import CacheStore
from services.lta.bus_stops import list_bus_stops
from services.lta.client import LTAClient
from services.lta.routes import list_bus_services


def cache_bus_stops(
    client: LTAClient,
    store: CacheStore,
    *,
    ttl_seconds: int,
) -> int:
    stops = list_bus_stops(client)
    store.set_json(
        STOPS_KEY,
        [stop.model_dump(mode="json") for stop in stops],
        ttl_seconds,
    )
    return len(stops)


def cache_bus_services(
    client: LTAClient,
    store: CacheStore,
    *,
    ttl_seconds: int,
) -> int:
    services = list_bus_services(client)
    store.set_json(
        SERVICES_KEY,
        [service.model_dump(mode="json") for service in services],
        ttl_seconds,
    )
    return len(services)
