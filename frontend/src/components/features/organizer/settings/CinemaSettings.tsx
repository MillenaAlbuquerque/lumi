import { useEffect, useState } from 'react'
import { LoaderCircle, MapPin } from 'lucide-react'
import { cepService, type CepAddress } from '../../../../services/cepService'
import { organizerService, type OrganizerCinema } from '../../../../services/organizerService'
import { Button } from '../../../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card'
import FeedbackDialog, { type FeedbackMessage } from '../../../ui/feedback-dialog'
import { Input } from '../../../ui/input'

interface CinemaSettingsProps { onCinemaUpdated?: (cinema: OrganizerCinema) => void }

function CinemaSettings({ onCinemaUpdated }: CinemaSettingsProps) {
  const [cinema, setCinema] = useState<OrganizerCinema | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [cep, setCep] = useState('')
  const [number, setNumber] = useState('')
  const [cepAddress, setCepAddress] = useState<CepAddress | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)

  const resolvedAddress = cepAddress && number.trim()
    ? [cepAddress.logradouro, number.trim(), cepAddress.bairro, `${cepAddress.localidade} - ${cepAddress.uf}`, `CEP ${cepAddress.cep}`].filter(Boolean).join(', ')
    : ''

  useEffect(() => {
    organizerService.getMyCinema()
      .then((data) => { setCinema(data); setName(data.name); setAddress(data.address) })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const digits = cep.replace(/\D/g, '')
    setCepAddress(null)
    setCepError('')
    if (digits.length !== 8) {
      setCepLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setCepLoading(true)
      try {
        setCepAddress(await cepService.find(digits, controller.signal))
      } catch (requestError) {
        if (!controller.signal.aborted) setCepError(requestError instanceof Error ? requestError.message : 'Não foi possível consultar o CEP.')
      } finally {
        if (!controller.signal.aborted) setCepLoading(false)
      }
    }, 350)

    return () => { window.clearTimeout(timer); controller.abort() }
  }, [cep])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const updated = await organizerService.updateMyCinema({ name: name.trim(), address: resolvedAddress || address })
      setCinema(updated)
      setAddress(updated.address)
      setCep('')
      setNumber('')
      setCepAddress(null)
      onCinemaUpdated?.(updated)
      setFeedback({ type: 'success', title: 'Cinema atualizado', description: 'As informações do cinema foram salvas com sucesso.' })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Não foi possível atualizar o cinema.'
      setError(message)
      setFeedback({ type: 'error', title: 'Não foi possível salvar', description: message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="py-12 text-center text-slate-500">Carregando informações do cinema...</p>
  if (!cinema) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>

  return <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
    <Card className="bg-white shadow-sm">
      <CardHeader><CardTitle className="flex items-center text-[var(--color-primary-dark)] gap-2">Informações do cinema</CardTitle><CardDescription>Dados aparecem para os clientes nas sessões e nos ingressos.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><label htmlFor="cinema-name" className="text-sm font-medium text-slate-700">Nome do cinema</label><Input id="cinema-name" value={name} onChange={(event) => setName(event.target.value)} className="border border-orange-300" required maxLength={255} /></div>
          <div className="space-y-2"><p className="text-sm font-medium text-slate-700">Endereço atual</p><p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />{address}</p></div>
          <div className="space-y-2"></div>
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <div className="space-y-2"><label htmlFor="cinema-cep" className="text-sm text-slate-600">CEP</label><div className="relative"><Input id="cinema-cep" inputMode="numeric" value={cep} onChange={(event) => { const digits = event.target.value.replace(/\D/g, '').slice(0, 8); setCep(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits) }} placeholder="00000-000" className="border border-orange-300 pr-9" />{cepLoading && <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-orange-500" />}</div></div>
            <div className="space-y-2"><label htmlFor="cinema-number" className="text-sm text-slate-600">Número</label><Input id="cinema-number" value={number} onChange={(event) => setNumber(event.target.value)} placeholder="123" className="border border-orange-300" maxLength={20} /></div>
          </div>
          {cepError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{cepError}</p>}
          {cepAddress && <p className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50/60 p-3 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />{resolvedAddress || [cepAddress.logradouro, cepAddress.bairro, `${cepAddress.localidade} - ${cepAddress.uf}`].filter(Boolean).join(', ')}</p>}
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={saving || cepLoading || !name.trim() || (!!cepAddress && !number.trim()) || (!!cep.replace(/\D/g, '') && !cepAddress)}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
        </form>
      </CardContent>
    </Card>
    <FeedbackDialog feedback={feedback} onClose={() => setFeedback(null)} />
  </div>
}

export default CinemaSettings
