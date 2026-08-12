from datetime import datetime, timedelta, timezone

from httpx import AsyncClient

from app.models.movie import Movie
from app.models.room import Room


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _create_movie(db_session, title: str = "Movie Test", duration_minutes: int = 120) -> Movie:
    movie = Movie(title=title, duration_minutes=duration_minutes, tmdb_id=999)
    db_session.add(movie)
    await db_session.commit()
    await db_session.refresh(movie)
    return movie


async def _create_room(db_session, name: str = "Sala Teste") -> Room:
    room = Room(name=name, capacity=50)
    db_session.add(room)
    await db_session.commit()
    await db_session.refresh(room)
    return room


async def test_create_event_success(client: AsyncClient, organizer_token: str, db_session) -> None:
    movie = await _create_movie(db_session)
    room = await _create_room(db_session)

    payload = {
        "movie_id": movie.id,
        "room_id": room.id,
        "start_datetime": "2026-08-15T20:30:00",
        "price": 25.00,
    }

    response = await client.post("/events", json=payload, headers=_auth_headers(organizer_token))

    assert response.status_code == 201
    body = response.json()
    assert body["movie"]["id"] == movie.id
    assert body["room"]["id"] == room.id
    assert body["organizer"]["role"] == "ORGANIZER"
    assert body["price"] == 25.0


async def test_create_event_as_client_forbidden(client: AsyncClient, client_token: str, db_session) -> None:
    movie = await _create_movie(db_session)
    room = await _create_room(db_session)

    payload = {
        "movie_id": movie.id,
        "room_id": room.id,
        "start_datetime": "2026-08-16T20:30:00",
        "price": 25.00,
    }

    response = await client.post("/events", json=payload, headers=_auth_headers(client_token))

    assert response.status_code == 403


async def test_create_event_conflict_in_same_room(client: AsyncClient, organizer_token: str, db_session) -> None:
    movie = await _create_movie(db_session, duration_minutes=90)
    room = await _create_room(db_session, name="Sala Conflito")

    first_payload = {
        "movie_id": movie.id,
        "room_id": room.id,
        "start_datetime": "2026-08-17T20:00:00",
        "price": 20.00,
    }
    first_response = await client.post("/events", json=first_payload, headers=_auth_headers(organizer_token))
    assert first_response.status_code == 201

    second_payload = {
        "movie_id": movie.id,
        "room_id": room.id,
        "start_datetime": "2026-08-17T21:15:00",
        "price": 20.00,
    }
    second_response = await client.post("/events", json=second_payload, headers=_auth_headers(organizer_token))

    assert second_response.status_code == 409


async def test_create_event_with_missing_movie_returns_404(client: AsyncClient, organizer_token: str, db_session) -> None:
    room = await _create_room(db_session)
    payload = {
        "movie_id": 9999,
        "room_id": room.id,
        "start_datetime": "2026-08-19T20:30:00",
        "price": 25.00,
    }

    response = await client.post("/events", json=payload, headers=_auth_headers(organizer_token))

    assert response.status_code == 404


async def test_create_event_with_missing_room_returns_404(client: AsyncClient, organizer_token: str, db_session) -> None:
    movie = await _create_movie(db_session)
    payload = {
        "movie_id": movie.id,
        "room_id": 9999,
        "start_datetime": "2026-08-20T20:30:00",
        "price": 25.00,
    }

    response = await client.post("/events", json=payload, headers=_auth_headers(organizer_token))

    assert response.status_code == 404


async def test_create_event_with_negative_price_returns_422(client: AsyncClient, organizer_token: str, db_session) -> None:
    movie = await _create_movie(db_session)
    room = await _create_room(db_session)
    payload = {
        "movie_id": movie.id,
        "room_id": room.id,
        "start_datetime": "2026-08-21T20:30:00",
        "price": -1.00,
    }

    response = await client.post("/events", json=payload, headers=_auth_headers(organizer_token))

    assert response.status_code == 422


async def test_create_event_with_invalid_datetime_returns_422(client: AsyncClient, organizer_token: str, db_session) -> None:
    movie = await _create_movie(db_session)
    room = await _create_room(db_session)
    payload = {
        "movie_id": movie.id,
        "room_id": room.id,
        "start_datetime": "invalid-date",
        "price": 25.00,
    }

    response = await client.post("/events", json=payload, headers=_auth_headers(organizer_token))

    assert response.status_code == 422


async def test_list_and_get_event(client: AsyncClient, organizer_token: str, db_session) -> None:
    movie = await _create_movie(db_session, title="Movie Detail", duration_minutes=100)
    room = await _create_room(db_session, name="Sala Listagem")

    payload = {
        "movie_id": movie.id,
        "room_id": room.id,
        "start_datetime": "2026-08-18T19:00:00",
        "price": 30.00,
    }
    created = await client.post("/events", json=payload, headers=_auth_headers(organizer_token))
    event_id = created.json()["id"]

    list_response = await client.get("/events", headers=_auth_headers(organizer_token))
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    detail_response = await client.get(f"/events/{event_id}", headers=_auth_headers(organizer_token))
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == event_id


async def test_update_event_success(client: AsyncClient, organizer_token: str, db_session) -> None:
    movie = await _create_movie(db_session, title="Movie Update", duration_minutes=100)
    room = await _create_room(db_session, name="Sala Update")
    payload = {
        "movie_id": movie.id,
        "room_id": room.id,
        "start_datetime": "2026-08-22T19:00:00",
        "price": 30.00,
    }
    created = await client.post("/events", json=payload, headers=_auth_headers(organizer_token))
    event_id = created.json()["id"]

    update_payload = {"price": 35.00}
    response = await client.put(f"/events/{event_id}", json=update_payload, headers=_auth_headers(organizer_token))

    assert response.status_code == 200
    assert response.json()["price"] == 35.0


async def test_delete_event_success(client: AsyncClient, organizer_token: str, db_session) -> None:
    movie = await _create_movie(db_session, title="Movie Delete", duration_minutes=100)
    room = await _create_room(db_session, name="Sala Delete")
    payload = {
        "movie_id": movie.id,
        "room_id": room.id,
        "start_datetime": "2026-08-23T19:00:00",
        "price": 30.00,
    }
    created = await client.post("/events", json=payload, headers=_auth_headers(organizer_token))
    event_id = created.json()["id"]

    response = await client.delete(f"/events/{event_id}", headers=_auth_headers(organizer_token))

    assert response.status_code == 204


async def test_get_missing_event_returns_404(client: AsyncClient, organizer_token: str) -> None:
    response = await client.get("/events/9999", headers=_auth_headers(organizer_token))

    assert response.status_code == 404
