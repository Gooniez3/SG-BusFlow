from __future__ import annotations

import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.journey.planner import JourneyGraph, StopInfo, build_graph
from app.models.bus_route import BusRoute
from app.models.bus_route_stop import BusRouteStop
from app.models.bus_service import BusService
from app.models.bus_stop import BusStop

_CACHE: tuple[float, JourneyGraph] | None = None
_CACHE_TTL_SECONDS = 600


def clear_graph_cache() -> None:
    global _CACHE
    _CACHE = None


def load_journey_graph(db: Session, *, ttl_seconds: int = _CACHE_TTL_SECONDS) -> JourneyGraph:
    global _CACHE
    now = time.monotonic()
    if _CACHE is not None and now - _CACHE[0] < ttl_seconds:
        return _CACHE[1]
    stmt = (
        select(
            BusService.service_no,
            BusRoute.direction,
            BusRouteStop.stop_sequence,
            BusRouteStop.distance_km,
            BusStop.code,
            BusStop.name,
            BusStop.road_name,
            BusStop.latitude,
            BusStop.longitude,
        )
        .join(BusRoute, BusRoute.service_id == BusService.id)
        .join(BusRouteStop, BusRouteStop.route_id == BusRoute.id)
        .join(BusStop, BusStop.id == BusRouteStop.stop_id)
        .order_by(BusService.service_no, BusRoute.direction, BusRouteStop.stop_sequence)
    )
    rows = []
    for (
        service_no,
        direction,
        sequence,
        distance_km,
        code,
        name,
        road_name,
        latitude,
        longitude,
    ) in db.execute(stmt):
        rows.append(
            (
                str(service_no),
                int(direction),
                int(sequence),
                float(distance_km) if distance_km is not None else None,
                StopInfo(
                    code=str(code),
                    name=str(name),
                    road_name=str(road_name) if road_name else None,
                    lat=float(latitude),
                    lng=float(longitude),
                ),
            )
        )
    graph = build_graph(rows)
    if graph.routes:
        _CACHE = (now, graph)
    else:
        _CACHE = None
    return graph
