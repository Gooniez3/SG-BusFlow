from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from geoalchemy2 import Geography, WKBElement
from sqlalchemy import Index, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.arrival import Arrival
    from app.models.bus_route import BusRoute
    from app.models.bus_route_stop import BusRouteStop
    from app.models.favorite import FavoriteStop


class BusStop(TimestampMixin, Base):
    __tablename__ = "bus_stops"
    __table_args__ = (
        Index("ix_bus_stops_location", "location", postgresql_using="gist"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(8), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    location: Mapped[WKBElement] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    road_name: Mapped[str | None] = mapped_column(String(255))

    route_stops: Mapped[list[BusRouteStop]] = relationship(back_populates="stop")
    origin_routes: Mapped[list[BusRoute]] = relationship(
        back_populates="origin_stop",
        foreign_keys="BusRoute.origin_stop_id",
    )
    destination_routes: Mapped[list[BusRoute]] = relationship(
        back_populates="destination_stop",
        foreign_keys="BusRoute.destination_stop_id",
    )
    arrivals: Mapped[list[Arrival]] = relationship(back_populates="stop")
    favorite_stops: Mapped[list[FavoriteStop]] = relationship(back_populates="stop")
