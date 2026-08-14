from sqlalchemy import select

from app.models.cinema import Cinema
from app.models.enums import UserRole
from app.models.user import User


async def test_register_organizer_creates_related_cinema(client, db_session):
    response = await client.post(
        "/api/auth/register-organizer",
        json={
            "name": "João Silva",
            "email": "joao@email.com",
            "password": "password123",
            "cinema": {"name": "Cine Lumi Guarulhos", "address": "Guarulhos, SP"},
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["role"] == "ORGANIZER"
    assert body["cinema"]["organizer_id"] == body["user"]["id"]

    user = await db_session.scalar(select(User).where(User.email == "joao@email.com"))
    cinema = await db_session.scalar(select(Cinema).where(Cinema.organizer_id == user.id))
    assert user.role == UserRole.ORGANIZER
    assert cinema.name == "Cine Lumi Guarulhos"


async def test_regular_register_cannot_choose_organizer_role(client):
    response = await client.post(
        "/api/auth/register",
        json={
            "name": "Cliente",
            "email": "cliente@email.com",
            "password": "password123",
            "role": "ORGANIZER",
        },
    )

    assert response.status_code == 201
    assert response.json()["role"] == "CLIENT"


async def test_organizer_can_get_own_cinema(client, db_session):
    register_response = await client.post(
        "/api/auth/register-organizer",
        json={
            "name": "Maria",
            "email": "maria-cinema@email.com",
            "password": "password123",
            "cinema": {"name": "Cine Maria", "address": "Rua Central"},
        },
    )
    user_id = register_response.json()["user"]["id"]
    from app.core.security import create_access_token

    response = await client.get(
        "/api/auth/me/cinema",
        headers={"Authorization": f"Bearer {create_access_token(subject=str(user_id))}"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Cine Maria"
    assert response.json()["organizer_id"] == user_id
async def test_organizer_updates_own_cinema(client, organizer_token):
    response = await client.put(
        "/api/auth/me/cinema",
        json={"name": "Lumi Atualizado", "address": "Rua Nova, 123"},
        headers={"Authorization": f"Bearer {organizer_token}"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Lumi Atualizado"
    assert response.json()["address"] == "Rua Nova, 123"
