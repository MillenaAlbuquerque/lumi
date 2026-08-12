from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole


class GatekeeperCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)


class GatekeeperRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: UserRole
    cinema_id: int
