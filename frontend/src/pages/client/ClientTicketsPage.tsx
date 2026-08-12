import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Armchair, CalendarDays, Clapperboard, Copy, MapPin, Share2, Ticket as TicketIcon } from 'lucide-react'
import Header from '../../components/layout/Header'
import { ticketService, type ClientTicket } from '../../services/ticketService'

const statusLabels = { issued: 'Válido', used: 'Utilizado', cancelled: 'Cancelado' } as const

function ClientTicketsPage() {
  const [tickets, setTickets] = useState<ClientTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedTicketId, setCopiedTicketId] = useState<number | null>(null)
  const [sharingTicketId, setSharingTicketId] = useState<number | null>(null)

  useEffect(() => {
    ticketService.list().then(setTickets).catch((requestError: Error) => setError(requestError.message)).finally(() => setLoading(false))
  }, [])

  return <div className="min-h-screen bg-mauve-950 text-white">
    <Header />
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-36 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="mt-2 text-3xl font-medium text-[var(--color-primary-dark)] sm:text-4xl">Meus ingressos</h1>
        <p className="mt-3 max-w-2xl text-[var(--color-surface)]">Apresente o QR Code na portaria do cinema. </p>
      </div>

      {loading && <div className="py-20 text-center text-white/50">Carregando seus ingressos...</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
      {!loading && !error && tickets.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center"><TicketIcon className="mx-auto h-10 w-10 text-orange-400" /><h2 className="mt-4 text-xl font-semibold">Você ainda não possui ingressos</h2><p className="mt-2 text-sm text-white/50">Após a confirmação de um pagamento, seus ingressos aparecerão aqui.</p></div>}

      <div className="grid gap-5 lg:grid-cols-2">
        {tickets.map((ticket) => {
          const sessionDate = new Date(ticket.session_datetime)
          return <article key={ticket.id} className="overflow-hidden rounded-2xl border border-[var(--color-primary-dark)] bg-white/[0.04] shadow-xl shadow-black/10">
            <div className="grid sm:grid-cols-[130px_1fr_180px]">
              <div className="hidden bg-black/25 sm:block">
                {ticket.poster_url ? <img src={ticket.poster_url} alt={`Cartaz de ${ticket.movie_title}`} className="h-full min-h-64 w-full object-cover" /> : <div className="flex h-full min-h-64 items-center justify-center"><Clapperboard className="h-10 w-10 text-white/25" /></div>}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3"><h2 className="text-xl font-medium leading-tight">{ticket.movie_title}</h2><span className={` px-2.5 py-1 text-xs font-semibold ${ticket.status === 'issued' ? ' text-emerald-300' : ticket.status === 'used' ? 'bg-white/10 text-white/55' : 'bg-red-500/15 text-red-300'}`}>{statusLabels[ticket.status]}</span></div>
                <div className="mt-5 space-y-3 text-sm text-[var(--color-surface)]">
                  <p className="flex gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-orange-400" /><span>{sessionDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às {sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></p>
                  <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-orange-400" /><span className="text-xs text-white/50"><strong className="block text-white">{ticket.cinema_name}</strong>{ticket.cinema_address}</span></p>
                  <p className="flex gap-2"><Armchair className="h-4 w-4 shrink-0 text-orange-400" /><span>{ticket.room_name} · Assento <strong className="text-white">{ticket.seat_row}{ticket.seat_number}</strong> · {ticket.projection_type}</span></p>
                </div>
                <p className="mt-5 text-xs text-white/35">Ingresso #{ticket.id} · Reserva #{ticket.reservation_id}</p>
              </div>
              <div className="flex flex-col items-center justify-center border-t border-dashed border-white/15 bg-white/[0.03] p-5 sm:border-l sm:border-t-0">
                <div className={`rounded-xl bg-white p-3 ${ticket.status !== 'issued' ? 'opacity-40 grayscale' : ''}`}><QRCodeSVG value={ticket.token} size={132} level="H" marginSize={0} /></div>
                <p className="mt-3 text-center text-xs font-medium text-white/50">Código individual<br />{ticket.seat_row}{ticket.seat_number}</p>
              </div>
            </div>
            <div className="border-t border-white/10 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold tracking-wider text-orange-400">Código manual</p><code className="mt-1 block truncate text-xs text-white/45" title={ticket.token}>{ticket.token}</code></div>
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(ticket.token); setCopiedTicketId(ticket.id); setTimeout(() => setCopiedTicketId(null), 2000) }} className="inline-flex shrink-0 cursor-pointer items-center gap-1.5  px-3 py-2 text-xs font-semibold text-orange-400 transition hover:bg-orange-500/10 hover:rounded-lg" aria-label={`Copiar código do ingresso ${ticket.id}`}>
                  {copiedTicketId === ticket.id ? <>Copiado</> : <><Copy className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
            <div className="border-t border-white/10 px-5 py-3">
              <button type="button" disabled={sharingTicketId === ticket.id || ticket.status !== 'issued'} onClick={async () => { try { setSharingTicketId(ticket.id); const share = await ticketService.share(ticket.id); if (navigator.share) await navigator.share({ title: `Ingresso — ${ticket.movie_title}`, text: `Ingresso ${ticket.seat_row}${ticket.seat_number}`, url: share.share_url }); else { await navigator.clipboard.writeText(share.share_url); setCopiedTicketId(ticket.id); setTimeout(() => setCopiedTicketId(null), 2000) } } catch (shareError) { if ((shareError as Error).name !== 'AbortError') setError(shareError instanceof Error ? shareError.message : 'Não foi possível compartilhar.') } finally { setSharingTicketId(null) } }} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 py-2 text-sm font-semibold text-orange-400 transition hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-40"><Share2 className="h-4 w-4" />{sharingTicketId === ticket.id ? 'Gerando link...' : 'Compartilhar ingresso'}</button>
            </div>
          </article>
        })}
      </div>
    </main>
  </div>
}

export default ClientTicketsPage
