from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.security import create_access_token, hash_password
from app.models.cinema import Cinema, cinema_gatekeepers
from app.models.enums import ReservationStatus, SeatType, TicketStatus, UserRole
from app.models.event import Event
from app.models.movie import Movie
from app.models.reservation import Reservation
from app.models.reservation_seat import ReservationSeat
from app.models.room import Room
from app.models.seat import Seat
from app.models.ticket import Ticket
from app.models.user import User
from app.services.tickets import generate_ticket_token


async def _setup_entrance(db):
    organizer = User(name="Organizer", email="entrance-org@test.com", password_hash=hash_password("password123"), role=UserRole.ORGANIZER)
    gatekeeper = User(name="Gatekeeper", email="entrance-gate@test.com", password_hash=hash_password("password123"), role=UserRole.GATEKEEPER)
    client_user = User(name="Client", email="entrance-client@test.com", password_hash=hash_password("password123"), role=UserRole.CLIENT)
    db.add_all([organizer, gatekeeper, client_user]); await db.flush()
    cinema = Cinema(name="Entrance Cinema", address="Rua 1", organizer_id=organizer.id); db.add(cinema); await db.flush()
    await db.execute(cinema_gatekeepers.insert().values(cinema_id=cinema.id, user_id=gatekeeper.id))
    room = Room(name="Sala 1", capacity=1, cinema_id=cinema.id); movie = Movie(title="Entrance Movie", duration_minutes=100, tmdb_id=990011)
    db.add_all([room, movie]); await db.flush()
    seat = Seat(room_id=room.id, row="A", number=1, seat_type=SeatType.standard); db.add(seat); await db.flush()
    event = Event(movie_id=movie.id, room_id=room.id, organizer_id=organizer.id, start_datetime=datetime.now() + timedelta(hours=2), price=Decimal("20"), projection_type="2D")
    other_event = Event(movie_id=movie.id, room_id=room.id, organizer_id=organizer.id, start_datetime=datetime.now() + timedelta(days=1), price=Decimal("20"), projection_type="2D")
    db.add_all([event, other_event]); await db.flush()
    reservation = Reservation(user_id=client_user.id, event_id=event.id, status=ReservationStatus.confirmed); db.add(reservation); await db.flush()
    reservation_seat = ReservationSeat(reservation_id=reservation.id, event_id=event.id, seat_id=seat.id, price=event.price); db.add(reservation_seat); await db.flush()
    token, token_hash = generate_ticket_token(reservation_seat.id)
    ticket = Ticket(reservation_seat_id=reservation_seat.id, token_hash=token_hash); db.add(ticket); await db.commit()
    return create_access_token(subject=str(gatekeeper.id)), event, other_event, ticket, token


async def test_gatekeeper_validates_ticket_once(client, db_session):
    gate_token, event, _, ticket, token = await _setup_entrance(db_session)
    headers = {"Authorization": f"Bearer {gate_token}"}
    first = await client.post("/api/entrance/validate", headers=headers, json={"token": token})
    assert first.status_code == 200
    assert first.json()["result"] == "valid"
    second = await client.post("/api/entrance/validate", headers=headers, json={"token": token})
    assert second.json()["result"] == "used"
    ticket_id = ticket.id
    db_session.expire_all()
    stored = await db_session.get(Ticket, ticket_id)
    assert stored.status == TicketStatus.used
    assert stored.used_at is not None
    gatekeeper = await db_session.scalar(select(User).where(User.email == "entrance-gate@test.com"))
    assert stored.used_by_id == gatekeeper.id


async def test_entrance_rejects_invalid_token(client, db_session):
    gate_token, _, other_event, _, token = await _setup_entrance(db_session)
    headers = {"Authorization": f"Bearer {gate_token}"}
    invalid = await client.post("/api/entrance/validate", headers=headers, json={"token": token + "changed"})
    assert invalid.json()["result"] == "invalid"
    assert "token_hash" not in invalid.json()


async def test_non_gatekeeper_cannot_validate(client, client_token):
    response = await client.post("/api/entrance/validate", headers={"Authorization": f"Bearer {client_token}"}, json={"token": "not-a-ticket"})
    assert response.status_code == 403


async def test_gatekeeper_cannot_validate_ticket_from_another_cinema(client, db_session):
    gate_token, _, _, _, _ = await _setup_entrance(db_session)
    other_organizer = User(name="Other Organizer", email="other-entrance-org@test.com", password_hash=hash_password("password123"), role=UserRole.ORGANIZER)
    other_client = User(name="Other Client", email="other-entrance-client@test.com", password_hash=hash_password("password123"), role=UserRole.CLIENT)
    db_session.add_all([other_organizer, other_client]); await db_session.flush()
    cinema = Cinema(name="Other Cinema", address="Rua 2", organizer_id=other_organizer.id); db_session.add(cinema); await db_session.flush()
    room = Room(name="Other Room", capacity=1, cinema_id=cinema.id)
    movie = Movie(title="Other Movie", duration_minutes=90, tmdb_id=990012)
    db_session.add_all([room, movie]); await db_session.flush()
    seat = Seat(room_id=room.id, row="A", number=1, seat_type=SeatType.standard); db_session.add(seat); await db_session.flush()
    event = Event(movie_id=movie.id, room_id=room.id, organizer_id=other_organizer.id, start_datetime=datetime.now() + timedelta(hours=2), price=Decimal("20"), projection_type="2D"); db_session.add(event); await db_session.flush()
    reservation = Reservation(user_id=other_client.id, event_id=event.id, status=ReservationStatus.confirmed); db_session.add(reservation); await db_session.flush()
    reservation_seat = ReservationSeat(reservation_id=reservation.id, event_id=event.id, seat_id=seat.id, price=event.price); db_session.add(reservation_seat); await db_session.flush()
    token, token_hash = generate_ticket_token(reservation_seat.id)
    ticket = Ticket(reservation_seat_id=reservation_seat.id, token_hash=token_hash); db_session.add(ticket); await db_session.commit()

    response = await client.post("/api/entrance/validate", headers={"Authorization": f"Bearer {gate_token}"}, json={"token": token})
    assert response.status_code == 200
    assert response.json()["result"] == "invalid"
    assert response.json()["ticket_id"] is None
