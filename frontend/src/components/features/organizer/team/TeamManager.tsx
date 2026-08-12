import { useEffect, useState } from 'react'
import { Plus, UserRound } from 'lucide-react'
import { teamService, type TeamMember } from '../../../../services/teamService'
import { Button } from '../../../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card'
import { Input } from '../../../ui/input'

function TeamManager() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    teamService.list().then(setMembers).catch((requestError: Error) => setError(requestError.message)).finally(() => setIsLoading(false))
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setIsCreating(true)
    try {
      const member = await teamService.create({ name: name.trim(), email: email.trim(), password })
      setMembers((current) => [...current, member].sort((a, b) => a.name.localeCompare(b.name)))
      setName(''); setEmail(''); setPassword('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao adicionar funcionário')
    } finally { setIsCreating(false) }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="lg:order-1">
        <p className="mb-4 text-sm text-slate-500">{members.length} {members.length === 1 ? 'funcionário cadastrado' : 'funcionários cadastrados'}</p>
        {isLoading ? <p className="rounded-xl bg-white p-8 text-center text-slate-500">Carregando equipe...</p> : members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-orange-200 bg-white p-10 text-center text-slate-500">Nenhum funcionário da portaria cadastrado.</div>
        ) : <div className="flex flex-col gap-3">{members.map((member) => (
          <Card key={member.id} className=" bg-white shadow-sm"><CardContent className="flex min-h-14 items-center justify-between gap-4 p-4">
            <span className="flex items-center gap-2 font-semibold"><UserRound className="h-5 w-5 text-[var(--color-primary-dark)]" />{member.name}</span>
            <span className="flex items-center gap-2 text-sm text-slate-500">{member.email}</span>
          </CardContent></Card>
        ))}</div>}
      </div>
      <Card className="h-fit bg-white shadow-sm lg:order-2"><CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl"><Plus className="h-6 w-6 text-[var(--color-primary-dark)]" />Adicionar funcionário</CardTitle>
        <CardDescription>Ele receberá um login próprio com acesso à Portaria.</CardDescription>
      </CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-2">
        <div className="space-y-2"><label htmlFor="staff-name" className="text-sm font-medium">Nome</label><Input id="staff-name" className="border border-[var(--color-primary)]"  value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} /></div>
        <div className="space-y-2"><label htmlFor="staff-email" className="text-sm font-medium">E-mail</label><Input id="staff-email" type="email" className="border border-[var(--color-primary)]" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div className="space-y-2"><label htmlFor="staff-password" className="text-sm font-medium">Senha inicial</label><Input id="staff-password" type="password" className="border border-[var(--color-primary)]" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <Button className="w-full" type="submit" disabled={isCreating}>{isCreating ? 'Adicionando...' : 'Adicionar'}</Button>
      </form></CardContent></Card>
    </div>
  )
}

export default TeamManager
