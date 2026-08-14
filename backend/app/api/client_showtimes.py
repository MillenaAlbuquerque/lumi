from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, case, delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.cinema import Cinema
from app.models.event import Event
from app.models.enums import ReservationStatus, TicketStatus
from app.models.movie import Movie
from app.models.reservation import Reservation
from app.models.reservation_seat import ReservationSeat
from app.models.room import Room
from app.models.seat import Seat
from app.models.user import User
from app.models.ticket import Ticket
from app.models.payment import Payment
from app.api.deps import require_client
from app.schemas.client_showtime import AvailableCinemaRead, AvailableMovieRead, AvailableSessionRead, SessionSeatAvailabilityRead
from app.schemas.seat_hold import SeatHoldCreate, SeatHoldRead
from app.services.seat_holds import expire_seat_holds
from app.services.seat_updates import seat_update_manager

router = APIRouter(prefix="/client/showtimes", tags=["client-showtimes"])
LUMI_TIMEZONE = "America/Sao_Paulo"


def _event_local_date():
    return func.date(func.timezone(LUMI_TIMEZONE, Event.start_datetime))


@router.get("/cinemas", response_model=list[AvailableCinemaRead])
async def available_cinemas_list(
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = await db.execute(
        select(Cinema.id.label("id"), Cinema.name, Cinema.address)
        .distinct()
        .join(Room, Room.cinema_id == Cinema.id)
        .join(Event, Event.room_id == Room.id)
        .where(Event.start_datetime > func.now())
        .order_by(Cinema.name)
    )
    return [dict(row._mapping) for row in rows.all()]


@router.get("/cinemas/{cinema_id}/movies", response_model=list[AvailableMovieRead])
async def cinema_available_movies(
    cinema_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = await db.execute(
        select(
            Movie.id.label("id"),
            Movie.title,
            Movie.poster_url,
            Movie.duration_minutes,
            Movie.description,
            Movie.rating,
            Movie.release_date,
            Movie.backdrop_url,
        )
        .distinct()
        .join(Event, Event.movie_id == Movie.id)
        .join(Room, Event.room_id == Room.id)
        .where(Room.cinema_id == cinema_id, Event.start_datetime > func.now())
        .order_by(Movie.title)
    )
    return [dict(row._mapping) for row in rows.all()]


@router.get("/movies", response_model=list[AvailableMovieRead])
async def available_movies(
    show_date: date | None = Query(default=None, alias="date"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    query = (
        select(
            Movie.id.label("id"),
            Movie.title,
            Movie.poster_url,
            Movie.duration_minutes,
            Movie.description,
            Movie.rating,
            Movie.release_date,
            Movie.backdrop_url,
        )
        .distinct()
        .join(Event, Event.movie_id == Movie.id)
        .where(Event.start_datetime > func.now())
    )
    if show_date is not None:
        query = query.where(_event_local_date() == show_date)
    rows = await db.execute(query.order_by(Movie.title))
    return [dict(row._mapping) for row in rows.all()]


@router.get("/movies/{movie_id}/cinemas", response_model=list[AvailableCinemaRead])
async def available_cinemas(
    movie_id: int,
    show_date: date | None = Query(default=None, alias="date"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    query = (
        select(Cinema.id.label("id"), Cinema.name, Cinema.address)
        .distinct()
        .join(Room, Room.cinema_id == Cinema.id)
        .join(Event, Event.room_id == Room.id)
        .where(Event.movie_id == movie_id, Event.start_datetime > func.now())
        .order_by(Cinema.name)
    )
    if show_date is not None:
        query = query.where(_event_local_date() == show_date)
    rows = await db.execute(query)
    return [dict(row._mapping) for row in rows.all()]


@router.get(
    "/movies/{movie_id}/cinemas/{cinema_id}/sessions",
    response_model=list[AvailableSessionRead],
)
async def available_sessions(
    movie_id: int,
    cinema_id: int,
    show_date: date | None = Query(default=None, alias="date"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    query = (
        select(
            Event.id,
            Event.movie_id,
            Room.cinema_id.label("cinema_id"),
            Event.room_id,
            Room.name.label("room_name"),
            Event.start_datetime,
            Event.projection_type,
            Event.price,
        )
        .join(Room, Event.room_id == Room.id)
        .where(
            Event.movie_id == movie_id,
            Room.cinema_id == cinema_id,
            Event.start_datetime > func.now(),
        )
        .order_by(Event.start_datetime)
    )
    if show_date is not None:
        query = query.where(_event_local_date() == show_date)
    rows = await db.execute(query)
    return [dict(row._mapping) for row in rows.all()]


@router.get("/sessions/{session_id}/seats", response_model=SessionSeatAvailabilityRead)
async def session_seat_availability(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_client),
) -> dict:
    await expire_seat_holds(db, session_id)
    session_row = (
        await db.execute(
            select(
                Event.id,
                Event.movie_id,
                Room.cinema_id.label("cinema_id"),
                Event.room_id,
                Room.name.label("room_name"),
                Event.start_datetime,
                Event.projection_type,
                Event.price,
            )
            .join(Room, Event.room_id == Room.id)
            .where(Event.id == session_id, Event.start_datetime > func.now())
        )
    ).one_or_none()
    if session_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session está indisponível ou não encontrada")

    occupied_seats = (
        select(ReservationSeat.seat_id)
        .join(Reservation, Reservation.id == ReservationSeat.reservation_id)
        .outerjoin(Ticket, Ticket.reservation_seat_id == ReservationSeat.id)
        .where(
            ReservationSeat.event_id == session_id,
            or_(
                Reservation.status == ReservationStatus.pending,
                and_(Reservation.status == ReservationStatus.confirmed, or_(Ticket.id.is_(None), Ticket.status != TicketStatus.cancelled)),
            ),
        )
    )
    seat_rows = await db.execute(
        select(
            Seat.id,
            Seat.row,
            Seat.number,
            Seat.seat_type,
            case((Seat.id.in_(occupied_seats), True), else_=False).label("occupied"),
        )
        .where(Seat.room_id == session_row.room_id)
        .order_by(Seat.row, Seat.number)
    )
    return {
        "session": dict(session_row._mapping),
        "seats": [dict(row._mapping) for row in seat_rows.all()],
    }


@router.post("/sessions/{session_id}/holds", response_model=SeatHoldRead, status_code=status.HTTP_201_CREATED)
async def create_seat_hold(
    session_id: int,
    payload: SeatHoldCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_client),
) -> dict:
    await expire_seat_holds(db, session_id)
    event = await db.scalar(
        select(Event).where(Event.id == session_id, Event.start_datetime > func.now()).with_for_update()
    )
    if event is None:
        raise HTTPException(status_code=404, detail="Session está indisponível ou não encontrada")

    seats = list((await db.scalars(
        select(Seat)
        .where(Seat.room_id == event.room_id, Seat.id.in_(payload.seat_ids))
        .order_by(Seat.id)
        .with_for_update()
    )).all())
    if len(seats) != len(payload.seat_ids):
        raise HTTPException(status_code=409, detail="Um ou mais assentos selecionados não existem na sessão")

    occupied_ids = set((await db.scalars(
        select(ReservationSeat.seat_id)
        .join(Reservation, Reservation.id == ReservationSeat.reservation_id)
        .outerjoin(Ticket, Ticket.reservation_seat_id == ReservationSeat.id)
        .where(
            ReservationSeat.event_id == session_id,
            ReservationSeat.seat_id.in_(payload.seat_ids),
            or_(
                Reservation.status == ReservationStatus.pending,
                and_(Reservation.status == ReservationStatus.confirmed, or_(Ticket.id.is_(None), Ticket.status != TicketStatus.cancelled)),
            ),
        )
    )).all())
    if occupied_ids:
        raise HTTPException(status_code=409, detail="Um ou mais assentos não estão mais disponíveis")

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    reservation = Reservation(
        user_id=current_user.id,
        event_id=session_id,
        status=ReservationStatus.pending,
        hold_expires_at=expires_at,
    )
    db.add(reservation)
    await db.flush()
    db.add_all(
        ReservationSeat(
            reservation_id=reservation.id,
            event_id=session_id,
            seat_id=seat.id,
            price=event.price,
        )
        for seat in seats
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Assentos não estão mais disponíveis") from exc

    seat_ids = [seat.id for seat in seats]
    await seat_update_manager.publish_held(session_id, seat_ids, current_user.id)
    return {"id": reservation.id, "session_id": session_id, "seat_ids": seat_ids, "expires_at": expires_at}


@router.delete("/holds/{hold_id}", status_code=status.HTTP_204_NO_CONTENT)
async def release_seat_hold(
    hold_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_client),
) -> None:
    reservation = await db.scalar(
        select(Reservation)
        .where(Reservation.id == hold_id, Reservation.user_id == current_user.id)
        .with_for_update()
    )
    if reservation is None:
        return
    payment_exists = await db.scalar(select(Payment.id).where(Payment.reservation_id == hold_id))
    if reservation.status != ReservationStatus.pending or payment_exists is not None:
        return
    seat_ids = list((await db.scalars(
        select(ReservationSeat.seat_id).where(ReservationSeat.reservation_id == hold_id)
    )).all())
    await db.execute(delete(ReservationSeat).where(ReservationSeat.reservation_id == hold_id))
    reservation.status = ReservationStatus.cancelled
    reservation.hold_expires_at = None
    await db.commit()
    await seat_update_manager.publish_released(reservation.event_id, seat_ids)
