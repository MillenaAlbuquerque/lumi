import asyncio

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from jose import JWTError
from sqlalchemy import func, select

from app.core.security import decode_access_token
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.enums import UserRole
from app.models.event import Event
from app.models.user import User
from app.services.seat_updates import seat_update_manager

router = APIRouter(tags=["seat-updates"])


@router.websocket("/client/showtimes/sessions/{session_id}/seats/live")
async def session_seat_updates(
    websocket: WebSocket,
    session_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    await websocket.accept()
    try:
        auth_message = await asyncio.wait_for(websocket.receive_json(), timeout=10)
        token = auth_message.get("token") if auth_message.get("type") == "authenticate" else None
        payload = decode_access_token(token or "")
        user_id = int(payload["sub"])
    except (asyncio.TimeoutError, JWTError, KeyError, TypeError, ValueError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return

    user = await db.get(User, user_id)
    event_exists = await db.scalar(
        select(Event.id).where(Event.id == session_id, Event.start_datetime > func.now())
    )
    if user is None or user.role != UserRole.CLIENT or event_exists is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Session unavailable")
        return

    await seat_update_manager.connect(session_id, websocket, user_id)
    await websocket.send_json({"type": "connected", "session_id": session_id})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await seat_update_manager.disconnect(session_id, websocket)
