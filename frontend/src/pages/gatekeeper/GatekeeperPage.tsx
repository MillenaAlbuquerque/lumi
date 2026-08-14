import { useRef, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { CheckCircle2, Keyboard, QrCode, TriangleAlert, XCircle } from 'lucide-react'
import Header from '../../components/layout/Header'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { entranceService, type EntranceResult } from '../../services/entranceService'

const formatManualCode = (value: string) => value
  .toUpperCase()
  .replace(/[^2-9A-HJ-NP-Z]/g, '')
  .slice(0, 12)
  .replace(/(.{4})(?=.)/g, '$1-')

const resultStyle = {
  valid: { icon: CheckCircle2, title: 'Ingresso válido', color: 'text-emerald-400', surface: 'bg-mauve-900' },
  invalid: { icon: XCircle, title: 'Ingresso inválido', color: 'text-red-400', surface: 'bg-mauve-900' },
  used: { icon: TriangleAlert, title: 'Ingresso já utilizado', color: 'text-amber-400', surface: 'bg-mauve-900' },
} as const

function GatekeeperPage() {
  const [manualToken, setManualToken] = useState('')
  const [result, setResult] = useState<EntranceResult | null>(null)
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const lastScan = useRef('')

  const reset = () => { setResult(null); setManualToken(''); setError(''); lastScan.current = '' }
  const validate = async (token: string) => {
    const cleanToken = token.trim()
    if (!cleanToken || validating) return
    setValidating(true); setError('')
    try { setResult(await entranceService.validate(cleanToken)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível validar o ingresso.'); lastScan.current = '' }
    finally { setValidating(false) }
  }

  const visual = result ? resultStyle[result.result] : null
  const ResultIcon = visual?.icon
  const manualCodeComplete = manualToken.replace(/-/g, '').length === 12

  return <div className="min-h-screen bg-mauve-950 text-white"><Header /><main className="mx-auto max-w-5xl px-4 pb-14 pt-32 sm:px-6">
    <div className="mb-7"><h1 className="text-3xl font-medium text-[var(--color-primary-dark)]">Portaria</h1><p className="text-[var(--color-surface)]">Valide o ingresso. </p></div>

    {result && visual && ResultIcon ? <section className={`rounded-3xl p-8 text-center ${visual.surface}`}><ResultIcon className={`mx-auto h-16 w-16 ${visual.color}`} /><h2 className="mt-4 text-2xl font-bold">{visual.title}</h2><p className="mt-2 text-white/65">{result.message}</p>{result.movie_title && <div className="mx-auto mt-5 max-w-sm rounded-xl bg-black/20 p-4 text-sm"><p className="font-semibold">{result.movie_title}</p><p className="mt-1 text-white/55">{result.room_name} · Assento {result.seat}</p></div>}<Button type="button" onClick={reset} className="mt-6 w-full max-w-sm">Escanear próximo ingresso</Button></section> : <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <section className="overflow-hidden rounded-2xl border border-[var(--color-primary-dark)] bg-black/25"><div className="flex items-center gap-2 px-4 py-3"><QrCode className="h-5 w-5 text-orange-400" /><h2 className="font-medium">Leitor de QR Code</h2></div><div className="relative aspect-square max-h-[520px] overflow-hidden"><Scanner paused={validating} formats={['qr_code']} constraints={{ facingMode: 'environment' }} scanDelay={800} components={{ finder: true }} onScan={(codes) => { const token = codes[0]?.rawValue; if (token && token !== lastScan.current) { lastScan.current = token; void validate(token) } }} onError={(scannerError) => setCameraError(scannerError instanceof Error ? scannerError.message : 'Não foi possível acessar a câmera.')} /></div>{cameraError && <p className="p-4 text-sm text-amber-300">{cameraError} Use a digitação manual.</p>}</section>
      <section className="h-fit rounded-2xl border border-[var(--color-primary-dark)] bg-black/25 p-5"><Keyboard className="h-6 w-6 text-orange-400" /><h2 className="mt-3 text-lg font-semibold">Digitação manual</h2><p className="mt-1 text-sm text-white/45">Digite o código curto de 12 caracteres exibido no ingresso.</p><form className="mt-5" onSubmit={(event) => { event.preventDefault(); if (manualCodeComplete) void validate(manualToken) }}><Input value={manualToken} onChange={(event) => setManualToken(formatManualCode(event.target.value))} inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={14} placeholder="Ex.: 7K3M-P9Q2-XD4F" className="h-12 border border-white/10 bg-black/20 px-3 text-center font-mono text-base tracking-[0.16em] text-white outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-white/25 focus-visible:border-orange-500" /><p className="mt-2 text-right text-xs text-white/35">{manualToken.replace(/-/g, '').length}/12</p><Button type="submit" disabled={!manualCodeComplete || validating} className="mt-3 w-full">{validating ? 'Validando...' : 'Validar ingresso'}</Button></form>{error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}</section>
    </div>}
  </main></div>
}

export default GatekeeperPage
