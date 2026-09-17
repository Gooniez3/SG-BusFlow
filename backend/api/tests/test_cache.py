from datetime import datetime, timezone

import httpx
import pytest
from fakeredis import FakeRedis

from services.cache.arrivals import cache_stop_arrivals, get_cached_arrivals
from services.cache.keys import STOPS_KEY, arrivals_key
from services.cache.models import CachedStopArrivals
from services.cache.static import cache_bus_stops
from services.cache.store import CacheStore
from services.cache.transform import transform_arrivals
from services.lta.bus_arrivals import get_bus_arrivals
from services.lta.client import LTAClient, LTARequestError
from services.lta.models import LTABusArrival


def _lta(handler: httpx.MockTransport) -> LTAClient:
    return LTAClient("test-key", client=httpx.Client(transport=handler))


def test_transform_arrivals_computes_minutes() -> None:
    payload = LTABusArrival.model_validate(
        {
            "BusStopCode": "22009",
            "Services": [
                {
                    "ServiceNo": "174",
                    "Operator": "SBST",
                    "NextBus": {
                        "EstimatedArrival": "2026-09-17T12:04:00+08:00",
                        "Latitude": "1.3404",
                        "Longitude": "103.7050",
                        "Load": "SEA",
                        "Feature": "WAB",
                        "Type": "SD",
                    },
                    "NextBus2": {"EstimatedArrival": ""},
                }
            ],
        }
    )
    now = datetime(2026, 9, 17, 4, 1, tzinfo=timezone.utc)
    cached = transform_arrivals(payload, now=now)

    assert cached.bus_stop_code == "22009"
    assert cached.services[0].service_no == "174"
    assert len(cached.services[0].arrivals) == 1
    assert cached.services[0].arrivals[0].minutes == 3
    assert cached.services[0].arrivals[0].load == "SEA"
    assert cached.services[0].arrivals[0].latitude == pytest.approx(1.3404)


def test_cache_stop_arrivals_writes_redis() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "BusStopCode": "22009",
                "Services": [
                    {
                        "ServiceNo": "174",
                        "Operator": "SBST",
                        "NextBus": {
                            "EstimatedArrival": "2026-09-17T12:04:00+08:00",
                            "Load": "SEA",
                        },
                    }
                ],
            },
        )

    redis = FakeRedis(decode_responses=True)
    store = CacheStore(redis)
    with _lta(httpx.MockTransport(handler)) as client:
        cached = cache_stop_arrivals(
            client,
            store,
            "22009",
            ttl_seconds=30,
            now=datetime(2026, 9, 17, 4, 1, tzinfo=timezone.utc),
        )

    raw = redis.get(arrivals_key("22009"))
    assert raw is not None
    assert cached.services[0].arrivals[0].minutes == 3
    loaded = CachedStopArrivals.model_validate_json(raw)
    assert loaded.bus_stop_code == "22009"


def test_get_cached_arrivals_does_not_call_lta_on_hit() -> None:
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        return httpx.Response(500)

    redis = FakeRedis(decode_responses=True)
    store = CacheStore(redis)
    existing = CachedStopArrivals(
        bus_stop_code="22009",
        cached_at=datetime(2026, 9, 17, 4, 1, tzinfo=timezone.utc),
        services=[],
    )
    store.set_json(arrivals_key("22009"), existing, 30)

    with _lta(httpx.MockTransport(handler)) as client:
        cached = get_cached_arrivals(client, store, "22009", ttl_seconds=30)

    assert calls["count"] == 0
    assert cached.bus_stop_code == "22009"


def test_lta_failure_keeps_stale_cache() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503)

    redis = FakeRedis(decode_responses=True)
    store = CacheStore(redis)
    existing = CachedStopArrivals(
        bus_stop_code="22009",
        cached_at=datetime(2026, 9, 17, 4, 1, tzinfo=timezone.utc),
        stale=False,
        services=[],
    )
    store.set_json(arrivals_key("22009"), existing, 30)

    with _lta(httpx.MockTransport(handler)) as client:
        cached = cache_stop_arrivals(client, store, "22009", ttl_seconds=30)

    assert cached.stale is True
    assert CachedStopArrivals.model_validate_json(
        redis.get(arrivals_key("22009"))
    ).stale is False


def test_lta_failure_without_cache_raises() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503)

    store = CacheStore(FakeRedis(decode_responses=True))
    with _lta(httpx.MockTransport(handler)) as client:
        with pytest.raises(LTARequestError):
            cache_stop_arrivals(client, store, "22009", ttl_seconds=30)


def test_cache_bus_stops_writes_static_payload() -> None:
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

    redis = FakeRedis(decode_responses=True)
    store = CacheStore(redis)
    with _lta(httpx.MockTransport(handler)) as client:
        count = cache_bus_stops(client, store, ttl_seconds=60)

    assert count == 1
    assert "Boon Lay Int" in redis.get(STOPS_KEY)


def test_get_bus_arrivals_still_used_by_worker_not_routes() -> None:
    assert get_bus_arrivals.__module__ == "services.lta.bus_arrivals"
