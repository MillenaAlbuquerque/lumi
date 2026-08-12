import httpx
from fastapi import HTTPException, status

from app.core.config import settings


class TMDbService:
    """Thin async client around the TMDb REST API."""

    def __init__(self) -> None:
        self._base_url = settings.tmdb_base_url
        self._api_key = settings.tmdb_api_key

    async def search_movies(self, query: str, page: int = 1) -> dict:
        return await self._get("/search/movie", params={"query": query, "page": page})

    async def get_movie(self, tmdb_id: int) -> dict:
        return await self._get(f"/movie/{tmdb_id}")

    async def _get(self, path: str, params: dict | None = None) -> dict:
        request_params = {"api_key": self._api_key, **(params or {})}
        try:
            async with httpx.AsyncClient(base_url=self._base_url, timeout=10.0) as client:
                response = await client.get(path, params=request_params)
                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="TMDb request timed out",
            ) from exc
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found") from exc
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="TMDb returned an error",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not reach TMDb",
            ) from exc


tmdb_service = TMDbService()
