"""Idempotent demonstration data for the local Lumi environment.

Run from ``backend`` with: ``python -m app.seed_demo``.
"""

import asyncio
import sys
from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import func, insert, select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal, engine
from app.models.cinema import Cinema, cinema_gatekeepers
from app.models.enums import SeatType, UserRole
from app.models.event import Event
from app.models.movie import Movie
from app.models.room import Room
from app.models.seat import Seat
from app.models.user import User

DEMO_PASSWORD = "LumiDemo123!"
SAO_PAULO = ZoneInfo("America/Sao_Paulo")

USERS = (
    ("Marina Costa", "organizador.paulista@lumi.demo", UserRole.ORGANIZER),
    ("Rafael Almeida", "organizador.guarulhos@lumi.demo", UserRole.ORGANIZER),
    ("Ana Cliente", "cliente.teste2@testuser.com", UserRole.CLIENT),
    ("Lucas Cliente", "cliente.teste@testuser.com", UserRole.CLIENT),
    ("Carlos Portaria", "portaria.paulista@lumi.demo", UserRole.GATEKEEPER),
)

MOVIES = (
    {
        "tmdb_id": 693134, "title": "Duna: Parte Dois", "duration_minutes": 166,
        "description": "Paul Atreides se une a Chani e aos Fremen enquanto busca vingança e tenta impedir um futuro terrível.",
        "rating": "14", "release_date": date(2024, 2, 29),
        "poster_url": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    },
    {
        "tmdb_id": 1022789, "title": "Divertida Mente 2", "duration_minutes": 96,
        "description": "Riley entra na adolescência e novas emoções chegam para transformar o centro de controle de sua mente.",
        "rating": "L", "release_date": date(2024, 6, 20),
        "poster_url": "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/6cCb2Q2V0nq8T9oWJZx3K7IY8aE.jpg",
    },
    {
        "tmdb_id": 653346, "title": "Planeta dos Macacos: O Reinado", "duration_minutes": 145,
        "description": "Gerações após César, um jovem macaco inicia uma jornada que definirá o futuro de macacos e humanos.",
        "rating": "14", "release_date": date(2024, 5, 9),
        "poster_url": "https://image.tmdb.org/t/p/w500/gKkl37BQuKTanygYQG1pyYgLVgf.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/fqv8v6AycXKsivp1T5yKtLbGxnd.jpg",
    },
    {
        "tmdb_id": 786892, "title": "Furiosa: Uma Saga Mad Max", "duration_minutes": 149,
        "description": "A jovem Furiosa enfrenta um mundo em colapso para encontrar o caminho de volta para casa.",
        "rating": "16", "release_date": date(2024, 5, 23),
        "poster_url": "https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xceZprc.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/wNAhuOZ3Zf84jCIlrcI6JhgmY5q.jpg",
    },
    {
        "tmdb_id": 823464, "title": "Godzilla e Kong: O Novo Império", "duration_minutes": 115,
        "description": "Godzilla e Kong enfrentam uma ameaça colossal escondida nas profundezas do planeta.",
        "rating": "12", "release_date": date(2024, 3, 28),
        "poster_url": "https://image.tmdb.org/t/p/w500/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/j3Z3XktmWB1VhsS8iXNcrR86PXi.jpg",
    },
    {
        "tmdb_id": 533535, "title": "Deadpool & Wolverine", "duration_minutes": 128,
        "description": "Deadpool recruta Wolverine para uma missão que pode mudar para sempre a história de seu universo.",
        "rating": "18", "release_date": date(2024, 7, 25),
        "poster_url": "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
    },
)


async def upsert_user(session, name: str, email: str, role: UserRole) -> User:
    user = await session.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(name=name, email=email, role=role, password_hash=hash_password(DEMO_PASSWORD))
        session.add(user)
        await session.flush()
    else:
        user.name, user.role = name, role
        user.password_hash = hash_password(DEMO_PASSWORD)
    return user


async def upsert_cinema(session, organizer: User, name: str, address: str) -> Cinema:
    cinema = await session.scalar(select(Cinema).where(Cinema.organizer_id == organizer.id))
    if cinema is None:
        cinema = Cinema(name=name, address=address, organizer_id=organizer.id)
        session.add(cinema)
        await session.flush()
    else:
        cinema.name, cinema.address = name, address
    return cinema


async def upsert_room(session, cinema: Cinema, name: str, rows: int, seats_per_row: int) -> Room:
    room = await session.scalar(select(Room).where(Room.cinema_id == cinema.id, Room.name == name))
    capacity = rows * seats_per_row
    if room is None:
        room = Room(name=name, capacity=capacity, cinema_id=cinema.id)
        session.add(room)
        await session.flush()
    else:
        room.capacity = capacity

    existing = {(seat.row, seat.number): seat for seat in (await session.scalars(select(Seat).where(Seat.room_id == room.id))).all()}
    for row_index in range(rows):
        row = chr(ord("A") + row_index)
        for number in range(1, seats_per_row + 1):
            seat_type = SeatType.accessible if row_index == 0 and number <= 2 else SeatType.vip if row_index >= rows - 2 else SeatType.standard
            seat = existing.get((row, number))
            if seat is None:
                session.add(Seat(room_id=room.id, row=row, number=number, seat_type=seat_type))
            else:
                seat.seat_type = seat_type
    await session.flush()
    return room


