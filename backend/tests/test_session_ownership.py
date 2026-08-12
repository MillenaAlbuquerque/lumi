from datetime import datetime, timedelta

from sqlalchemy import select

from app.core.security import create_access_token, hash_password
from app.models.cinema import Cinema
from app.models.enums import UserRole
from app.models.movie import Movie
from app.models.room import Room
from app.models.user import User


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_session_uses_only_own_room_and_list_is_scoped(client, organizer_token, db_session):
    organizer = await db_session.scalar(select(User).where(User.email == "organizer@lumi-test.com"))
    cinema = await db_session.scalar(select(Cinema).where(Cinema.organizer_id == organizer.id))
    own_room = Room(name="Minha Sala", capacity=20, cinema_id=cinema.id)
    movie = Movie(title="Filme Global", duration_minutes=100, tmdb_id=880001)
    other = User(name="Outro", email="other-session@test.com", password_hash=hash_password("password123"), role=UserRole.ORGANIZER)
    db_session.add_all([own_room, movie, other])
    await db_session.flush()
    other_cinema = Cinema(name="Outro Cinema", address="Rua", organizer_id=other.id)
    db_session.add(other_cinema)
    await db_session.flush()
    other_room = Room(name="Sala Alheia", capacity=20, cinema_id=other_cinema.id)
    db_session.add(other_room)
    await db_session.commit()

    payload = {"movie_id": movie.id, "room_id": own_room.id, "start_datetime": (datetime.now() + timedelta(days=10)).isoformat(), "price": 25, "projection_type": "3D"}
    created = await client.post("/api/events", json=payload, headers=_headers(organizer_token))
    assert created.status_code == 201
    assert created.json()["projection_type"] == "3D"

    forbidden_room = await client.post("/api/events", json={**payload, "room_id": other_room.id}, headers=_headers(organizer_token))
    assert forbidden_room.status_code == 404

    other_payload = {**payload, "room_id": other_room.id, "start_datetime": (datetime.now() + timedelta(days=12)).isoformat()}
    other_token = create_access_token(subject=str(other.id))
    assert (await client.post("/api/events", json=other_payload, headers=_headers(other_token))).status_code == 201

    listed = await client.get("/api/events", headers=_headers(organizer_token))
    assert [event["room_id"] for event in listed.json()] == [own_room.id]
