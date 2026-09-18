from fastapi import APIRouter, Depends, HTTPException, Query
from redis import Redis
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.lta import create_lta_client
from app.core.redis import get_redis
from app.models.bus_stop import BusStop
from app.repositories.stops import (
    distance_to_stop,
    find_nearby_stops,
    get_stop_by_code,
    get_stops_by_codes,
    search_stops,
)
from app.schemas.stops import (
    NearbyStop,
    NearbyStopsResponse,
    StopArrivalsResponse,
    StopDetail,
    StopSearchResponse,
)
from services.cache.arrivals import get_cached_arrivals
from services.cache.store import CacheStore
from services.lta.client import LTAConfigError, LTARequestError

router = APIRouter(prefix="/stops", tags=["stops"])


def _stop_detail(stop: BusStop, distance_m: int | None = None) -> StopDetail:
    return StopDetail(
        code=stop.code,
        name=stop.name,
        road_name=stop.road_name,
        latitude=float(stop.latitude),
        longitude=float(stop.longitude),
        distance_m=distance_m,
    )


@router.get("/nearby", response_model=NearbyStopsResponse)
def nearby_stops(
    lat: float = Query(..., ge=-90, le=90, examples=[1.3404]),
    lng: float = Query(..., ge=-180, le=180, examples=[103.7050]),
    radius: int = Query(1000, ge=1, le=5000, description="Search radius in metres"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> NearbyStopsResponse:
    nearby = find_nearby_stops(db, lat=lat, lng=lng, radius_m=radius, limit=limit)
    return NearbyStopsResponse(
        lat=lat,
        lng=lng,
        radius=radius,
        stops=[
            NearbyStop(
                code=stop.code,
                name=stop.name,
                road_name=stop.road_name,
                latitude=float(stop.latitude),
                longitude=float(stop.longitude),
                distance_m=round(distance_m),
            )
            for stop, distance_m in nearby
        ],
    )


@router.get("/search", response_model=StopSearchResponse)
def search_bus_stops(
    q: str = Query(..., min_length=1, max_length=80),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> StopSearchResponse:
    return StopSearchResponse(
        query=q,
        stops=[_stop_detail(stop) for stop in search_stops(db, q, limit=limit)],
    )


@router.get("/{code}", response_model=StopDetail)
def get_stop(
    code: str,
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    db: Session = Depends(get_db),
) -> StopDetail:
    stop = get_stop_by_code(db, code)
    if stop is None:
        raise HTTPException(status_code=404, detail="Bus stop not found")
    distance_m = None
    if lat is not None and lng is not None:
        distance_m = round(distance_to_stop(db, stop, lat=lat, lng=lng))
    return _stop_detail(stop, distance_m)


@router.get("/{code}/arrivals", response_model=StopArrivalsResponse)
def get_stop_arrivals(
    code: str,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> StopArrivalsResponse:
    if get_stop_by_code(db, code) is None:
        raise HTTPException(status_code=404, detail="Bus stop not found")
    settings = get_settings()
    store = CacheStore(redis)
    try:
        client = create_lta_client()
    except LTAConfigError as exc:
        raise HTTPException(status_code=503, detail="LTA DataMall is not configured") from exc
    try:
        cached = get_cached_arrivals(
            client,
            store,
            code,
            ttl_seconds=settings.arrival_cache_ttl_seconds,
        )
    except LTARequestError as exc:
        raise HTTPException(
            status_code=503,
            detail="Live arrivals are unavailable. Data may be delayed.",
        ) from exc
    finally:
        client.close()
    payload = cached.model_dump(mode="json")
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
    return StopArrivalsResponse.model_validate(
        {
            **payload,
            "cached_at": cached.cached_at.isoformat(),
        }
    )
