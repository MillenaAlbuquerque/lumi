from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class OrganizerSessionSalesRead(BaseModel):
    event_id: int
    movie_id: int
    movie_title: str
    poster_url: str | None
    room_name: str
    start_datetime: datetime
    capacity: int
    tickets_sold: int
    tickets_used: int
    revenue: Decimal
    occupancy_percentage: float


class OrganizerTicketDashboardRead(BaseModel):
    tickets_sold: int
    tickets_used: int
    total_revenue: Decimal
    sessions_with_sales: int
    sessions: list[OrganizerSessionSalesRead]
