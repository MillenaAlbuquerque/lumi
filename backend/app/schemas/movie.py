from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class MovieSearchResult(BaseModel):
    id: int
    title: str
    overview: str | None = None
    release_date: str | None = None
    poster_path: str | None = None
    backdrop_path: str | None = None
    vote_average: float | None = None


class MovieSearchResponse(BaseModel):
    page: int
    results: list[MovieSearchResult]
    total_pages: int
    total_results: int


class MovieGenre(BaseModel):
    id: int
    name: str


class MovieDetail(BaseModel):
    id: int
    title: str
    overview: str | None = None
    release_date: str | None = None
    runtime: int | None = None
    poster_path: str | None = None
    backdrop_path: str | None = None
    vote_average: float | None = None
    original_language: str | None = None
    tagline: str | None = None
    status: str | None = None
    genres: list[MovieGenre] = []


class MovieCreate(BaseModel):
    tmdb_id: int
    title: str = Field(..., max_length=255)
    description: str | None = None
    duration_minutes: int = Field(..., gt=0)
    rating: str | None = Field(None, max_length=10)
    release_date: date | None = None
    poster_url: str | None = Field(None, max_length=500)
    backdrop_url: str | None = Field(None, max_length=500)


class MovieRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tmdb_id: int | None
    title: str
    description: str | None
    duration_minutes: int
    rating: str | None
    release_date: date | None
    poster_url: str | None
    backdrop_url: str | None
    created_at: datetime
