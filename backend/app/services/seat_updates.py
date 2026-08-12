import asyncio
from collections import defaultdict

from fastapi import WebSocket


class SeatUpdateManager:
    """Keeps the live seat-map connections grouped by session."""

    def __init__(self) -> None:
        self._connections: dict[int, dict[WebSocket, int]] = defaultdict(dict)
        self._lock = asyncio.Lock()

    async def connect(self, session_id: int, websocket: WebSocket, user_id: int) -> None:
        async with self._lock:
            self._connections[session_id][websocket] = user_id

    async def disconnect(self, session_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            connections = self._connections.get(session_id)
            if connections is None:
                return
            connections.pop(websocket, None)
            if not connections:
                self._connections.pop(session_id, None)

    async def publish_occupied(self, session_id: int, seat_ids: list[int]) -> None:
        await self._publish("seats_occupied", session_id, seat_ids)

    async def publish_held(self, session_id: int, seat_ids: list[int], owner_user_id: int) -> None:
        await self._publish("seats_held", session_id, seat_ids, excluded_user_id=owner_user_id)

    async def publish_released(self, session_id: int, seat_ids: list[int]) -> None:
        await self._publish("seats_released", session_id, seat_ids)

    async def _publish(
        self,
        message_type: str,
        session_id: int,
        seat_ids: list[int],
        excluded_user_id: int | None = None,
    ) -> None:
        if not seat_ids:
            return
        async with self._lock:
            connections = tuple(self._connections.get(session_id, {}).items())

        message = {
            "type": message_type,
            "session_id": session_id,
            "seat_ids": seat_ids,
        }
        disconnected: list[WebSocket] = []
        for websocket, user_id in connections:
            if user_id == excluded_user_id:
                continue
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(websocket)
        for websocket in disconnected:
            await self.disconnect(session_id, websocket)


seat_update_manager = SeatUpdateManager()
