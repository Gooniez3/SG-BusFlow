from services.lta.client import LTAClient
from services.lta.models import LTABusArrival


def get_bus_arrivals(
    client: LTAClient,
    bus_stop_code: str,
    service_no: str | None = None,
) -> LTABusArrival:
    params: dict[str, str | int] = {"BusStopCode": bus_stop_code}
    if service_no:
        params["ServiceNo"] = service_no
    payload = client.get("BusArrivalv2", params=params)
    return LTABusArrival.model_validate(payload)
