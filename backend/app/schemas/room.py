from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SeatType


class RoomCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., max_length=100)
    rows: int = Field(..., gt=0)
    seats_per_row: int = Field(..., gt=0)


class RoomUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=100)


class SeatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    row: str
    number: int
    seat_type: SeatType


class RoomRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    capacity: int
    cinema_id: int
    created_at: datetime


class RoomDetail(RoomRead):
    seats: list[SeatRead] = []
