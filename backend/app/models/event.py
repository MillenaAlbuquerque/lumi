from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Event(Base):
    """Sessão de exibição de um filme em uma sala, em um horário específico."""

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    movie_id: Mapped[int] = mapped_column(ForeignKey("movies.id"), nullable=False)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)
    organizer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    projection_type: Mapped[str] = mapped_column(String(10), nullable=False, default="2D")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    movie: Mapped["Movie"] = relationship(back_populates="events")
    room: Mapped["Room"] = relationship(back_populates="events")
    organizer: Mapped["User"] = relationship(back_populates="organized_events")
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="event")
    reservation_seats: Mapped[list["ReservationSeat"]] = relationship(back_populates="event")
