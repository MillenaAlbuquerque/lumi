import { useEffect, useRef, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { CheckCircle2, Keyboard, QrCode, Search, TriangleAlert, XCircle } from 'lucide-react'
import Header from '../../components/layout/Header'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { entranceService, type EntranceEvent, type EntranceResult } from '../../services/entranceService'

const resultStyle = {
  valid: { icon: CheckCircle2, title: 'Ingresso válido', color: 'text-emerald-400', surface: 'bg-mauve-900' },
  invalid: { icon: XCircle, title: 'Ingresso inválido', color: 'text-red-400', surface: 'bg-mauve-900' },
  used: { icon: TriangleAlert, title: 'Ingresso já utilizado', color: 'text-amber-400', surface: 'bg-mauve-900' },
  wrong_event: { icon: XCircle, title: 'Evento errado', color: 'text-orange-400', surface: 'bg-mauve-900' },
} as const

function GatekeeperPage() {
  const [events, setEvents] = useState<EntranceEvent[]>([])
  const [eventId, setEventId] = useState('')
  const [eventQuery, setEventQuery] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [result, setResult] = useState<EntranceResult | null>(null)
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const lastScan = useRef('')

  useEffect(() => { entranceService.listEvents().then(setEvents).catch((requestError: Error) => setError(requestError.message)) }, [])

  const eventLabel = (event: EntranceEvent) => {
    const date = new Date(event.start_datetime)
    return `${event.movie_title} · ${event.room_name} · ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }
  const filteredEvents = events.filter((event) => eventLabel(event).toLocaleLowerCase('pt-BR').includes(eventQuery.trim().toLocaleLowerCase('pt-BR')))
  const selectedEvent = events.find((event) => event.id === Number(eventId))

  const reset = () => { setResult(null); setManualToken(''); setError(''); lastScan.current = '' }
  const validate = async (token: string) => {
    const cleanToken = token.trim()
    if (!eventId || !cleanToken || validating) return
    setValidating(true); setError('')
    try { setResult(await entranceService.validate(Number(eventId), cleanToken)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível validar o ingresso.') }
    finally { setValidating(false) }
  }

  const visual = result ? resultStyle[result.result] : null
  const ResultIcon = visual?.icon

  return <div className="min-h-screen bg-mauve-950 text-white"><Header /><main className="mx-auto max-w-5xl px-4 pb-14 pt-32 sm:px-6">
    <div className="mb-7"><h1 className="text-3xl font-medium text-[var(--color-primary-dark)]">Portaria</h1><p className="text-[var(--color-surface)]">Validação dos ingressos da sessão.</p></div>

    <section className="relative z-20 mb-6 rounded-2xl p-2">
      <label htmlFor="entrance-event" className="mb-2 block text-sm font-medium text-orange-400">Sessão:</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-orange-400" />
        <Input id="entrance-event" value={eventQuery} onChange={(event) => { setEventQuery(event.target.value); setEventId(''); setShowOptions(true); reset() }} onFocus={() => setShowOptions(true)} onBlur={() => setTimeout(() => setShowOptions(false), 100)} className="border border-white/10 bg-[#211915] pl-10 text-white placeholder:text-white/35 focus:border-orange-500" placeholder="Pesquisar e selecionar sessão" autoComplete="off" />
        {showOptions && <div className="absolute mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-white/10 bg-[#211915] p-1 shadow-2xl">{filteredEvents.length ? filteredEvents.map((event) => <button key={event.id} type="button" onMouseDown={(mouseEvent) => mouseEvent.preventDefault()} onClick={() => { setEventId(String(event.id)); setEventQuery(eventLabel(event)); setShowOptions(false); reset() }} className="w-full rounded px-3 py-2.5 text-left text-sm text-white/80 transition hover:bg-orange-500/15 hover:text-orange-300">{eventLabel(event)}</button>) : <p className="px-3 py-2 text-sm text-white/40">Nenhuma sessão encontrada.</p>}</div>}
      </div>
    </section>

    {result && visual && ResultIcon ? <section className={`rounded-3xl p-8 text-center ${visual.surface}`}><ResultIcon className={`mx-auto h-16 w-16 ${visual.color}`} /><h2 className="mt-4 text-2xl font-bold">{visual.title}</h2><p className="mt-2 text-white/65">{result.message}</p>{result.movie_title && <div className="mx-auto mt-5 max-w-sm rounded-xl bg-black/20 p-4 text-sm"><p className="font-semibold">{result.movie_title}</p><p className="mt-1 text-white/55">{result.room_name} · Assento {result.seat}</p></div>}<Button type="button" onClick={reset} className="mt-6 w-full max-w-sm">Escanear próximo ingresso</Button></section> : <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <section className="overflow-hidden rounded-2xl border border-[var(--color-primary-dark)] bg-black/25"><div className="flex items-center gap-2 px-4 py-3"><QrCode className="h-5 w-5 text-orange-400" /><h2 className="font-medium">Leitor de QR Code</h2></div>{eventId ? <div className="relative aspect-square max-h-[520px] overflow-hidden"><Scanner paused={validating} formats={['qr_code']} constraints={{ facingMode: 'environment' }} scanDelay={800} components={{ finder: true }} onScan={(codes) => { const token = codes[0]?.rawValue; if (token && token !== lastScan.current) { lastScan.current = token; void validate(token) } }} onError={(scannerError) => setCameraError(scannerError instanceof Error ? scannerError.message : 'Não foi possível acessar a câmera.')} /></div> : <div className="p-12 text-center text-white/45">Selecione uma sessão para iniciar a câmera.</div>}{cameraError && <p className="p-4 text-sm text-amber-300">{cameraError} Use a digitação manual abaixo.</p>}</section>
      <section className="h-fit rounded-2xl border border-[var(--color-primary-dark)] bg-black/25 p-5"><Keyboard className="h-6 w-6 text-orange-400" /><h2 className="mt-3 text-lg font-semibold">Digitação manual</h2><p className="mt-1 text-sm text-white/45">Cole ou digite o token exibido no ingresso.</p><form className="mt-5" onSubmit={(event) => { event.preventDefault(); void validate(manualToken) }}><textarea value={manualToken} onChange={(event) => setManualToken(event.target.value)} rows={5} placeholder="Token do ingresso" className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-orange-500" /><Button type="submit" disabled={!eventId || !manualToken.trim() || validating} className="mt-3 w-full">{validating ? 'Validando...' : 'Validar'}</Button></form>{selectedEvent && <p className="mt-4 text-xs text-white/35">Validando para: {selectedEvent.movie_title} · {selectedEvent.room_name}</p>}{error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}</section>
    </div>}
  </main></div>
}

export default GatekeeperPage
