from datetime import datetime, timedelta, timezone
import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_client
from app.db.session import get_db
from app.models.event import Event
from app.models.reservation import Reservation
from app.models.reservation_seat import ReservationSeat
from app.models.room import Room
from app.models.ticket import Ticket
from app.models.enums import ReservationStatus, TicketStatus
from app.models.user import User
from app.core.config import settings
from app.schemas.ticket import ClientTicketRead, SharedTicketRead, TicketShareRead
from app.services.tickets import ticket_manual_code, ticket_token

router = APIRouter(prefix="/client/tickets", tags=["tickets"])


def _ticket_details(ticket: Ticket, *, include_identity: bool = True) -> dict:
    reservation_seat = ticket.reservation_seat
    event = reservation_seat.reservation.event
    result = {
        "status": ticket.status,
        "movie_title": event.movie.title,
        "poster_url": event.movie.poster_url,
        "cinema_name": event.room.cinema.name,
        "cinema_address": event.room.cinema.address,
        "room_name": event.room.name,
        "session_datetime": event.start_datetime,
        "projection_type": event.projection_type,
        "seat_row": reservation_seat.seat.row,
        "seat_number": reservation_seat.seat.number,
        "token": ticket_token(ticket),
        "manual_code": ticket_manual_code(ticket.id),
    }
    if include_identity:
        result.update({"id": ticket.id, "issued_at": ticket.issued_at, "reservation_id": reservation_seat.reservation_id, "session_id": reservation_seat.event_id, "price": reservation_seat.price})
    return result


def _ticket_options():
    return (
        selectinload(Ticket.reservation_seat).selectinload(ReservationSeat.seat),
        selectinload(Ticket.reservation_seat).selectinload(ReservationSeat.reservation).selectinload(Reservation.event).selectinload(Event.movie),
        selectinload(Ticket.reservation_seat).selectinload(ReservationSeat.reservation).selectinload(Reservation.event).selectinload(Event.room).selectinload(Room.cinema),
    )


@router.get("", response_model=list[ClientTicketRead])
async def list_client_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_client),
) -> list[dict]:
    tickets = list(
        (
            await db.scalars(
                select(Ticket)
                .join(Ticket.reservation_seat)
                .join(ReservationSeat.reservation)
                .where(Reservation.user_id == current_user.id)
                .options(*_ticket_options())
                .order_by(Ticket.issued_at.desc(), Ticket.id.desc())
            )
        ).all()
    )
    return [_ticket_details(ticket) for ticket in tickets]


@router.post("/{ticket_id}/cancel", response_model=ClientTicketRead)
async def cancel_client_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_client),
) -> dict:
    ticket = await db.scalar(
        select(Ticket)
        .join(Ticket.reservation_seat)
        .join(ReservationSeat.reservation)
        .where(Ticket.id == ticket_id, Reservation.user_id == current_user.id)
        .with_for_update()
        .options(*_ticket_options())
    )
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ingresso não encontrado.")
    if ticket.status != TicketStatus.issued:
        raise HTTPException(status_code=409, detail="Somente ingressos válidos podem ser cancelados.")

    event = ticket.reservation_seat.reservation.event
    if event.start_datetime <= datetime.now(timezone.utc) + timedelta(hours=1):
        raise HTTPException(status_code=409, detail="O ingresso só pode ser cancelado até 1 hora antes da sessão.")

    ticket.status = TicketStatus.cancelled
    ticket.share_token_hash = None
    ticket.share_expires_at = None

    reservation = ticket.reservation_seat.reservation
    active_tickets = await db.scalar(
        select(func.count(Ticket.id))
        .join(Ticket.reservation_seat)
        .where(
            ReservationSeat.reservation_id == reservation.id,
            Ticket.id != ticket.id,
            Ticket.status.in_([TicketStatus.issued, TicketStatus.used]),
        )
    )
    if not active_tickets:
        reservation.status = ReservationStatus.cancelled
    await db.commit()
    await db.refresh(ticket)

    from app.services.seat_updates import seat_update_manager
    await seat_update_manager.publish_released(event.id, [ticket.reservation_seat.seat_id])
    return _ticket_details(ticket)


@router.post("/{ticket_id}/share", response_model=TicketShareRead)
async def create_ticket_share(ticket_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_client)) -> dict:
    ticket = await db.scalar(select(Ticket).join(Ticket.reservation_seat).join(ReservationSeat.reservation).where(Ticket.id == ticket_id, Reservation.user_id == current_user.id))
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status != TicketStatus.issued:
        raise HTTPException(status_code=409, detail="Somente ingressos válidos podem ser compartilhados.")
    raw_token = secrets.token_urlsafe(32)
    ticket.share_token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    ticket.share_expires_at = await db.scalar(select(func.now() + timedelta(days=7)))
    await db.commit()
    return {"share_url": f"{settings.frontend_url.rstrip('/')}/ingresso/compartilhado/{raw_token}", "expires_at": ticket.share_expires_at}


public_router = APIRouter(prefix="/tickets/shared", tags=["tickets"])


@public_router.get("/{share_token}", response_model=SharedTicketRead)
async def get_shared_ticket(share_token: str, db: AsyncSession = Depends(get_db)) -> dict:
    token_hash = hashlib.sha256(share_token.encode()).hexdigest()
    ticket = await db.scalar(select(Ticket).where(Ticket.share_token_hash == token_hash, Ticket.share_expires_at > func.now()).options(*_ticket_options()))
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared ticket not found or expired")
    return _ticket_details(ticket, include_identity=False)
