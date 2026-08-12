import { useEffect, useState } from 'react'
import { CircleDollarSign, Film, TicketCheck, UsersRound } from 'lucide-react'
import { organizerTicketService, type TicketDashboard } from '../../../../services/organizerTicketService'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function TicketManager() {
  const [dashboard, setDashboard] = useState<TicketDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    organizerTicketService.dashboard()
      .then(setDashboard)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

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
    <div><p className="mt-1 text-sm text-slate-500">Acompanhe as vendas e a ocupação das sessões.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon }) => 
    <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between">
    <p className="text-sm text-slate-500">{label}</p><Icon className="h-5 w-5 text-orange-500" /></div><p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p></div>)}</div>
    {dashboard.sessions.length === 0 ? <div className="rounded-2xl shadow-sm bg-white p-12 text-center"><TicketCheck className="mx-auto h-10 w-10 text-orange-300" /><h3 className="mt-3 font-semibold text-slate-700">Nenhum ingresso vendido ainda</h3><p className="mt-1 text-sm text-slate-500">As vendas aparecerão aqui após pagamentos aprovados.</p></div> : 
    <div className="space-y-3">{dashboard.sessions.map((session) => { const date = new Date(session.start_datetime); return <article key={session.event_id} className="rounded-2xl bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
    <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">{session.poster_url ? 
    <img src={session.poster_url} alt={session.movie_title} className="h-full w-full object-cover" /> : <Film className="m-auto mt-7 h-5 w-5 text-slate-300" />}</div><div className="min-w-0 flex-1"><h4 className="truncate font-semibold text-[var(--color-primary-dark)]">{session.movie_title}</h4><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500"><span className="flex items-center gap-1">{date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><span className="flex items-center gap-1">{session.room_name}</span></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-50"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(session.occupancy_percentage, 100)}%` }} /></div><p className="mt-1 text-xs text-slate-400">{session.tickets_sold} de {session.capacity} lugares · {session.occupancy_percentage}% ocupado</p></div><div className="grid grid-cols-2 gap-5 text-right sm:min-w-48">
    <div className="col-span-2"><p className="text-xs text-slate-400">Receita</p><p className="font-semibold text-orange-600">{currency.format(Number(session.revenue))}</p></div></div></div></article> })}</div>}
  </div>
}

export default TicketManager
