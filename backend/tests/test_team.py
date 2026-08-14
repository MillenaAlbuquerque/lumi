from app.core.security import create_access_token, hash_password
from app.models.cinema import Cinema, cinema_gatekeepers
from app.models.enums import UserRole
from app.models.user import User


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_organizer_creates_gatekeeper_for_own_cinema(client, organizer_token, db_session):
    response = await client.post(
        "/api/team",
        json={"name": "Funcionário", "email": "portaria@lumi.com", "password": "password123"},
        headers=_headers(organizer_token),
    )
    assert response.status_code == 201
    assert response.json()["role"] == "GATEKEEPER"

    organizer = await db_session.scalar(select(User).where(User.email == "organizer@lumi-test.com"))
    cinema = await db_session.scalar(select(Cinema).where(Cinema.organizer_id == organizer.id))
    assert response.json()["cinema_id"] == cinema.id


async def test_team_list_is_scoped_and_client_is_forbidden(client, organizer_token, client_token, db_session):
    other = User(name="Outro", email="outro@team.com", password_hash=hash_password("password123"), role=UserRole.ORGANIZER)
    db_session.add(other)
    await db_session.flush()
    other_cinema = Cinema(name="Outro", address="Rua", organizer_id=other.id)
    db_session.add(other_cinema)
    await db_session.flush()
    other_gatekeeper = User(name="Outra Portaria", email="outra@portaria.com", password_hash=hash_password("password123"), role=UserRole.GATEKEEPER)
    db_session.add(other_gatekeeper)
    await db_session.flush()
    await db_session.execute(cinema_gatekeepers.insert().values(cinema_id=other_cinema.id, user_id=other_gatekeeper.id))
    await db_session.commit()

    await client.post("/api/team", json={"name": "Minha Portaria", "email": "minha@portaria.com", "password": "password123"}, headers=_headers(organizer_token))
    response = await client.get("/api/team", headers=_headers(organizer_token))
    assert [member["name"] for member in response.json()] == ["Minha Portaria"]
    assert (await client.get("/api/team", headers=_headers(client_token))).status_code == 403


async def test_gatekeeper_can_login(client, organizer_token):
    await client.post("/api/team", json={"name": "Porteiro", "email": "login@portaria.com", "password": "password123"}, headers=_headers(organizer_token))
    response = await client.post("/api/auth/login", json={"email": "login@portaria.com", "password": "password123"})
    assert response.status_code == 200


async def test_organizer_updates_and_deletes_own_gatekeeper(client, organizer_token):
    created = await client.post(
        "/api/team",
        json={"name": "Porteiro Antigo", "email": "editar@portaria.com", "password": "password123"},
        headers=_headers(organizer_token),
    )
    member_id = created.json()["id"]
    updated = await client.put(
        f"/api/team/{member_id}",
        json={"name": "Porteiro Novo", "email": "novo@portaria.com"},
        headers=_headers(organizer_token),
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Porteiro Novo"
    assert updated.json()["email"] == "novo@portaria.com"

    deleted = await client.delete(f"/api/team/{member_id}", headers=_headers(organizer_token))
    assert deleted.status_code == 204
    assert (await client.get("/api/team", headers=_headers(organizer_token))).json() == []
from sqlalchemy import select
