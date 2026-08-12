from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ReservationStatus
from app.models.payment import Payment
from app.models.reservation import Reservation
from app.models.reservation_seat import ReservationSeat
from app.services.seat_updates import seat_update_manager


async def expire_seat_holds(db: AsyncSession, session_id: int | None = None) -> None:
    query = (
        select(Reservation.id, Reservation.event_id, ReservationSeat.seat_id)
        .join(ReservationSeat, ReservationSeat.reservation_id == Reservation.id)
        .outerjoin(Payment, Payment.reservation_id == Reservation.id)
        .where(
            Reservation.status == ReservationStatus.pending,
            Reservation.hold_expires_at.is_not(None),
            Reservation.hold_expires_at <= datetime.now(timezone.utc),
            Payment.id.is_(None),
        )
    )
    if session_id is not None:
        query = query.where(Reservation.event_id == session_id)
    rows = (await db.execute(query.with_for_update(of=Reservation))).all()
    if not rows:
        return

    reservation_ids = {row.id for row in rows}
    released: dict[int, list[int]] = defaultdict(list)
    for row in rows:
        released[row.event_id].append(row.seat_id)
    await db.execute(delete(ReservationSeat).where(ReservationSeat.reservation_id.in_(reservation_ids)))
    reservations = list((await db.scalars(select(Reservation).where(Reservation.id.in_(reservation_ids)))).all())
    for reservation in reservations:
        reservation.status = ReservationStatus.cancelled
        reservation.hold_expires_at = None
    await db.commit()
    for event_id, seat_ids in released.items():
        await seat_update_manager.publish_released(event_id, seat_ids)
