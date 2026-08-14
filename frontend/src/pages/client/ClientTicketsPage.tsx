import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Armchair, CalendarDays, Clapperboard, Copy, MapPin, QrCode, Share2, Ticket as TicketIcon, X } from 'lucide-react'
import Header from '../../components/layout/Header'
import { Modal } from '../../components/ui/modal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog'
import { ticketService, type ClientTicket } from '../../services/ticketService'
import { getTmdbImageUrl } from '../../lib/tmdb-image'

const statusLabels = { issued: 'Válido', used: 'Utilizado', cancelled: 'Cancelado' } as const

function TicketArtwork({ ticket }: { ticket: ClientTicket }) {
  const [backdropLoaded, setBackdropLoaded] = useState(false)
  const [backdropFailed, setBackdropFailed] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const backdropUrl = getTmdbImageUrl(ticket.backdrop_url, 'w1280')
  const posterUrl = getTmdbImageUrl(ticket.poster_url, 'w500')
  const unavailable = (!posterUrl || posterFailed) && (!backdropUrl || backdropFailed)
  const imageStateClass = ticket.status !== 'issued' ? 'grayscale' : ''

  if (unavailable) return <div className="flex h-full items-center justify-center"><Clapperboard className="h-10 w-10 text-white/25" /></div>

  return <>
    {posterUrl && !posterFailed && <img src={posterUrl} alt="" aria-hidden="true" onError={() => setPosterFailed(true)} className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 ${imageStateClass}`} />}
    {backdropUrl && !backdropFailed && <img src={backdropUrl} alt={`Imagem de ${ticket.movie_title}`} onLoad={() => setBackdropLoaded(true)} onError={() => setBackdropFailed(true)} className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform,filter] duration-700 group-hover:scale-105 ${backdropLoaded ? 'opacity-100' : 'opacity-0'} ${imageStateClass}`} />}
  </>
}

