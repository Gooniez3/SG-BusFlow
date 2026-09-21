from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from redis import Redis
from redis.exceptions import RedisError

from app.core.config import Settings
from app.core.metrics import metrics


class RateLimiter:
    testing_bypass = False

    def __init__(
        self,
        redis: Redis | None,
        *,
        default_per_minute: int,
        assistant_per_minute: int,
        journey_per_minute: int,
        window_seconds: int = 60,
    ) -> None:
        self._redis = redis
        self._default = default_per_minute
        self._assistant = assistant_per_minute
        self._journey = journey_per_minute
        self._window = window_seconds
        self._memory: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    @classmethod
    def from_settings(cls, settings: Settings, redis: Redis | None) -> RateLimiter:
        return cls(
            redis,
            default_per_minute=settings.rate_limit_per_minute,
            assistant_per_minute=settings.rate_limit_assistant_per_minute,
            journey_per_minute=settings.rate_limit_journey_per_minute,
        )

    def bucket_for(self, method: str, path: str) -> tuple[str, int]:
        if path.startswith("/api/v1/assistant/chat") and method == "POST":
            return "assistant", self._assistant
        if path.startswith("/api/v1/journey") and method == "GET":
            return "journey", self._journey
        return "http", self._default

    def allow(self, ip: str, method: str, path: str) -> tuple[bool, int, int]:
        if RateLimiter.testing_bypass:
            return True, self._default, self._default
        bucket, limit = self.bucket_for(method, path)
        if limit <= 0:
            return True, 0, limit
        key = f"sg-busflow:rl:{bucket}:{ip}"
        count = self._hit(key)
        remaining = max(0, limit - count)
        allowed = count <= limit
        if not allowed:
            metrics.bump("rate_limited")
        return allowed, remaining, limit

    def _hit(self, key: str) -> int:
        if self._redis is not None:
            try:
                count = int(self._redis.incr(key))
                if count == 1:
                    self._redis.expire(key, self._window)
                return count
            except RedisError:
                metrics.bump("redis_errors")
        now = time.monotonic()
        cutoff = now - self._window
        with self._lock:
            stamps = [stamp for stamp in self._memory[key] if stamp > cutoff]
            stamps.append(now)
            self._memory[key] = stamps
            return len(stamps)
