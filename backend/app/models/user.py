from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False, default=UserRole.CLIENT)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    reservations: Mapped[list["Reservation"]] = relationship(back_populates="user")
    organized_events: Mapped[list["Event"]] = relationship(back_populates="organizer")
    cinema: Mapped["Cinema | None"] = relationship(
        back_populates="organizer",
        cascade="all, delete-orphan",
        uselist=False,
        foreign_keys="Cinema.organizer_id",
    )
    workplace_cinemas: Mapped[list["Cinema"]] = relationship(
        secondary="cinema_gatekeepers", back_populates="gatekeepers"
    )
    validated_tickets: Mapped[list["Ticket"]] = relationship(back_populates="used_by")
