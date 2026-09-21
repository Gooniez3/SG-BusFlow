from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from redis import Redis
from redis.exceptions import RedisError

from app.core.codes import SERVICE_NO_PATTERN
from app.core.redis import get_redis
from services.cache.keys import SERVICES_KEY

router = APIRouter(prefix="/services", tags=["services"])


class ServiceDirection(BaseModel):
    service_no: str
    operator: str
    direction: int
    category: str | None = None
    origin_code: str | None = None
    destination_code: str | None = None
    loop_desc: str | None = None


class ServiceDetailResponse(BaseModel):
    service_no: str
    directions: list[ServiceDirection]


class ServiceSearchItem(BaseModel):
    service_no: str
    operator: str | None = None
    origin_code: str | None = None
    destination_code: str | None = None


class ServiceSearchResponse(BaseModel):
    query: str
    services: list[ServiceSearchItem]


def _load_services(redis: Redis) -> list[dict]:
    try:
        raw = redis.get(SERVICES_KEY)
    except RedisError as exc:
        raise HTTPException(status_code=503, detail="Live cache is unavailable") from exc
    if raw is None:
        raise HTTPException(status_code=404, detail="Service data is not cached yet")
    payload = json.loads(raw)
    if not isinstance(payload, list):
        raise HTTPException(status_code=404, detail="Service data is not cached yet")
    return payload


@router.get("/search", response_model=ServiceSearchResponse)
def search_services(
    q: str = Query(..., min_length=1, max_length=80),
    limit: int = Query(20, ge=1, le=50),
    redis: Redis = Depends(get_redis),
) -> ServiceSearchResponse:
    needle = q.strip().upper()
    seen: dict[str, ServiceSearchItem] = {}
    for item in _load_services(redis):
        service_no = str(item.get("service_no", "")).upper()
        if needle not in service_no or service_no in seen:
            continue
        seen[service_no] = ServiceSearchItem(
            service_no=service_no,
            operator=item.get("operator"),
            origin_code=item.get("origin_code"),
            destination_code=item.get("destination_code"),
        )
        if len(seen) >= limit:
            break
    return ServiceSearchResponse(query=q, services=list(seen.values()))


@router.get("/{service_no}", response_model=ServiceDetailResponse)
def get_service(
    service_no: str = Path(..., pattern=SERVICE_NO_PATTERN),
    redis: Redis = Depends(get_redis),
) -> ServiceDetailResponse:
    matches = [
        item
        for item in _load_services(redis)
        if str(item.get("service_no", "")).upper() == service_no.upper()
    ]
    if not matches:
        raise HTTPException(status_code=404, detail="Bus service not found")
    return ServiceDetailResponse(
        service_no=service_no.upper(),
        directions=[ServiceDirection.model_validate(item) for item in matches],
    )
