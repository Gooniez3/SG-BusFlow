from __future__ import annotations

import json
from typing import Any

from redis import Redis

from services.cache.keys import (
    WATCH_COUNTS_KEY,
    WATCHED_STOPS_KEY,
    bus_channel,
    service_channel,
    stop_channel,
)
from services.cache.models import CachedStopArrivals


def make_bus_id(service_no: str, stop_code: str, index: int = 1) -> str:
    return f"{service_no.upper()}:{stop_code}:{index}"


def parse_bus_id(bus_id: str) -> tuple[str, str, int]:
    parts = [part.strip() for part in bus_id.split(":") if part.strip()]
    if len(parts) < 2:
        raise ValueError("bus_id must be {service}:{stop} or {service}:{stop}:{index}")
    index = int(parts[2]) if len(parts) > 2 else 1
    if index < 1:
        raise ValueError("bus index must be >= 1")
    return parts[0].upper(), parts[1], index


def attach_bus_ids(payload: dict[str, Any]) -> dict[str, Any]:
    stop_code = str(payload.get("bus_stop_code") or "")
    for service in payload.get("services") or []:
        service_no = str(service.get("service_no") or "")
        for index, arrival in enumerate(service.get("arrivals") or [], start=1):
            arrival["bus_id"] = make_bus_id(service_no, stop_code, index)
    return payload


def _envelope(kind: str, channel: str, identity: str, payload: dict[str, Any]) -> str:
    return json.dumps(
        {"type": kind, "channel": channel, "id": identity, "payload": payload},
        default=str,
    )


def publish_stop_arrivals(
    redis: Redis,
    cached: CachedStopArrivals,
    *,
    kind: str = "update",
) -> None:
    payload = attach_bus_ids(cached.model_dump(mode="json"))
    redis.publish(stop_channel(cached.bus_stop_code), _envelope(kind, "stop", cached.bus_stop_code, payload))
    for service in payload["services"]:
        service_no = service["service_no"]
        service_payload = {
            "service_no": service_no,
            "stop_code": cached.bus_stop_code,
            "cached_at": payload["cached_at"],
            "stale": payload["stale"],
            "operator": service.get("operator"),
            "arrivals": service.get("arrivals") or [],
        }
        redis.publish(
            service_channel(service_no),
            _envelope(kind, "service", service_no, service_payload),
        )
        arrivals = service_payload["arrivals"]
        if not arrivals:
            continue
        bus_id = make_bus_id(service_no, cached.bus_stop_code, 1)
        bus_payload = {
            **arrivals[0],
            "bus_id": bus_id,
            "service_no": service_no,
            "stop_code": cached.bus_stop_code,
            "cached_at": payload["cached_at"],
            "stale": payload["stale"],
        }
        redis.publish(bus_channel(bus_id), _envelope(kind, "bus", bus_id, bus_payload))


def add_watch(redis: Redis, stop_code: str) -> None:
    redis.hincrby(WATCH_COUNTS_KEY, stop_code, 1)
    redis.sadd(WATCHED_STOPS_KEY, stop_code)


def remove_watch(redis: Redis, stop_code: str) -> None:
    remaining = redis.hincrby(WATCH_COUNTS_KEY, stop_code, -1)
    if remaining <= 0:
        redis.hdel(WATCH_COUNTS_KEY, stop_code)
        redis.srem(WATCHED_STOPS_KEY, stop_code)


def watched_stops(redis: Redis) -> set[str]:
    values = redis.smembers(WATCHED_STOPS_KEY) or set()
    return {value if isinstance(value, str) else value.decode() for value in values}


def resolve_watch_codes(redis: Redis, configured: list[str]) -> list[str]:
    codes = {code.strip() for code in configured if code.strip()}
    codes.update(watched_stops(redis))
    return sorted(codes)
