from __future__ import annotations

import asyncio
import logging
from collections import defaultdict

from fastapi import WebSocket
from redis.asyncio import Redis

from services.cache.keys import (
    WATCH_COUNTS_KEY,
    WATCHED_STOPS_KEY,
    live_pattern,
)

logger = logging.getLogger("sg-busflow.ws")


class ConnectionHub:
    def __init__(self, redis_url: str) -> None:
        self._redis_url = redis_url
        self._channels: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()
        self._redis: Redis | None = None
        self._listener: asyncio.Task[None] | None = None

    async def start(self) -> None:
        try:
            self._redis = Redis.from_url(self._redis_url, decode_responses=True)
            await self._redis.ping()
            self._listener = asyncio.create_task(self._listen())
            logger.info("websocket hub subscribed to Redis live channels")
        except Exception:
            logger.exception("websocket hub could not subscribe to Redis")
            self._redis = None

    async def stop(self) -> None:
        if self._listener:
            self._listener.cancel()
            try:
                await self._listener
            except asyncio.CancelledError:
                pass
            self._listener = None
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    async def subscribe(self, channel: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._channels[channel].add(websocket)

    async def unsubscribe(self, channel: str, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._channels.get(channel)
            if not sockets:
                return
            sockets.discard(websocket)
            if not sockets:
                self._channels.pop(channel, None)

    async def watch_stop(self, stop_code: str) -> None:
        if self._redis is None:
            return
        await self._redis.hincrby(WATCH_COUNTS_KEY, stop_code, 1)
        await self._redis.sadd(WATCHED_STOPS_KEY, stop_code)

    async def unwatch_stop(self, stop_code: str) -> None:
        if self._redis is None:
            return
        remaining = await self._redis.hincrby(WATCH_COUNTS_KEY, stop_code, -1)
        if remaining <= 0:
            await self._redis.hdel(WATCH_COUNTS_KEY, stop_code)
            await self._redis.srem(WATCHED_STOPS_KEY, stop_code)

    async def _listen(self) -> None:
        assert self._redis is not None
        pubsub = self._redis.pubsub()
        await pubsub.psubscribe(live_pattern())
        try:
            async for message in pubsub.listen():
                if message.get("type") != "pmessage":
                    continue
                channel = message.get("channel")
                data = message.get("data")
                if not isinstance(channel, str) or not isinstance(data, str):
                    continue
                await self._broadcast(channel, data)
        finally:
            await pubsub.aclose()

    async def _broadcast(self, channel: str, data: str) -> None:
        async with self._lock:
            sockets = list(self._channels.get(channel, ()))
        for websocket in sockets:
            try:
                await websocket.send_text(data)
            except Exception:
                await self.unsubscribe(channel, websocket)
