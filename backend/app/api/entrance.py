import hashlib
import hmac

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_gatekeeper
from app.db.session import get_db
from app.models.cinema import cinema_gatekeepers
from app.models.enums import TicketStatus
from app.models.event import Event
from app.models.reservation_seat import ReservationSeat
from app.models.room import Room
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.entrance import EntranceEventRead, EntranceValidationCreate, EntranceValidationRead
from app.services.tickets import ticket_reservation_seat_id

router = APIRouter(prefix="/entrance", tags=["entrance"])


def _ticket_result(result: str, message: str, ticket: Ticket | None = None) -> dict:
    if ticket is None:
        return {"result": result, "message": message}
    event = ticket.reservation_seat.event
    return {
        "result": result,
        "message": message,
        "ticket_id": ticket.id,
        "movie_title": event.movie.title,
        "room_name": event.room.name,
        "seat": f"{ticket.reservation_seat.seat.row}{ticket.reservation_seat.seat.number}",
        "used_at": ticket.used_at,
    }


@router.get("/events", response_model=list[EntranceEventRead])
async def list_entrance_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_gatekeeper),
) -> list[dict]:
    events = (
        await db.execute(
            select(Event, Room)
            .join(Room, Event.room_id == Room.id)
            .join(cinema_gatekeepers, cinema_gatekeepers.c.cinema_id == Room.cinema_id)
            .where(cinema_gatekeepers.c.user_id == current_user.id)
            .options(selectinload(Event.movie))
            .order_by(Event.start_datetime.desc())
        )
    ).all()
    return [
        {
            "id": event.id,
            "movie_title": event.movie.title,
            "room_name": room.name,
            "start_datetime": event.start_datetime,
            "projection_type": event.projection_type,
        }
        for event, room in events
    ]


@router.post("/validate", response_model=EntranceValidationRead)
async def validate_entrance_ticket(
    payload: EntranceValidationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_gatekeeper),
) -> dict:
    allowed_event = await db.scalar(
        select(Event.id)
        .join(Room, Event.room_id == Room.id)
        .join(cinema_gatekeepers, cinema_gatekeepers.c.cinema_id == Room.cinema_id)
        .where(Event.id == payload.event_id, cinema_gatekeepers.c.user_id == current_user.id)
    )
    if allowed_event is None:
        return _ticket_result("wrong_event", "Esta sessão não pertence ao cinema da portaria.")

    reservation_seat_id = ticket_reservation_seat_id(payload.token.strip())
    if reservation_seat_id is None:
        return _ticket_result("invalid", "Código de ingresso inválido.")

    ticket = await db.scalar(
        select(Ticket)
        .where(Ticket.reservation_seat_id == reservation_seat_id)
        .with_for_update()
        .options(
            selectinload(Ticket.reservation_seat).selectinload(ReservationSeat.seat),
            selectinload(Ticket.reservation_seat).selectinload(ReservationSeat.event).selectinload(Event.movie),
            selectinload(Ticket.reservation_seat).selectinload(ReservationSeat.event).selectinload(Event.room),
        )
    )
    token_hash = hashlib.sha256(payload.token.strip().encode("utf-8")).hexdigest()
    if ticket is None or not hmac.compare_digest(ticket.token_hash, token_hash):
        return _ticket_result("invalid", "Código de ingresso inválido.")
    if ticket.reservation_seat.event_id != payload.event_id:
        return _ticket_result("wrong_event", "O ingresso pertence a outra sessão.", ticket)
    if ticket.status == TicketStatus.used:
        return _ticket_result("used", "Este ingresso já foi utilizado.", ticket)
    if ticket.status != TicketStatus.issued:
        return _ticket_result("invalid", "Este ingresso não está válido.", ticket)

    ticket.status = TicketStatus.used
    from sqlalchemy import func
    ticket.used_at = await db.scalar(select(func.now()))
    await db.commit()
    return _ticket_result("valid", "Entrada liberada.", ticket)
