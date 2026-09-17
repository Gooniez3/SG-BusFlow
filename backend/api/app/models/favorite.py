from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.bus_service import BusService
    from app.models.bus_stop import BusStop
    from app.models.user import User


class FavoriteStop(TimestampMixin, Base):
    __tablename__ = "favorite_stops"
    __table_args__ = (UniqueConstraint("user_id", "stop_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stop_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bus_stops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user: Mapped[User] = relationship(back_populates="favorite_stops")
    stop: Mapped[BusStop] = relationship(back_populates="favorite_stops")


class FavoriteService(TimestampMixin, Base):
    __tablename__ = "favorite_services"
    __table_args__ = (UniqueConstraint("user_id", "service_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bus_services.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user: Mapped[User] = relationship(back_populates="favorite_services")
    service: Mapped[BusService] = relationship(back_populates="favorite_services")
