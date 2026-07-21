import { memo, useState, useRef, type ReactNode } from 'react'
import KebabMenu from './KebabMenu'
import ConfirmModal from '../ConfirmModal'
import type { Tarefa } from '../../types'

interface TaskCardProps {
  tarefa: Tarefa
  externalScore?: { value: number | string; label: string; color: string }
  onScoreClick?: () => void
  children?: React.ReactNode
  onToggleStatus?: (id: number) => void
  onDelete?: (id: number) => void
  onLimparQuadrante?: () => void
  onCriarNota?: () => void
  onIniciarPomodoro?: () => void
  quadrante?: string
  extraKebabItems?: { label: ReactNode; onClick: () => void; danger?: boolean }[]
}

const CHECKBOX_STYLES: Record<string, string> = {
  fazer: 'border-accent/60 border-2',
  agendar: 'border-quadrant-2/50 border-2',
  delegar: 'border-text-muted/40 border-2',
  eliminar: 'border-quadrant-4/50 border',
}

const TaskCard = memo(function TaskCard({ tarefa, externalScore, onScoreClick, children, onToggleStatus, onDelete, onLimparQuadrante, onCriarNota, onIniciarPomodoro, quadrante, extraKebabItems }: TaskCardProps) {
  const concluida = tarefa.status === 'feito'
  const checkboxStyle = quadrante ? (CHECKBOX_STYLES[quadrante] || 'border-text-muted border-2') : 'border-text-muted border-2'
  const [confirmDelete, setConfirmDelete] = useState(false)
  const toggleDebounce = useRef(false)
  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (toggleDebounce.current) return
    toggleDebounce.current = true
    setTimeout(() => { toggleDebounce.current = false }, 250)
    onToggleStatus?.(tarefa.id)
  }
  return (
    <div className={`bg-bg-secondary/50 border border-border/60 rounded-lg p-3 text-xs space-y-1 relative transition-all duration-200 hover:shadow-elevation-1 ${concluida ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <button onClick={handleToggleClick}
            className={`shrink-0 w-4 h-4 rounded-sm flex items-center justify-center transition-all duration-150 active:scale-[0.85] ${
              concluida
                ? 'bg-success border-success text-bg-primary'
                : `${checkboxStyle} hover:border-accent`
            }`}
            aria-label={concluida ? 'Reabrir tarefa' : 'Concluir tarefa'}>
            {concluida && (
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-current">
                <path d="M3.5 7.5L2 6l-.7.7L3.5 9l6-6-.7-.7z"/>
              </svg>
            )}
          </button>
          <span className={`truncate text-text-primary text-sm font-semibold transition-all duration-200 ${concluida ? 'line-through text-text-secondary' : ''}`}>{tarefa.titulo}</span>
        </div>
        <div className="flex items-center gap-1">
          {externalScore && (onScoreClick ? (
            <button onClick={onScoreClick} title={externalScore.label}
              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-accent-foreground ${externalScore.color}`}>
              {externalScore.value}
            </button>
          ) : (
            <span title={externalScore.label}
              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-accent-foreground ${externalScore.color}`}>
              {externalScore.value}
            </span>
          ))}
          {quadrante === 'fazer' && onIniciarPomodoro && (
            <button onClick={(e) => { e.stopPropagation(); onIniciarPomodoro() }}
              className="shrink-0 text-xs px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              title="Iniciar Pomodoro" aria-label="Iniciar Pomodoro">
              {'\u25B6'} Pomodoro
            </button>
          )}
          {quadrante === 'fazer' && onCriarNota && (
            <button onClick={(e) => { e.stopPropagation(); onCriarNota() }}
              className="shrink-0 text-xs px-2 py-1 rounded bg-quadrant-2/10 text-quadrant-2 hover:bg-quadrant-2/20 transition-colors"
              title="Criar nota" aria-label="Criar nota">
              {'\uD83D\uDCDD'} Nota
            </button>
          )}
          {quadrante === 'agendar' && onCriarNota && (
            <button onClick={(e) => { e.stopPropagation(); onCriarNota() }}
              className="shrink-0 text-xs px-2 py-1 rounded bg-quadrant-2/10 text-quadrant-2 hover:bg-quadrant-2/20 transition-colors"
              title="Criar nota de lembrete" aria-label="Criar nota de lembrete">
              {'\uD83D\uDCCC'} Nota
            </button>
          )}
          {quadrante === 'eliminar' && onDelete && (
            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
              className="shrink-0 text-xs px-2 py-1 rounded bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
              title="Excluir tarefa" aria-label="Excluir tarefa">
              {'\u2715'} Excluir
            </button>
          )}
          {onToggleStatus && onDelete && (
            <KebabMenu concluida={tarefa.status === 'feito'}
              onConcluir={() => onToggleStatus(tarefa.id)}
              onExcluir={() => onDelete(tarefa.id)}
              onLimparQuadrante={onLimparQuadrante}
              items={extraKebabItems} />
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span>{tarefa.data}</span>
        {tarefa.tempo_estimado && <span>{tarefa.tempo_estimado}min</span>}
      </div>
      {children}
      {confirmDelete && (
        <ConfirmModal
          titulo="Excluir tarefa"
          mensagem={`Tem certeza que deseja excluir "${tarefa.titulo}"?`}
          onConfirm={() => { setConfirmDelete(false); onDelete?.(tarefa.id) }}
          onCancel={() => setConfirmDelete(false)}
          confirmLabel="Sim, excluir"
          destructive
        />
      )}
    </div>
  )
})

export default TaskCard
