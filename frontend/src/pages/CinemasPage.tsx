import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, MapPin, Search, Film } from 'lucide-react'
import Header from '../components/layout/Header'
import MovieDetailsModal from '../components/features/client/showtime-selection/MovieDetailsModal'
import MovieCard from '../components/features/movies-sessions/MovieCard'
import { Input } from '../components/ui/input'
import { clientShowtimeService, type AvailableCinema, type AvailableMovie, type AvailableSession } from '../services/clientShowtimeService'

function posterUrl(path: string | null): string {
  if (!path) return 'https://via.placeholder.com/500x750?text=Sem+Cartaz'
  if (path.startsWith('http')) return path
  return `https://image.tmdb.org/t/p/w500${path}`
}

function CinemasPage() {
  const [cinemas, setCinemas] = useState<AvailableCinema[]>([])
  const [moviesByCinema, setMoviesByCinema] = useState<Record<number, AvailableMovie[]>>({})
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null)
  const [loadingCinemaId, setLoadingCinemaId] = useState<number | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<AvailableMovie | null>(null)
  const [movieCinema, setMovieCinema] = useState<AvailableCinema | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    clientShowtimeService.listAvailableCinemas()
      .then(setCinemas)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredCinemas = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    if (!term) return cinemas
    return cinemas.filter((cinema) => `${cinema.name} ${cinema.address}`.toLocaleLowerCase('pt-BR').includes(term))
  }, [cinemas, search])

  const toggleCinema = async (cinemaId: number) => {
    if (selectedCinemaId === cinemaId) {
      setSelectedCinemaId(null)
      return
    }
    setSelectedCinemaId(cinemaId)
    if (moviesByCinema[cinemaId]) return
    setLoadingCinemaId(cinemaId)
    try {
      const movies = await clientShowtimeService.listCinemaMovies(cinemaId)
      setMoviesByCinema((current) => ({ ...current, [cinemaId]: movies }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os filmes.')
    } finally {
      setLoadingCinemaId(null)
    }
  }

  const openMovie = (movie: AvailableMovie, cinema: AvailableCinema) => {
    setMovieCinema(cinema)
    setSelectedMovie(movie)
  }

  const selectSession = (movie: AvailableMovie, cinema: AvailableCinema, session: AvailableSession) => {
    clientShowtimeService.saveSelection(session)
    sessionStorage.setItem('lumi_selected_movie', JSON.stringify(movie))
    sessionStorage.setItem('lumi_selected_cinema', JSON.stringify(cinema))
  }

  return <div className="min-h-screen bg-mauve-950 text-white">
    <Header />
    <main className="mx-auto max-w-5xl px-6 pb-16 pt-32 sm:pt-36">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="mt-2 text-4xl text-[var(--color-primary-dark)] font-medium sm:text-5xl">Cinemas disponíveis</h1><p className="mt-3 text-[var(--color-surface)]">Selecione um cinema para ver os filmes em cartaz.</p></div>
        <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cinema ou endereço..." className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/35" /></div>
      </div>

      {loading ? <p className="py-20 text-center text-white/50">Carregando cinemas...</p>
        : error && cinemas.length === 0 ? <p className="mt-10 rounded-xl bg-red-500/10 p-6 text-red-200">{error}</p>
          : filteredCinemas.length === 0 ? <div className="py-20 text-center"><Film className="mx-auto h-12 w-12 text-orange-400/50" /><p className="mt-4 text-white/55">Nenhum cinema encontrado.</p></div>
            : <div className="mt-9 space-y-2">
              {filteredCinemas.map((cinema) => {
                const expanded = selectedCinemaId === cinema.id
                const movies = moviesByCinema[cinema.id] || []
                return <section key={cinema.id} className="overflow-hidden rounded-xl  bg-white/[0.035]">
                  <button type="button" onClick={() => void toggleCinema(cinema.id)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.055]">
                    <Film className="h-5 w-5 shrink-0 text-[var(--color-primary-dark)]" />
                    <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium sm:text-base">{cinema.name}</strong><span className="mt-0.5 flex items-center gap-1 truncate text-xs text-white/45"><MapPin className="h-3 w-3 shrink-0" />{cinema.address}</span></span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-white/45 transition-transform ${expanded ? 'rotate-180 text-orange-400' : ''}`} />
                  </button>

                  {expanded && <div className="cinema-movies-reveal overflow-hidden border-t border-white/10 px-4 py-4">
                    {loadingCinemaId === cinema.id ? <p className="py-6 text-center text-sm text-white/45">Carregando filmes...</p>
                      : movies.length === 0 ? <p className="py-4 text-center text-sm text-white/45">Nenhum filme com sessão futura neste cinema.</p>
                        : <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{movies.map((movie, index) => <div key={`${cinema.id}-${movie.id}-${expanded}`} className="cinema-movie-card-reveal" style={{ animationDelay: `${120 + Math.min(index, 8) * 90}ms` }}><MovieCard id={movie.id} title={movie.title} posterPath={posterUrl(movie.poster_url)} duration={movie.duration_minutes} onClick={() => openMovie(movie, cinema)} /></div>)}</div>}
                  </div>}
                </section>
              })}
            </div>}
    </main>
    <MovieDetailsModal movie={selectedMovie} cinemaId={movieCinema?.id} open={!!selectedMovie} onOpenChange={(open) => { if (!open) { setSelectedMovie(null); setMovieCinema(null) } }} onSelectSession={selectSession} />
  </div>
}

export default CinemasPage
