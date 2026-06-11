import { useEffect, useRef } from 'react'

interface Props {
  titulo: string
  mensagem: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export default function ConfirmModal({ titulo, mensagem, onConfirm, onCancel, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', destructive }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    confirmRef.current?.focus()
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={onCancel}>
      <div
        className="bg-bg-secondary rounded-xl border border-border shadow-2xl w-full max-w-sm mx-4 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4">
          <h3 className="text-base font-semibold mb-2">{titulo}</h3>
          <p className="text-sm text-text-muted">{mensagem}</p>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button onClick={onCancel}
            className="px-4 py-1.5 text-sm rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors">
            {cancelLabel}
          </button>
          <button ref={confirmRef} onClick={onConfirm}
            className={`px-4 py-1.5 text-sm rounded-lg text-white transition-colors ${destructive ? 'bg-danger hover:bg-danger/80' : 'bg-accent hover:bg-accent-hover'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
