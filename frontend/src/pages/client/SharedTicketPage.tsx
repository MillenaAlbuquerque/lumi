import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Armchair, CalendarDays, MapPin, Ticket as TicketIcon } from 'lucide-react'
import Header from '../../components/layout/Header'
import { ticketService, type ClientTicket } from '../../services/ticketService'

type SharedTicket = Omit<ClientTicket, 'id' | 'issued_at' | 'reservation_id' | 'session_id' | 'price'>

function SharedTicketPage() {
  const { shareToken = '' } = useParams()
  const [ticket, setTicket] = useState<SharedTicket | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { ticketService.getShared(shareToken).then(setTicket).catch((requestError: Error) => setError(requestError.message)) }, [shareToken])
  if (error) return <div className="min-h-screen bg-mauve-950 text-white"><Header /><main className="mx-auto max-w-lg px-5 pt-40 text-center"><TicketIcon className="mx-auto h-12 w-12 text-red-400" /><h1 className="mt-4 text-2xl font-semibold">Ingresso indisponível</h1><p className="mt-2 text-white/50">{error}</p></main></div>
  if (!ticket) return <div className="min-h-screen bg-mauve-950 pt-40 text-center text-white/50">Carregando ingresso...</div>
  const date = new Date(ticket.session_datetime)
  return <div className="min-h-screen bg-mauve-950 text-white"><Header /><main className="mx-auto max-w-lg px-4 pb-12 pt-36"><article className="overflow-hidden rounded-2xl border border-orange-500/50 bg-white/[0.04]">{ticket.poster_url && <img src={ticket.poster_url} alt={ticket.movie_title} className="h-56 w-full object-cover" />}<div className="p-6"><div className="flex justify-between gap-3"><h1 className="text-2xl font-semibold">{ticket.movie_title}</h1><span className="text-sm text-emerald-300">{ticket.status === 'issued' ? 'Válido' : ticket.status === 'used' ? 'Utilizado' : 'Cancelado'}</span></div><div className="mt-5 space-y-3 text-sm text-white/65"><p className="flex gap-2"><CalendarDays className="h-4 w-4 text-orange-400" />{date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p><p className="flex gap-2"><MapPin className="h-4 w-4 text-orange-400" />{ticket.cinema_name} · {ticket.cinema_address}</p><p className="flex gap-2"><Armchair className="h-4 w-4 text-orange-400" />{ticket.room_name} · Assento {ticket.seat_row}{ticket.seat_number} · {ticket.projection_type}</p></div></div><div className="flex flex-col items-center border-t border-dashed border-white/15 p-6"><div className={`rounded-xl bg-white p-3 ${ticket.status !== 'issued' ? 'opacity-40 grayscale' : ''}`}><QRCodeSVG value={ticket.token} size={190} level="H" /></div><p className="mt-3 text-sm text-white/50">Apresente este QR Code na portaria</p></div></article><p className="mt-4 text-center text-xs text-white/35">Este link é pessoal. Não encaminhe para mais de uma pessoa.</p></main></div>
}

export default SharedTicketPage
