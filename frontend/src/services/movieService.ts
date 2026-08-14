import api from './api'

export interface Movie {
  id: number
  tmdb_id: number | null
  title: string
  description: string | null
  duration_minutes: number
  rating: string | null
  release_date: string | null
  poster_url: string | null
  backdrop_url: string | null
  created_at: string
}

export const movieService = {
  async listMovies(): Promise<Movie[]> {
    return api.get<Movie[]>('/movies')
  },
}

export default movieService
