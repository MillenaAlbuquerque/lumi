from datetime import date, datetime

from pydantic import BaseModel


class AvailableMovieRead(BaseModel):
    id: int
    title: str
    poster_url: str | None
    duration_minutes: int
    description: str | None
    rating: str | None
    release_date: date | None
    backdrop_url: str | None


class AvailableCinemaRead(BaseModel):
    id: int
    name: str
    address: str


class AvailableSessionRead(BaseModel):
    id: int
    movie_id: int
    cinema_id: int
    room_id: int
    room_name: str
    start_datetime: datetime
    projection_type: str
    price: float


class AvailableSeatRead(BaseModel):
    id: int
    row: str
    number: int
    seat_type: str
    occupied: bool


class SessionSeatAvailabilityRead(BaseModel):
    session: AvailableSessionRead
    seats: list[AvailableSeatRead]
