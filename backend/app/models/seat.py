from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import SeatType


class Seat(Base):
    __tablename__ = "seats"
    __table_args__ = (UniqueConstraint("room_id", "row", "number", name="uq_seat_room_row_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)
    row: Mapped[str] = mapped_column(String(5), nullable=False)
    number: Mapped[int] = mapped_column(nullable=False)
    seat_type: Mapped[SeatType] = mapped_column(SAEnum(SeatType), nullable=False, default=SeatType.standard)

    room: Mapped["Room"] = relationship(back_populates="seats")
    reservation_seats: Mapped[list["ReservationSeat"]] = relationship(back_populates="seat")
