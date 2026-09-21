import time

from fastapi.testclient import TestClient
from redis.exceptions import RedisError

from app.core.limits import RateLimiter
from services.cache.store import CacheStore


def test_health_includes_security_and_request_id(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "test-req-1"})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "test-req-1"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_ready_and_metrics_endpoints(client: TestClient) -> None:
    ready = client.get("/health/ready")
    assert ready.status_code == 200
    body = ready.json()
    assert body["service"] == "sg-busflow-api"
    assert "database" in body["checks"]
    assert "redis" in body["checks"]
    metrics = client.get("/metrics")
    assert metrics.status_code == 200
    assert "http_requests" in metrics.json()


def test_invalid_stop_code_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/stops/not-a-valid-code")
    assert response.status_code == 422


def test_invalid_journey_prefer_is_rejected(client: TestClient) -> None:
    response = client.get(
        "/api/v1/journeys",
        params={
            "from_lat": 1.34,
            "from_lng": 103.7,
            "to_lat": 1.35,
            "to_lng": 103.8,
            "prefer": "magic",
        },
    )
    assert response.status_code == 422


def test_rate_limit_returns_429(client: TestClient) -> None:
    RateLimiter.testing_bypass = False
    client.app.state.limiter = RateLimiter(
        None,
        default_per_minute=3,
        assistant_per_minute=3,
        journey_per_minute=3,
    )
    params = {"q": "a"}
    seen = [client.get("/api/v1/stops/search", params=params).status_code for _ in range(3)]
    assert all(status in (200, 404) for status in seen)
    limited = client.get("/api/v1/stops/search", params=params)
    assert limited.status_code == 429
    assert limited.json()["detail"].startswith("Too many requests")


def test_redis_get_failure_returns_none() -> None:
    class BrokenRedis:
        def get(self, key: str) -> str:
            raise RedisError("down")

        def set(self, *args: object, **kwargs: object) -> None:
            raise RedisError("down")

    store = CacheStore(BrokenRedis())  # type: ignore[arg-type]
    assert store.get_text("sg-busflow:arrivals:22009") is None
    store.set_json("sg-busflow:arrivals:22009", {"ok": True}, 30)


def test_health_stays_fast_under_repeated_calls(client: TestClient) -> None:
    started = time.perf_counter()
    for _ in range(30):
        assert client.get("/health").status_code == 200
    assert time.perf_counter() - started < 3.0
