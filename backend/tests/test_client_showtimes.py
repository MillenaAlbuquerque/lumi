from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.models.cinema import Cinema
from app.models.event import Event
from app.models.movie import Movie
from app.models.room import Room
from app.models.seat import Seat
from app.models.reservation import Reservation
from app.models.reservation_seat import ReservationSeat
from app.models.enums import ReservationStatus, SeatType
from app.models.user import User


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_client_selection_flow_uses_only_future_related_showtimes(
    client, client_token, organizer_token, db_session
):
    organizer = await db_session.scalar(select(User).where(User.email == "organizer@lumi-test.com"))
    cinema = await db_session.scalar(select(Cinema).where(Cinema.organizer_id == organizer.id))
    room = Room(name="Sala Cliente", capacity=20, cinema_id=cinema.id)
    available_movie = Movie(title="Filme Disponível", duration_minutes=100, tmdb_id=990001)
    unavailable_movie = Movie(title="Filme Antigo", duration_minutes=90, tmdb_id=990002)
    db_session.add_all([room, available_movie, unavailable_movie])
    await db_session.flush()
    future = Event(movie_id=available_movie.id, room_id=room.id, organizer_id=organizer.id, start_datetime=datetime.now() + timedelta(days=2), price=Decimal("25"), projection_type="2D")
    past = Event(movie_id=unavailable_movie.id, room_id=room.id, organizer_id=organizer.id, start_datetime=datetime.now() - timedelta(days=2), price=Decimal("20"), projection_type="2D")
    db_session.add_all([future, past])
    await db_session.commit()

    headers = _headers(client_token)
    movies = await client.get("/api/client/showtimes/movies")
    assert movies.status_code == 200
    assert [movie["id"] for movie in movies.json()] == [available_movie.id]

    movies_on_session_date = await client.get(
        "/api/client/showtimes/movies",
        params={"date": future.start_datetime.date().isoformat()},
    )
    assert [movie["id"] for movie in movies_on_session_date.json()] == [available_movie.id]
    movies_on_another_date = await client.get(
        "/api/client/showtimes/movies",
        params={"date": (future.start_datetime.date() + timedelta(days=1)).isoformat()},
    )
    assert movies_on_another_date.json() == []

    cinemas = await client.get(
        f"/api/client/showtimes/movies/{available_movie.id}/cinemas", headers=headers
    )
    assert [item["id"] for item in cinemas.json()] == [cinema.id]

    sessions = await client.get(
        f"/api/client/showtimes/movies/{available_movie.id}/cinemas/{cinema.id}/sessions",
        headers=headers,
    )
    sessions_on_date = await client.get(
        f"/api/client/showtimes/movies/{available_movie.id}/cinemas/{cinema.id}/sessions",
        params={"date": future.start_datetime.date().isoformat()},
        headers=headers,
    )
    sessions_on_another_date = await client.get(
        f"/api/client/showtimes/movies/{available_movie.id}/cinemas/{cinema.id}/sessions",
        params={"date": (future.start_datetime.date() + timedelta(days=1)).isoformat()},
        headers=headers,
    )
    assert [item["id"] for item in sessions_on_date.json()] == [future.id]
    assert sessions_on_another_date.json() == []
    assert [item["id"] for item in sessions.json()] == [future.id]
    assert sessions.json()[0]["cinema_id"] == cinema.id

    unrelated = await client.get(
        f"/api/client/showtimes/movies/{unavailable_movie.id}/cinemas/{cinema.id}/sessions",
        headers=headers,
    )
    assert unrelated.json() == []

    assert (await client.get("/api/client/showtimes/movies")).status_code == 200


async def test_client_gets_only_session_room_seats_with_occupied_state(
    client, client_token, organizer_token, db_session
):
    organizer = await db_session.scalar(select(User).where(User.email == "organizer@lumi-test.com"))
    customer = await db_session.scalar(select(User).where(User.email == "client@lumi-test.com"))
    cinema = await db_session.scalar(select(Cinema).where(Cinema.organizer_id == organizer.id))
    room = Room(name="Sala Assentos", capacity=2, cinema_id=cinema.id)
    other_room = Room(name="Outra Sala", capacity=1, cinema_id=cinema.id)
    movie = Movie(title="Filme com Assentos", duration_minutes=110, tmdb_id=990003)
    db_session.add_all([room, other_room, movie])
    await db_session.flush()
    available_seat = Seat(room_id=room.id, row="A", number=1, seat_type=SeatType.standard)
    occupied_seat = Seat(room_id=room.id, row="A", number=2, seat_type=SeatType.vip)
    unrelated_seat = Seat(room_id=other_room.id, row="B", number=1, seat_type=SeatType.standard)
    event = Event(movie_id=movie.id, room_id=room.id, organizer_id=organizer.id, start_datetime=datetime.now() + timedelta(days=1), price=Decimal("30"), projection_type="2D")
    db_session.add_all([available_seat, occupied_seat, unrelated_seat, event])
    await db_session.flush()
    reservation = Reservation(user_id=customer.id, event_id=event.id, status=ReservationStatus.confirmed)
    db_session.add(reservation)
    await db_session.flush()
    db_session.add(ReservationSeat(reservation_id=reservation.id, event_id=event.id, seat_id=occupied_seat.id, price=Decimal("30")))
    await db_session.commit()

    response = await client.get(
        f"/api/client/showtimes/sessions/{event.id}/seats",
        headers=_headers(client_token),
    )
    assert response.status_code == 200
    assert response.json()["session"]["room_id"] == room.id
    assert response.json()["seats"] == [
        {"id": available_seat.id, "row": "A", "number": 1, "seat_type": "standard", "occupied": False},
        {"id": occupied_seat.id, "row": "A", "number": 2, "seat_type": "vip", "occupied": True},
    ]

    assert (await client.get(f"/api/client/showtimes/sessions/{event.id}/seats")).status_code == 401
    assert (await client.get(f"/api/client/showtimes/sessions/{event.id}/seats", headers=_headers(organizer_token))).status_code == 403
    assert (await client.get("/api/client/showtimes/sessions/999999/seats", headers=_headers(client_token))).status_code == 404
