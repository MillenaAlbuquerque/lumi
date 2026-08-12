from sqlalchemy import Column, ForeignKey, String, Table, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


cinema_gatekeepers = Table(
    "cinema_gatekeepers",
    Base.metadata,
    Column("cinema_id", ForeignKey("cinemas.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    UniqueConstraint("user_id", name="uq_cinema_gatekeepers_user_id"),
)


class Cinema(Base):
    __tablename__ = "cinemas"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    organizer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    organizer: Mapped["User"] = relationship(
        back_populates="cinema", foreign_keys=[organizer_id]
    )
    gatekeepers: Mapped[list["User"]] = relationship(
        secondary=cinema_gatekeepers, back_populates="workplace_cinemas"
    )
    rooms: Mapped[list["Room"]] = relationship(back_populates="cinema")
