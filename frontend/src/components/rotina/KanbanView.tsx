import { useState } from 'react'
import type { Tarefa } from '../../types'
import { labelPrioridade, badgePrioridade } from '../../utils/prioridade'

interface KanbanViewProps {
  tarefas: Tarefa[]
  isLoading: boolean
  isError: boolean
  onDropTarefa: (tarefaId: number, novoStatus: string) => void
}

const STATUS_CONFIG = [
  { key: 'pendente', label: 'A Fazer' },
  { key: 'em_andamento', label: 'Em Andamento' },
  { key: 'feito', label: 'Feito' },
] as const

export function KanbanView({ tarefas, isLoading, isError, onDropTarefa }: KanbanViewProps) {
  const [dragItem, setDragItem] = useState<number | null>(null)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {STATUS_CONFIG.map(({ key, label }) => {
        const colTarefas = (tarefas || [])
          .filter(t => t.status === key)
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        return (
          <div key={key} className="bg-bg-secondary rounded-xl border border-border p-3 flex flex-col"
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
            onDrop={e => {
              e.preventDefault()
              const tarefaId = Number(e.dataTransfer.getData('text/tarefa-id'))
              if (!tarefaId) return
              const tarefa = tarefas?.find(t => t.id === tarefaId)
              if (!tarefa || tarefa.status === key) return
              onDropTarefa(tarefaId, key)
              setDragItem(null)
            }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">{label}</h3>
              <span className="text-xs text-text-muted">{colTarefas.length}</span>
            </div>
            <div className="flex-1 space-y-2 min-h-[60px] max-h-[calc(100vh-280px)] overflow-y-auto">
              {isLoading ? (
                [1, 2, 3].map(i => <div key={i} className="h-10 bg-bg-tertiary rounded-lg animate-pulse" />)
              ) : isError ? (
                <p className="text-xs text-danger">Erro</p>
              ) : (
                colTarefas.map(t => (
                  <div key={t.id} data-tarefa-id={t.id}
                    draggable
                    onDragStart={e => { setDragItem(t.id); e.dataTransfer.setData('text/tarefa-id', String(t.id)); e.dataTransfer.effectAllowed = 'move' }}
                    onDragEnd={() => setDragItem(null)}
                    className={`bg-bg-primary rounded-lg border border-border p-2.5 cursor-grab active:cursor-grabbing transition-opacity ${dragItem === t.id ? 'opacity-40' : 'hover:border-accent/30'}`}>
                    <p className="text-sm font-medium truncate">{t.titulo}</p>
                    {t.descricao && <p className="text-xs text-text-muted truncate mt-0.5">{t.descricao}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgePrioridade(t.prioridade)}`}>
                        {labelPrioridade(t.prioridade)}
                      </span>
                      {t.recorrente && <span className="text-xs text-accent">🔁</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
