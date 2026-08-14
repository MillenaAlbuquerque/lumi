from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_organizer
from app.core.security import hash_password
from app.db.session import get_db
from app.models.cinema import Cinema, cinema_gatekeepers
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.team import GatekeeperCreate, GatekeeperRead, GatekeeperUpdate

router = APIRouter(prefix="/team", tags=["team"])


async def _organizer_cinema(db: AsyncSession, organizer_id: int) -> Cinema:
    cinema = await db.scalar(select(Cinema).where(Cinema.organizer_id == organizer_id))
    if cinema is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cinema não encontrado para o organizador")
    return cinema


async def _owned_gatekeeper(db: AsyncSession, cinema_id: int, user_id: int) -> User:
    member = await db.scalar(
        select(User)
        .join(cinema_gatekeepers, cinema_gatekeepers.c.user_id == User.id)
        .where(
            cinema_gatekeepers.c.cinema_id == cinema_id,
            User.id == user_id,
            User.role == UserRole.GATEKEEPER,
        )
    )
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário da equipe não encontrado")
    return member


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
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já registrado")

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


@router.put("/{user_id}", response_model=GatekeeperRead)
async def update_gatekeeper(
    user_id: int,
    payload: GatekeeperUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organizer),
) -> dict[str, object]:
    cinema = await _organizer_cinema(db, current_user.id)
    member = await _owned_gatekeeper(db, cinema.id, user_id)
    duplicate = await db.scalar(select(User.id).where(User.email == payload.email, User.id != member.id))
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já registrado")
    member.name = payload.name
    member.email = payload.email
    if payload.password:
        member.password_hash = hash_password(payload.password)
    await db.commit()
    await db.refresh(member)
    return {"id": member.id, "name": member.name, "email": member.email, "role": member.role, "cinema_id": cinema.id}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gatekeeper(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organizer),
) -> None:
    cinema = await _organizer_cinema(db, current_user.id)
    member = await _owned_gatekeeper(db, cinema.id, user_id)
    await db.execute(delete(cinema_gatekeepers).where(cinema_gatekeepers.c.cinema_id == cinema.id, cinema_gatekeepers.c.user_id == member.id))
    await db.delete(member)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Funcionário da equipe está em uso e não pode ser deletado") from exc
