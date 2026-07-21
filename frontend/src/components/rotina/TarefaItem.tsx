import { memo } from 'react'
import type { Tarefa } from '../../types'
import { labelPrioridade, badgePrioridade } from '../../utils/prioridade'

interface TarefaItemProps {
  tarefa: Tarefa
  isEditing: boolean
  editingTitle: string
  editingPrioridade: string
  editingRecorrente: boolean
  editingRecTipo: string | null
  editingRecIntervalo: number
  expanded: boolean
  isPendingToggle: boolean
  isPendingUpdate: boolean
  onToggle: () => void
  onStartEdit: () => void
  onEditTitleChange: (value: string) => void
  onEditPrioridadeChange: (value: string) => void
  onEditRecorrenteChange: (value: boolean) => void
  onEditRecTipoChange: (value: string) => void
  onEditRecIntervaloChange: (value: number) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onFocusPomodoro: () => void
  onToggleDesc: () => void
}

function TarefaItemBase({
  tarefa, isEditing,
  editingTitle, editingPrioridade, editingRecorrente, editingRecTipo, editingRecIntervalo,
  expanded, isPendingToggle, isPendingUpdate,
  onToggle, onStartEdit, onEditTitleChange,
  onEditPrioridadeChange, onEditRecorrenteChange, onEditRecTipoChange, onEditRecIntervaloChange,
  onSaveEdit, onCancelEdit, onDelete, onFocusPomodoro, onToggleDesc,
}: TarefaItemProps) {
  return (
    <div key={tarefa.id}>
      <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-bg-hover transition-colors group">
        <button onClick={onToggle}
          disabled={isPendingToggle}
          className={`w-4 h-4 rounded border flex items-center justify-center text-xs transition-colors shrink-0 disabled:opacity-disabled
            ${tarefa.status === 'feito' ? 'bg-accent border-accent text-accent-foreground' : 'border-border hover:border-accent'}`}>
          {tarefa.status === 'feito' && '✓'}
        </button>
        {isEditing ? (
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2">
              <input value={editingTitle} onChange={e => onEditTitleChange(e.target.value)}
                className="flex-1 bg-bg-primary rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-accent" />
              <button onClick={onSaveEdit}
                disabled={isPendingUpdate} className="text-xs text-success disabled:opacity-disabled">{isPendingUpdate ? '...' : 'OK'}</button>
              <button onClick={onCancelEdit} className="text-xs text-text-muted">Cancelar</button>
            </div>
            <div className="flex items-center gap-2 ml-1 flex-wrap">
              <label className="flex items-center gap-1 text-xs text-text-muted cursor-pointer">
                <input type="checkbox" checked={editingRecorrente}
                  onChange={e => onEditRecorrenteChange(e.target.checked)} className="accent-accent" />
                Recorrente
              </label>
              <select value={editingPrioridade} onChange={e => onEditPrioridadeChange(e.target.value)}
                className="bg-bg-tertiary rounded px-2 py-0.5 text-[10px] outline-none">
                <option value="baixa">{labelPrioridade('baixa')}</option>
                <option value="normal">{labelPrioridade('normal')}</option>
                <option value="alta">{labelPrioridade('alta')}</option>
                <option value="urgente">{labelPrioridade('urgente')}</option>
              </select>
              {editingRecorrente && (
                <>
                    <select value={editingRecTipo ?? 'daily'} onChange={e => onEditRecTipoChange(e.target.value)}
                      className="bg-bg-tertiary rounded px-2 py-0.5 text-[10px] outline-none">
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="weekday">Dia útil</option>
                  </select>
                  <span className="text-xs text-text-muted">a cada</span>
                    <input type="number" min={1} value={editingRecIntervalo}
                      onChange={e => onEditRecIntervaloChange(Math.max(1, Number(e.target.value)))}
                      className="w-12 bg-bg-tertiary rounded px-2 py-0.5 text-[10px] outline-none text-center" />
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <span className={`text-sm flex-1 ${tarefa.status === 'feito' ? 'line-through text-text-muted' : ''}`}>{tarefa.titulo}</span>
            {tarefa.recorrente && <span className="text-xs text-accent" title="Recorrente">🔁</span>}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgePrioridade(tarefa.prioridade)}`}>
              {labelPrioridade(tarefa.prioridade)}
            </span>
            <button onClick={onFocusPomodoro}
              className="text-xs text-accent hover:text-accent-hover opacity-0 group-hover:opacity-100 transition-opacity" title="Focar nesta tarefa">▶️</button>
            <button onClick={onStartEdit}
              className="text-xs text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Editar tarefa">✏️</button>
            <button onClick={onDelete}
              className="text-xs text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Excluir tarefa">🗑️</button>
          </>
        )}
      </div>
      {tarefa.descricao && !isEditing && (
        <div className="px-2 pb-1">
          <button onClick={onToggleDesc} className="text-xs text-text-muted hover:text-accent">
            {expanded ? '▲ ocultar' : '▼ descrição'}
          </button>
          {expanded && <p className="text-sm text-text-secondary mt-0.5 px-1 whitespace-pre-wrap">{tarefa.descricao}</p>}
        </div>
      )}
    </div>
  )
}

export const TarefaItem = memo(TarefaItemBase)
