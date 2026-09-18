from __future__ import annotations

import uuid
from decimal import Decimal

from geoalchemy2 import Geography
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_Distance, ST_DWithin, ST_MakePoint, ST_SetSRID
from sqlalchemy import cast, or_, select
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


def _ilike_pattern(query: str) -> str:
    return f"%{query.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')}%"


def search_stops(db: Session, query: str, *, limit: int = 20) -> list[BusStop]:
    pattern = _ilike_pattern(query.strip())
    stmt = (
        select(BusStop)
        .where(
            or_(
                BusStop.code.ilike(pattern, escape="\\"),
                BusStop.name.ilike(pattern, escape="\\"),
                BusStop.road_name.ilike(pattern, escape="\\"),
            )
        )
        .order_by(BusStop.name)
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


def get_stop_by_code(db: Session, code: str) -> BusStop | None:
    return db.scalar(select(BusStop).where(BusStop.code == code))


def get_stops_by_codes(db: Session, codes: list[str]) -> dict[str, BusStop]:
    unique = [code for code in dict.fromkeys(codes) if code]
    if not unique:
        return {}
    rows = db.scalars(select(BusStop).where(BusStop.code.in_(unique))).all()
    return {stop.code: stop for stop in rows}


def distance_to_stop(db: Session, stop: BusStop, *, lat: float, lng: float) -> float:
    origin = cast(ST_SetSRID(ST_MakePoint(lng, lat), 4326), Geography)
    metres = db.scalar(
        select(ST_Distance(BusStop.location, origin)).where(BusStop.id == stop.id)
    )
    return float(metres or 0)
