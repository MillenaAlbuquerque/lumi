import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { teamService, type TeamMember } from '../../../../services/teamService'
import { Button } from '../../../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card'
import { Input } from '../../../ui/input'
import { Modal } from '../../../ui/modal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../../ui/alert-dialog'
import FeedbackDialog, { type FeedbackMessage } from '../../../ui/feedback-dialog'

function TeamManager() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)

  useEffect(() => {
    teamService.list().then(setMembers).catch((requestError: Error) => setError(requestError.message)).finally(() => setIsLoading(false))
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setIsCreating(true)
    try {
      const member = await teamService.create({ name: name.trim(), email: email.trim(), password })
      setMembers((current) => [...current, member].sort((a, b) => a.name.localeCompare(b.name)))
      setName(''); setEmail(''); setPassword('')
      setFeedback({ type: 'success', title: 'Funcionário adicionado', description: `${member.name} já pode acessar a Portaria com o próprio login.` })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Erro ao adicionar funcionário'
      setError(message)
      setFeedback({ type: 'error', title: 'Não foi possível adicionar', description: message })
    } finally { setIsCreating(false) }
  }

  const openEdit = (member: TeamMember) => { setEditingMember(member); setEditName(member.name); setEditEmail(member.email); setEditPassword(''); setError('') }
  const saveMember = async (event: React.FormEvent) => { event.preventDefault(); if (!editingMember) return; setSaving(true); setError(''); try { const updated = await teamService.update(editingMember.id, { name: editName.trim(), email: editEmail.trim(), ...(editPassword ? { password: editPassword } : {}) }); setMembers((current) => current.map((member) => member.id === updated.id ? updated : member).sort((a, b) => a.name.localeCompare(b.name))); setEditingMember(null); setFeedback({ type: 'success', title: 'Funcionário atualizado', description: 'As informações do funcionário foram atualizadas com sucesso.' }) } catch (requestError) { const message = requestError instanceof Error ? requestError.message : 'Não foi possível editar o funcionário.'; setError(message); setEditingMember(null); setFeedback({ type: 'error', title: 'Não foi possível atualizar', description: message }) } finally { setSaving(false) } }
  const deleteMember = async () => { if (!memberToDelete) return; setDeleting(true); setError(''); try { await teamService.delete(memberToDelete.id); setMembers((current) => current.filter((member) => member.id !== memberToDelete.id)); setMemberToDelete(null); setFeedback({ type: 'success', title: 'Funcionário excluído', description: 'O acesso desse funcionário à Portaria foi removido.' }) } catch (requestError) { const message = requestError instanceof Error ? requestError.message : 'Não foi possível excluir o funcionário.'; setError(message); setMemberToDelete(null); setFeedback({ type: 'error', title: 'Não foi possível excluir', description: message }) } finally { setDeleting(false) } }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="lg:order-1">
        <p className="mb-4 text-sm text-slate-500">{members.length} {members.length === 1 ? 'funcionário cadastrado' : 'funcionários cadastrados'}</p>
        {isLoading ? <p className="rounded-xl bg-white p-8 text-center text-slate-500">Carregando equipe...</p> : members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-orange-200 bg-white p-10 text-center text-slate-500">Nenhum funcionário da portaria cadastrado.</div>
        ) : <div className="flex flex-col gap-3">{members.map((member) => (
          <Card key={member.id} className=" bg-white shadow-sm"><CardContent className="flex min-h-14 items-center justify-between gap-4 p-4">
            <span className="flex items-center gap-2 font-semibold"><UserRound className="h-5 w-5 text-[var(--color-primary-dark)]" />{member.name}</span>
            <span className="flex items-center gap-2 text-sm text-[var(--colo">{member.email}<button type="button" onClick={() => openEdit(member)} title="Editar funcionário" className="cursor-pointer rounded-lg p-2 text-orange-500 hover:bg-orange-50"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => setMemberToDelete(member)} title="Excluir funcionário" className="cursor-pointer rounded-lg p-2 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></span>
          </CardContent></Card>
        ))}</div>}
      </div>
      <Card className="h-fit bg-white shadow-sm lg:order-2"><CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl "><Plus className="h-6 w-6 text-[var(--color-primary-dark)]" />Adicionar funcionário</CardTitle>
        <CardDescription>Ele receberá um login próprio com acesso à Portaria.</CardDescription>
      </CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-2">
        <div className="space-y-2"><label htmlFor="staff-name" className="text-sm font-medium">Nome</label><Input id="staff-name" className="border border-[var(--color-primary)]"  value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} /></div>
        <div className="space-y-2"><label htmlFor="staff-email" className="text-sm font-medium">E-mail</label><Input id="staff-email" type="email" className="border border-[var(--color-primary)]" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div className="space-y-2"><label htmlFor="staff-password" className="text-sm font-medium">Senha inicial</label><Input id="staff-password" type="password" className="border border-[var(--color-primary)]" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <Button className="w-full" type="submit" disabled={isCreating}>{isCreating ? 'Adicionando...' : 'Adicionar'}</Button>
      </form></CardContent></Card>
      <Modal open={editingMember !== null} onOpenChange={(open) => { if (!open && !saving) setEditingMember(null) }} title="Editar funcionário" className="max-w-md"><form onSubmit={saveMember} className="space-y-4 p-6"><div className="space-y-2"><label htmlFor="edit-staff-name" className="text-sm font-medium">Nome</label><Input id="edit-staff-name" value={editName} onChange={(event) => setEditName(event.target.value)} className="border border-orange-300" required /></div><div className="space-y-2"><label htmlFor="edit-staff-email" className="text-sm font-medium">E-mail</label><Input id="edit-staff-email" type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} className="border border-orange-300" required /></div><div className="space-y-2"><label htmlFor="edit-staff-password" className="text-sm font-medium">Nova senha <span className="font-normal text-slate-400">(opcional)</span></label><Input id="edit-staff-password" type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} minLength={8} className="border border-orange-300" placeholder="Mantenha vazio para não alterar" /></div>{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}<Button type="submit" disabled={saving} className="w-full">{saving ? 'Salvando...' : 'Salvar alterações'}</Button></form></Modal>
      <AlertDialog open={memberToDelete !== null} onOpenChange={(open) => { if (!open && !deleting) setMemberToDelete(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir funcionário?</AlertDialogTitle><AlertDialogDescription>{memberToDelete && <>O acesso de <strong className="text-white">{memberToDelete.name}</strong> à Portaria será removido e esse usuário não conseguirá mais entrar no Lumi.</>}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Manter funcionário</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={(event) => { event.preventDefault(); void deleteMember() }}>{deleting ? 'Excluindo...' : 'Sim, excluir'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <FeedbackDialog feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  )
}

export default TeamManager
