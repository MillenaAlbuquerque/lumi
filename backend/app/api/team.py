from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_organizer
from app.core.security import hash_password
from app.db.session import get_db
from app.models.cinema import Cinema, cinema_gatekeepers
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.team import GatekeeperCreate, GatekeeperRead

router = APIRouter(prefix="/team", tags=["team"])


async def _organizer_cinema(db: AsyncSession, organizer_id: int) -> Cinema:
    cinema = await db.scalar(select(Cinema).where(Cinema.organizer_id == organizer_id))
    if cinema is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organizer cinema not found")
    return cinema


@router.get("", response_model=list[GatekeeperRead])
async def list_gatekeepers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organizer),
) -> list[dict[str, object]]:
    cinema = await _organizer_cinema(db, current_user.id)
    result = await db.scalars(
        select(User)
        .join(cinema_gatekeepers, cinema_gatekeepers.c.user_id == User.id)
        .where(cinema_gatekeepers.c.cinema_id == cinema.id, User.role == UserRole.GATEKEEPER)
        .order_by(User.name, User.id)
    )
    return [
        {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "cinema_id": cinema.id}
        for user in result.all()
    ]


@router.post("", response_model=GatekeeperRead, status_code=status.HTTP_201_CREATED)
async def create_gatekeeper(
    payload: GatekeeperCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organizer),
) -> dict[str, object]:
    cinema = await _organizer_cinema(db, current_user.id)
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    gatekeeper = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.GATEKEEPER,
    )
    db.add(gatekeeper)
    await db.flush()
    await db.execute(
        insert(cinema_gatekeepers).values(cinema_id=cinema.id, user_id=gatekeeper.id)
    )
    await db.commit()
    await db.refresh(gatekeeper)
    return {
        "id": gatekeeper.id,
        "name": gatekeeper.name,
        "email": gatekeeper.email,
        "role": gatekeeper.role,
        "cinema_id": cinema.id,
    }
