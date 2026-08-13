import { useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
  hideHeader?: boolean
}

function Modal({ open, onOpenChange, title, description, children, className, hideHeader = false }: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!open) {
      setIsVisible(false)
      return
    }
    setIsVisible(false)
    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setIsVisible(true))
    })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button className={`absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={() => onOpenChange(false)} aria-label="Fechar modal" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(`relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl transition-[opacity,transform] duration-500 ease-out ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-6 scale-[0.96] opacity-0'}`, className)}
      >
        {hideHeader ? <h2 id={titleId} className="sr-only">{title}</h2> : <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <div><h2 id={titleId} className="text-xl font-bold text-[var(--color-text)]">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm text-slate-500">{description}</p>}</div>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-orange-50 hover:text-[var(--color-primary-dark)]" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>}
        {children}
      </div>
    </div>,
    document.body,
  )
}

export { Modal }
