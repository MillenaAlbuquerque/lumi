import { CheckCircle2, X } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './alert-dialog'

export interface FeedbackMessage {
  type: 'success' | 'error'
  title: string
  description: string
}

interface FeedbackDialogProps {
  feedback: FeedbackMessage | null
  onClose: () => void
}

function FeedbackDialog({ feedback, onClose }: FeedbackDialogProps) {
  const success = feedback?.type === 'success'
  return <AlertDialog open={feedback !== null} onOpenChange={(open) => { if (!open) onClose() }}><AlertDialogContent><AlertDialogHeader><div className={`mb-2 flex h-11 w-11 items-center justify-center rounded-full ${success ? 'text-emerald-400' : 'text-red-400'}`}>{success ? <CheckCircle2 className="h-6 w-6" /> : <X className="h-6 w-6" />}</div><AlertDialogTitle>{feedback?.title}</AlertDialogTitle><AlertDialogDescription>{feedback?.description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={onClose} className={success ? 'bg-emerald-500 hover:bg-emerald-400' : undefined}>Entendi</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
}

export default FeedbackDialog
