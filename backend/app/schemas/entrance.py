from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class EntranceEventRead(BaseModel):
    id: int
    movie_title: str
    room_name: str
    start_datetime: datetime
    projection_type: str


class EntranceValidationCreate(BaseModel):
    token: str = Field(..., min_length=1, max_length=500)


class EntranceValidationRead(BaseModel):
    result: Literal["valid", "invalid", "used"]
    message: str
    ticket_id: int | None = None
    movie_title: str | None = None
    room_name: str | None = None
    seat: str | None = None
    used_at: datetime | None = None
