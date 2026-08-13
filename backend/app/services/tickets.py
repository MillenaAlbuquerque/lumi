import hashlib
import base64
import hmac

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reservation_seat import ReservationSeat
from app.models.ticket import Ticket
from app.core.config import settings

MANUAL_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def _base32_encode(value: int, length: int) -> str:
    chars = []
    for _ in range(length):
        chars.append(MANUAL_CODE_ALPHABET[value & 31])
        value >>= 5
    return "".join(reversed(chars))


def _base32_decode(value: str) -> int | None:
    result = 0
    try:
        for char in value:
            result = (result << 5) | MANUAL_CODE_ALPHABET.index(char)
        return result
    except ValueError:
        return None


def ticket_manual_code(ticket_id: int) -> str:
    payload = ticket_id.to_bytes(4, "big")
    mask = hmac.new(
        settings.jwt_secret_key.encode(), b"lumi-manual-mask", hashlib.sha256
    ).digest()[:4]
    obfuscated_payload = bytes(left ^ right for left, right in zip(payload, mask))
    signature = hmac.new(
        settings.jwt_secret_key.encode(), b"lumi-manual:" + payload, hashlib.sha256
    ).digest()[:3]
    encoded = _base32_encode(int.from_bytes(signature + obfuscated_payload, "big"), 12)
    return f"{encoded[:4]}-{encoded[4:8]}-{encoded[8:]}"


def ticket_id_from_manual_code(code: str) -> int | None:
    normalized = "".join(char for char in code.upper() if char.isalnum())
    if len(normalized) != 12:
        return None
    packed = _base32_decode(normalized)
    if packed is None:
        return None
    raw = packed.to_bytes(8, "big")[-7:]
    mask = hmac.new(
        settings.jwt_secret_key.encode(), b"lumi-manual-mask", hashlib.sha256
    ).digest()[:4]
    payload = bytes(left ^ right for left, right in zip(raw[3:], mask))
    ticket_id = int.from_bytes(payload, "big")
    expected = ticket_manual_code(ticket_id).replace("-", "")
    return ticket_id if hmac.compare_digest(expected, normalized) else None


def generate_ticket_token(reservation_seat_id: int) -> tuple[str, str]:
    """Create an authenticated token that can be reproduced without storing it."""
    payload = base64.urlsafe_b64encode(
        f"lumi-ticket:{reservation_seat_id}".encode("utf-8")
    ).rstrip(b"=").decode("ascii")
    signature = hmac.new(
        settings.jwt_secret_key.encode("utf-8"), payload.encode("ascii"), hashlib.sha256
    ).hexdigest()
    token = f"{payload}.{signature}"
    return token, hashlib.sha256(token.encode("utf-8")).hexdigest()


def ticket_token(ticket: Ticket) -> str:
    token, token_hash = generate_ticket_token(ticket.reservation_seat_id)
    if not hmac.compare_digest(token_hash, ticket.token_hash):
        raise ValueError("Stored ticket token hash does not match")
    return token


def ticket_reservation_seat_id(token: str) -> int | None:
    try:
        payload, received_signature = token.split(".", 1)
        expected_signature = hmac.new(
            settings.jwt_secret_key.encode("utf-8"),
            payload.encode("ascii"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected_signature, received_signature):
            return None
        padding = "=" * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload + padding).decode("utf-8")
        prefix, raw_id = decoded.rsplit(":", 1)
        if prefix != "lumi-ticket":
            return None
        return int(raw_id)
    except (ValueError, UnicodeDecodeError):
        return None


async def issue_reservation_tickets(
    db: AsyncSession, reservation_seats: list[ReservationSeat]
) -> list[str]:
    """Idempotently issue one ticket for every confirmed reservation seat."""
    seat_ids = [item.id for item in reservation_seats]
    if not seat_ids:
        return []

    already_issued = set(
        (
            await db.scalars(
                select(Ticket.reservation_seat_id).where(
                    Ticket.reservation_seat_id.in_(seat_ids)
                )
            )
        ).all()
    )
    raw_tokens: list[str] = []
    for reservation_seat in reservation_seats:
        if reservation_seat.id in already_issued:
            continue
        raw_token, token_hash = generate_ticket_token(reservation_seat.id)
        db.add(Ticket(reservation_seat_id=reservation_seat.id, token_hash=token_hash))
        raw_tokens.append(raw_token)
    return raw_tokens
