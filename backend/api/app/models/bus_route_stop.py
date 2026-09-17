from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Numeric, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.bus_route import BusRoute
    from app.models.bus_stop import BusStop


class BusRouteStop(TimestampMixin, Base):
    __tablename__ = "bus_route_stops"
    __table_args__ = (UniqueConstraint("route_id", "stop_sequence"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    route_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bus_routes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stop_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bus_stops.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    stop_sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    distance_km: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))

    route: Mapped[BusRoute] = relationship(back_populates="route_stops")
    stop: Mapped[BusStop] = relationship(back_populates="route_stops")
