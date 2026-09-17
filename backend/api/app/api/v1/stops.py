from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories.stops import find_nearby_stops
from app.schemas.stops import NearbyStop, NearbyStopsResponse

router = APIRouter(prefix="/stops", tags=["stops"])


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
