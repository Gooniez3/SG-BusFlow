from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from redis import Redis
from sqlalchemy.orm import Session

from app.core.codes import PREFER_PATTERN, STOP_CODE_PATTERN
from app.core.db import get_db
from app.core.redis import get_redis
from app.journey.service import JourneyPlanError, compose_journey
from app.schemas.journeys import JourneyPlanResponse

router = APIRouter(tags=["journeys"])


@router.get("/journeys", response_model=JourneyPlanResponse)
@router.get("/journey", response_model=JourneyPlanResponse)
def plan_journey(
    from_lat: float = Query(..., ge=-90, le=90),
    from_lng: float = Query(..., ge=-180, le=180),
    to_lat: float = Query(..., ge=-90, le=90),
    to_lng: float = Query(..., ge=-180, le=180),
    from_stop: str | None = Query(default=None, pattern=STOP_CODE_PATTERN),
    to_stop: str | None = Query(default=None, pattern=STOP_CODE_PATTERN),
    from_label: str = Query(default="Current location", max_length=80),
    to_label: str = Query(default="Destination", max_length=80),
    prefer: str = Query(default="fastest", pattern=PREFER_PATTERN),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> JourneyPlanResponse:
    try:
        payload = compose_journey(
            db,
            redis,
            from_lat=from_lat,
            from_lng=from_lng,
            to_lat=to_lat,
            to_lng=to_lng,
            from_stop=from_stop,
            to_stop=to_stop,
            from_label=from_label,
            to_label=to_label,
            prefer=prefer,
        )
    except JourneyPlanError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return JourneyPlanResponse.model_validate(payload)
