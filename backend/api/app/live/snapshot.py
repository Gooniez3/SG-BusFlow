from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.lta import create_lta_client
from app.repositories.stops import get_stop_by_code, get_stops_by_codes
from services.cache.arrivals import get_cached_arrivals
from services.cache.live import attach_bus_ids
from services.cache.models import CachedStopArrivals
from services.cache.store import CacheStore
from services.lta.client import LTAConfigError, LTARequestError


class LiveSnapshotError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def arrivals_payload(db: Session, cached: CachedStopArrivals) -> dict:
    payload = attach_bus_ids(cached.model_dump(mode="json"))
    destination_codes = [
        arrival.get("destination_code")
        for service in payload["services"]
        for arrival in service["arrivals"]
        if arrival.get("destination_code")
    ]
    names = {
        code: stop.name for code, stop in get_stops_by_codes(db, destination_codes).items()
    }
    for service in payload["services"]:
        for arrival in service["arrivals"]:
            dest = arrival.get("destination_code")
            arrival["destination_name"] = names.get(dest) if dest else None
    return payload


def load_stop_snapshot(db: Session, redis, code: str) -> dict:
    if get_stop_by_code(db, code) is None:
        raise LiveSnapshotError(404, "Bus stop not found")
    settings = get_settings()
    store = CacheStore(redis)
    try:
        client = create_lta_client()
    except LTAConfigError as exc:
        raise LiveSnapshotError(503, "LTA DataMall is not configured") from exc
    try:
        cached = get_cached_arrivals(
            client,
            store,
            code,
            ttl_seconds=settings.arrival_cache_ttl_seconds,
        )
    except LTARequestError as exc:
        raise LiveSnapshotError(503, "Live arrivals are unavailable. Data may be delayed.") from exc
    finally:
        client.close()
    return arrivals_payload(db, cached)
