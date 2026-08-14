import { authService } from './authService'
import type { Movie } from './movieService'
import type { Room } from './roomService'
import { API_BASE_URL } from './config'

export interface CinemaSession {
  id: number; movie_id: number; room_id: number; start_datetime: string; price: number; projection_type: '2D' | '3D'; movie: Movie; room: Room
}

export interface TmdbMovie {
  id: number; title: string; overview: string | null; release_date: string | null; poster_path: string | null
}

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getToken()}`, ...init?.headers },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail || 'Não foi possível concluir a operação')
  }
  return response.json()
}

export const sessionService = {
  list: () => request<CinemaSession[]>('/events'),
  create: (data: { movie_id: number; room_id: number; start_datetime: string; price: number; projection_type: '2D' | '3D' }) =>
    request<CinemaSession>('/events', { method: 'POST', body: JSON.stringify(data) }),
  listMovies: () => request<Movie[]>('/movies'),
  searchTmdb: (query: string) => request<{ results: TmdbMovie[] }>(`/movies/search?query=${encodeURIComponent(query)}`),
  async addTmdbMovie(tmdbId: number): Promise<Movie> {
    const detail = await request<{ id: number; title: string; overview: string | null; runtime: number | null; release_date: string | null; poster_path: string | null; backdrop_path: string | null }>(`/movies/${tmdbId}`)
    return request<Movie>('/movies', {
      method: 'POST',
      body: JSON.stringify({
        tmdb_id: detail.id,
        title: detail.title,
        description: detail.overview,
        duration_minutes: detail.runtime || 1,
        release_date: detail.release_date || null,
        poster_url: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null,
        backdrop_url: detail.backdrop_path ? `https://image.tmdb.org/t/p/w1280${detail.backdrop_path}` : null,
      }),
    })
  },
}
