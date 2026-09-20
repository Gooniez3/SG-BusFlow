from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.bus_route import BusRoute
from app.models.bus_route_stop import BusRouteStop
from app.models.bus_service import BusService
from app.models.bus_stop import BusStop
from services.lta.models import LTABusRoute, LTABusService


def upsert_bus_network(
    db: Session,
    services: list[LTABusService],
    routes: list[LTABusRoute],
    *,
    batch_size: int = 500,
) -> dict[str, int]:
    unique_services: dict[str, LTABusService] = {}
    for service in services:
        unique_services[service.service_no] = service
    if unique_services:
        rows = [
            {
                "id": uuid.uuid4(),
                "service_no": service.service_no,
                "operator": service.operator,
                "category": service.category,
            }
            for service in unique_services.values()
        ]
        stmt = pg_insert(BusService).values(rows)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_bus_services_service_no",
            set_={
                "operator": stmt.excluded.operator,
                "category": stmt.excluded.category,
            },
        )
        db.execute(stmt)

    service_ids = dict(db.execute(select(BusService.service_no, BusService.id)).all())
    stop_ids = dict(db.execute(select(BusStop.code, BusStop.id)).all())

    route_keys: dict[tuple[str, int], LTABusService | None] = {}
    for service in services:
        if service.direction in (1, 2):
            route_keys[(service.service_no, service.direction)] = service
    for route in routes:
        if route.direction in (1, 2):
            route_keys.setdefault((route.service_no, route.direction), None)

    route_rows = []
    for (service_no, direction), service in route_keys.items():
        service_id = service_ids.get(service_no)
        if service_id is None:
            continue
        origin_code = service.origin_code if service else None
        destination_code = service.destination_code if service else None
        route_rows.append(
            {
                "id": uuid.uuid4(),
                "service_id": service_id,
                "direction": direction,
                "origin_stop_id": stop_ids.get(origin_code) if origin_code else None,
                "destination_stop_id": stop_ids.get(destination_code) if destination_code else None,
            }
        )
    if route_rows:
        stmt = pg_insert(BusRoute).values(route_rows)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_bus_routes_service_id",
            set_={
                "origin_stop_id": stmt.excluded.origin_stop_id,
                "destination_stop_id": stmt.excluded.destination_stop_id,
            },
        )
        db.execute(stmt)

    route_ids = {
        (service_no, int(direction)): route_id
        for service_no, direction, route_id in db.execute(
            select(BusService.service_no, BusRoute.direction, BusRoute.id).join(
                BusRoute, BusRoute.service_id == BusService.id
            )
        )
    }
    db.execute(delete(BusRouteStop))
    stop_rows = []
    skipped = 0
    for route in routes:
        route_id = route_ids.get((route.service_no, route.direction))
        stop_id = stop_ids.get(route.bus_stop_code)
        if route_id is None or stop_id is None:
            skipped += 1
            continue
        stop_rows.append(
            {
                "id": uuid.uuid4(),
                "route_id": route_id,
                "stop_id": stop_id,
                "stop_sequence": route.stop_sequence,
                "distance_km": Decimal(str(route.distance)) if route.distance is not None else None,
            }
        )
    inserted = 0
    for start in range(0, len(stop_rows), batch_size):
        chunk = stop_rows[start : start + batch_size]
        db.execute(
            pg_insert(BusRouteStop)
            .values(chunk)
            .on_conflict_do_nothing(constraint="uq_bus_route_stops_route_id")
        )
        inserted += len(chunk)
    return {
        "services": len(unique_services),
        "routes": len(route_ids),
        "route_stops": inserted,
        "skipped_route_stops": skipped,
    }
