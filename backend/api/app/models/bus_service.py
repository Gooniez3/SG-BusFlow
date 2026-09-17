from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.arrival import Arrival
    from app.models.bus import Bus
    from app.models.bus_route import BusRoute
    from app.models.favorite import FavoriteService


class BusService(TimestampMixin, Base):
    __tablename__ = "bus_services"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    service_no: Mapped[str] = mapped_column(String(8), unique=True, nullable=False)
    operator: Mapped[str | None] = mapped_column(String(16))
    category: Mapped[str | None] = mapped_column(String(32))

    routes: Mapped[list[BusRoute]] = relationship(back_populates="service")
    buses: Mapped[list[Bus]] = relationship(back_populates="service")
    arrivals: Mapped[list[Arrival]] = relationship(back_populates="service")
    favorite_services: Mapped[list[FavoriteService]] = relationship(
        back_populates="service"
    )
