from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_organizer
from app.db.session import get_db
from app.models.movie import Movie
from app.models.user import User
from app.schemas.movie import MovieCreate, MovieDetail, MovieRead, MovieSearchResponse
from app.services.tmdb import tmdb_service

router = APIRouter(prefix="/movies", tags=["movies"])


@router.get("/search", response_model=MovieSearchResponse)
async def search_movies(query: str = Query(..., min_length=1)) -> dict:
    return await tmdb_service.search_movies(query)


@router.get("", response_model=list[MovieRead])
async def list_movies(db: AsyncSession = Depends(get_db)) -> list[Movie]:
    result = await db.scalars(select(Movie).order_by(Movie.id))
    return list(result.all())


@router.post("", response_model=MovieRead, status_code=status.HTTP_201_CREATED)
async def create_movie(
    payload: MovieCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_organizer),
) -> Movie:
    existing = await db.scalar(select(Movie).where(Movie.tmdb_id == payload.tmdb_id))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Movie already registered")

    movie = Movie(**payload.model_dump())
    db.add(movie)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Movie already registered") from exc
    await db.refresh(movie)
    return movie


@router.get("/{tmdb_id}", response_model=MovieDetail)
async def get_movie(tmdb_id: int) -> dict:
    return await tmdb_service.get_movie(tmdb_id)
