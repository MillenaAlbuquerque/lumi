import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, CircleDollarSign, DoorOpen, Film, TicketCheck, UsersRound } from 'lucide-react'
import { organizerTicketService, type SessionTicketSales, type TicketDashboard } from '../../../../services/organizerTicketService'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

interface MovieSalesGroup {
  movieId: number
  title: string
  posterUrl: string | null
  sessions: SessionTicketSales[]
  ticketsSold: number
  revenue: number
}

interface RoomSalesGroup {
  roomName: string
  movies: MovieSalesGroup[]
  sessionCount: number
  ticketsSold: number
  capacity: number
  revenue: number
}

function TicketManager() {
  const [dashboard, setDashboard] = useState<TicketDashboard | null>(null)
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)
  const [expandedMovie, setExpandedMovie] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    organizerTicketService.dashboard().then(setDashboard).catch((requestError: Error) => setError(requestError.message)).finally(() => setLoading(false))
  }, [])

  const rooms = useMemo<RoomSalesGroup[]>(() => {
    if (!dashboard) return []
    const now = Date.now()
    const activeSessions = dashboard.sessions.filter((session) => new Date(session.start_datetime).getTime() > now)
    const byRoom = new Map<string, SessionTicketSales[]>()
    activeSessions.forEach((session) => byRoom.set(session.room_name, [...(byRoom.get(session.room_name) || []), session]))

    return [...byRoom.entries()].map(([roomName, sessions]) => {
      const byMovie = new Map<number, SessionTicketSales[]>()
      sessions.forEach((session) => byMovie.set(session.movie_id, [...(byMovie.get(session.movie_id) || []), session]))
      const movies = [...byMovie.entries()].map(([movieId, movieSessions]) => ({
        movieId,
        title: movieSessions[0].movie_title,
        posterUrl: movieSessions[0].poster_url,
        sessions: [...movieSessions].sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()),
        ticketsSold: movieSessions.reduce((total, session) => total + session.tickets_sold, 0),
        revenue: movieSessions.reduce((total, session) => total + Number(session.revenue), 0),
      })).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
      return {
        roomName,
        movies,
        sessionCount: sessions.length,
        ticketsSold: sessions.reduce((total, session) => total + session.tickets_sold, 0),
        capacity: sessions.reduce((total, session) => total + session.capacity, 0),
        revenue: sessions.reduce((total, session) => total + Number(session.revenue), 0),
      }
    }).sort((a, b) => a.roomName.localeCompare(b.roomName, 'pt-BR'))
  }, [dashboard])

  if (loading) return <p className="py-16 text-center text-slate-500">Carregando vendas...</p>
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
  if (!dashboard) return null

  const metrics = [
    { label: 'Ingressos vendidos', value: dashboard.tickets_sold, icon: TicketCheck },
    { label: 'Receita Total', value: currency.format(Number(dashboard.total_revenue)), icon: CircleDollarSign },
    { label: 'Entradas realizadas', value: dashboard.tickets_used, icon: UsersRound },
    { label: 'Sessões com vendas', value: dashboard.sessions_with_sales, icon: Film },
  ]

  return <div className="space-y-6">
    <p className="text-sm text-slate-500">Acompanhe as vendas e consulte as sessões ativas por sala e filme.</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><Icon className="h-5 w-5 text-orange-500" /></div><p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p></div>)}</div>

    {rooms.length === 0 ? <div className="rounded-2xl bg-white p-12 text-center shadow-sm"><Film className="mx-auto h-10 w-10 text-orange-300" /><h3 className="mt-3 font-semibold text-slate-700">Nenhuma sessão ativa</h3><p className="mt-1 text-sm text-slate-500">As próximas sessões aparecerão aqui organizadas por sala e filme.</p></div> : <div className="space-y-2">{rooms.map((room) => {
      const roomOpen = expandedRoom === room.roomName
      const occupancy = room.capacity ? Math.round((room.ticketsSold / room.capacity) * 100) : 0
      return <section key={room.roomName} className="overflow-hidden rounded-xl bg-white shadow-sm">
        <button type="button" onClick={() => { setExpandedRoom(roomOpen ? null : room.roomName); setExpandedMovie(null) }} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-orange-50/60" aria-expanded={roomOpen}>
          <DoorOpen className="h-5 w-5 shrink-0 text-orange-500" />
          <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold text-slate-800 sm:text-base">{room.roomName}</strong><span className="mt-0.5 block text-xs text-slate-400">{room.movies.length} {room.movies.length === 1 ? 'filme' : 'filmes'} · {room.sessionCount} sessões ativas</span></span>
          <span className="hidden text-right sm:block"><strong className="block text-sm text-orange-600">{currency.format(room.revenue)}</strong><span className="text-xs text-slate-400">{occupancy}% ocupado</span></span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${roomOpen ? 'rotate-180 text-orange-500' : ''}`} />
        </button>

        {roomOpen && <div className="cinema-movies-reveal space-y-2 overflow-hidden border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">{room.movies.map((movie, movieIndex) => {
          const movieKey = `${room.roomName}:${movie.movieId}`
          const movieOpen = expandedMovie === movieKey
          return <section key={movieKey} className="cinema-movie-card-reveal overflow-hidden rounded-xl border border-slate-100 bg-white" style={{ animationDelay: `${Math.min(movieIndex, 8) * 60}ms` }}>
            <button type="button" onClick={() => setExpandedMovie(movieOpen ? null : movieKey)} className="flex w-full cursor-pointer items-center gap-3 p-3 text-left transition hover:bg-orange-50/50" aria-expanded={movieOpen}>
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-slate-100">{movie.posterUrl ? <img src={movie.posterUrl} alt={movie.title} className="h-full w-full object-cover" /> : <Film className="m-auto mt-5 h-5 w-5 text-slate-300" />}</div>
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[var(--color-primary-dark)]">{movie.title}</strong><span className="mt-1 block text-xs text-slate-400">{movie.sessions.length} {movie.sessions.length === 1 ? 'sessão ativa' : 'sessões ativas'} · {movie.ticketsSold} vendidos</span></span>
              <span className="hidden text-sm font-semibold text-orange-600 sm:block">{currency.format(movie.revenue)}</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${movieOpen ? 'rotate-180 text-orange-500' : ''}`} />
            </button>

            {movieOpen && <div className="space-y-2 border-t border-dashed border-slate-200 bg-slate-50/60 p-3">{movie.sessions.map((session) => {
              const date = new Date(session.start_datetime)
              return <article key={session.event_id} className="flex flex-col gap-3 rounded-lg bg-white p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-700">{date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-50"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(session.occupancy_percentage, 100)}%` }} /></div><p className="mt-1 text-xs text-slate-400">{session.tickets_sold} de {session.capacity} lugares · {session.occupancy_percentage}% ocupado</p></div>
                <div className="shrink-0 sm:min-w-28 sm:text-right"><p className="text-xs text-slate-400">Receita</p><p className="font-semibold text-orange-600">{currency.format(Number(session.revenue))}</p></div>
              </article>
            })}</div>}
          </section>
        })}</div>}
      </section>
    })}</div>}
  </div>
}

export default TicketManager
