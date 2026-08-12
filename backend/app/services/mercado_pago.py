import hashlib
import hmac
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


class MercadoPagoError(Exception):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


def _provider_error(response: httpx.Response, fallback: str) -> MercadoPagoError:
    try:
        body = response.json()
    except ValueError:
        body = {}
    code = body.get("code") or body.get("error")
    message = body.get("message") or body.get("detail")
    description = f"{code}: {message}" if code and message else str(code or message or fallback)
    return MercadoPagoError(description, response.status_code)


class MercadoPagoClient:
    def __init__(self) -> None:
        if settings.mercado_pago_environment != "test":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Mercado Pago must run in test environment",
            )
        if not settings.mercado_pago_access_token_test:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Mercado Pago TEST credentials are not configured",
            )
        self.base_url = settings.mercado_pago_api_url.rstrip("/")
        self.access_token = settings.mercado_pago_access_token_test

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    async def create_order(self, payload: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        headers = {**self.headers, "X-Idempotency-Key": idempotency_key}
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    f"{self.base_url}/v1/orders", json=payload, headers=headers
                )
        except httpx.HTTPError as exc:
            raise MercadoPagoError("Could not communicate with Mercado Pago") from exc
        if response.status_code == status.HTTP_402_PAYMENT_REQUIRED:
            try:
                declined_order = response.json()
            except ValueError:
                declined_order = {}
            # A recusa é um resultado de negócio válido na API Orders, não uma
            # indisponibilidade do provedor. Algumas respostas 402 já trazem a
            # Order completa; outras trazem apenas code/message.
            if declined_order.get("status") or declined_order.get("transactions"):
                return declined_order
            return {
                "status": "failed",
                "status_detail": declined_order.get("code")
                or declined_order.get("message")
                or "rejected_by_provider",
                "total_amount": payload.get("total_amount"),
                "external_reference": payload.get("external_reference"),
                "transactions": {
                    "payments": [
                        {
                            "status": "failed",
                            "status_detail": declined_order.get("code")
                            or declined_order.get("message")
                            or "rejected_by_provider",
                        }
                    ]
                },
            }
        if response.is_error:
            raise _provider_error(response, f"Mercado Pago rejected the order request ({response.status_code})")
        return response.json()

    async def get_order(self, order_id: str) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.get(
                    f"{self.base_url}/v1/orders/{order_id}", headers=self.headers
                )
        except httpx.HTTPError as exc:
            raise MercadoPagoError("Could not communicate with Mercado Pago") from exc
        if response.is_error:
            raise _provider_error(response, f"Could not retrieve Mercado Pago order ({response.status_code})")
        return response.json()


def get_mercado_pago_client() -> MercadoPagoClient:
    return MercadoPagoClient()


def validate_webhook_signature(
    x_signature: str | None,
    x_request_id: str | None,
    data_id: str | None,
) -> bool:
    secret = settings.mercado_pago_webhook_secret
    if not secret or not x_signature or not data_id:
        return False
    parts = dict(
        part.strip().split("=", 1)
        for part in x_signature.split(",")
        if "=" in part
    )
    timestamp = parts.get("ts")
    received_hash = parts.get("v1")
    if not timestamp or not received_hash:
        return False
    manifest_parts = [f"id:{data_id};"]
    if x_request_id:
        manifest_parts.append(f"request-id:{x_request_id};")
    manifest_parts.append(f"ts:{timestamp};")
    expected_hash = hmac.new(
        secret.encode(), "".join(manifest_parts).encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_hash, received_hash)


def extract_order_payment(order: dict[str, Any]) -> tuple[str, str | None, str | None]:
    payments = order.get("transactions", {}).get("payments") or []
    payment = payments[0] if payments else {}
    payment_status = str(payment.get("status") or order.get("status") or "pending").lower()
    payment_id = payment.get("id")
    status_detail = payment.get("status_detail") or order.get("status_detail")
    return payment_status, str(payment_id) if payment_id is not None else None, status_detail
