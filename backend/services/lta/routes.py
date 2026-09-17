from services.lta.client import LTAClient
from services.lta.models import LTABusRoute, LTABusService


def list_bus_routes(client: LTAClient) -> list[LTABusRoute]:
    return [LTABusRoute.model_validate(item) for item in client.get_paginated("BusRoutes")]


def list_bus_services(client: LTAClient) -> list[LTABusService]:
    return [
        LTABusService.model_validate(item) for item in client.get_paginated("BusServices")
    ]
