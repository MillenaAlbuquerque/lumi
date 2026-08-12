from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_organizer
from app.db.session import get_db
from app.models.cinema import Cinema
from app.models.event import Event
from app.models.movie import Movie
from app.models.room import Room
from app.models.user import User
from app.schemas.event import EventCreate, EventRead, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])


def _normalized(value: datetime) -> datetime:
    return value if value.tzinfo is None else value.astimezone().replace(tzinfo=None)


def _owned_events_query(organizer_id: int):
    return (
        select(Event)
        .join(Room, Event.room_id == Room.id)
        .join(Cinema, Room.cinema_id == Cinema.id)
        .options(selectinload(Event.movie), selectinload(Event.room), selectinload(Event.organizer))
        .where(Cinema.organizer_id == organizer_id)
    )


async def _validate_payload(
    db: AsyncSession,
    organizer_id: int,
    movie_id: int,
    room_id: int,
    start_datetime: datetime,
    event_id: int | None = None,
) -> None:
    movie = await db.get(Movie, movie_id)
    if movie is None:
        raise HTTPException(status_code=404, detail="Movie not found")

    room = await db.scalar(
        select(Room).join(Cinema).where(
            Room.id == room_id, Cinema.organizer_id == organizer_id
        )
    )
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")

    start = _normalized(start_datetime)
    if start < _normalized(datetime.now()):
        raise HTTPException(status_code=400, detail="start_datetime must be in the future")

    rows = await db.execute(
        select(Event.id, Event.start_datetime, Movie.duration_minutes)
        .join(Movie, Event.movie_id == Movie.id)
        .where(Event.room_id == room_id)
    )
    for existing_id, existing_start, duration in rows.all():
        if existing_id == event_id:
            continue
        existing_start = _normalized(existing_start)
        if start < existing_start + timedelta(minutes=duration) and existing_start < start + timedelta(minutes=movie.duration_minutes):
            raise HTTPException(status_code=409, detail="Room already has an overlapping event")


async def _commit(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Event could not be saved") from exc


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
async def create_event(payload: EventCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_organizer)) -> Event:
    await _validate_payload(db, current_user.id, payload.movie_id, payload.room_id, payload.start_datetime)
    event = Event(
        movie_id=payload.movie_id,
        room_id=payload.room_id,
        organizer_id=current_user.id,
        start_datetime=payload.start_datetime,
        price=Decimal(str(payload.price)),
        projection_type=payload.projection_type,
    )
    db.add(event)
    await _commit(db)
    return await db.scalar(_owned_events_query(current_user.id).where(Event.id == event.id))


@router.get("", response_model=list[EventRead])
async def list_events(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_organizer)) -> list[Event]:
    result = await db.scalars(_owned_events_query(current_user.id).order_by(Event.start_datetime))
    return list(result.all())


@router.get("/{event_id}", response_model=EventRead)
async def get_event(event_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_organizer)) -> Event:
    event = await db.scalar(_owned_events_query(current_user.id).where(Event.id == event_id))
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.put("/{event_id}", response_model=EventRead)
async def update_event(event_id: int, payload: EventUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_organizer)) -> Event:
    event = await db.scalar(_owned_events_query(current_user.id).where(Event.id == event_id))
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    movie_id = payload.movie_id if payload.movie_id is not None else event.movie_id
    room_id = payload.room_id if payload.room_id is not None else event.room_id
    start_datetime = payload.start_datetime if payload.start_datetime is not None else event.start_datetime
    await _validate_payload(db, current_user.id, movie_id, room_id, start_datetime, event.id)
    event.movie_id = movie_id
    event.room_id = room_id
    event.start_datetime = start_datetime
    event.price = Decimal(str(payload.price if payload.price is not None else event.price))
    event.projection_type = payload.projection_type or event.projection_type
    await _commit(db)
    return await db.scalar(_owned_events_query(current_user.id).where(Event.id == event.id))


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_organizer)) -> None:
    event = await db.scalar(_owned_events_query(current_user.id).where(Event.id == event_id))
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete(event)
    await _commit(db)
