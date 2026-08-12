from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class PaymentPayer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    identification_type: str = Field(..., min_length=1, max_length=20)
    identification_number: str = Field(..., min_length=1, max_length=30)


class PaymentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: int = Field(..., gt=0)
    hold_id: int | None = Field(default=None, gt=0)
    seat_ids: list[int] = Field(..., min_length=1, max_length=20)
    token: str = Field(..., min_length=1, max_length=300)
    payment_method_id: str = Field(..., min_length=1, max_length=50)
    installments: int = Field(default=1, ge=1, le=24)
    payer: PaymentPayer

    @field_validator("seat_ids")
    @classmethod
    def unique_seats(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("seat_ids must be unique")
        return value


class PurchasedSeatRead(BaseModel):
    id: int
    row: str
    number: int
    price: Decimal


class PaymentRead(BaseModel):
    id: int
    reservation_id: int
    session_id: int
    payment_status: str
    status_detail: str | None
    reservation_status: str
    provider_order_id: str | None
    provider_payment_id: str | None
    unit_price: Decimal
    total: Decimal
    seats: list[PurchasedSeatRead]
    created_at: datetime


class MercadoPagoWebhook(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    live_mode: bool
    data: dict[str, str]
