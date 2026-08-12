from app.services.mercado_pago import get_mercado_pago_client
from tests.test_payments import FakeMercadoPago, _headers, _order, _payload, _setup_showtime


async def test_organizer_dashboard_reports_confirmed_ticket_sales(
    client, client_token, organizer_token, db_session
):
    event, seats, _ = await _setup_showtime(db_session)
    client._transport.app.dependency_overrides[get_mercado_pago_client] = lambda: FakeMercadoPago(
        _order("order-dashboard", "approved")
    )
    payment = await client.post(
        "/api/client/payments",
        headers=_headers(client_token, "checkout-dashboard-key"),
        json=_payload(event.id, [seat.id for seat in seats]),
    )
    assert payment.status_code == 201

    response = await client.get(
        "/api/organizer/tickets/dashboard",
        headers={"Authorization": f"Bearer {organizer_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["tickets_sold"] == 2
    assert body["tickets_used"] == 0
    assert body["total_revenue"] == "55.00"
    assert body["sessions_with_sales"] == 1
    assert body["sessions"][0]["event_id"] == event.id
    assert body["sessions"][0]["tickets_sold"] == 2
    assert body["sessions"][0]["revenue"] == "55.00"


async def test_client_cannot_access_organizer_ticket_dashboard(client, client_token):
    response = await client.get(
        "/api/organizer/tickets/dashboard",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert response.status_code == 403
