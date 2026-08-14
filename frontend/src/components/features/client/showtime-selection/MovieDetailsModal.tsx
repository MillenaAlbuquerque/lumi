import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Armchair, Clock, CreditCard, Film, LoaderCircle, MapPin, Star, X } from 'lucide-react'
import { getTmdbImageUrl } from '../../../../lib/tmdb-image'
import { authService } from '../../../../services/authService'
import {
  clientShowtimeService,
  ShowtimeRequestError,
  type AvailableCinema,
  type AvailableMovie,
  type AvailableSeat,
  type AvailableSession,
  type SeatHold,
} from '../../../../services/clientShowtimeService'
import { Button } from '../../../ui/button'
import { Modal } from '../../../ui/modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs'
import CinemaSeatMap from './CinemaSeatMap'
import CardPaymentStep from './CardPaymentStep'

interface CinemaSessions {
  cinema: AvailableCinema
  sessions: AvailableSession[]
}

interface MovieDetailsModalProps {
  movie: AvailableMovie | null
  cinemaId?: number
  showDate?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectSession: (movie: AvailableMovie, cinema: AvailableCinema, session: AvailableSession) => void
}

type CheckoutStep = 'sessions' | 'seats' | 'payment'

function MovieDetailsModal({ movie, cinemaId, showDate, open, onOpenChange, onSelectSession }: MovieDetailsModalProps) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<CinemaSessions[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeStep, setActiveStep] = useState<CheckoutStep>('sessions')
  const [selectedCinema, setSelectedCinema] = useState<AvailableCinema | null>(null)
  const [selectedSession, setSelectedSession] = useState<AvailableSession | null>(null)
  const [seats, setSeats] = useState<AvailableSeat[]>([])
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([])
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [seatError, setSeatError] = useState('')
  const [activeHold, setActiveHold] = useState<SeatHold | null>(null)
  const [holdFinalized, setHoldFinalized] = useState(false)
  const [creatingHold, setCreatingHold] = useState(false)
  const [holdMessage, setHoldMessage] = useState('')
  const [backdropLoading, setBackdropLoading] = useState(false)
  const [backdropError, setBackdropError] = useState(false)

  useEffect(() => {
    if (!open || !movie) return
    setBackdropLoading(Boolean(movie.backdrop_url))
    setBackdropError(false)
    setActiveStep('sessions')
    setSelectedCinema(null)
    setSelectedSession(null)
    setSeats([])
    setSelectedSeatIds([])
    setSeatError('')
    setActiveHold(null)
    setHoldFinalized(false)
    setHoldMessage('')
    setLoading(true)
    setError('')
    setGroups([])
    clientShowtimeService.listCinemas(movie.id, showDate)
      .then((cinemas) => cinemaId ? cinemas.filter((cinema) => cinema.id === cinemaId) : cinemas)
      .then(async (cinemas) => Promise.all(cinemas.map(async (cinema) => ({ cinema, sessions: await clientShowtimeService.listSessions(movie.id, cinema.id, showDate) }))))
      .then((items) => setGroups(items.filter((item) => item.sessions.length > 0)))
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [movie, open, cinemaId, showDate])

  useEffect(() => {
    if (!open || !selectedSession) return
    const sessionId = selectedSession.id
    return clientShowtimeService.subscribeToSeatUpdates(sessionId, async (update) => {
      if (update.session_id !== sessionId) return
      if (update.type === 'connected') {
        try {
          const availability = await clientShowtimeService.listSessionSeats(sessionId)
          const ownHeldIds = new Set(activeHold?.seat_ids || [])
          setSeats(availability.seats.map((seat) => ownHeldIds.has(seat.id) ? { ...seat, occupied: false } : seat))
          const occupiedIds = new Set(availability.seats.filter((seat) => seat.occupied && !ownHeldIds.has(seat.id)).map((seat) => seat.id))
          setSelectedSeatIds((current) => current.filter((id) => !occupiedIds.has(id)))
        } catch {
          // The regular API error handling remains responsible for unavailable sessions.
        }
        return
      }
      if ((update.type === 'seats_occupied' || update.type === 'seats_held') && update.seat_ids?.length) {
        const occupiedIds = new Set(update.seat_ids)
        setSeats((current) => current.map((seat) => occupiedIds.has(seat.id) ? { ...seat, occupied: true } : seat))
        const ownHeldIds = new Set(activeHold?.seat_ids || [])
        setSelectedSeatIds((current) => current.filter((id) => !occupiedIds.has(id) || ownHeldIds.has(id)))
      } else if (update.type === 'seats_released' && update.seat_ids?.length) {
        const releasedIds = new Set(update.seat_ids)
        setSeats((current) => current.map((seat) => releasedIds.has(seat.id) ? { ...seat, occupied: false } : seat))
      }
    })
  }, [open, selectedSession?.id, activeHold?.id])

  useEffect(() => {
    if (!activeHold || holdFinalized) return
    const remaining = new Date(activeHold.expires_at).getTime() - Date.now()
    const expire = () => {
      void clientShowtimeService.releaseSeatHold(activeHold.id)
      setActiveHold(null)
      setActiveStep('seats')
      setHoldMessage('O tempo para pagamento terminou. Selecione os assentos novamente.')
      setSelectedSeatIds([])
      if (selectedSession) void clientShowtimeService.listSessionSeats(selectedSession.id).then((availability) => setSeats(availability.seats))
    }
    if (remaining <= 0) {
      expire()
      return
    }
    const timer = window.setTimeout(expire, remaining)
    return () => window.clearTimeout(timer)
  }, [activeHold?.id, activeHold?.expires_at, holdFinalized, selectedSession?.id])

  const selectedSeats = useMemo(() => seats.filter((seat) => selectedSeatIds.includes(seat.id)), [seats, selectedSeatIds])
  const seatsByRow = useMemo(() => seats.reduce<Record<string, AvailableSeat[]>>((rows, seat) => {
    rows[seat.row] = [...(rows[seat.row] || []), seat]
    return rows
  }, {}), [seats])
  if (!movie) return null

  const chooseSession = async (cinema: AvailableCinema, session: AvailableSession) => {
    if (activeHold) await clientShowtimeService.releaseSeatHold(activeHold.id)
    setActiveHold(null)
    setHoldFinalized(false)
    setSelectedCinema(cinema)
    setSelectedSession(session)
    setSelectedSeatIds([])
    setSeats([])
    setSeatError('')
    setActiveStep('seats')

    const user = authService.getUser()
    const token = authService.getToken()
    if (!user || !token) {
      authService.logout()
      onOpenChange(false)
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    if (user.role !== 'CLIENT') {
      setSelectedSession(null)
      setSeatError('A seleção de assentos está disponível apenas para contas de cliente.')
      return
    }

    setLoadingSeats(true)
    try {
      const availability = await clientShowtimeService.listSessionSeats(session.id)
      setSelectedSession(availability.session)
      setSeats(availability.seats)
      onSelectSession(movie, cinema, availability.session)
    } catch (requestError) {
      if (requestError instanceof ShowtimeRequestError && requestError.status === 401) {
        authService.logout()
        onOpenChange(false)
        navigate('/login', { state: { from: window.location.pathname } })
        return
      }
      setSelectedSession(null)
      setSeatError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os assentos desta sessão.')
    } finally {
      setLoadingSeats(false)
    }
  }

  const toggleSeat = (seat: AvailableSeat) => {
    if (seat.occupied || !selectedSession) return
    setSelectedSeatIds((current) => current.includes(seat.id) ? current.filter((id) => id !== seat.id) : [...current, seat.id])
  }

  const continueToPayment = async () => {
    if (!selectedSession || selectedSeatIds.length === 0 || creatingHold) return
    setCreatingHold(true)
    setHoldMessage('')
    try {
      const hold = await clientShowtimeService.createSeatHold(selectedSession.id, selectedSeatIds)
      setActiveHold(hold)
      setHoldFinalized(false)
      setActiveStep('payment')
    } catch (requestError) {
      setHoldMessage(requestError instanceof Error ? requestError.message : 'Não foi possível bloquear os assentos.')
      const availability = await clientShowtimeService.listSessionSeats(selectedSession.id).catch(() => null)
      if (availability) {
        setSeats(availability.seats)
        const occupiedIds = new Set(availability.seats.filter((seat) => seat.occupied).map((seat) => seat.id))
        setSelectedSeatIds((current) => current.filter((id) => !occupiedIds.has(id)))
      }
    } finally {
      setCreatingHold(false)
    }
  }

  const returnToSeats = async () => {
    if (activeHold && !holdFinalized) await clientShowtimeService.releaseSeatHold(activeHold.id)
    setActiveHold(null)
    setHoldFinalized(false)
    setActiveStep('seats')
  }

  const closeModal = () => {
    if (activeHold && !holdFinalized) void clientShowtimeService.releaseSeatHold(activeHold.id)
    setActiveHold(null)
    onOpenChange(false)
  }

  const changeStep = (value: string) => {
    const nextStep = value as CheckoutStep
    if (activeHold && !holdFinalized && nextStep === 'sessions') {
      void clientShowtimeService.releaseSeatHold(activeHold.id)
      setActiveHold(null)
    }
    setActiveStep(nextStep)
  }

  const sessionDate = selectedSession ? new Date(selectedSession.start_datetime) : null
  const backdropUrl = getTmdbImageUrl(movie.backdrop_url, 'w1280')
  const posterUrl = getTmdbImageUrl(movie.poster_url, 'w500')

  return <Modal open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : closeModal()} title={movie.title} hideHeader className={`bg-mauve-950 transition-[max-width] duration-300 ${activeStep === 'payment' ? 'max-w-6xl' : 'max-w-4xl'}`}>
    <div className="relative overflow-hidden bg-slate-950 mb-2 text-white">
      {posterUrl && <img src={posterUrl} alt="" aria-hidden="true" className="absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)] scale-110 object-cover opacity-20 blur-2xl" />}
      {backdropUrl && !backdropError && <img key={`${movie.id}-${backdropUrl}`} src={backdropUrl} alt="" onLoad={() => setBackdropLoading(false)} onError={() => { setBackdropLoading(false); setBackdropError(true) }} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${backdropLoading ? 'opacity-0' : 'opacity-25'}`} />}
      {backdropLoading && <div className="pointer-events-none absolute right-16 top-5 z-10 rounded-full bg-slate-950/55 p-2 backdrop-blur"><LoaderCircle className="h-4 w-4 animate-spin text-orange-400/80" /></div>}
      <button type="button" onClick={closeModal} className="absolute right-4 top-4 z-20 cursor-pointer rounded-full bg-slate-950/60 p-2 text-white backdrop-blur transition hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400" aria-label="Fechar">
        <X className="h-5 w-5" />
      </button>
      <div className="relative grid min-h-[350px,50vh] gap-6 p-6 sm:grid-cols-[150px_1fr]">
        <div className="aspect-[2/3] overflow-hidden rounded-xl bg-slate-800">
          {posterUrl ? <img src={posterUrl} alt={`Cartaz de ${movie.title}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Film className="h-10 w-10 text-white/40" /></div>}
        </div>
        <div className="self-center pr-10">
          <h2 className="mb-3 text-2xl font-semibold leading-tight sm:text-3xl">{movie.title}</h2>
          <div className="mb-4 flex flex-wrap gap-3 text-sm text-white/75">
            <span>{movie.duration_minutes} min</span>
            {movie.release_date && <span>{movie.release_date.slice(0, 4)}</span>}
            {movie.rating && <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{movie.rating}</span>}
          </div>
          <p className="leading-relaxed text-white/80">{movie.description || 'Sinopse não disponível.'}</p>
        </div>
      </div>
    </div>

    <Tabs value={activeStep} onValueChange={changeStep} variant="line" className="bg-mauve-950 px-6 pb-6">
      <TabsList className="w-full overflow-x-auto border-white/10 pt-4 [&_[role=tab]]:text-white/60 [&_[role=tab][data-state=active]]:text-[var(--color-primary-dark)]">
        <TabsTrigger value="sessions"><Clock className="h-4 w-4" />Sessões</TabsTrigger>
        <TabsTrigger value="seats" disabled={!selectedSession && !seatError}><Armchair className="h-4 w-4" />Seleção de assentos</TabsTrigger>
        <TabsTrigger value="payment" disabled={selectedSeatIds.length === 0}><CreditCard className="h-4 w-4" />Pagamento</TabsTrigger>
      </TabsList>

      <TabsContent value="sessions" className="session-purchase-buttons space-y-5 pt-3">
        {loading ? <p className="py-8 text-center text-slate-500">Carregando horários...</p> : error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : groups.length === 0 ? <p className="py-8 text-center text-white/55">Nenhuma sessão disponível para a data selecionada.</p> : groups.map(({ cinema, sessions }) => <section key={cinema.id} className="p-2">
          <div className="mb-4"><h3 className="flex items-center gap-2 font-medium text-[var(--color-primary-dark)]"><Film className="h-4 w-4" />{cinema.name}</h3><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" />{cinema.address}</p></div>
          <div className="flex flex-wrap gap-2">{sessions.map((session) => {
            const date = new Date(session.start_datetime)
            return <button key={session.id} type="button" onClick={() => chooseSession(cinema, session)} className="group cursor-pointer rounded-lg bg-[var(--color-primary-dark)] px-4 py-2 text-left text-sm text-white transition hover:-translate-y-0.5 hover:bg-[var(--color-surface)] hover:text-[var(--color-primary-dark)] hover:shadow-md"><span className="block font-semibold">{date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span><span className="flex items-center gap-1">{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · R$ {Number(session.price).toFixed(2).replace('.', ',')}</span></button>
          })}</div>
        </section>)}
      </TabsContent>

      <TabsContent value="seats" className="pt-2">
        {holdMessage && <p role="alert" className="mb-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">{holdMessage}</p>}
        {loadingSeats ? <p className="py-12 text-center text-slate-500">Carregando mapa de assentos...</p> : seatError ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700"><p>{seatError}</p><button type="button" onClick={() => setActiveStep('sessions')} className="mt-3 font-semibold text-[var(--color-primary-dark)] underline">Voltar para as sessões</button></div> : selectedSession && selectedCinema ? <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="min-w-0 rounded-xl border border-white/10 bg-black/10 p-4 sm:p-6 lg:col-span-2">
            <CinemaSeatMap seats={seats} selectedSeatIds={selectedSeatIds} onToggle={toggleSeat} />
            <div className="hidden">
            <div className="mx-auto mb-4 max-w-lg"><div className="h-2 rounded-full bg-gradient-to-r from-transparent via-orange-300 to-transparent shadow-[0_8px_18px_rgba(251,146,60,0.35)]" /><p className="mt-2 text-center text-xs uppercase tracking-[0.35em] text-slate-400">Tela</p></div>
            {seats.length === 0 ? <p className="py-8 text-center text-slate-500">Esta sala não possui assentos configurados.</p> : <div className="space-y-3 overflow-x-auto pb-2">{Object.entries(seatsByRow).map(([row, rowSeats]) => {
              const maxNumber = Math.max(...rowSeats.map((seat) => seat.number))
              return <div key={row} className="flex min-w-max items-center gap-3"><span className="w-5 text-center text-xs font-bold text-slate-400">{row}</span><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${maxNumber}, 2.5rem)` }}>{Array.from({ length: maxNumber }, (_, index) => {
                const seat = rowSeats.find((item) => item.number === index + 1)
                if (!seat) return <span key={index} />
                const selected = selectedSeatIds.includes(seat.id)
                return <button key={seat.id} type="button" disabled={seat.occupied} onClick={() => toggleSeat(seat)} aria-pressed={selected} aria-label={`Assento ${seat.row}${seat.number}, ${seat.occupied ? 'ocupado' : selected ? 'selecionado' : 'disponível'}`} title={`${seat.row}${seat.number} · ${seat.seat_type}`} className={`flex h-10 w-10 items-center justify-center rounded-t-lg border text-xs font-semibold transition ${seat.occupied ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400' : selected ? 'border-orange-600 bg-orange-500 text-white shadow-md shadow-orange-200' : seat.seat_type === 'vip' ? 'border-amber-300 bg-amber-50 text-amber-700 hover:-translate-y-0.5 hover:bg-amber-100' : seat.seat_type === 'accessible' ? 'border-sky-300 bg-sky-50 text-sky-700 hover:-translate-y-0.5 hover:bg-sky-100' : 'border-orange-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-orange-400 hover:bg-orange-50'}`}>{seat.row}{seat.number}</button>
              })}</div></div>
            })}</div>}
            <div className="mt-7 flex flex-wrap justify-center gap-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm  bg-white" />Disponível</span><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-orange-500" />Selecionado</span><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-slate-200" />Ocupado</span></div>
            </div>
          </div>

          <aside className="h-fit rounded-xl  p-4 lg:col-span-2">
            <h3 className="font-semibold text-[var(--color-primary-dark)]">Resumo</h3>
            <div className="mt-4 space-y-2 text-sm text-[var(--color-surface)]"><p><strong className="text-[var(--color-primary-dark)]">Cinema:</strong> {selectedCinema.name}</p><p><strong className="text-[var(--color-primary-dark)]">Sala:</strong> {selectedSession.room_name}</p><p><strong className="text-[var(--color-primary-dark)]">Sessão:</strong> {sessionDate?.toLocaleDateString('pt-BR')} às {sessionDate?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p><p><strong className="text-[var(--color-primary-dark)]">Assentos:</strong> {selectedSeats.length ? selectedSeats.map((seat) => `${seat.row}${seat.number}`).join(', ') : 'Nenhum selecionado'}</p></div>
            <div className="mt-4 flex items-center justify-between pt-3 text-base"><strong className="text-[var(--color-surface)]">Total:</strong><strong className="text-[var(--color-primary-dark)]">R$ {(selectedSeats.length * Number(selectedSession.price)).toFixed(2).replace('.', ',')}</strong></div>
            <Button type="button" className="mt-4 w-full" disabled={selectedSeats.length === 0 || creatingHold} onClick={continueToPayment}>{creatingHold ? 'Bloqueando assentos...' : 'Continuar'}</Button>
          </aside>
        </div> : null}
      </TabsContent>

      <TabsContent value="payment" className="pt-4 [&>div:last-child]:hidden">
        {selectedSession && activeHold && selectedSeatIds.length > 0 && <CardPaymentStep
          sessionId={selectedSession.id}
          holdId={activeHold.id}
          holdExpiresAt={activeHold.expires_at}
          seatIds={selectedSeatIds}
          estimatedTotal={selectedSeatIds.length * Number(selectedSession.price)}
          seatLabels={selectedSeats.map((seat) => `${seat.row}${seat.number}`)}
          onBack={returnToSeats}
          onPaymentResult={() => setHoldFinalized(true)}
        />}
        <div className="rounded-xl  border-dashed border-orange-20border0 bg-orange-50/50 p-10 text-center"><CreditCard className="mx-auto h-8 w-8 text-[var(--color-primary-dark)]" /><h3 className="mt-3 font-semibold">Pagamento</h3><p className="mt-1 text-sm text-slate-500">A sessão e os assentos estão prontos para a próxima etapa. O pagamento ainda não foi implementado.</p><button type="button" onClick={() => setActiveStep('seats')} className="mt-4 text-sm font-semibold text-[var(--color-primary-dark)] underline">Voltar aos assentos</button></div>
      </TabsContent>
    </Tabs>
  </Modal>
}

export default MovieDetailsModal
