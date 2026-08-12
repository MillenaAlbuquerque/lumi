from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class SeatHoldCreate(BaseModel):
    seat_ids: list[int] = Field(..., min_length=1, max_length=20)

    @field_validator("seat_ids")
    @classmethod
    def unique_seats(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("seat_ids must be unique")
        return value


class SeatHoldRead(BaseModel):
    id: int
    session_id: int
    seat_ids: list[int]
    expires_at: datetime
