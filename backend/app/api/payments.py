from decimal import Decimal
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_client
from app.db.session import get_db
from app.models.enums import ReservationStatus
from app.models.event import Event
from app.models.payment import Payment
from app.models.reservation import Reservation
from app.models.reservation_seat import ReservationSeat
from app.models.room import Room
from app.models.seat import Seat
from app.models.user import User
from app.schemas.payment import MercadoPagoWebhook, PaymentCreate, PaymentRead
from app.services.mercado_pago import (
    MercadoPagoClient,
    MercadoPagoError,
    extract_order_payment,
    get_mercado_pago_client,
    validate_webhook_signature,
)
from app.services.tickets import issue_reservation_tickets
from app.services.seat_updates import seat_update_manager
from app.services.seat_holds import expire_seat_holds

router = APIRouter(tags=["payments"])

APPROVED_PROVIDER_STATUSES = {"approved", "processed"}
CANCELLED_PROVIDER_STATUSES = {
    "rejected", "failed", "cancelled", "canceled", "expired", "refunded", "charged_back"
}


def _payment_query():
    return select(Payment).options(
        selectinload(Payment.reservation).selectinload(Reservation.event),
        selectinload(Payment.reservation)
        .selectinload(Reservation.reservation_seats)
        .selectinload(ReservationSeat.seat),
    )


def _payment_read(payment: Payment) -> dict:
    reservation = payment.reservation
    reservation_seats = reservation.reservation_seats
    unit_price = reservation_seats[0].price if reservation_seats else reservation.event.price
    return {
        "id": payment.id,
        "reservation_id": reservation.id,
        "session_id": reservation.event_id,
        "payment_status": payment.status,
        "status_detail": payment.status_detail,
        "reservation_status": reservation.status.value,
        "provider_order_id": payment.provider_order_id,
        "provider_payment_id": payment.provider_payment_id,
        "unit_price": unit_price,
        "total": payment.amount,
        "seats": [
            {
                "id": item.seat.id,
                "row": item.seat.row,
                "number": item.seat.number,
                "price": item.price,
            }
            for item in reservation_seats
        ],
        "created_at": payment.created_at,
    }


async def _loaded_payment(db: AsyncSession, payment_id: int) -> Payment:
    payment = await db.scalar(_payment_query().where(Payment.id == payment_id))
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


async def _reconcile_payment(
    db: AsyncSession, payment: Payment, order: dict, *, expected_order_id: str | None = None
) -> None:
    was_confirmed = payment.reservation.status == ReservationStatus.confirmed
    was_cancelled = payment.reservation.status == ReservationStatus.cancelled
    order_id = order.get("id")
    if expected_order_id and str(order_id) != expected_order_id:
        raise HTTPException(status_code=409, detail="Mercado Pago order does not match")

    external_reference = order.get("external_reference")
    if external_reference and external_reference != f"lumi-payment-{payment.id}":
        raise HTTPException(status_code=409, detail="Mercado Pago reference does not match")

    order_amount = order.get("total_amount")
    if order_amount is not None and Decimal(str(order_amount)) != payment.amount:
        payment.status_detail = "provider_amount_mismatch"
        await db.commit()
        raise HTTPException(status_code=409, detail="Mercado Pago amount does not match")

    provider_status, provider_payment_id, status_detail = extract_order_payment(order)
    payment.provider_order_id = str(order_id) if order_id is not None else payment.provider_order_id
    payment.provider_payment_id = provider_payment_id or payment.provider_payment_id
    payment.status = provider_status
    payment.status_detail = status_detail

    if provider_status == "approved" or (
        provider_status == "processed" and status_detail in {None, "accredited"}
    ):
        payment.reservation.status = ReservationStatus.confirmed
        await issue_reservation_tickets(db, payment.reservation.reservation_seats)
    elif provider_status in CANCELLED_PROVIDER_STATUSES:
        payment.reservation.status = ReservationStatus.cancelled
        await db.execute(
            delete(ReservationSeat).where(
                ReservationSeat.reservation_id == payment.reservation_id
            )
        )
    else:
        payment.reservation.status = ReservationStatus.pending
    occupied_seat_ids = [item.seat_id for item in payment.reservation.reservation_seats]
    session_id = payment.reservation.event_id
    await db.commit()
    if payment.reservation.status == ReservationStatus.confirmed and not was_confirmed:
        await seat_update_manager.publish_occupied(session_id, occupied_seat_ids)
    elif payment.reservation.status == ReservationStatus.cancelled and not was_cancelled:
        await seat_update_manager.publish_released(session_id, occupied_seat_ids)


def _order_payload(payment: Payment, payload: PaymentCreate) -> dict:
    return {
        "type": "online",
        "processing_mode": "automatic",
        "total_amount": f"{payment.amount:.2f}",
        "external_reference": f"lumi-payment-{payment.id}",
        "payer": {
            "email": str(payload.payer.email),
            "identification": {
                "type": payload.payer.identification_type,
                "number": payload.payer.identification_number,
            },
        },
        "transactions": {
            "payments": [
                {
                    "amount": f"{payment.amount:.2f}",
                    "payment_method": {
                        "id": payload.payment_method_id,
                        "type": "credit_card",
                        "token": payload.token,
                        "installments": payload.installments,
                    },
                }
            ]
        },
    }


