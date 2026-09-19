from fastapi import APIRouter, Depends, HTTPException, Query
from redis import Redis
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.redis import get_redis
from app.live.snapshot import LiveSnapshotError, load_stop_snapshot
from app.models.bus_stop import BusStop
from app.repositories.stops import (
    distance_to_stop,
    find_nearby_stops,
    get_stop_by_code,
    search_stops,
)
from app.schemas.stops import (
    NearbyStop,
    NearbyStopsResponse,
    StopArrivalsResponse,
    StopDetail,
    StopSearchResponse,
)

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
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> StopSearchResponse:
    return StopSearchResponse(
        query=q,
        stops=[
            _stop_detail(stop, round(distance_m) if distance_m is not None else None)
            for stop, distance_m in search_stops(db, q, lat=lat, lng=lng, limit=limit)
        ],
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
    try:
        payload = load_stop_snapshot(db, redis, code)
    except LiveSnapshotError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return StopArrivalsResponse.model_validate(payload)
