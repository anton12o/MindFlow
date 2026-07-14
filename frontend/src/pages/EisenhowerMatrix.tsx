import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, useDroppable, useDraggable, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { getTarefasEisenhower, updateTarefa } from '../api/rotina'
import { getWeeklyStats } from '../api/stats'
import { useNotify } from '../store/notification'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Tarefa } from '../types'

const QUADRANTES: { key: string; titulo: string; desc: string; cor: string; bg: string }[] = [
  { key: 'fazer', titulo: 'Fazer', desc: 'Urgente e Importante', cor: 'border-red-500/40', bg: 'bg-red-500/5' },
  { key: 'agendar', titulo: 'Agendar', desc: 'Não Urgente e Importante', cor: 'border-emerald-500/40', bg: 'bg-emerald-500/5' },
  { key: 'delegar', titulo: 'Delegar', desc: 'Urgente e Não Importante', cor: 'border-amber-500/40', bg: 'bg-amber-500/5' },
  { key: 'eliminar', titulo: 'Eliminar', desc: 'Não Urgente e Não Importante', cor: 'border-gray-500/30', bg: 'bg-gray-500/5' },
]

function formatRange(inicio: string, fim: string) {
  const d1 = new Date(inicio + 'T12:00:00')
  const d2 = new Date(fim + 'T12:00:00')
  const f1 = d1.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const f2 = d2.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return `${f1} a ${f2}`
}

function TaskCard({ tarefa }: { tarefa: Tarefa }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: tarefa.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`bg-bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${isDragging ? 'opacity-50 shadow-lg' : ''}`}>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tarefa.status === 'feito' ? 'bg-success' : tarefa.prioridade === 'urgente' ? 'bg-red-500' : tarefa.prioridade === 'alta' ? 'bg-amber-500' : tarefa.prioridade === 'baixa' ? 'bg-text-muted' : 'bg-accent'}`} />
        <span className="truncate text-text-primary">{tarefa.titulo}</span>
      </div>
      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted">
        <span>{tarefa.data}</span>
        {tarefa.tempo_estimado && <span>{tarefa.tempo_estimado}min</span>}
      </div>
    </div>
  )
}

function Quadrante({ quadrante, tarefas }: { quadrante: typeof QUADRANTES[0]; tarefas: Tarefa[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrante.key })
  return (
    <div ref={setNodeRef}
      className={`rounded-xl border-2 ${quadrante.cor} ${quadrante.bg} p-3 min-h-[150px] flex flex-col transition-colors ${isOver ? 'ring-2 ring-accent' : ''}`}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-0.5">{quadrante.titulo}</div>
      <div className="text-[10px] text-text-muted mb-2">{quadrante.desc}</div>
      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[240px]">
        {tarefas.length === 0 ? (
          <p className="text-[10px] text-text-muted italic">Nenhuma tarefa</p>
        ) : (
          tarefas.map(t => <TaskCard key={t.id} tarefa={t} />)
        )}
      </div>
    </div>
  )
}

export default function EisenhowerMatrix() {
  const [offset, setOffset] = useState(0)
  const queryClient = useQueryClient()
  const notify = useNotify()

  const { data: stats } = useQuery({
    queryKey: ['stats-weekly', offset],
    queryFn: () => getWeeklyStats(offset),
    staleTime: 60_000,
  })

  const dataInicio = stats?.semana.inicio || ''
  const dataFim = stats?.semana.fim || ''

  const { data: agrupadas, isLoading } = useQuery({
    queryKey: ['tarefas-eisenhower', dataInicio, dataFim],
    queryFn: () => getTarefasEisenhower(dataInicio, dataFim),
    enabled: !!dataInicio,
    staleTime: 30_000,
  })

  const moverTarefa = useMutation({
    mutationFn: ({ id, quadrante }: { id: number; quadrante: string }) =>
      updateTarefa(id, { quadrante }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-eisenhower'] })
    },
    onError: (e) => { console.error('[Eisenhower]', e); notify('Erro ao mover tarefa') },
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!event.over) return
    const tarefaId = event.active.id as number
    const novoQuadrante = event.over.id as string
    if (!['fazer', 'agendar', 'delegar', 'eliminar'].includes(novoQuadrante)) return
    moverTarefa.mutate({ id: tarefaId, quadrante: novoQuadrante })
  }, [moverTarefa])

  if (!stats) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-bg-secondary rounded w-48" />
        <div className="h-96 bg-bg-secondary rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Matriz de Eisenhower</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset(o => o - 1)} title="Semana anterior" className="p-1 text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-text-muted tabular-nums w-28 text-center">
            {formatRange(stats.semana.inicio, stats.semana.fim)}
          </span>
          <button onClick={() => setOffset(o => o + 1)} disabled={offset >= 0} title="Próxima semana" className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-sm text-text-muted py-8 animate-pulse">Carregando tarefas...</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUADRANTES.map(q => (
              <Quadrante key={q.key} quadrante={q} tarefas={agrupadas?.[q.key as keyof typeof agrupadas] || []} />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  )
}
