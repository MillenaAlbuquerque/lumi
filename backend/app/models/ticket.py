from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.enums import TicketStatus


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    reservation_seat_id: Mapped[int] = mapped_column(
        ForeignKey("reservation_seats.id"), nullable=False, unique=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    status: Mapped[TicketStatus] = mapped_column(SAEnum(TicketStatus), nullable=False, default=TicketStatus.issued)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    used_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    share_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    share_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    reservation_seat: Mapped["ReservationSeat"] = relationship(back_populates="ticket")
    used_by: Mapped["User | None"] = relationship(back_populates="validated_tickets")
