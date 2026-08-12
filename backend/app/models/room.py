from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (UniqueConstraint("cinema_id", "name", name="uq_room_cinema_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity: Mapped[int] = mapped_column(nullable=False)
    cinema_id: Mapped[int] = mapped_column(
        ForeignKey("cinemas.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cinema: Mapped["Cinema"] = relationship(back_populates="rooms")
    seats: Mapped[list["Seat"]] = relationship(back_populates="room", cascade="all, delete-orphan")
    events: Mapped[list["Event"]] = relationship(back_populates="room")
