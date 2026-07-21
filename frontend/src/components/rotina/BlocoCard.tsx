import type { ReactNode } from 'react'

interface BlocoCardProps {
  id: number
  horaInicio: string
  horaFim: string
  titulo: string
  cor: string | null
  isCurrent: boolean
  isPast: boolean
  statusLabel: string | null
  statusColor: string | null
  isEditing: boolean
  editTitulo: string
  editHoraInicio: string
  editHoraFim: string
  isPendingUpdate: boolean
  isLast: boolean
  children?: ReactNode
  onEditTitleChange: (value: string) => void
  onEditHoraInicioChange: (value: string) => void
  onEditHoraFimChange: (value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onStartEdit: () => void
  onDelete: () => void
}

export function BlocoCard({
  id, horaInicio, horaFim, titulo, cor,
  isCurrent, isPast, statusLabel, statusColor,
  isEditing, editTitulo, editHoraInicio, editHoraFim,
  isPendingUpdate, isLast, children,
  onEditTitleChange, onEditHoraInicioChange, onEditHoraFimChange,
  onSaveEdit, onCancelEdit, onStartEdit, onDelete,
}: BlocoCardProps) {
  return (
    <div id={`bloco-${id}`} className={`relative pl-10 pb-4 ${isPast ? 'opacity-50' : ''}`}>
      <div className="absolute left-[11px] top-[5px] flex flex-col items-center">
        <div className={`w-4 h-4 rounded-full border-2 transition-all ${isCurrent
          ? 'bg-success border-success shadow-[0_0_8px_var(--color-success)]'
          : 'bg-bg-secondary border-border'}`} />
        {!isLast && (
          <div className="w-0.5 h-full min-h-[24px] bg-border mt-0.5" />
        )}
      </div>
      <div className={`rounded-xl border p-3 transition-all ${isCurrent
        ? 'border-success/30 bg-success/[0.03] shadow-elevation-1'
        : 'border-border bg-bg-primary'}`}>
        {isEditing ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input value={editTitulo} onChange={e => onEditTitleChange(e.target.value)}
              className="bg-bg-primary rounded px-2 py-1 text-sm w-28 outline-none focus:ring-1 focus:ring-accent" />
            <input type="time" value={editHoraInicio} onChange={e => onEditHoraInicioChange(e.target.value)}
              className="bg-bg-primary rounded px-2 py-1 text-sm outline-none" />
            <input type="time" value={editHoraFim} onChange={e => onEditHoraFimChange(e.target.value)}
              className="bg-bg-primary rounded px-2 py-1 text-sm outline-none" />
            <button onClick={onSaveEdit}
              disabled={isPendingUpdate} className="text-xs text-success disabled:opacity-disabled">{isPendingUpdate ? '...' : 'OK'}</button>
            <button onClick={onCancelEdit} className="text-xs text-text-muted">Cancelar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-text-secondary shrink-0">{horaInicio}→{horaFim}</span>
                <span className="text-sm font-medium truncate" style={{ color: cor || undefined }}>{titulo}</span>
                {statusLabel && isCurrent && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={onStartEdit}
                  className="text-xs text-text-muted hover:text-accent" aria-label="Editar bloco">✏️</button>
                <button onClick={onDelete}
                  className="text-xs text-text-muted hover:text-danger" aria-label="Excluir bloco">🗑️</button>
              </div>
            </div>
            {children && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-0.5 max-h-60 overflow-y-auto">
                {children}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
