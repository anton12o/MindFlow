import { useEffect, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface Props {
  titulo: string
  mensagem: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  disabled?: boolean
}

export default function ConfirmModal({ titulo, mensagem, onConfirm, onCancel, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', destructive, disabled }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, true)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    confirmRef.current?.focus()
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div ref={modalRef}
        className="bg-bg-secondary rounded-xl border border-border shadow-elevation-6 w-full max-w-sm mx-4 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4">
          <h3 id="confirm-modal-title" className="text-base font-semibold mb-2">{titulo}</h3>
          <p className="text-sm text-text-muted">{mensagem}</p>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button onClick={onCancel}
            className="px-4 py-1.5 text-sm rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors">
            {cancelLabel}
          </button>
          <button ref={confirmRef} onClick={onConfirm}
            disabled={disabled}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-disabled ${destructive ? 'bg-danger text-white hover:bg-danger/80' : 'bg-accent text-accent-foreground hover:bg-accent-hover'}`}>
            {disabled ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
