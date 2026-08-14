from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_organizer
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.cinema import Cinema
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import CinemaRead, CinemaUpdate, OrganizerRegister, OrganizerRegistrationRead, Token, UserLogin, UserRead, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)) -> User:
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.CLIENT,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post(
    "/register-organizer",
    response_model=OrganizerRegistrationRead,
    status_code=status.HTTP_201_CREATED,
)
async def register_organizer(
    payload: OrganizerRegister, db: AsyncSession = Depends(get_db)
) -> dict[str, User | Cinema]:
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já registrado")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.ORGANIZER,
    )
    db.add(user)
    await db.flush()

    cinema = Cinema(
        name=payload.cinema.name,
        address=payload.cinema.address,
        organizer_id=user.id,
    )
    db.add(cinema)
    await db.commit()
    await db.refresh(user)
    await db.refresh(cinema)
    return {"user": user, "cinema": cinema}


@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)) -> Token:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.get("/me/cinema", response_model=CinemaRead)
async def get_my_cinema(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Cinema:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas organizadores têm um cinema",
        )

    cinema = await db.scalar(select(Cinema).where(Cinema.organizer_id == current_user.id))
    if cinema is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cinema não encontrado para o organizador")
    return cinema


@router.put("/me/cinema", response_model=CinemaRead)
async def update_my_cinema(
    payload: CinemaUpdate,
    current_user: User = Depends(require_organizer),
    db: AsyncSession = Depends(get_db),
) -> Cinema:
    cinema = await db.scalar(select(Cinema).where(Cinema.organizer_id == current_user.id))
    if cinema is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cinema não encontrado para o organizador")
    cinema.name = payload.name
    cinema.address = payload.address
    await db.commit()
    await db.refresh(cinema)
    return cinema