@router.post("/client/payments", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payload: PaymentCreate,
    idempotency_key: str = Header(..., alias="X-Idempotency-Key", min_length=8, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_client),
    mercado_pago: MercadoPagoClient = Depends(get_mercado_pago_client),
) -> dict:
    await expire_seat_holds(db, payload.session_id)
    existing = await db.scalar(
        _payment_query().where(Payment.idempotency_key == idempotency_key)
    )
    if existing is not None:
        if existing.reservation.user_id != current_user.id:
            raise HTTPException(status_code=409, detail="Idempotency key is already in use")
        if existing.provider_order_id is not None:
            return _payment_read(existing)
        payment = existing
    else:
        event = await db.scalar(
            select(Event)
            .join(Room, Event.room_id == Room.id)
            .where(Event.id == payload.session_id, Event.start_datetime > func.now())
            .with_for_update()
        )
        if event is None:
            raise HTTPException(status_code=404, detail="Session is unavailable")

        seats = list(
            (
                await db.scalars(
                    select(Seat)
                    .where(Seat.room_id == event.room_id, Seat.id.in_(payload.seat_ids))
                    .order_by(Seat.id)
                    .with_for_update()
                )
            ).all()
        )
        if len(seats) != len(payload.seat_ids):
            raise HTTPException(status_code=409, detail="One or more seats do not belong to this session")

        occupied_rows = (await db.execute(
            select(
                ReservationSeat.seat_id,
                Reservation.id.label("reservation_id"),
                Reservation.user_id,
                Reservation.hold_expires_at,
            )
            .join(Reservation, Reservation.id == ReservationSeat.reservation_id)
            .where(
                ReservationSeat.event_id == event.id,
                ReservationSeat.seat_id.in_(payload.seat_ids),
                Reservation.status.in_([ReservationStatus.pending, ReservationStatus.confirmed]),
            )
        )).all()
        if occupied_rows:
            held_ids = {row.seat_id for row in occupied_rows}
            valid_hold = (
                payload.hold_id is not None
                and held_ids == set(payload.seat_ids)
                and {row.reservation_id for row in occupied_rows} == {payload.hold_id}
                and all(row.user_id == current_user.id for row in occupied_rows)
                and all(
                    row.hold_expires_at is not None
                    and row.hold_expires_at > datetime.now(timezone.utc)
                    for row in occupied_rows
                )
            )
            if not valid_hold:
                raise HTTPException(status_code=409, detail="One or more seats are no longer available")
            reservation = await db.get(Reservation, payload.hold_id, with_for_update=True)
            reservation.hold_expires_at = None
        else:
            if payload.hold_id is not None:
                raise HTTPException(status_code=409, detail="Seat hold has expired")
            reservation = Reservation(
                user_id=current_user.id,
                event_id=event.id,
                status=ReservationStatus.pending,
            )
            db.add(reservation)
            await db.flush()
            db.add_all(
                ReservationSeat(
                    reservation_id=reservation.id,
                    event_id=event.id,
                    seat_id=seat.id,
                    price=event.price,
                )
                for seat in seats
            )
        payment = Payment(
            reservation_id=reservation.id,
            idempotency_key=idempotency_key,
            status="pending",
            amount=event.price * len(seats),
        )
        db.add(payment)
        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            duplicate = await db.scalar(
                _payment_query().where(Payment.idempotency_key == idempotency_key)
            )
            if duplicate is not None and duplicate.reservation.user_id == current_user.id:
                return _payment_read(duplicate)
            raise HTTPException(status_code=409, detail="Seats are no longer available") from exc
        payment = await _loaded_payment(db, payment.id)

    try:
        order = await mercado_pago.create_order(
            _order_payload(payment, payload), idempotency_key
        )
    except MercadoPagoError as exc:
        released_seat_ids = [item.seat_id for item in payment.reservation.reservation_seats]
        released_session_id = payment.reservation.event_id
        release_seats = False
        payment.status_detail = str(exc)[:255]
        if exc.status_code is not None and 400 <= exc.status_code < 500:
            payment.status = "failed"
            payment.reservation.status = ReservationStatus.cancelled
            release_seats = True
            await db.execute(
                delete(ReservationSeat).where(
                    ReservationSeat.reservation_id == payment.reservation_id
                )
            )
        await db.commit()
        if release_seats:
            await seat_update_manager.publish_released(released_session_id, released_seat_ids)
        raise HTTPException(status_code=502, detail=f"Mercado Pago: {exc}") from exc

    await _reconcile_payment(db, payment, order)
    return _payment_read(await _loaded_payment(db, payment.id))


@router.get("/client/payments/{payment_id}", response_model=PaymentRead)
async def get_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_client),
) -> dict:
    payment = await _loaded_payment(db, payment_id)
    if payment.reservation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Payment not found")
    return _payment_read(payment)


@router.post("/webhooks/mercado-pago", status_code=status.HTTP_200_OK)
async def mercado_pago_webhook(
    payload: MercadoPagoWebhook,
    data_id: str | None = Query(default=None, alias="data.id"),
    x_signature: str | None = Header(default=None, alias="X-Signature"),
    x_request_id: str | None = Header(default=None, alias="X-Request-Id"),
    db: AsyncSession = Depends(get_db),
    mercado_pago: MercadoPagoClient = Depends(get_mercado_pago_client),
) -> dict[str, str]:
    if payload.live_mode:
        raise HTTPException(status_code=400, detail="Production notifications are disabled")
    if payload.type != "order":
        return {"status": "ignored"}
    order_id = data_id or payload.data.get("id")
    if not validate_webhook_signature(x_signature, x_request_id, order_id):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        order = await mercado_pago.get_order(order_id)
    except MercadoPagoError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    payment = await db.scalar(
        _payment_query().where(Payment.provider_order_id == order_id)
    )
    if payment is None:
        return {"status": "ignored"}
    await _reconcile_payment(db, payment, order, expected_order_id=order_id)
    return {"status": "processed"}
