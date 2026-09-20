from pydantic import BaseModel, Field


class JourneyStop(BaseModel):
    code: str
    name: str
    road_name: str | None = None
    latitude: float
    longitude: float


class JourneyLeg(BaseModel):
    kind: str
    duration_min: int
    distance_m: int | None = None
    from_label: str | None = None
    to_label: str | None = None
    to_stop: JourneyStop | None = None
    service_no: str | None = None
    wait_min: int | None = None
    live_minutes: int | None = None
    stop_count: int | None = None
    from_stop: JourneyStop | None = None
    via_stops: list[JourneyStop] = Field(default_factory=list)


class JourneyOption(BaseModel):
    id: str
    duration_min: int
    walk_min: int
    wait_min: int
    transfers: int
    live: bool = False
    stale: bool = False
    legs: list[JourneyLeg]


class JourneyPlanResponse(BaseModel):
    from_label: str
    to_label: str
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float
    network_ready: bool
    options: list[JourneyOption] = Field(default_factory=list)
