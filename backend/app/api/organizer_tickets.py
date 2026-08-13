from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_organizer
from app.db.session import get_db
from app.models.cinema import Cinema
from app.models.enums import TicketStatus
from app.models.event import Event
from app.models.movie import Movie
from app.models.reservation_seat import ReservationSeat
from app.models.room import Room
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.organizer_ticket import OrganizerTicketDashboardRead

router = APIRouter(prefix="/organizer/tickets", tags=["organizer-tickets"])


@router.get("/dashboard", response_model=OrganizerTicketDashboardRead)
async def organizer_ticket_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organizer),
) -> dict:
    rows = (
        await db.execute(
            select(
                Event.id,
                Movie.title,
                Movie.poster_url,
                Room.name,
                Event.start_datetime,
                Room.capacity,
                func.count(Ticket.id),
                func.count(case((Ticket.status == TicketStatus.used, 1))),
                func.coalesce(func.sum(ReservationSeat.price), 0),
            )
            .join(Room, Event.room_id == Room.id)
            .join(Cinema, Room.cinema_id == Cinema.id)
            .join(Movie, Event.movie_id == Movie.id)
            .join(ReservationSeat, ReservationSeat.event_id == Event.id)
            .join(Ticket, Ticket.reservation_seat_id == ReservationSeat.id)
            .where(Cinema.organizer_id == current_user.id, Ticket.status != TicketStatus.cancelled)
            .group_by(Event.id, Movie.id, Room.id)
            .order_by(Event.start_datetime.desc())
        )
    ).all()

    sessions = []
    for event_id, title, poster_url, room_name, start_datetime, capacity, sold, used, revenue in rows:
        sessions.append(
            {
                "event_id": event_id,
                "movie_title": title,
                "poster_url": poster_url,
                "room_name": room_name,
                "start_datetime": start_datetime,
                "capacity": capacity,
                "tickets_sold": sold,
                "tickets_used": used,
                "revenue": revenue,
                "occupancy_percentage": round((sold / capacity * 100) if capacity else 0, 1),
            }
        )
    return {
        "tickets_sold": sum(item["tickets_sold"] for item in sessions),
        "tickets_used": sum(item["tickets_used"] for item in sessions),
        "total_revenue": sum((item["revenue"] for item in sessions), Decimal("0")),
        "sessions_with_sales": len(sessions),
        "sessions": sessions,
    }
