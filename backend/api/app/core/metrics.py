from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock


@dataclass
class Metrics:
    http_requests: int = 0
    http_errors: int = 0
    rate_limited: int = 0
    ws_rejected: int = 0
    redis_errors: int = 0
    lta_errors: int = 0
    _lock: Lock = field(default_factory=Lock, repr=False)

    def bump(self, name: str, amount: int = 1) -> None:
        with self._lock:
            setattr(self, name, getattr(self, name) + amount)

    def snapshot(self) -> dict[str, int]:
        with self._lock:
            return {
                "http_requests": self.http_requests,
                "http_errors": self.http_errors,
                "rate_limited": self.rate_limited,
                "ws_rejected": self.ws_rejected,
                "redis_errors": self.redis_errors,
                "lta_errors": self.lta_errors,
            }


metrics = Metrics()
