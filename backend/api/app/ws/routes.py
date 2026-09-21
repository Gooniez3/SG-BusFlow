from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Path, Query, WebSocket, WebSocketDisconnect

from app.core.codes import SERVICE_NO_PATTERN, STOP_CODE_PATTERN
from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.redis import get_redis
from app.live.snapshot import LiveSnapshotError, load_stop_snapshot
from app.ws.hub import ConnectionHub, HubLimitError
from services.cache.keys import bus_channel, service_channel, stop_channel
from services.cache.live import make_bus_id, parse_bus_id

logger = logging.getLogger("sg-busflow.ws")
router = APIRouter()


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
    idle = get_settings().ws_idle_seconds
    while True:
        try:
            message = await asyncio.wait_for(websocket.receive_text(), timeout=idle)
        except TimeoutError:
            await websocket.close(code=1001)
            return
        if message == "ping":
            await websocket.send_text("pong")


async def _bind(websocket: WebSocket) -> bool:
    await websocket.accept()
    try:
        await _hub(websocket).admit(websocket)
        return True
    except HubLimitError as exc:
        await websocket.send_json({"type": "error", "detail": exc.detail})
        await websocket.close(code=1013)
        return False


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
async def stop_socket(
    websocket: WebSocket,
    stop_id: str = Path(..., pattern=STOP_CODE_PATTERN),
) -> None:
    code = stop_id.strip()
    if not await _bind(websocket):
        return
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
        await hub.release(websocket)


@router.websocket("/ws/v1/services/{service_number}")
async def service_socket(
    websocket: WebSocket,
    service_number: str = Path(..., pattern=SERVICE_NO_PATTERN),
    stop: str | None = Query(default=None, pattern=STOP_CODE_PATTERN),
) -> None:
    service_no = service_number.strip().upper()
    stop_code = stop.strip() if stop else None
    if not await _bind(websocket):
        return
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
                            "age_seconds": payload.get("age_seconds"),
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
        await hub.release(websocket)


@router.websocket("/ws/v1/buses/{bus_id}")
async def bus_socket(websocket: WebSocket, bus_id: str) -> None:
    if not await _bind(websocket):
        return
    try:
        service_no, stop_code, index = parse_bus_id(bus_id)
    except ValueError:
        await websocket.send_json({"type": "error", "detail": "Invalid bus id"})
        await websocket.close(code=1008)
        await _hub(websocket).release(websocket)
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
                        "age_seconds": payload.get("age_seconds"),
                    },
                }
            )
        await _pump(websocket)
    except WebSocketDisconnect:
        pass
    finally:
        await hub.unsubscribe(channel, websocket)
        await hub.unwatch_stop(stop_code)
        await hub.release(websocket)
