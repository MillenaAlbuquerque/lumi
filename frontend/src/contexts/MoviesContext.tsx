import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { movieService, type Movie } from '../services/movieService'

interface MoviesContextType {
  movies: Movie[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const MoviesContext = createContext<MoviesContextType | undefined>(undefined)

export function MoviesProvider({ children }: { children: ReactNode }) {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMovies = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await movieService.listMovies()
      setMovies(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar filmes'
      setError(message)
      console.error('Erro ao buscar filmes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovies()
  }, [])

  return (
    <MoviesContext.Provider value={{ movies, loading, error, refetch: fetchMovies }}>
      {children}
    </MoviesContext.Provider>
  )
}

export function useMovies() {
  const context = useContext(MoviesContext)
  if (context === undefined) {
    throw new Error('useMovies must be used within MoviesProvider')
  }
  return context
}
