from __future__ import annotations

import asyncio
import logging
from collections import defaultdict

from fastapi import WebSocket
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.metrics import metrics
from services.cache.keys import (
    WATCH_COUNTS_KEY,
    WATCHED_STOPS_KEY,
    live_pattern,
)

logger = logging.getLogger("sg-busflow.ws")


class HubLimitError(Exception):
    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class ConnectionHub:
    def __init__(
        self,
        redis_url: str,
        *,
        max_connections: int = 200,
        max_per_ip: int = 8,
    ) -> None:
        self._redis_url = redis_url
        self._max_connections = max_connections
        self._max_per_ip = max_per_ip
        self._channels: dict[str, set[WebSocket]] = defaultdict(set)
        self._sockets: set[WebSocket] = set()
        self._by_ip: dict[str, int] = defaultdict(int)
        self._local_watches: dict[str, int] = {}
        self._lock = asyncio.Lock()
        self._redis: Redis | None = None
        self._listener: asyncio.Task[None] | None = None

    @staticmethod
    def _ip(websocket: WebSocket) -> str:
        if websocket.client and websocket.client.host:
            return websocket.client.host
        return "unknown"

    async def start(self) -> None:
        try:
            self._redis = Redis.from_url(self._redis_url, decode_responses=True)
            await self._redis.ping()
            await self.reset_watch_state()
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
            await self.reset_watch_state()
            await self._redis.aclose()
            self._redis = None

    async def admit(self, websocket: WebSocket) -> None:
        ip = self._ip(websocket)
        async with self._lock:
            if len(self._sockets) >= self._max_connections:
                metrics.bump("ws_rejected")
                raise HubLimitError("Too many live connections")
            if self._by_ip[ip] >= self._max_per_ip:
                metrics.bump("ws_rejected")
                raise HubLimitError("Too many live connections from this network")
            self._sockets.add(websocket)
            self._by_ip[ip] += 1

    async def release(self, websocket: WebSocket) -> None:
        ip = self._ip(websocket)
        async with self._lock:
            self._sockets.discard(websocket)
            remaining = self._by_ip.get(ip, 0) - 1
            if remaining <= 0:
                self._by_ip.pop(ip, None)
            else:
                self._by_ip[ip] = remaining

    async def reset_watch_state(self) -> None:
        async with self._lock:
            self._local_watches.clear()
        if self._redis is None:
            return
        try:
            await self._redis.delete(WATCH_COUNTS_KEY, WATCHED_STOPS_KEY)
        except RedisError:
            logger.warning("could not reset websocket watch keys")

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
        async with self._lock:
            count = self._local_watches.get(stop_code, 0) + 1
            self._local_watches[stop_code] = count
        if self._redis is None:
            return
        try:
            await self._redis.hset(WATCH_COUNTS_KEY, stop_code, count)
            await self._redis.sadd(WATCHED_STOPS_KEY, stop_code)
        except RedisError:
            logger.warning("could not record watch for %s", stop_code)

    async def unwatch_stop(self, stop_code: str) -> None:
        async with self._lock:
            remaining = self._local_watches.get(stop_code, 0) - 1
            if remaining <= 0:
                self._local_watches.pop(stop_code, None)
                remaining = 0
            else:
                self._local_watches[stop_code] = remaining
        if self._redis is None:
            return
        try:
            if remaining <= 0:
                await self._redis.hdel(WATCH_COUNTS_KEY, stop_code)
                await self._redis.srem(WATCHED_STOPS_KEY, stop_code)
                return
            await self._redis.hset(WATCH_COUNTS_KEY, stop_code, remaining)
        except RedisError:
            logger.warning("could not clear watch for %s", stop_code)

    async def _listen(self) -> None:
        while True:
            try:
                if self._redis is None:
                    self._redis = Redis.from_url(self._redis_url, decode_responses=True)
                    await self._redis.ping()
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
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("websocket redis listener dropped; retrying")
                self._redis = None
                await asyncio.sleep(2)

    async def _broadcast(self, channel: str, data: str) -> None:
        async with self._lock:
            sockets = list(self._channels.get(channel, ()))
        dead: list[WebSocket] = []
        for websocket in sockets:
            try:
                await websocket.send_text(data)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            await self.unsubscribe(channel, websocket)
            await self.release(websocket)
