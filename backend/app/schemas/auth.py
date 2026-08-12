from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole


class UserRegister(BaseModel):
    name: str = Field(..., max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)


class CinemaRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: str = Field(..., min_length=1)


class OrganizerRegister(UserRegister):
    cinema: CinemaRegister


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: UserRole


class CinemaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str
    organizer_id: int


class OrganizerRegistrationRead(BaseModel):
    user: UserRead
    cinema: CinemaRead


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
