from app.services.seat_updates import SeatUpdateManager


class FakeWebSocket:
    def __init__(self) -> None:
        self.messages: list[dict] = []

    async def send_json(self, message: dict) -> None:
        self.messages.append(message)


async def test_seat_updates_are_scoped_to_the_selected_session():
    manager = SeatUpdateManager()
    first_session = FakeWebSocket()
    other_session = FakeWebSocket()
    await manager.connect(10, first_session, 1)  # type: ignore[arg-type]
    await manager.connect(20, other_session, 2)  # type: ignore[arg-type]

    await manager.publish_occupied(10, [4, 7])

    assert first_session.messages == [
        {"type": "seats_occupied", "session_id": 10, "seat_ids": [4, 7]}
    ]
    assert other_session.messages == []
