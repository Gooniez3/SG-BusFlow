from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.bus import Bus
    from app.models.bus_service import BusService
    from app.models.bus_stop import BusStop


class Arrival(TimestampMixin, Base):
    __tablename__ = "arrivals"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    stop_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bus_stops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bus_services.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bus_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("buses.id", ondelete="SET NULL")
    )
    estimated_arrival: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    visit_number: Mapped[int | None] = mapped_column(Integer)
    load: Mapped[str | None] = mapped_column(String(8))
    feature: Mapped[str | None] = mapped_column(String(16))
    type: Mapped[str | None] = mapped_column(String(8))

    stop: Mapped[BusStop] = relationship(back_populates="arrivals")
    service: Mapped[BusService] = relationship(back_populates="arrivals")
    bus: Mapped[Bus | None] = relationship(back_populates="arrivals")
