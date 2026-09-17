from __future__ import annotations

import uuid
from decimal import Decimal

from geoalchemy2 import Geography
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_Distance, ST_DWithin, ST_MakePoint, ST_SetSRID
from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.bus_stop import BusStop
from services.lta.models import LTABusStop


def _point(latitude: float, longitude: float) -> WKTElement:
    return WKTElement(f"POINT({longitude} {latitude})", srid=4326)


def upsert_bus_stops(db: Session, stops: list[LTABusStop], *, batch_size: int = 500) -> int:
    if not stops:
        return 0

    total = 0
    for start in range(0, len(stops), batch_size):
        chunk = stops[start : start + batch_size]
        rows = [
            {
                "id": uuid.uuid4(),
                "code": stop.bus_stop_code,
                "name": stop.description,
                "latitude": Decimal(str(round(stop.latitude, 6))),
                "longitude": Decimal(str(round(stop.longitude, 6))),
                "location": _point(stop.latitude, stop.longitude),
                "road_name": stop.road_name or None,
            }
            for stop in chunk
        ]
        stmt = pg_insert(BusStop).values(rows)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_bus_stops_code",
            set_={
                "name": stmt.excluded.name,
                "latitude": stmt.excluded.latitude,
                "longitude": stmt.excluded.longitude,
                "location": stmt.excluded.location,
                "road_name": stmt.excluded.road_name,
            },
        )
        db.execute(stmt)
        total += len(rows)
    return total


def find_nearby_stops(
    db: Session,
    *,
    lat: float,
    lng: float,
    radius_m: int,
    limit: int = 20,
) -> list[tuple[BusStop, float]]:
    origin = cast(ST_SetSRID(ST_MakePoint(lng, lat), 4326), Geography)
    distance = ST_Distance(BusStop.location, origin)
    stmt = (
        select(BusStop, distance.label("distance_m"))
        .where(ST_DWithin(BusStop.location, origin, float(radius_m)))
        .order_by(distance)
        .limit(limit)
    )
    return [(stop, float(metres)) for stop, metres in db.execute(stmt).all()]
