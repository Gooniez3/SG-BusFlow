from __future__ import annotations

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


def _blank_to_none(value: object) -> object:
    if value == "":
        return None
    return value


class LTABusStop(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    bus_stop_code: str = Field(alias="BusStopCode")
    road_name: str = Field(alias="RoadName")
    description: str = Field(alias="Description")
    latitude: float = Field(alias="Latitude")
    longitude: float = Field(alias="Longitude")


class LTABusService(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    service_no: str = Field(alias="ServiceNo")
    operator: str = Field(alias="Operator")
    direction: int = Field(alias="Direction")
    category: str | None = Field(default=None, alias="Category")
    origin_code: str | None = Field(default=None, alias="OriginCode")
    destination_code: str | None = Field(default=None, alias="DestinationCode")
    loop_desc: str | None = Field(default=None, alias="LoopDesc")


class LTABusRoute(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    service_no: str = Field(alias="ServiceNo")
    operator: str = Field(alias="Operator")
    direction: int = Field(alias="Direction")
    stop_sequence: int = Field(alias="StopSequence")
    bus_stop_code: str = Field(alias="BusStopCode")
    distance: float | None = Field(default=None, alias="Distance")
    weekday_first_bus: str | None = Field(default=None, alias="WD_FirstBus")
    weekday_last_bus: str | None = Field(default=None, alias="WD_LastBus")


class LTANextBus(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    origin_code: str | None = Field(default=None, alias="OriginCode")
    destination_code: str | None = Field(default=None, alias="DestinationCode")
    estimated_arrival: str | None = Field(default=None, alias="EstimatedArrival")
    latitude: float | None = Field(default=None, alias="Latitude")
    longitude: float | None = Field(default=None, alias="Longitude")
    visit_number: str | None = Field(default=None, alias="VisitNumber")
    load: str | None = Field(default=None, alias="Load")
    feature: str | None = Field(default=None, alias="Feature")
    type: str | None = Field(default=None, alias="Type")

    @field_validator(
        "origin_code",
        "destination_code",
        "estimated_arrival",
        "visit_number",
        "load",
        "feature",
        "type",
        mode="before",
    )
    @classmethod
    def blank_strings_to_none(cls, value: object) -> object:
        return _blank_to_none(value)

    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def parse_coordinate(cls, value: object) -> object:
        value = _blank_to_none(value)
        if value is None:
            return None
        return float(value)


class LTAArrivalService(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    service_no: str = Field(alias="ServiceNo")
    operator: str = Field(alias="Operator")
    next_bus: LTANextBus | None = Field(default=None, alias="NextBus")
    next_bus_2: LTANextBus | None = Field(default=None, alias="NextBus2")
    next_bus_3: LTANextBus | None = Field(default=None, alias="NextBus3")


class LTABusArrival(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    bus_stop_code: str = Field(
        validation_alias=AliasChoices("BusStopCode", "BusStopID")
    )
    services: list[LTAArrivalService] = Field(default_factory=list, alias="Services")
