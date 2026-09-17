from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from geoalchemy2 import Geography, WKBElement
from sqlalchemy import ForeignKey, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.arrival import Arrival
    from app.models.bus_service import BusService


class Bus(TimestampMixin, Base):
    __tablename__ = "buses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("bus_services.id", ondelete="SET NULL"),
        index=True,
    )
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))
    location: Mapped[WKBElement | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False)
    )

    service: Mapped[BusService | None] = relationship(back_populates="buses")
    arrivals: Mapped[list[Arrival]] = relationship(back_populates="bus")
