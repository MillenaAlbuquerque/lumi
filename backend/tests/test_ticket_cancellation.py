from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.models.event import Event
from app.models.enums import TicketStatus
from app.models.ticket import Ticket
from app.services.mercado_pago import get_mercado_pago_client
from tests.test_payments import FakeMercadoPago, _headers, _order, _payload, _setup_showtime


async def _buy_ticket(client, client_token, event, seat, order_id: str):
    client._transport.app.dependency_overrides[get_mercado_pago_client] = lambda: FakeMercadoPago(
        _order(order_id, "approved", "27.50")
    )
    response = await client.post(
        "/api/client/payments",
        headers=_headers(client_token, f"cancel-key-{order_id}"),
        json=_payload(event.id, [seat.id]),
    )
    assert response.status_code == 201


async def test_client_cancels_ticket_more_than_one_hour_before_session_and_seat_is_released(
    client, client_token, organizer_token, db_session
):
    event, seats, _ = await _setup_showtime(db_session)
    await _buy_ticket(client, client_token, event, seats[0], "cancel-success")
    ticket = await db_session.scalar(select(Ticket))

    response = await client.post(
        f"/api/client/tickets/{ticket.id}/cancel",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    await db_session.refresh(ticket)
    assert ticket.status == TicketStatus.cancelled

    availability = await client.get(
        f"/api/client/showtimes/sessions/{event.id}/seats",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    released = next(item for item in availability.json()["seats"] if item["id"] == seats[0].id)
    assert released["occupied"] is False


async def test_client_cannot_cancel_within_one_hour_of_session(
    client, client_token, organizer_token, db_session
):
    event, seats, _ = await _setup_showtime(db_session)
    await _buy_ticket(client, client_token, event, seats[0], "cancel-too-late")
    ticket = await db_session.scalar(select(Ticket))
    stored_event = await db_session.get(Event, event.id)
    stored_event.start_datetime = datetime.now(timezone.utc) + timedelta(minutes=59)
    await db_session.commit()

    response = await client.post(
        f"/api/client/tickets/{ticket.id}/cancel",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert response.status_code == 409
    await db_session.refresh(ticket)
    assert ticket.status == TicketStatus.issued