async def upsert_movie(session, data: dict) -> Movie:
    movie = await session.scalar(select(Movie).where(Movie.tmdb_id == data["tmdb_id"]))
    if movie is None:
        movie = Movie(**data)
        session.add(movie)
        await session.flush()
    else:
        for key, value in data.items():
            setattr(movie, key, value)
    return movie


async def upsert_event(session, organizer: User, room: Room, movie: Movie, start: datetime, price: str, projection: str) -> None:
    event = await session.scalar(select(Event).where(Event.room_id == room.id, Event.movie_id == movie.id, Event.start_datetime == start))
    if event is None:
        session.add(Event(room_id=room.id, movie_id=movie.id, organizer_id=organizer.id, start_datetime=start, price=Decimal(price), projection_type=projection))
    else:
        event.organizer_id, event.price, event.projection_type = organizer.id, Decimal(price), projection


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        async with session.begin():
            legacy_client = await session.scalar(select(User).where(User.email == "cliente.apro@testuser.com"))
            new_client = await session.scalar(select(User).where(User.email == "cliente.teste2@testuser.com"))
            if legacy_client is not None and new_client is None:
                legacy_client.email = "cliente.teste2@testuser.com"
            users = {email: await upsert_user(session, name, email, role) for name, email, role in USERS}
            paulista = await upsert_cinema(session, users["organizador.paulista@lumi.demo"], "Cine Paulista", "Avenida Paulista, 1578 — Bela Vista, São Paulo — SP")
            guarulhos = await upsert_cinema(session, users["organizador.guarulhos@lumi.demo"], "Cine Guraulhos", "Avenida Paulo Faccini, 1650 — Centro, Guarulhos — SP")

            gatekeeper = users["portaria.paulista@lumi.demo"]
            linked = await session.scalar(select(cinema_gatekeepers.c.user_id).where(cinema_gatekeepers.c.cinema_id == paulista.id, cinema_gatekeepers.c.user_id == gatekeeper.id))
            if linked is None:
                await session.execute(insert(cinema_gatekeepers).values(cinema_id=paulista.id, user_id=gatekeeper.id))

            rooms = {
                "aurora": await upsert_room(session, paulista, "Sala Aurora", 8, 10),
                "imax": await upsert_room(session, paulista, "Sala IMAX", 6, 12),
                "lumiere": await upsert_room(session, guarulhos, "Sala Lumière", 7, 9),
                "vip": await upsert_room(session, guarulhos, "Sala VIP", 5, 8),
            }
            movies = {data["tmdb_id"]: await upsert_movie(session, data) for data in MOVIES}

            schedules = (
                ("aurora", 1022789, 5, 14, 0, "24.90", "2D"), ("aurora", 533535, 5, 19, 30, "32.90", "2D"),
                ("imax", 693134, 5, 17, 0, "44.90", "3D"), ("imax", 823464, 5, 21, 0, "42.90", "3D"),
                ("lumiere", 653346, 5, 15, 30, "27.90", "2D"), ("vip", 786892, 5, 20, 0, "39.90", "2D"),
                ("aurora", 823464, 6, 16, 0, "29.90", "3D"), ("imax", 533535, 6, 20, 30, "44.90", "3D"),
                ("lumiere", 1022789, 6, 14, 30, "24.90", "2D"), ("vip", 693134, 6, 18, 30, "39.90", "2D"),
                ("aurora", 653346, 7, 18, 0, "29.90", "2D"), ("imax", 786892, 7, 21, 0, "42.90", "3D"),
                ("lumiere", 533535, 7, 19, 0, "31.90", "2D"), ("vip", 823464, 7, 21, 30, "39.90", "3D"),
                ("aurora", 693134, 8, 17, 30, "32.90", "2D"), ("lumiere", 786892, 8, 20, 0, "31.90", "2D"),
                ("imax", 653346, 9, 18, 30, "42.90", "3D"), ("vip", 1022789, 9, 15, 0, "34.90", "2D"),
            )
            for room_key, tmdb_id, day, hour, minute, price, projection in schedules:
                room = rooms[room_key]
                organizer = users["organizador.paulista@lumi.demo"] if room.cinema_id == paulista.id else users["organizador.guarulhos@lumi.demo"]
                await upsert_event(session, organizer, room, movies[tmdb_id], datetime(2030, 10, day, hour, minute, tzinfo=SAO_PAULO), price, projection)

        counts = {
            "users": await session.scalar(select(func.count()).select_from(User)),
            "cinemas": await session.scalar(select(func.count()).select_from(Cinema)),
            "movies": await session.scalar(select(func.count()).select_from(Movie)),
            "sessions": await session.scalar(select(func.count()).select_from(Event)),
            "rooms": await session.scalar(select(func.count()).select_from(Room)),
            "available_seats": await session.scalar(select(func.count()).select_from(Seat)),
        }
        print("Lumi demo seed concluído: " + ", ".join(f"{key}={value}" for key, value in counts.items()))


async def main() -> None:
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
