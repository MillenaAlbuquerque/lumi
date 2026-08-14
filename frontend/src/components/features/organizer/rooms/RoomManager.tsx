import { useEffect, useState } from 'react'
import { DoorOpen, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card'
import { Input } from '../../../ui/input'
import { roomService, type Room } from '../../../../services/roomService'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../../ui/alert-dialog'
import FeedbackDialog, { type FeedbackMessage } from '../../../ui/feedback-dialog'

function RoomManager() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [name, setName] = useState('')
  const [rows, setRows] = useState('')
  const [seatsPerRow, setSeatsPerRow] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null)
  const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)

  useEffect(() => {
    roomService.list()
      .then(setRooms)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setIsCreating(true)
    try {
      const room = await roomService.create({
        name: name.trim(),
        rows: Number(rows),
        seats_per_row: Number(seatsPerRow),
      })
      setRooms((current) => [...current, room])
      setName('')
      setRows('')
      setSeatsPerRow('')
      setFeedback({ type: 'success', title: 'Sala criada', description: `${room.name} foi cadastrada com ${room.capacity} lugares.` })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Erro ao criar sala'
      setError(message)
      setFeedback({ type: 'error', title: 'Não foi possível criar', description: message })
    } finally {
      setIsCreating(false)
    }
  }

  const deleteRoom = async () => {
    if (!roomToDelete) return
    setDeletingRoomId(roomToDelete.id); setError('')
    try { await roomService.delete(roomToDelete.id); setRooms((current) => current.filter((room) => room.id !== roomToDelete.id)); setRoomToDelete(null); setFeedback({ type: 'success', title: 'Sala excluída', description: 'A sala e seus assentos foram removidos com sucesso.' }) }
    catch (requestError) { const message = requestError instanceof Error ? requestError.message : 'Não foi possível excluir a sala.'; setError(message); setRoomToDelete(null); setFeedback({ type: 'error', title: 'Não foi possível excluir', description: message }) }
    finally { setDeletingRoomId(null) }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="h-fit bg-[var(--color-white)] shadow-sm lg:order-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-[var(--color-text)]">
            <Plus className="h-6 w-6 text-[var(--color-primary-dark)]" /> Nova sala
          </CardTitle>
          <CardDescription>Defina o nome e a disposição inicial dos assentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="room-name" className="text-sm font-medium text-slate-700">Nome da sala</label>
              <Input id="room-name" className="border border-[var(--color-primary)]" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Sala VIP" required maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="room-rows" className="text-sm font-medium text-slate-700">Fileiras</label>
                <Input id="room-rows" className="border border-[var(--color-primary)]" type="number" min="1" value={rows} onChange={(event) => setRows(event.target.value)} placeholder="10" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="room-seats" className="text-sm font-medium text-slate-700">Assentos (por fileira)</label>
                <Input id="room-seats" className="border border-[var(--color-primary)]" type="number" min="1" value={seatsPerRow} onChange={(event) => setSeatsPerRow(event.target.value)} placeholder="12" required />
              </div>
            </div>
            {rows && seatsPerRow && (
              <p className="rounded-lg bg-orange-50 p-3 text-sm text-slate-600">
                Total de assentos: <strong>{Number(rows) * Number(seatsPerRow)}</strong>
              </p>
            )}
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={isCreating}>
              {isCreating ? 'Criando sala...' : 'Criar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="lg:order-1">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{rooms.length} {rooms.length === 1 ? 'sala cadastrada' : 'salas cadastradas'}</p>
          </div>
        </div>
        {isLoading ? (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Carregando salas...</p>
        ) : rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-orange-200 bg-white p-10 text-center">
            <DoorOpen className="mx-auto mb-3 h-9 w-9 text-orange-300" />
            <p className="mt-1 text-sm text-slate-500">Seu cinema ainda não possui salas, cadastre a primeira.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rooms.map((room) => (
              <Card key={room.id} className=" bg-white shadow-sm">
                <CardContent className="flex min-h-14 items-center justify-between gap-4 p-4">
                  <CardTitle className="flex items-center gap-2 text-medium text-[var(--color-text)]">
                    <DoorOpen className="h-5 w-5 text-[var(--color-primary-dark)]" /> {room.name}
                  </CardTitle>
                  <span className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
                     {room.capacity} lugares
                    <button type="button" onClick={() => setRoomToDelete(room)} title="Excluir sala" aria-label={`Excluir ${room.name}`} className="ml-2 cursor-pointer rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <AlertDialog open={roomToDelete !== null} onOpenChange={(open) => { if (!open && !deletingRoomId) setRoomToDelete(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{roomToDelete ? roomToDelete.name : 'Excluir sala'}</AlertDialogTitle><AlertDialogDescription>{roomToDelete && <>Esta sala e seus assentos serão excluídos. Tem certeza que deseja prosseguir?</>}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={Boolean(deletingRoomId)}>Manter sala</AlertDialogCancel><AlertDialogAction disabled={Boolean(deletingRoomId)} onClick={(event) => { event.preventDefault(); void deleteRoom() }}>{deletingRoomId ? 'Excluindo...' : 'Sim, excluir'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <FeedbackDialog feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  )
}

export default RoomManager
