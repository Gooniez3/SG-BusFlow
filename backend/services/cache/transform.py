from __future__ import annotations

from datetime import datetime, timezone

from services.cache.models import CachedArrival, CachedServiceArrivals, CachedStopArrivals
from services.lta.models import LTABusArrival, LTANextBus


def minutes_until(estimated_arrival: str | None, *, now: datetime) -> int | None:
    if not estimated_arrival:
        return None
    eta = datetime.fromisoformat(estimated_arrival)
    if eta.tzinfo is None:
        eta = eta.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    delta_seconds = (eta - now).total_seconds()
    if delta_seconds <= 0:
        return 0
    return round(delta_seconds / 60)


def _transform_next_bus(next_bus: LTANextBus | None, *, now: datetime) -> CachedArrival | None:
    if next_bus is None or next_bus.estimated_arrival is None:
        return None
    return CachedArrival(
        estimated_arrival=next_bus.estimated_arrival,
        minutes=minutes_until(next_bus.estimated_arrival, now=now),
        latitude=next_bus.latitude,
        longitude=next_bus.longitude,
        load=next_bus.load,
        feature=next_bus.feature,
        type=next_bus.type,
    )


def transform_arrivals(
    payload: LTABusArrival,
    *,
    now: datetime | None = None,
    stale: bool = False,
) -> CachedStopArrivals:
    current_time = now or datetime.now(timezone.utc)
    services: list[CachedServiceArrivals] = []
    for service in payload.services:
        arrivals = [
            item
            for item in (
                _transform_next_bus(service.next_bus, now=current_time),
                _transform_next_bus(service.next_bus_2, now=current_time),
                _transform_next_bus(service.next_bus_3, now=current_time),
            )
            if item is not None
        ]
        services.append(
            CachedServiceArrivals(
                service_no=service.service_no,
                operator=service.operator,
                arrivals=arrivals,
            )
        )
    return CachedStopArrivals(
        bus_stop_code=payload.bus_stop_code,
        cached_at=current_time,
        stale=stale,
        services=services,
    )
