from datetime import datetime, timezone

from fakeredis import FakeRedis

from services.cache.keys import bus_channel, service_channel, stop_channel
from services.cache.live import (
    add_watch,
    attach_bus_ids,
    make_bus_id,
    parse_bus_id,
    publish_stop_arrivals,
    remove_watch,
    resolve_watch_codes,
    watched_stops,
)
from services.cache.models import CachedArrival, CachedServiceArrivals, CachedStopArrivals


def _cached() -> CachedStopArrivals:
    return CachedStopArrivals(
        bus_stop_code="22009",
        cached_at=datetime(2026, 9, 17, 4, 1, tzinfo=timezone.utc),
        stale=False,
        services=[
            CachedServiceArrivals(
                service_no="174",
                operator="SBST",
                arrivals=[
                    CachedArrival(
                        estimated_arrival="2026-09-17T12:04:00+08:00",
                        minutes=3,
                        latitude=1.3404,
                        longitude=103.705,
                    )
                ],
            )
        ],
    )


def test_bus_id_round_trip() -> None:
    assert make_bus_id("174", "22009") == "174:22009:1"
    assert parse_bus_id("174:22009") == ("174", "22009", 1)
    assert parse_bus_id("174:22009:2") == ("174", "22009", 2)


def test_publish_stop_arrivals_fans_out_channels() -> None:
    redis = FakeRedis(decode_responses=True)
    pubsub = redis.pubsub()
    pubsub.psubscribe("sg-busflow:ws:*")
    pubsub.get_message(timeout=0.05)

    publish_stop_arrivals(redis, _cached())

    channels: set[str] = set()
    for _ in range(10):
        message = pubsub.get_message(timeout=0.05)
        if message is None:
            break
        if message.get("type") == "pmessage":
            channels.add(message["channel"])

    assert stop_channel("22009") in channels
    assert service_channel("174") in channels
    assert bus_channel("174:22009:1") in channels


def test_watch_refcount_and_worker_merge() -> None:
    redis = FakeRedis(decode_responses=True)
    add_watch(redis, "52339")
    add_watch(redis, "52339")
    assert watched_stops(redis) == {"52339"}
    remove_watch(redis, "52339")
    assert watched_stops(redis) == {"52339"}
    remove_watch(redis, "52339")
    assert watched_stops(redis) == set()
    add_watch(redis, "52339")
    assert resolve_watch_codes(redis, ["22009"]) == ["22009", "52339"]


def test_attach_bus_ids() -> None:
    payload = attach_bus_ids(_cached().model_dump(mode="json"))
    assert payload["services"][0]["arrivals"][0]["bus_id"] == "174:22009:1"
