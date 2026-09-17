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
