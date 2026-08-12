from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_organizer
from app.db.session import get_db
from app.models.cinema import Cinema
from app.models.enums import SeatType
from app.models.room import Room
from app.models.seat import Seat
from app.models.user import User
from app.schemas.room import RoomCreate, RoomDetail, RoomRead, RoomUpdate

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _row_label(index: int) -> str:
    """0-based row index to spreadsheet-style letters: 0->A, 25->Z, 26->AA..."""
    index += 1
    label = ""
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        label = chr(65 + remainder) + label
    return label


async def _get_organizer_cinema(db: AsyncSession, organizer_id: int) -> Cinema:
    cinema = await db.scalar(select(Cinema).where(Cinema.organizer_id == organizer_id))
    if cinema is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organizer cinema not found",
        )
    return cinema


async def _get_owned_room(
    db: AsyncSession, room_id: int, organizer_id: int, *, with_seats: bool = False
) -> Room:
    query = (
        select(Room)
        .join(Cinema, Room.cinema_id == Cinema.id)
        .where(Room.id == room_id, Cinema.organizer_id == organizer_id)
    )
    if with_seats:
        query = query.options(selectinload(Room.seats))
    room = await db.scalar(query)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return room


@router.get("", response_model=list[RoomRead])
async def list_rooms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organizer),
) -> list[Room]:
    cinema = await _get_organizer_cinema(db, current_user.id)
    result = await db.scalars(
        select(Room).where(Room.cinema_id == cinema.id).order_by(Room.id)
    )
    return list(result.all())


@router.post("", response_model=RoomDetail, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organizer),
) -> Room:
    cinema = await _get_organizer_cinema(db, current_user.id)
    existing = await db.scalar(
        select(Room).where(Room.cinema_id == cinema.id, Room.name == payload.name)
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room name already exists")

    room = Room(
        name=payload.name,
        capacity=payload.rows * payload.seats_per_row,
        cinema_id=cinema.id,
    )
    room.seats = [
        Seat(row=_row_label(row_index), number=seat_number, seat_type=SeatType.standard)
        for row_index in range(payload.rows)
        for seat_number in range(1, payload.seats_per_row + 1)
    ]

    db.add(room)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room name already exists") from exc

    return room


@router.get("/{room_id}", response_model=RoomDetail)
async def get_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organizer),
) -> Room:
    return await _get_owned_room(db, room_id, current_user.id, with_seats=True)


@router.put("/{room_id}", response_model=RoomDetail)
async def update_room(
    room_id: int,
    payload: RoomUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organizer),
) -> Room:
    room = await _get_owned_room(db, room_id, current_user.id, with_seats=True)
    duplicate = await db.scalar(
        select(Room).where(
            Room.cinema_id == room.cinema_id,
            Room.name == payload.name,
            Room.id != room.id,
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room name already exists")

    room.name = payload.name
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room name already exists") from exc
    return room


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organizer),
) -> None:
    room = await _get_owned_room(db, room_id, current_user.id, with_seats=True)
    await db.delete(room)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room is in use and cannot be deleted",
        ) from exc
