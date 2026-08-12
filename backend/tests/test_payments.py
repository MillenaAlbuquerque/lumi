import hashlib
import hmac
from unittest.mock import AsyncMock
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.config import settings
from app.models.cinema import Cinema
from app.models.enums import ReservationStatus, SeatType
from app.models.event import Event
from app.models.movie import Movie
from app.models.payment import Payment
from app.models.reservation import Reservation
from app.models.reservation_seat import ReservationSeat
from app.models.room import Room
from app.models.seat import Seat
from app.models.ticket import Ticket
from app.models.user import User
from app.services.mercado_pago import get_mercado_pago_client
from app.services.seat_updates import seat_update_manager


def _headers(token: str, key: str = "checkout-key-0001") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-Idempotency-Key": key}


def _payload(event_id: int, seat_ids: list[int], hold_id: int | None = None) -> dict:
    payload = {
        "session_id": event_id,
        "seat_ids": seat_ids,
        "token": "test-card-token",
        "payment_method_id": "master",
        "installments": 1,
        "payer": {
            "email": "test@testuser.com",
            "identification_type": "CPF",
            "identification_number": "12345678909",
        },
    }
    if hold_id is not None:
        payload["hold_id"] = hold_id
    return payload


class FakeMercadoPago:
    def __init__(self, create_order: dict, fetched_order: dict | None = None):
        self.created_order = create_order
        self.fetched_order = fetched_order or create_order
        self.create_calls: list[tuple[dict, str]] = []
        self.get_calls: list[str] = []

    async def create_order(self, payload: dict, idempotency_key: str) -> dict:
        self.create_calls.append((payload, idempotency_key))
        return self.created_order

    async def get_order(self, order_id: str) -> dict:
        self.get_calls.append(order_id)
        return self.fetched_order


async def _setup_showtime(db_session):
    organizer = await db_session.scalar(select(User).where(User.email == "organizer@lumi-test.com"))
    cinema = await db_session.scalar(select(Cinema).where(Cinema.organizer_id == organizer.id))
    room = Room(name="Sala Pagamento", capacity=3, cinema_id=cinema.id)
    other_room = Room(name="Sala Pagamento Outra", capacity=1, cinema_id=cinema.id)
    movie = Movie(title="Filme Pagamento", duration_minutes=100, tmdb_id=991001)
    db_session.add_all([room, other_room, movie])
    await db_session.flush()
    seats = [
        Seat(room_id=room.id, row="A", number=1, seat_type=SeatType.standard),
        Seat(room_id=room.id, row="A", number=2, seat_type=SeatType.standard),
    ]
    unrelated = Seat(room_id=other_room.id, row="B", number=1, seat_type=SeatType.standard)
    event = Event(
        movie_id=movie.id,
        room_id=room.id,
        organizer_id=organizer.id,
        start_datetime=datetime.now() + timedelta(days=1),
        price=Decimal("27.50"),
        projection_type="2D",
    )
    db_session.add_all([*seats, unrelated, event])
    await db_session.commit()
    return event, seats, unrelated


def _order(order_id: str, payment_status: str, amount: str = "55.00") -> dict:
    return {
        "id": order_id,
        "status": "processed",
        "total_amount": amount,
        "external_reference": "lumi-payment-1",
        "transactions": {
            "payments": [
                {
                    "id": f"pay-{order_id}",
                    "status": payment_status,
                    "status_detail": f"test_{payment_status}",
                }
            ]
        },
    }


