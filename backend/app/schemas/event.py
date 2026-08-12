from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import UserRead
from app.schemas.movie import MovieRead
from app.schemas.room import RoomRead


class EventCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    movie_id: int
    room_id: int
    start_datetime: datetime
    price: Decimal = Field(..., ge=0)
    projection_type: str = Field(default="2D", pattern="^(2D|3D)$")


class EventUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    movie_id: int | None = None
    room_id: int | None = None
    start_datetime: datetime | None = None
    price: Decimal | None = Field(None, ge=0)
    projection_type: str | None = Field(None, pattern="^(2D|3D)$")


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    movie_id: int
    room_id: int
    organizer_id: int
    start_datetime: datetime
    price: float
    projection_type: str
    created_at: datetime
    movie: MovieRead
    room: RoomRead
    organizer: UserRead
