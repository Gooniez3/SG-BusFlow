from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.db import SessionLocal
from app.core.redis import get_redis
from app.live.snapshot import LiveSnapshotError, load_stop_snapshot
from app.ws.hub import ConnectionHub
from services.cache.keys import bus_channel, service_channel, stop_channel
from services.cache.live import make_bus_id, parse_bus_id

logger = logging.getLogger("sg-busflow.ws")
router = APIRouter()
IDLE_SECONDS = 90


def _hub(websocket: WebSocket) -> ConnectionHub:
    return websocket.app.state.hub


async def _snapshot(code: str) -> dict:
    def load() -> dict:
        db = SessionLocal()
        try:
            return load_stop_snapshot(db, get_redis(), code)
        finally:
            db.close()

    return await asyncio.to_thread(load)


async def _pump(websocket: WebSocket) -> None:
    while True:
        try:
            message = await asyncio.wait_for(websocket.receive_text(), timeout=IDLE_SECONDS)
        except TimeoutError:
            await websocket.close(code=1001)
            return
        if message == "ping":
            await websocket.send_text("pong")


async def _send_snapshot_or_live_error(websocket: WebSocket, code: str) -> dict | None:
    try:
        return await _snapshot(code)
    except LiveSnapshotError as exc:
        await websocket.send_json({"type": "error", "detail": exc.detail})
        if exc.status_code == 404:
            await websocket.close(code=1008)
            return None
        return {}


@router.websocket("/ws/v1/stops/{stop_id}")
async def stop_socket(websocket: WebSocket, stop_id: str) -> None:
    code = stop_id.strip()
    await websocket.accept()
    hub = _hub(websocket)
    channel = stop_channel(code)
    await hub.watch_stop(code)
    await hub.subscribe(channel, websocket)
    try:
        payload = await _send_snapshot_or_live_error(websocket, code)
        if payload is None:
            return
        if payload:
            await websocket.send_json(
                {"type": "snapshot", "channel": "stop", "id": code, "payload": payload}
            )
        await _pump(websocket)
    except WebSocketDisconnect:
        pass
    finally:
        await hub.unsubscribe(channel, websocket)
        await hub.unwatch_stop(code)


@router.websocket("/ws/v1/services/{service_number}")
async def service_socket(websocket: WebSocket, service_number: str, stop: str | None = None) -> None:
    service_no = service_number.strip().upper()
    stop_code = stop.strip() if stop else None
    await websocket.accept()
    hub = _hub(websocket)
    channel = service_channel(service_no)
    if stop_code:
        await hub.watch_stop(stop_code)
    await hub.subscribe(channel, websocket)
    try:
        if stop_code:
            payload = await _send_snapshot_or_live_error(websocket, stop_code)
            if payload is None:
                return
            if payload:
                match = next(
                    (
                        item
                        for item in payload["services"]
                        if item["service_no"].upper() == service_no
                    ),
                    None,
                )
                await websocket.send_json(
                    {
                        "type": "snapshot",
                        "channel": "service",
                        "id": service_no,
                        "payload": {
                            "service_no": service_no,
                            "stop_code": stop_code,
                            "cached_at": payload["cached_at"],
                            "stale": payload["stale"],
                            "operator": match.get("operator") if match else None,
                            "arrivals": match.get("arrivals") if match else [],
                        },
                    }
                )
        await _pump(websocket)
    except WebSocketDisconnect:
        pass
    finally:
        await hub.unsubscribe(channel, websocket)
        if stop_code:
            await hub.unwatch_stop(stop_code)


@router.websocket("/ws/v1/buses/{bus_id}")
async def bus_socket(websocket: WebSocket, bus_id: str) -> None:
    await websocket.accept()
    try:
        service_no, stop_code, index = parse_bus_id(bus_id)
    except ValueError:
        await websocket.send_json({"type": "error", "detail": "Invalid bus id"})
        await websocket.close(code=1008)
        return
    canonical = make_bus_id(service_no, stop_code, index)
    hub = _hub(websocket)
    channel = bus_channel(canonical)
    await hub.watch_stop(stop_code)
    await hub.subscribe(channel, websocket)
    try:
        payload = await _send_snapshot_or_live_error(websocket, stop_code)
        if payload is None:
            return
        if payload:
            match = next(
                (
                    item
                    for item in payload["services"]
                    if item["service_no"].upper() == service_no
                ),
                None,
            )
            arrivals = match.get("arrivals") if match else []
            arrival = arrivals[index - 1] if index <= len(arrivals) else None
            await websocket.send_json(
                {
                    "type": "snapshot",
                    "channel": "bus",
                    "id": canonical,
                    "payload": None
                    if arrival is None
                    else {
                        **arrival,
                        "bus_id": canonical,
                        "service_no": service_no,
                        "stop_code": stop_code,
                        "cached_at": payload["cached_at"],
                        "stale": payload["stale"],
                    },
                }
            )
        await _pump(websocket)
    except WebSocketDisconnect:
        pass
    finally:
        await hub.unsubscribe(channel, websocket)
        await hub.unwatch_stop(stop_code)