async def test_approved_payment_uses_backend_price_and_is_idempotent(
    client, client_token, organizer_token, db_session, monkeypatch
):
    publish = AsyncMock()
    monkeypatch.setattr(seat_update_manager, "publish_occupied", publish)
    event, seats, _ = await _setup_showtime(db_session)
    fake = FakeMercadoPago(_order("order-approved", "approved"))
    client._transport.app.dependency_overrides[get_mercado_pago_client] = lambda: fake

    response = await client.post(
        "/api/client/payments",
        headers=_headers(client_token),
        json=_payload(event.id, [seat.id for seat in seats]),
    )
    assert response.status_code == 201
    assert response.json()["payment_status"] == "approved"
    assert response.json()["reservation_status"] == "confirmed"
    assert response.json()["unit_price"] == "27.50"
    assert response.json()["total"] == "55.00"
    assert fake.create_calls[0][0]["total_amount"] == "55.00"
    assert fake.create_calls[0][1] == "checkout-key-0001"

    repeated = await client.post(
        "/api/client/payments",
        headers=_headers(client_token),
        json=_payload(event.id, [seat.id for seat in seats]),
    )
    assert repeated.json()["id"] == response.json()["id"]
    assert len(fake.create_calls) == 1
    assert len((await db_session.scalars(select(Ticket))).all()) == 2
    publish.assert_awaited_once_with(event.id, [seat.id for seat in seats])

    availability = await client.get(
        f"/api/client/showtimes/sessions/{event.id}/seats",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert all(seat["occupied"] for seat in availability.json()["seats"])

    tickets = list((await db_session.scalars(select(Ticket).order_by(Ticket.id))).all())
    assert len(tickets) == 2
    assert len({ticket.reservation_seat_id for ticket in tickets}) == 2
    assert all(len(ticket.token_hash) == 64 for ticket in tickets)
    assert all(set(ticket.token_hash) <= set("0123456789abcdef") for ticket in tickets)

    ticket_list = await client.get(
        "/api/client/tickets", headers={"Authorization": f"Bearer {client_token}"}
    )
    assert ticket_list.status_code == 200
    assert len(ticket_list.json()) == 2
    assert {ticket["seat_number"] for ticket in ticket_list.json()} == {1, 2}
    assert all("token_hash" not in ticket for ticket in ticket_list.json())
    assert all(ticket["token"] for ticket in ticket_list.json())
    assert {
        hashlib.sha256(ticket["token"].encode()).hexdigest()
        for ticket in ticket_list.json()
    } == {ticket.token_hash for ticket in tickets}


async def test_rejected_payment_cancels_reservation_and_releases_seats(
    client, client_token, organizer_token, db_session, monkeypatch
):
    publish = AsyncMock()
    monkeypatch.setattr(seat_update_manager, "publish_occupied", publish)
    event, seats, _ = await _setup_showtime(db_session)
    fake = FakeMercadoPago(_order("order-rejected", "failed", "27.50"))
    client._transport.app.dependency_overrides[get_mercado_pago_client] = lambda: fake

    response = await client.post(
        "/api/client/payments",
        headers=_headers(client_token, "checkout-key-rejected"),
        json=_payload(event.id, [seats[0].id]),
    )
    assert response.status_code == 201
    assert response.json()["payment_status"] == "failed"
    assert response.json()["reservation_status"] == "cancelled"
    reservation = await db_session.get(Reservation, response.json()["reservation_id"])
    await db_session.refresh(reservation)
    assert reservation.status == ReservationStatus.cancelled
    assert await db_session.scalar(
        select(ReservationSeat).where(ReservationSeat.reservation_id == reservation.id)
    ) is None
    assert await db_session.scalar(select(Ticket)) is None

    availability = await client.get(
        f"/api/client/showtimes/sessions/{event.id}/seats",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert availability.json()["seats"][0]["occupied"] is False
    publish.assert_not_awaited()


async def test_confirmed_seat_cannot_be_sold_twice(
    client, client_token, organizer_token, db_session
):
    event, seats, _ = await _setup_showtime(db_session)
    fake = FakeMercadoPago(_order("order-first-buyer", "approved", "27.50"))
    client._transport.app.dependency_overrides[get_mercado_pago_client] = lambda: fake

    first_purchase = await client.post(
        "/api/client/payments",
        headers=_headers(client_token, "checkout-key-first-buyer"),
        json=_payload(event.id, [seats[0].id]),
    )
    assert first_purchase.status_code == 201
    assert first_purchase.json()["reservation_status"] == "confirmed"

    second_purchase = await client.post(
        "/api/client/payments",
        headers=_headers(client_token, "checkout-key-second-buyer"),
        json=_payload(event.id, [seats[0].id]),
    )
    assert second_purchase.status_code == 409
    assert second_purchase.json()["detail"] == "One or more seats are no longer available"
    assert len(fake.create_calls) == 1

    reservation_seat_count = len(
        (
            await db_session.scalars(
                select(ReservationSeat).where(
                    ReservationSeat.event_id == event.id,
                    ReservationSeat.seat_id == seats[0].id,
                )
            )
        ).all()
    )
    assert reservation_seat_count == 1


async def test_payment_rejects_seat_from_another_room(
    client, client_token, organizer_token, db_session
):
    event, _, unrelated = await _setup_showtime(db_session)
    fake = FakeMercadoPago(_order("unused", "approved", "27.50"))
    client._transport.app.dependency_overrides[get_mercado_pago_client] = lambda: fake
    response = await client.post(
        "/api/client/payments",
        headers=_headers(client_token, "checkout-key-invalid-seat"),
        json=_payload(event.id, [unrelated.id]),
    )
    assert response.status_code == 409
    assert fake.create_calls == []


async def test_held_seats_are_blocked_and_the_owner_can_pay(
    client, client_token, organizer_token, db_session, monkeypatch
):
    event, seats, _ = await _setup_showtime(db_session)
    publish_held = AsyncMock()
    publish_occupied = AsyncMock()
    monkeypatch.setattr(seat_update_manager, "publish_held", publish_held)
    monkeypatch.setattr(seat_update_manager, "publish_occupied", publish_occupied)

    hold_response = await client.post(
        f"/api/client/showtimes/sessions/{event.id}/holds",
        headers={"Authorization": f"Bearer {client_token}"},
        json={"seat_ids": [seats[0].id]},
    )
    assert hold_response.status_code == 201
    hold = hold_response.json()
    publish_held.assert_awaited_once_with(event.id, [seats[0].id], 1)

    competing_hold = await client.post(
        f"/api/client/showtimes/sessions/{event.id}/holds",
        headers={"Authorization": f"Bearer {client_token}"},
        json={"seat_ids": [seats[0].id]},
    )
    assert competing_hold.status_code == 409

    fake = FakeMercadoPago(_order("order-held-seat", "approved", "27.50"))
    client._transport.app.dependency_overrides[get_mercado_pago_client] = lambda: fake
    payment_response = await client.post(
        "/api/client/payments",
        headers=_headers(client_token, "checkout-key-held-seat"),
        json=_payload(event.id, [seats[0].id], hold["id"]),
    )
    assert payment_response.status_code == 201
    assert payment_response.json()["reservation_id"] == hold["id"]
    assert payment_response.json()["reservation_status"] == "confirmed"
    publish_occupied.assert_awaited_once_with(event.id, [seats[0].id])


async def test_pending_payment_is_confirmed_only_after_verified_webhook(
    client, client_token, organizer_token, db_session
):
    event, seats, _ = await _setup_showtime(db_session)
    pending_order = _order("order-pending", "pending", "27.50")
    approved_order = _order("order-pending", "approved", "27.50")
    fake = FakeMercadoPago(pending_order, approved_order)
    client._transport.app.dependency_overrides[get_mercado_pago_client] = lambda: fake

    response = await client.post(
        "/api/client/payments",
        headers=_headers(client_token, "checkout-key-pending"),
        json=_payload(event.id, [seats[0].id]),
    )
    assert response.json()["reservation_status"] == "pending"
    payment = await db_session.get(Payment, response.json()["id"])
    assert payment.status == "pending"

    previous_secret = settings.mercado_pago_webhook_secret
    settings.mercado_pago_webhook_secret = "webhook-test-secret"
    try:
        request_id = "request-123"
        timestamp = "1742505638683"
        manifest = f"id:order-pending;request-id:{request_id};ts:{timestamp};"
        signature = hmac.new(
            settings.mercado_pago_webhook_secret.encode(),
            manifest.encode(),
            hashlib.sha256,
        ).hexdigest()
        webhook = await client.post(
            "/api/webhooks/mercado-pago?data.id=order-pending",
            headers={
                "X-Request-Id": request_id,
                "X-Signature": f"ts={timestamp},v1={signature}",
            },
            json={"type": "order", "live_mode": False, "data": {"id": "order-pending"}},
        )
    finally:
        settings.mercado_pago_webhook_secret = previous_secret

    assert webhook.status_code == 200
    assert fake.get_calls == ["order-pending"]
    db_session.expire_all()
    reservation = await db_session.get(Reservation, response.json()["reservation_id"])
    assert reservation.status == ReservationStatus.confirmed
