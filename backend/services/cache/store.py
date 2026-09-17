from __future__ import annotations

import json
from typing import Any

from redis import Redis


class CacheStore:
    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    def set_json(self, key: str, value: Any, ttl_seconds: int) -> None:
        if hasattr(value, "model_dump_json"):
            payload = value.model_dump_json()
        elif isinstance(value, (dict, list)):
            payload = json.dumps(value)
        else:
            payload = value
        self._redis.set(key, payload, ex=ttl_seconds)

    def get_text(self, key: str) -> str | None:
        value = self._redis.get(key)
        if value is None:
            return None
        return value if isinstance(value, str) else value.decode()
