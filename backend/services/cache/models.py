from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CachedArrival(BaseModel):
    model_config = ConfigDict(extra="ignore")

    estimated_arrival: str | None = None
    minutes: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    load: str | None = None
    feature: str | None = None
    type: str | None = None
    origin_code: str | None = None
    destination_code: str | None = None


class CachedServiceArrivals(BaseModel):
    model_config = ConfigDict(extra="ignore")

    service_no: str
    operator: str
    arrivals: list[CachedArrival] = Field(default_factory=list)


class CachedStopArrivals(BaseModel):
    model_config = ConfigDict(extra="ignore")

    bus_stop_code: str
    cached_at: datetime
    stale: bool = False
    services: list[CachedServiceArrivals] = Field(default_factory=list)
