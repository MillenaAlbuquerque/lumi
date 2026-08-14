import { useEffect, useState } from 'react'
import { Building2, MapPin, Save } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)

  useEffect(() => { organizerService.getMyCinema().then((data) => { setCinema(data); setName(data.name); setAddress(data.address) }).catch((requestError: Error) => setError(requestError.message)).finally(() => setLoading(false)) }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const updated = await organizerService.updateMyCinema({ name: name.trim(), address: address.trim() })
      setCinema(updated); onCinemaUpdated?.(updated)
      setFeedback({ type: 'success', title: 'Cinema atualizado', description: 'As informações do cinema foram salvas com sucesso.' })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Não foi possível atualizar o cinema.'
      setError(message); setFeedback({ type: 'error', title: 'Não foi possível salvar', description: message })
    } finally { setSaving(false) }
  }

  if (loading) return <p className="py-12 text-center text-slate-500">Carregando informações do cinema...</p>
  if (!cinema) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>

  return <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
    <Card className="bg-white shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-orange-500" />Informações do cinema</CardTitle><CardDescription>Esses dados aparecem para os clientes nas sessões e nos ingressos.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><label htmlFor="cinema-name" className="text-sm font-medium text-slate-700">Nome do cinema</label><Input id="cinema-name" value={name} onChange={(event) => setName(event.target.value)} className="border border-orange-300" required maxLength={255} /></div><div className="space-y-2"><label htmlFor="cinema-address" className="text-sm font-medium text-slate-700">Endereço</label><textarea id="cinema-address" value={address} onChange={(event) => setAddress(event.target.value)} className="min-h-24 w-full resize-y rounded-xl border border-orange-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300" required /></div>{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}<Button type="submit" disabled={saving || !name.trim() || !address.trim()}><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar alterações'}</Button></form></CardContent></Card>
    <Card className="h-fit bg-white shadow-sm"><CardHeader><CardTitle className="text-base">Dados cadastrados</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div><p className="text-xs text-slate-400">Identificador</p><p className="font-medium text-slate-700">Cinema #{cinema.id}</p></div><div><p className="text-xs text-slate-400">Nome</p><p className="font-medium text-slate-700">{cinema.name}</p></div><div><p className="text-xs text-slate-400">Endereço</p><p className="flex gap-2 text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />{cinema.address}</p></div><div><p className="text-xs text-slate-400">Organizador responsável</p><p className="font-medium text-slate-700">Usuário #{cinema.organizer_id}</p></div></CardContent></Card>
    <FeedbackDialog feedback={feedback} onClose={() => setFeedback(null)} />
  </div>
}

export default CinemaSettings
