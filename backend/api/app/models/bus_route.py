from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.bus_route_stop import BusRouteStop
    from app.models.bus_service import BusService
    from app.models.bus_stop import BusStop


class BusRoute(TimestampMixin, Base):
    __tablename__ = "bus_routes"
    __table_args__ = (
        UniqueConstraint("service_id", "direction"),
        CheckConstraint("direction IN (1, 2)", name="direction_valid"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    service_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bus_services.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    direction: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    origin_stop_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("bus_stops.id", ondelete="SET NULL")
    )
    destination_stop_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("bus_stops.id", ondelete="SET NULL")
    )

    service: Mapped[BusService] = relationship(back_populates="routes")
    origin_stop: Mapped[BusStop | None] = relationship(
        back_populates="origin_routes",
        foreign_keys=[origin_stop_id],
    )
    destination_stop: Mapped[BusStop | None] = relationship(
        back_populates="destination_routes",
        foreign_keys=[destination_stop_id],
    )
    route_stops: Mapped[list[BusRouteStop]] = relationship(
        back_populates="route",
        order_by="BusRouteStop.stop_sequence",
    )
