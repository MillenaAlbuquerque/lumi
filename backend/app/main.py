from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api.auth import router as auth_router
from app.api.events import router as events_router
from app.api.movies import router as movies_router
from app.api.rooms import router as rooms_router
from app.api.team import router as team_router
from app.api.client_showtimes import router as client_showtimes_router
from app.api.payments import router as payments_router
from app.api.tickets import public_router as public_tickets_router, router as tickets_router
from app.api.entrance import router as entrance_router
from app.api.organizer_tickets import router as organizer_tickets_router
from app.api.seat_updates import router as seat_updates_router
from app.api.routes import router

app = FastAPI(title="Lumi API")

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([
        settings.frontend_url.rstrip("/"),
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ])),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(movies_router, prefix="/api")
app.include_router(rooms_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(team_router, prefix="/api")
app.include_router(client_showtimes_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(tickets_router, prefix="/api")
app.include_router(public_tickets_router, prefix="/api")
app.include_router(entrance_router, prefix="/api")
app.include_router(organizer_tickets_router, prefix="/api")
app.include_router(seat_updates_router, prefix="/api")