function ClientTicketsPage() {
  const [tickets, setTickets] = useState<ClientTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<ClientTicket | null>(null)
  const [ticketToCancel, setTicketToCancel] = useState<ClientTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedTicketId, setCopiedTicketId] = useState<number | null>(null)
  const [sharingTicketId, setSharingTicketId] = useState<number | null>(null)
  const [cancellingTicketId, setCancellingTicketId] = useState<number | null>(null)

  useEffect(() => {
    ticketService.list().then(setTickets).catch((requestError: Error) => setError(requestError.message)).finally(() => setLoading(false))
  }, [])

  const copyCode = async (ticket: ClientTicket) => {
    await navigator.clipboard.writeText(ticket.manual_code)
    setCopiedTicketId(ticket.id)
    setTimeout(() => setCopiedTicketId(null), 2000)
  }

  const cancelTicket = async () => {
    if (!ticketToCancel) return
    const ticket = ticketToCancel
    try {
      setCancellingTicketId(ticket.id)
      setError('')
      const cancelled = await ticketService.cancel(ticket.id)
      setTickets((current) => current.map((item) => item.id === ticket.id ? cancelled : item))
      if (selectedTicket?.id === ticket.id) setSelectedTicket(cancelled)
      setTicketToCancel(null)
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Não foi possível cancelar o ingresso.')
    } finally {
      setCancellingTicketId(null)
    }
  }

  return <div className="min-h-screen bg-mauve-950 text-white">
    <Header />
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-36 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="mt-2 text-3xl font-medium text-[var(--color-primary-dark)] sm:text-4xl">Meus ingressos</h1>
        <p className="mt-3 max-w-2xl text-c">Clique em um ingresso para validar o QR Code na portaria.</p>
      </div>

      {loading && <div className="py-20 text-center text-white/50"></div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
      {!loading && !error && tickets.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center"><TicketIcon className="mx-auto h-10 w-10 text-orange-400" /><h2 className="mt-4 text-xl font-semibold">Você ainda não possui ingressos</h2><p className="mt-2 text-sm text-white/50">Após a confirmação de um pagamento, seus ingressos aparecerão aqui.</p></div>}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tickets.map((ticket) => {
          const sessionDate = new Date(ticket.session_datetime)
          const canCancel = ticket.status === 'issued' && sessionDate.getTime() > Date.now() + 60 * 60 * 1000
          return <article key={ticket.id} className="group overflow-hidden rounded-2xl  bg-slate-900 shadow-xl transition duration-300 hover:-translate-y-1 ">
            <button type="button" onClick={() => setSelectedTicket(ticket)} className="block w-full cursor-pointer text-left" aria-label={`Abrir ingresso de ${ticket.movie_title}`}>
              <div className="relative h-32 overflow-hidden bg-black/30 sm:h-56">
                <TicketArtwork ticket={ticket} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider  ${ticket.status === 'issued' ? 'bg-[var(--color-surface)] text-emerald-400' : ticket.status === 'used' ? 'bg-[var(--color-surface)] text-slate-600' : 'bg-[var(--color-surface)] text-red-400'}`}>{statusLabels[ticket.status]}</span>
                <h2 className="absolute bottom-3 left-4 right-4 line-clamp-2 text-lg font-semibold leading-tight">{ticket.movie_title}</h2>
              </div>
              <div className="relative space-y-3 border-t border-dashed border-white/15 bg-white/[0.04] p-4 text-sm text-[var(--color-surface)] before:absolute before:-left-2.5 before:-top-2.5 before:z-10 before:h-5 before:w-5 before:rounded-full before:bg-mauve-950 after:absolute after:-right-2.5 after:-top-2.5 after:z-10 after:h-5 after:w-5 after:rounded-full after:bg-mauve-950">
                <p className="flex gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-orange-400" /><span>{sessionDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></p>
                <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-orange-400" /><span className="truncate">{ticket.cinema_name}</span></p>
                <p className="flex gap-2"><Armchair className="h-4 w-4 shrink-0 text-orange-400" /><span>{ticket.room_name} · Assento <strong className="text-orange-400">{ticket.seat_row}{ticket.seat_number}</strong></span></p>
              </div>
            </button>

            <div className="relative grid grid-cols-3 divide-x divide-white/10 border-t border-dashed border-white/20 bg-white/[0.07] px-3 py-2 before:absolute before:-left-2.5 before:-top-2.5 before:z-10 before:h-5 before:w-5 before:rounded-full before:bg-mauve-950 after:absolute after:-right-2.5 after:-top-2.5 after:z-10 after:h-5 after:w-5 after:rounded-full after:bg-mauve-950">
              <button type="button" onClick={() => setSelectedTicket(ticket)} title="Ver QR Code" aria-label={`Ver QR Code do ingresso de ${ticket.movie_title}`} className="flex cursor-pointer justify-center py-2 text-orange-400 transition hover:text-orange-300"><QrCode className="h-5 w-5" /></button>
              <button type="button" disabled={sharingTicketId === ticket.id || ticket.status !== 'issued'} title="Compartilhar ingresso" aria-label={`Compartilhar ingresso de ${ticket.movie_title}`} onClick={async () => { try { setSharingTicketId(ticket.id); const share = await ticketService.share(ticket.id); if (navigator.share) await navigator.share({ title: `Ingresso - ${ticket.movie_title}`, text: `Ingresso ${ticket.seat_row}${ticket.seat_number}`, url: share.share_url }); else { await navigator.clipboard.writeText(share.share_url); setCopiedTicketId(ticket.id); setTimeout(() => setCopiedTicketId(null), 2000) } } catch (shareError) { if ((shareError as Error).name !== 'AbortError') setError(shareError instanceof Error ? shareError.message : 'Não foi possível compartilhar.') } finally { setSharingTicketId(null) } }} className="flex cursor-pointer justify-center py-2 text-orange-400 transition hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-35"><Share2 className={`h-5 w-5 ${sharingTicketId === ticket.id ? 'animate-pulse' : ''}`} /></button>
              <button type="button" disabled={ticket.status !== 'issued' || !canCancel || cancellingTicketId === ticket.id} title={ticket.status !== 'issued' ? 'Ingresso indisponível para cancelamento' : !canCancel ? 'Cancelamento disponível somente até 1 hora antes da sessão' : 'Cancelar ingresso'} aria-label={`Cancelar ingresso de ${ticket.movie_title}`} onClick={() => setTicketToCancel(ticket)} className="flex cursor-pointer justify-center py-2 text-red-300 transition hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-25"><X className={`h-5 w-5 ${cancellingTicketId === ticket.id ? 'animate-pulse' : ''}`} /></button>
            </div>
          </article>
        })}
      </div>
    </main>

    <Modal open={selectedTicket !== null} onOpenChange={(open) => { if (!open) setSelectedTicket(null) }} title={selectedTicket ? `Ingresso de ${selectedTicket.movie_title}` : 'Ingresso'} className="max-w-sm overflow-hidden bg-mauve-950 text-white" hideHeader>
      {selectedTicket && <div className="relative p-6 text-center">
        <button type="button" onClick={() => setSelectedTicket(null)} className="absolute right-4 top-4 z-10 cursor-pointer rounded-full  p-2 text-white/70 transition hover:bg-orange-500 hover:text-white" aria-label="Fechar"><X className="h-5 w-5" /></button>
        <p className="pr-10 text-left text-lg font-medium text-[var(--color-primary-dark)]">{selectedTicket.movie_title}</p>
        <p className="mt-1 text-left text-xs text-white/45">{selectedTicket.cinema_name} · {selectedTicket.room_name} · {selectedTicket.seat_row}{selectedTicket.seat_number}</p>
        <div className={`mx-auto mt-6 w-fit rounded-2xl bg-white p-4 ${selectedTicket.status !== 'issued' ? 'opacity-40 grayscale' : ''}`}><QRCodeSVG value={selectedTicket.token} size={220} level="H" marginSize={0} /></div>
        <p className="mt-5 text-xs font-bold text-orange-400">Código manual</p>
        <code className="mt-2 block text-xl font-bold  text-white">{selectedTicket.manual_code}</code>
        <button type="button" onClick={() => copyCode(selectedTicket)} className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-orange-400 transition "><Copy className="h-4 w-4" />{copiedTicketId === selectedTicket.id ? 'Código copiado' : 'Copiar código'}</button>
        {selectedTicket.status !== 'issued' && <p className="mt-4 text-sm text-red-300">Este ingresso está {statusLabels[selectedTicket.status].toLowerCase()} e não pode ser validado.</p>}
      </div>}
    </Modal>
    <AlertDialog open={ticketToCancel !== null} onOpenChange={(open) => { if (!open && !cancellingTicketId) setTicketToCancel(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar este ingresso?</AlertDialogTitle>
          <AlertDialogDescription>{ticketToCancel && <>Você está prestes a cancelar a sua reserva para assistir <strong className="text-white text-medium">{ticketToCancel.movie_title}</strong> . Essa ação não poderá ser desfeita.</>}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={Boolean(cancellingTicketId)}>Manter ingresso</AlertDialogCancel>
          <AlertDialogAction disabled={Boolean(cancellingTicketId)} onClick={(event) => { event.preventDefault(); void cancelTicket() }}>{cancellingTicketId ? 'Cancelando...' : 'Cancelar'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
}

export default ClientTicketsPage
