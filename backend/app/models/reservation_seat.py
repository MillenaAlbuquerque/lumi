from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReservationSeat(Base):
    """Assento específico incluído em uma reserva, com o preço praticado no momento."""

    __tablename__ = "reservation_seats"
    id: Mapped[int] = mapped_column(primary_key=True)
    reservation_id: Mapped[int] = mapped_column(ForeignKey("reservations.id"), nullable=False)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), nullable=False)
    seat_id: Mapped[int] = mapped_column(ForeignKey("seats.id"), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    reservation: Mapped["Reservation"] = relationship(back_populates="reservation_seats")
    event: Mapped["Event"] = relationship(back_populates="reservation_seats")
    seat: Mapped["Seat"] = relationship(back_populates="reservation_seats")
    ticket: Mapped["Ticket"] = relationship(back_populates="reservation_seat", uselist=False)
