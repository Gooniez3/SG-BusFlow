import asyncio

from fakeredis import FakeRedis

from app.ws.hub import ConnectionHub
from services.cache.keys import WATCH_COUNTS_KEY, WATCHED_STOPS_KEY


class AsyncFakeRedis:
    def __init__(self) -> None:
        self.inner = FakeRedis(decode_responses=True)

    async def ping(self) -> bool:
        return True

    async def delete(self, *keys: str) -> int:
        return self.inner.delete(*keys)

    async def hset(self, key: str, field: str, value: object) -> int:
        return self.inner.hset(key, field, value)

    async def hdel(self, key: str, field: str) -> int:
        return self.inner.hdel(key, field)

    async def sadd(self, key: str, value: str) -> int:
        return self.inner.sadd(key, value)

    async def srem(self, key: str, value: str) -> int:
        return self.inner.srem(key, value)

    async def aclose(self) -> None:
        return None


def test_multiple_watchers_keep_stop_until_last_unwatch() -> None:
    async def run() -> None:
        hub = ConnectionHub("redis://unused")
        redis = AsyncFakeRedis()
        hub._redis = redis  # type: ignore[assignment]
        await hub.watch_stop("52339")
        await hub.watch_stop("52339")
        assert redis.inner.smembers(WATCHED_STOPS_KEY) == {"52339"}
        assert redis.inner.hget(WATCH_COUNTS_KEY, "52339") == "2"
        await hub.unwatch_stop("52339")
        assert redis.inner.smembers(WATCHED_STOPS_KEY) == {"52339"}
        await hub.unwatch_stop("52339")
        assert redis.inner.smembers(WATCHED_STOPS_KEY) == set()
        assert redis.inner.hget(WATCH_COUNTS_KEY, "52339") is None

    asyncio.run(run())


def test_reset_watch_state_clears_leaked_redis_keys() -> None:
    async def run() -> None:
        hub = ConnectionHub("redis://unused")
        redis = AsyncFakeRedis()
        hub._redis = redis  # type: ignore[assignment]
        redis.inner.sadd(WATCHED_STOPS_KEY, "22009")
        redis.inner.hset(WATCH_COUNTS_KEY, "22009", 4)
        await hub.reset_watch_state()
        assert redis.inner.smembers(WATCHED_STOPS_KEY) == set()
        assert redis.inner.hgetall(WATCH_COUNTS_KEY) == {}

    asyncio.run(run())


def test_extra_unwatch_does_not_go_negative() -> None:
    async def run() -> None:
        hub = ConnectionHub("redis://unused")
        redis = AsyncFakeRedis()
        hub._redis = redis  # type: ignore[assignment]
        await hub.unwatch_stop("52339")
        await hub.watch_stop("52339")
        await hub.unwatch_stop("52339")
        await hub.unwatch_stop("52339")
        assert redis.inner.smembers(WATCHED_STOPS_KEY) == set()

    asyncio.run(run())
