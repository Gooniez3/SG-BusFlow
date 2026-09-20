from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from redis import Redis
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.redis import get_redis
from app.journey.graph import load_journey_graph
from app.journey.planner import StopInfo, live_wait, plan_journeys
from app.repositories.stops import find_nearby_stops, get_stop_by_code
from app.schemas.journeys import JourneyPlanResponse
from services.cache.keys import arrivals_key, arrivals_last_key
from services.cache.models import CachedStopArrivals
from services.cache.store import CacheStore

router = APIRouter(tags=["journeys"])

NEARBY_WALK_M = 600
NEARBY_LIMIT = 8


def _stop_info(stop, distance_m: int | None = None) -> tuple[StopInfo, int]:
    info = StopInfo(
        code=stop.code,
        name=stop.name,
        road_name=stop.road_name,
        lat=float(stop.latitude),
        lng=float(stop.longitude),
    )
    return info, int(distance_m or 0)


def _live_for_stops(redis: Redis, codes: list[str]) -> dict[str, dict]:
    store = CacheStore(redis)
    live: dict[str, dict] = {}
    for code in dict.fromkeys(codes):
        raw = store.get_text(arrivals_key(code)) or store.get_text(arrivals_last_key(code))
        if raw is None:
            continue
        cached = CachedStopArrivals.model_validate_json(raw)
        live[code] = cached.model_dump(mode="json")
    return live


def _attach_live(options: list[dict], redis: Redis) -> list[dict]:
    codes = [
        leg["from_stop"]["code"]
        for option in options
        for leg in option.get("legs") or []
        if leg.get("kind") == "bus" and leg.get("from_stop")
    ]
    live = _live_for_stops(redis, codes)
    for option in options:
        for leg in option.get("legs") or []:
            if leg.get("kind") != "bus" or not leg.get("from_stop"):
                continue
            minutes, stale = live_wait(live, leg["from_stop"]["code"], str(leg.get("service_no") or ""))
            if minutes is not None:
                leg["live_minutes"] = minutes
                option["live"] = True
            if stale:
                option["stale"] = True
    return options


@router.get("/journeys", response_model=JourneyPlanResponse)
@router.get("/journey", response_model=JourneyPlanResponse)
def plan_journey(
    from_lat: float = Query(..., ge=-90, le=90),
    from_lng: float = Query(..., ge=-180, le=180),
    to_lat: float = Query(..., ge=-90, le=90),
    to_lng: float = Query(..., ge=-180, le=180),
    from_stop: str | None = Query(default=None),
    to_stop: str | None = Query(default=None),
    from_label: str = Query(default="Current location"),
    to_label: str = Query(default="Destination"),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> JourneyPlanResponse:
    graph = load_journey_graph(db)
    if not graph.routes:
        return JourneyPlanResponse(
            from_label=from_label,
            to_label=to_label,
            from_lat=from_lat,
            from_lng=from_lng,
            to_lat=to_lat,
            to_lng=to_lng,
            network_ready=False,
            options=[],
        )

    if from_stop:
        origin = get_stop_by_code(db, from_stop)
        if origin is None:
            raise HTTPException(status_code=404, detail="Origin stop not found")
        origin_stops = [_stop_info(origin, 0)]
        from_lat, from_lng = float(origin.latitude), float(origin.longitude)
        from_label = origin.name
    else:
        origin_stops = [
            _stop_info(stop, round(distance_m))
            for stop, distance_m in find_nearby_stops(
                db, lat=from_lat, lng=from_lng, radius_m=NEARBY_WALK_M, limit=NEARBY_LIMIT
            )
        ]

    if to_stop:
        destination = get_stop_by_code(db, to_stop)
        if destination is None:
            raise HTTPException(status_code=404, detail="Destination stop not found")
        dest_stops = [_stop_info(destination, 0)]
        to_lat, to_lng = float(destination.latitude), float(destination.longitude)
        to_label = destination.name
    else:
        dest_stops = [
            _stop_info(stop, round(distance_m))
            for stop, distance_m in find_nearby_stops(
                db, lat=to_lat, lng=to_lng, radius_m=NEARBY_WALK_M, limit=NEARBY_LIMIT
            )
        ]

    if not origin_stops or not dest_stops:
        return JourneyPlanResponse(
            from_label=from_label,
            to_label=to_label,
            from_lat=from_lat,
            from_lng=from_lng,
            to_lat=to_lat,
            to_lng=to_lng,
            network_ready=True,
            options=[],
        )

    live = _live_for_stops(redis, [stop.code for stop, _ in origin_stops])
    options = plan_journeys(
        graph=graph,
        origin=(from_lat, from_lng),
        dest=(to_lat, to_lng),
        origin_stops=origin_stops,
        dest_stops=dest_stops,
        live=live,
        origin_label=from_label,
        dest_label=to_label,
    )
    options = _attach_live(options, redis)
    return JourneyPlanResponse(
        from_label=from_label,
        to_label=to_label,
        from_lat=from_lat,
        from_lng=from_lng,
        to_lat=to_lat,
        to_lng=to_lng,
        network_ready=True,
        options=options,
    )


