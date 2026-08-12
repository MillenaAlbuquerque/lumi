import { useEffect, useState } from 'react'
import { CalendarDays, Clapperboard, Plus, Search } from 'lucide-react'
import { sessionService, type CinemaSession, type TmdbMovie } from '../../../../services/sessionService'
import type { Movie } from '../../../../services/movieService'
import { roomService, type Room } from '../../../../services/roomService'
import { Button } from '../../../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card'
import { Input } from '../../../ui/input'

const selectClass = 'flex h-10 w-full rounded-md border border-[var(--color-primary)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)]'

function SessionManager() {
  const [sessions, setSessions] = useState<CinemaSession[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [movies, setMovies] = useState<Movie[]>([])
  const [roomId, setRoomId] = useState('')
  const [roomQuery, setRoomQuery] = useState('')
  const [showRoomOptions, setShowRoomOptions] = useState(false)
  const [movieId, setMovieId] = useState('')
  const [movieQuery, setMovieQuery] = useState('')
  const [showMovieOptions, setShowMovieOptions] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [projectionType, setProjectionType] = useState<'2D' | '3D'>('2D')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TmdbMovie[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const filteredRooms = rooms.filter((room) => room.name.toLocaleLowerCase('pt-BR').includes(roomQuery.trim().toLocaleLowerCase('pt-BR')))
  const filteredMovies = movies.filter((movie) => movie.title.toLocaleLowerCase('pt-BR').includes(movieQuery.trim().toLocaleLowerCase('pt-BR')))

  useEffect(() => {
    Promise.all([sessionService.list(), roomService.list(), sessionService.listMovies()])
      .then(([loadedSessions, loadedRooms, loadedMovies]) => { setSessions(loadedSessions); setRooms(loadedRooms); setMovies(loadedMovies) })
      .catch((requestError: Error) => setError(requestError.message))
  }, [])

  const createSession = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!roomId) { setError('Selecione uma sala válida.'); return }
    if (!movieId) { setError('Selecione um filme válido do catálogo.'); return }
    setError(''); setIsCreating(true)
    try {
      const created = await sessionService.create({ movie_id: Number(movieId), room_id: Number(roomId), start_datetime: `${date}T${time}:00`, price: Number(price), projection_type: projectionType })
      setSessions((current) => [...current, created].sort((a, b) => a.start_datetime.localeCompare(b.start_datetime)))
      setDate(''); setTime(''); setPrice('')
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Erro ao criar sessão') }
    finally { setIsCreating(false) }
  }

  const searchMovies = async (event: React.FormEvent) => {
    event.preventDefault(); setIsSearching(true); setError('')
    try { setSearchResults((await sessionService.searchTmdb(query)).results.slice(0, 6)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Erro na busca') }
    finally { setIsSearching(false) }
  }

  const addMovie = async (tmdbId: number) => {
    try {
      const movie = await sessionService.addTmdbMovie(tmdbId)
      setMovies((current) => [...current, movie].sort((a, b) => a.title.localeCompare(b.title)))
      setMovieId(String(movie.id)); setMovieQuery(movie.title); setSearchResults([]); setQuery('')
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Erro ao adicionar filme') }
  }

  return <div className="space-y-8">
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        <p className="mb-4 text-sm text-slate-500">{sessions.length} {sessions.length === 1 ? 'sessão cadastrada' : 'sessões cadastradas'}</p>
        {sessions.length === 0 ? <div className="rounded-xl border border-dashed border-orange-200 bg-white p-10 text-center text-slate-500">Nenhuma sessão cadastrada.</div> : <div className="flex flex-col gap-3">{sessions.map((session) => (
          <Card key={session.id} className="bg-white shadow-sm"><CardContent className="flex items-center justify-between gap-4 p-4">
            <div><p className="font-semibold">{session.movie.title}</p><p className="text-sm text-slate-500">{session.room.name} · {session.projection_type}</p></div>
            <div className="text-right text-sm"><p className="flex items-center gap-1 font-medium"><CalendarDays className="h-4 w-4" />{new Date(session.start_datetime).toLocaleDateString('pt-BR')}</p><p className="text-slate-500">{new Date(session.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · R$ {Number(session.price).toFixed(2)}</p></div>
          </CardContent></Card>
        ))}</div>}
      </div>
      <Card className="h-fit bg-white shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-[var(--color-primary-dark)]" />Criar sessão</CardTitle><CardDescription>Selecione uma sala e um filme do catálogo.</CardDescription></CardHeader><CardContent><form onSubmit={createSession} className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--color-primary-dark)]" />
          <Input
            value={roomQuery}
            onChange={(event) => { setRoomQuery(event.target.value); setRoomId(''); setShowRoomOptions(true) }}
            onFocus={() => setShowRoomOptions(true)}
            onBlur={() => setTimeout(() => setShowRoomOptions(false), 100)}
            className="border border-[var(--color-primary)] pl-10"
            placeholder="Pesquisar e selecionar sala"
            autoComplete="off"
            required
          />
          {showRoomOptions && <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-orange-200 bg-white p-1 shadow-lg">
            {filteredRooms.length > 0 ? filteredRooms.map((room) => <button
              key={room.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { setRoomId(String(room.id)); setRoomQuery(room.name); setShowRoomOptions(false) }}
              className="w-full rounded px-3 py-2 text-left text-sm transition hover:bg-orange-50 hover:text-[var(--color-primary-dark)]"
            >{room.name}</button>) : <p className="px-3 py-2 text-sm text-slate-500">Nenhuma sala encontrada.</p>}
          </div>}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--color-primary-dark)]" />
          <Input
            value={movieQuery}
            onChange={(event) => { setMovieQuery(event.target.value); setMovieId(''); setShowMovieOptions(true) }}
            onFocus={() => setShowMovieOptions(true)}
            onBlur={() => setTimeout(() => setShowMovieOptions(false), 100)}
            className="border border-[var(--color-primary)] pl-10"
            placeholder="Pesquisar e selecionar filme"
            autoComplete="off"
            required
          />
          {showMovieOptions && <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-orange-200 bg-white p-1 shadow-lg">
            {filteredMovies.length > 0 ? filteredMovies.map((movie) => <button
              key={movie.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { setMovieId(String(movie.id)); setMovieQuery(movie.title); setShowMovieOptions(false) }}
              className="w-full rounded px-3 py-2 text-left text-sm transition hover:bg-orange-50 hover:text-[var(--color-primary-dark)]"
            >{movie.title}</button>) : <p className="px-3 py-2 text-sm text-slate-500">Nenhum filme encontrado no catálogo.</p>}
          </div>}
          <input type="hidden" name="movie_id" value={movieId} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" value={date} className="border border-[var(--color-primary)] text-slate-700 " onChange={(event) => setDate(event.target.value)} />
          <Input type="time" value={time} className="border border-[var(--color-primary)] text-slate-700" onChange={(event) => setTime(event.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3"><select className={selectClass} value={projectionType} onChange={(event) => setProjectionType(event.target.value as '2D' | '3D')}><option>2D</option><option>3D</option></select><Input type="number" min="0" step="0.01" placeholder="Preço" value={price} className="border border-[var(--color-primary)]" onChange={(event) => setPrice(event.target.value)} required /></div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}<Button className="w-full" disabled={isCreating}>{isCreating ? 'Criando...' : 'Criar sessão'}</Button>
      </form></CardContent></Card>
    </div>
    <Card className="bg-white shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Clapperboard className="h-5 w-5 text-[var(--color-primary-dark)] " />Catálogo de filmes</CardTitle><CardDescription>Não encontrou um filme no seletor? Busque e adicione ao nosso catálogo.</CardDescription></CardHeader><CardContent>
      <form onSubmit={searchMovies} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-primary-dark)]" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="border border-[var(--color-primary)] pl-10" placeholder="Buscar filme..." required />
        </div>
        <Button disabled={isSearching}>{isSearching ? 'Buscando...' : 'Buscar'}</Button>
      </form>
      {searchResults.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{searchResults.map((movie) => <div key={movie.id} className="flex min-h-20 items-center gap-3 rounded-lg px-3 py-2 shadow-sm">
        <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-slate-100">
          {movie.poster_path ? <img src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`} alt={`Pôster de ${movie.title}`} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center"><Clapperboard className="h-5 w-5 text-slate-400" /></div>}
        </div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{movie.title}</p><p className="text-xs text-slate-500">{movie.release_date?.slice(0, 4) || 'Sem data'}</p></div>
        <Button className="h-8 w-8 shrink-0 p-0" type="button" onClick={() => addMovie(movie.id)} aria-label={`Adicionar ${movie.title}`} title={`Adicionar ${movie.title}`}><Plus className="h-4 w-4" /></Button>
      </div>)}</div>}
    </CardContent></Card>
  </div>
}

export default SessionManager
