import hashlib

from sqlalchemy import select

from app.models.ticket import Ticket
from app.services.mercado_pago import get_mercado_pago_client
from tests.test_payments import FakeMercadoPago, _headers, _order, _payload, _setup_showtime


async def test_owner_creates_share_link_and_public_can_view(client, client_token, organizer_token, db_session):
    event, seats, _ = await _setup_showtime(db_session)
    fake = FakeMercadoPago(_order("order-share", "approved", "27.50"))
    client._transport.app.dependency_overrides[get_mercado_pago_client] = lambda: fake
    payment = await client.post("/api/client/payments", headers=_headers(client_token, "checkout-share-key"), json=_payload(event.id, [seats[0].id]))
    assert payment.status_code == 201
    ticket = await db_session.scalar(select(Ticket))

    share = await client.post(f"/api/client/tickets/{ticket.id}/share", headers={"Authorization": f"Bearer {client_token}"})
    assert share.status_code == 200
    raw_share_token = share.json()["share_url"].rsplit("/", 1)[-1]
    await db_session.refresh(ticket)
    assert ticket.share_token_hash == hashlib.sha256(raw_share_token.encode()).hexdigest()
    assert raw_share_token not in ticket.share_token_hash

    public = await client.get(f"/api/tickets/shared/{raw_share_token}")
    assert public.status_code == 200
    assert public.json()["movie_title"] == "Filme Pagamento"
    assert public.json()["token"]
    assert "token_hash" not in public.json()


async def test_new_share_link_invalidates_previous(client, client_token, organizer_token, db_session):
    event, seats, _ = await _setup_showtime(db_session)
    client._transport.app.dependency_overrides[get_mercado_pago_client] = lambda: FakeMercadoPago(_order("order-share-rotate", "approved", "27.50"))
    await client.post("/api/client/payments", headers=_headers(client_token, "checkout-share-rotate"), json=_payload(event.id, [seats[0].id]))
    ticket = await db_session.scalar(select(Ticket))
    first = (await client.post(f"/api/client/tickets/{ticket.id}/share", headers={"Authorization": f"Bearer {client_token}"})).json()["share_url"].rsplit("/", 1)[-1]
    second = (await client.post(f"/api/client/tickets/{ticket.id}/share", headers={"Authorization": f"Bearer {client_token}"})).json()["share_url"].rsplit("/", 1)[-1]
    assert first != second
    assert (await client.get(f"/api/tickets/shared/{first}")).status_code == 404
    assert (await client.get(f"/api/tickets/shared/{second}")).status_code == 200
