import httpx
import pytest

from services.lta.bus_arrivals import get_bus_arrivals
from services.lta.bus_stops import list_bus_stops
from services.lta.client import LTAClient, LTAConfigError, LTARequestError
from services.lta.routes import list_bus_routes, list_bus_services


def _client_for(handler: httpx.MockTransport | None = None, **kwargs: object) -> LTAClient:
    http_client = httpx.Client(transport=handler) if handler is not None else None
    kwargs.setdefault("retries", 0)
    return LTAClient("test-key", client=http_client, **kwargs)


def test_missing_account_key_raises_config_error() -> None:
    with pytest.raises(LTAConfigError):
        LTAClient("  ")


def test_client_sends_account_key_header() -> None:
    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["AccountKey"] = request.headers["AccountKey"]
        seen["path"] = request.url.path
        return httpx.Response(200, json={"value": []})

    with _client_for(httpx.MockTransport(handler)) as client:
        client.get("BusStops")

    assert seen["AccountKey"] == "test-key"
    assert seen["path"].endswith("/BusStops")


def test_get_paginated_walks_skip_until_short_page() -> None:
    skips: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        skip = request.url.params["$skip"]
        skips.append(skip)
        if skip == "0":
            return httpx.Response(
                200,
                json={"value": [{"BusStopCode": str(i)} for i in range(500)]},
            )
        return httpx.Response(200, json={"value": [{"BusStopCode": "500"}]})

    with _client_for(httpx.MockTransport(handler)) as client:
        records = client.get_paginated("BusStops")

    assert skips == ["0", "500"]
    assert len(records) == 501


def test_http_error_becomes_lta_request_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"message": "unavailable"})

    with _client_for(httpx.MockTransport(handler)) as client:
        with pytest.raises(LTARequestError) as exc_info:
            client.get("BusStops")

    assert exc_info.value.status_code == 503


def test_list_bus_stops_maps_payload() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "value": [
                    {
                        "BusStopCode": "22009",
                        "RoadName": "Jurong West Central 3",
                        "Description": "Boon Lay Int",
                        "Latitude": 1.3394,
                        "Longitude": 103.7055,
                    }
                ]
            },
        )

    with _client_for(httpx.MockTransport(handler)) as client:
        stops = list_bus_stops(client)

    assert len(stops) == 1
    assert stops[0].bus_stop_code == "22009"
    assert stops[0].description == "Boon Lay Int"


def test_list_bus_routes_and_services_use_dataset_paths() -> None:
    paths: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        paths.append(request.url.path)
        if request.url.path.endswith("/BusRoutes"):
            return httpx.Response(
                200,
                json={
                    "value": [
                        {
                            "ServiceNo": "174",
                            "Operator": "SBST",
                            "Direction": 1,
                            "StopSequence": 1,
                            "BusStopCode": "22009",
                            "Distance": 0.0,
                            "WD_FirstBus": "0530",
                            "WD_LastBus": "2330",
                        }
                    ]
                },
            )
        return httpx.Response(
            200,
            json={
                "value": [
                    {
                        "ServiceNo": "174",
                        "Operator": "SBST",
                        "Direction": 1,
                        "Category": "TRUNK",
                        "OriginCode": "22009",
                        "DestinationCode": "10009",
                        "LoopDesc": "",
                    }
                ]
            },
        )

    with _client_for(httpx.MockTransport(handler)) as client:
        routes = list_bus_routes(client)
        services = list_bus_services(client)

    assert any(path.endswith("/BusRoutes") for path in paths)
    assert any(path.endswith("/BusServices") for path in paths)
    assert routes[0].service_no == "174"
    assert services[0].origin_code == "22009"


def test_get_bus_arrivals_parses_next_bus() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/v3/BusArrival")
        assert request.url.params["BusStopCode"] == "22009"
        return httpx.Response(
            200,
            json={
                "BusStopCode": "22009",
                "Services": [
                    {
                        "ServiceNo": "174",
                        "Operator": "SBST",
                        "NextBus": {
                            "OriginCode": "22009",
                            "DestinationCode": "10009",
                            "EstimatedArrival": "2026-09-17T12:04:00+08:00",
                            "Latitude": "1.3404",
                            "Longitude": "103.7050",
                            "VisitNumber": "1",
                            "Load": "SEA",
                            "Feature": "WAB",
                            "Type": "SD",
                        },
                        "NextBus2": {
                            "OriginCode": "",
                            "DestinationCode": "",
                            "EstimatedArrival": "",
                            "Latitude": "",
                            "Longitude": "",
                            "VisitNumber": "",
                            "Load": "",
                            "Feature": "",
                            "Type": "",
                        },
                    }
                ],
            },
        )

    with _client_for(httpx.MockTransport(handler)) as client:
        arrival = get_bus_arrivals(client, "22009")

    assert arrival.bus_stop_code == "22009"
    assert arrival.services[0].next_bus is not None
    assert arrival.services[0].next_bus.latitude == pytest.approx(1.3404)
    assert arrival.services[0].next_bus_2 is not None
    assert arrival.services[0].next_bus_2.estimated_arrival is None


def test_retries_transient_lta_errors_then_succeeds() -> None:
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        if calls["count"] < 3:
            return httpx.Response(503)
        return httpx.Response(200, json={"value": []})

    with _client_for(httpx.MockTransport(handler), retries=2, retry_backoff_seconds=0) as client:
        payload = client.get("BusStops")

    assert calls["count"] == 3
    assert payload == {"value": []}

