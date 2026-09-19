from pydantic import BaseModel, Field


class NearbyStop(BaseModel):
    code: str
    name: str
    road_name: str | None = None
    latitude: float
    longitude: float
    distance_m: int = Field(description="Walking distance in metres")


class NearbyStopsResponse(BaseModel):
    lat: float
    lng: float
    radius: int
    stops: list[NearbyStop]


class StopDetail(BaseModel):
    code: str
    name: str
    road_name: str | None = None
    latitude: float
    longitude: float
    distance_m: int | None = None


class StopSearchResponse(BaseModel):
    query: str
    stops: list[StopDetail]


class Arrival(BaseModel):
    estimated_arrival: str | None = None
    minutes: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    load: str | None = None
    feature: str | None = None
    type: str | None = None
    origin_code: str | None = None
    destination_code: str | None = None
    destination_name: str | None = None
    bus_id: str | None = None


class ServiceArrivals(BaseModel):
    service_no: str
    operator: str
    arrivals: list[Arrival]


class StopArrivalsResponse(BaseModel):
    bus_stop_code: str
    cached_at: str
    stale: bool = False
    services: list[ServiceArrivals]
