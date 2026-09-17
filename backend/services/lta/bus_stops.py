from services.lta.client import LTAClient
from services.lta.models import LTABusStop


def list_bus_stops(client: LTAClient) -> list[LTABusStop]:
    return [LTABusStop.model_validate(item) for item in client.get_paginated("BusStops")]
