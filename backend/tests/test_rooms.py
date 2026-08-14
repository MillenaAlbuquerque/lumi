from datetime import datetime, timedelta, timezone
from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy import select

from app.core.security import create_access_token, hash_password
from app.models.cinema import Cinema
from app.models.enums import UserRole
from app.models.event import Event
from app.models.movie import Movie
from app.models.room import Room
from app.models.user import User


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _create_other_organizer(db_session) -> tuple[User, Cinema, str]:
    user = User(
        name="Outro Organizer",
        email="outro-organizer@lumi-test.com",
        password_hash=hash_password("password123"),
        role=UserRole.ORGANIZER,
    )
    db_session.add(user)
    await db_session.flush()
    cinema = Cinema(name="Outro Cinema", address="Outra rua", organizer_id=user.id)
    db_session.add(cinema)
    await db_session.commit()
    await db_session.refresh(cinema)
    return user, cinema, create_access_token(subject=str(user.id))


async def test_organizer_creates_room_in_own_cinema(client, organizer_token, db_session):
    response = await client.post(
        "/api/rooms",
        json={"name": "Sala 1", "rows": 3, "seats_per_row": 5},
        headers=_auth_headers(organizer_token),
    )

    assert response.status_code == 201
    body = response.json()
    organizer = await db_session.scalar(select(User).where(User.email == "organizer@lumi-test.com"))
    cinema = await db_session.scalar(select(Cinema).where(Cinema.organizer_id == organizer.id))
    assert body["cinema_id"] == cinema.id
    assert body["capacity"] == 15
    assert len(body["seats"]) == 15


async def test_organizer_cannot_access_update_or_delete_other_cinema_room(
    client, organizer_token, db_session
):
    _, other_cinema, _ = await _create_other_organizer(db_session)
    room = Room(name="Sala Privada", capacity=10, cinema_id=other_cinema.id)
    db_session.add(room)
    await db_session.commit()
    await db_session.refresh(room)
    headers = _auth_headers(organizer_token)

    assert (await client.get(f"/api/rooms/{room.id}", headers=headers)).status_code == 404
    assert (
        await client.put(f"/api/rooms/{room.id}", json={"name": "Invadida"}, headers=headers)
    ).status_code == 404
    assert (await client.delete(f"/api/rooms/{room.id}", headers=headers)).status_code == 404


async def test_common_user_cannot_manage_rooms(client, client_token):
    headers = _auth_headers(client_token)
    assert (await client.get("/api/rooms", headers=headers)).status_code == 403
    assert (
        await client.post(
            "/api/rooms",
            json={"name": "Sala Cliente", "rows": 2, "seats_per_row": 2},
            headers=headers,
        )
    ).status_code == 403
    assert (await client.get("/api/rooms/1", headers=headers)).status_code == 403
    assert (
        await client.put("/api/rooms/1", json={"name": "Sala"}, headers=headers)
    ).status_code == 403
    assert (await client.delete("/api/rooms/1", headers=headers)).status_code == 403


async def test_list_returns_only_rooms_from_organizer_cinema(client, organizer_token, db_session):
    organizer = await db_session.scalar(select(User).where(User.email == "organizer@lumi-test.com"))
    own_cinema = await db_session.scalar(select(Cinema).where(Cinema.organizer_id == organizer.id))
    _, other_cinema, _ = await _create_other_organizer(db_session)
    db_session.add_all(
        [
            Room(name="Minha Sala", capacity=20, cinema_id=own_cinema.id),
            Room(name="Sala de Outro", capacity=20, cinema_id=other_cinema.id),
        ]
    )
    await db_session.commit()

    response = await client.get("/api/rooms", headers=_auth_headers(organizer_token))

    assert response.status_code == 200
    assert [room["name"] for room in response.json()] == ["Minha Sala"]


async def test_cinema_id_cannot_be_sent_or_changed(client, organizer_token):
    headers = _auth_headers(organizer_token)
    create_response = await client.post(
        "/api/rooms",
        json={"name": "Sala", "rows": 2, "seats_per_row": 2, "cinema_id": 999},
        headers=headers,
    )
    assert create_response.status_code == 422

    valid = await client.post(
        "/api/rooms",
        json={"name": "Sala", "rows": 2, "seats_per_row": 2},
        headers=headers,
    )
    room_id = valid.json()["id"]
    update_response = await client.put(
        f"/api/rooms/{room_id}",
        json={"name": "Novo nome", "cinema_id": 999},
        headers=headers,
    )
    assert update_response.status_code == 422


async def test_organizer_deletes_room_without_sessions(client, organizer_token):
    created = await client.post(
        "/api/rooms",
        json={"name": "Sala Temporária", "rows": 2, "seats_per_row": 2},
        headers=_auth_headers(organizer_token),
    )
    response = await client.delete(
        f"/api/rooms/{created.json()['id']}", headers=_auth_headers(organizer_token)
    )
    assert response.status_code == 204
    assert (await client.get("/api/rooms", headers=_auth_headers(organizer_token))).json() == []


async def test_organizer_cannot_delete_room_with_session(client, organizer_token, db_session):
    organizer = await db_session.scalar(select(User).where(User.email == "organizer@lumi-test.com"))
    cinema = await db_session.scalar(select(Cinema).where(Cinema.organizer_id == organizer.id))
    room = Room(name="Sala com Sessão", capacity=10, cinema_id=cinema.id)
    movie = Movie(title="Filme", duration_minutes=100)
    db_session.add_all([room, movie])
    await db_session.flush()
    db_session.add(Event(movie_id=movie.id, room_id=room.id, organizer_id=organizer.id, start_datetime=datetime.now(timezone.utc) + timedelta(days=1), price=Decimal("20.00"), projection_type="2D"))
    await db_session.commit()

    response = await client.delete(f"/api/rooms/{room.id}", headers=_auth_headers(organizer_token))
    assert response.status_code == 409
    assert "sessões" in response.json()["detail"]
