import { format, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, ChevronDown, Popcorn, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import MovieDetailsModal from '../client/showtime-selection/MovieDetailsModal'
import { Button } from '../../ui/button'
import { Calendar } from '../../ui/calendar'
import { Input } from '../../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { clientShowtimeService, type AvailableCinema, type AvailableMovie, type AvailableSession } from '../../../services/clientShowtimeService'
import MovieCard from './MovieCard'

const getImageUrl = (path: string | null): string => {
  if (!path) return 'https://via.placeholder.com/500x750?text=Sem+Cartaz'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `https://image.tmdb.org/t/p/w500${path.startsWith('/') ? path : `/${path}`}`
}

function MoviesSessionsSection() {
  const [movies, setMovies] = useState<AvailableMovie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<AvailableMovie | null>(null)
  const setSelectionMessage = (_message: string) => undefined
  const hasLoadedMovies = useRef(false)

  useEffect(() => {
    setLoading(!hasLoadedMovies.current)
    setError('')
    clientShowtimeService.listMovies(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined)
      .then(setMovies)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => { hasLoadedMovies.current = true; setLoading(false) })
  }, [selectedDate])

  const filteredMovies = movies.filter((movie) => movie.title.toLowerCase().includes(searchTerm.toLowerCase()))

  const selectSession = (movie: AvailableMovie, cinema: AvailableCinema, session: AvailableSession) => {
    clientShowtimeService.saveSelection(session)
    sessionStorage.setItem('lumi_selected_movie', JSON.stringify(movie))
    sessionStorage.setItem('lumi_selected_cinema', JSON.stringify(cinema))
    const date = new Date(session.start_datetime)
    setSelectionMessage(`${movie.title} · ${cinema.name} · ${date.toLocaleString('pt-BR')}`)
  }

  return <section id="sessoes" className="px-6 py-10">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 className="flex items-center gap-3 text-4xl font-medium text-white sm:text-5xl"><Popcorn className="h-10 w-10 text-[var(--color-primary-dark)] sm:h-12 sm:w-12" />Em Cartaz</h2><p className="mt-4 text-lg text-white/70">Escolha um filme e veja os cinemas e horários disponíveis.</p></div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-primary-dark)]" /><Input placeholder="Buscar filmes..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="border-[var(--color-primary-dark)] bg-white/5 pl-10 text-white placeholder:text-white/50" /></div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <div className="flex gap-2">
              <PopoverTrigger asChild><Button type="button" variant="outline" className="min-w-48 flex-1 justify-start border-0 bg-white/5 text-left font-normal text-white hover:bg-white/10 hover:text-white"><CalendarDays className="h-4 w-4 text-[var(--color-primary-dark)]" /><span className="flex-1">{selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Filtrar por data'}</span><ChevronDown className={`h-4 w-4 text-white transition-transform ${calendarOpen ? 'rotate-180' : ''}`} /></Button></PopoverTrigger>
              {selectedDate && <Button type="button" variant="outline" size="icon" onClick={() => setSelectedDate(undefined)} className="border-0 bg-white/5 text-white hover:bg-white/10 hover:text-white" aria-label="Limpar filtro de data"><X className="h-4 w-4" /></Button>}
            </div>
            <PopoverContent align="end" className="w-auto" onCloseAutoFocus={(event) => event.preventDefault()}><Calendar mode="single" selected={selectedDate} onSelect={(date) => { setSelectedDate(date); if (date) setCalendarOpen(false) }} disabled={{ before: startOfDay(new Date()) }} autoFocus /></PopoverContent>
          </Popover>
        </div>
      </div>

      {error ? <p className="rounded-xl bg-red-500/10 p-4 text-red-200">{error}</p> : loading ? <p className="text-center text-white/70">Carregando filmes com sessões...</p> : filteredMovies.length === 0 ? <p className="text-center text-white/70">{searchTerm ? `Nenhum filme encontrado para “${searchTerm}”` : selectedDate ? `Nenhum filme com sessão em ${format(selectedDate, 'dd/MM/yyyy')}.` : 'Nenhum filme com sessões futuras no momento.'}</p> : <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{filteredMovies.map((movie) => <MovieCard key={movie.id} id={movie.id} title={movie.title} posterPath={getImageUrl(movie.poster_url)} duration={movie.duration_minutes} onClick={() => setSelectedMovie(movie)} />)}</div>}
    </div>
    <MovieDetailsModal movie={selectedMovie} open={!!selectedMovie} onOpenChange={(open) => { if (!open) setSelectedMovie(null) }} onSelectSession={selectSession} />
  </section>
}

export default MoviesSessionsSection
