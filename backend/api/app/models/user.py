from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.favorite import FavoriteService, FavoriteStop


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)

    favorite_stops: Mapped[list[FavoriteStop]] = relationship(back_populates="user")
    favorite_services: Mapped[list[FavoriteService]] = relationship(
        back_populates="user"
    )
