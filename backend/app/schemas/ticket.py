from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import TicketStatus


class ClientTicketRead(BaseModel):
    id: int
    status: TicketStatus
    issued_at: datetime
    reservation_id: int
    session_id: int
    movie_title: str
    poster_url: str | None
    backdrop_url: str | None
    cinema_name: str
    cinema_address: str
    room_name: str
    session_datetime: datetime
    projection_type: str
    seat_row: str
    seat_number: int
    price: Decimal
    token: str
    manual_code: str


class TicketShareRead(BaseModel):
    share_url: str
    expires_at: datetime


class SharedTicketRead(BaseModel):
    status: TicketStatus
    movie_title: str
    poster_url: str | None
    backdrop_url: str | None
    cinema_name: str
    cinema_address: str
    room_name: str
    session_datetime: datetime
    projection_type: str
    seat_row: str
    seat_number: int
    token: str
    manual_code: str
