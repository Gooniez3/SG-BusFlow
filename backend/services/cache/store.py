from __future__ import annotations

import json
import logging
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

logger = logging.getLogger("sg-busflow.redis")


class CacheStore:
    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    @property
    def redis(self) -> Redis:
        return self._redis

    def set_json(self, key: str, value: Any, ttl_seconds: int) -> None:
        if hasattr(value, "model_dump_json"):
            payload = value.model_dump_json()
        elif isinstance(value, (dict, list)):
            payload = json.dumps(value)
        else:
            payload = value
        try:
            self._redis.set(key, payload, ex=ttl_seconds)
        except RedisError:
            logger.warning("redis set failed for %s", key)

    def get_text(self, key: str) -> str | None:
        try:
            value = self._redis.get(key)
        except RedisError:
            logger.warning("redis get failed for %s", key)
            return None
        if value is None:
            return None
        return value if isinstance(value, str) else value.decode()

    def get_texts(self, keys: list[str]) -> list[str | None]:
        if not keys:
            return []
        try:
            values = self._redis.mget(keys)
        except RedisError:
            logger.warning("redis mget failed for %s keys", len(keys))
            return [None] * len(keys)
        out: list[str | None] = []
        for value in values or []:
            if value is None:
                out.append(None)
            elif isinstance(value, str):
                out.append(value)
            else:
                out.append(value.decode())
        return out
