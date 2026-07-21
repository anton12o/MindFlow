import { useCallback, useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, DragOverlay, useDroppable, useDraggable, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useNavigate } from 'react-router-dom'
import { updateTarefa } from '../../api/rotina'
import { createNota } from '../../api/notas'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNotify } from '../../store/notification'
import { deleteTarefa as apiDelete } from '../../api/rotina'
import TaskCard from './TaskCard'
import KebabMenu from './KebabMenu'
import { formatDataRange, type MatrizViewProps } from './types'
import { QUADRANTES_EISENHOWER, getEI, classificar } from '../../utils/scoring'
import type { Tarefa } from '../../types'

export function getExternalScore(tarefa: Tarefa): { value: number | string; label: string; color: string } | undefined {
  const ei = getEI(tarefa)
  if (!ei) return undefined
  const key = classificar(ei.esforco, ei.impacto)
  const map: Record<string, { value: string; label: string; color: string }> = {
    quickwin: { value: '\u26A1', label: 'Quick Win', color: 'bg-accent' },
    grandeprojeto: { value: '\uD83D\uDCD0', label: 'Grande Projeto', color: 'bg-quadrant-2' },
    preenchimento: { value: '\u2197', label: 'Preenchimento', color: 'bg-text-muted' },
    ingrata: { value: '\u2715', label: 'Ingrata', color: 'bg-quadrant-4' },
  }
  return map[key]
}

function DraggableTaskCard({ tarefa, quadranteKey, onToggleStatus, onDelete, onLimparQuadrante, onCriarNota, onIniciarPomodoro, onMoverQuadrante }: {
  tarefa: Tarefa; quadranteKey: string; onToggleStatus: (id: number) => void; onDelete: (id: number) => void;
  onLimparQuadrante?: (id: number) => void; onCriarNota?: (id: number) => void; onIniciarPomodoro?: (id: number) => void;
  onMoverQuadrante: (id: number, quadrante: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: tarefa.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined
  const score = getExternalScore(tarefa)
  const moveItems = QUADRANTES_EISENHOWER.filter(q => q.key !== quadranteKey).map(q => ({
    label: <><span className="mr-1">{'\u2192'}</span>{q.titulo}</>,
    onClick: () => onMoverQuadrante(tarefa.id, q.key),
  }))
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`cursor-grab active:cursor-grabbing transition-shadow hover:shadow-[--elevation-1] ${isDragging ? 'opacity-50 shadow-lg' : ''}`}>
      <TaskCard tarefa={tarefa} externalScore={score} quadrante={quadranteKey}
        onToggleStatus={onToggleStatus} onDelete={onDelete} onLimparQuadrante={onLimparQuadrante ? () => onLimparQuadrante(tarefa.id) : undefined}
        onCriarNota={onCriarNota ? () => onCriarNota(tarefa.id) : undefined}
        onIniciarPomodoro={onIniciarPomodoro ? () => onIniciarPomodoro(tarefa.id) : undefined}
        extraKebabItems={moveItems.length > 0 ? moveItems : undefined} />
    </div>
  )
}

function Quadrante({ quadrante, tarefas, onToggleStatus, onDelete, onLimparQuadrante, onCriarNota, onIniciarPomodoro, onMoverQuadrante }: {
  quadrante: typeof QUADRANTES_EISENHOWER[0]; tarefas: Tarefa[];
  onToggleStatus: (id: number) => void; onDelete: (id: number) => void;
  onLimparQuadrante?: (id: number) => void; onCriarNota?: (id: number) => void; onIniciarPomodoro?: (id: number) => void;
  onMoverQuadrante: (id: number, quadrante: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrante.key })
  return (
    <div ref={setNodeRef}
      className={`rounded-xl border-2 ${quadrante.cor} ${quadrante.bg} p-4 flex flex-col transition-colors ${isOver ? 'ring-2 ring-accent' : ''} ${quadrante.destaque ? 'ring-1 ring-accent/20' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-primary">{quadrante.titulo}</span>
        {tarefas.length > 0 && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full min-w-[18px] text-center leading-none ${quadrante.badgeText} ${quadrante.badge}`}>
            {tarefas.length}
          </span>
        )}
        <span className="text-xs text-text-muted ml-auto truncate min-w-0">{quadrante.desc}</span>
      </div>
      <span className="text-xs text-text-muted italic mb-3 truncate">{quadrante.vies}</span>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-96 scrollbar-gutter-stable">
        {tarefas.length === 0 ? (
          <p className="text-xs text-text-muted italic">Nenhuma tarefa</p>
        ) : (
          tarefas.map(t => <DraggableTaskCard key={t.id} tarefa={t} quadranteKey={quadrante.key}
            onToggleStatus={onToggleStatus} onDelete={onDelete} onLimparQuadrante={onLimparQuadrante}
            onCriarNota={onCriarNota} onIniciarPomodoro={onIniciarPomodoro}
            onMoverQuadrante={onMoverQuadrante} />)
        )}
      </div>
    </div>
  )
}

export function sortEisenhower(lista: Tarefa[], dir: 'desc' | 'asc' = 'desc'): Tarefa[] {
  const d = dir === 'desc' ? -1 : 1
  return [...lista].sort((a, b) => a.titulo.localeCompare(b.titulo) * d)
}

export function agruparPorQuadrante(tarefas: Tarefa[], dir: 'desc' | 'asc' = 'desc'): Record<string, Tarefa[]> {
  const grupos: Record<string, Tarefa[]> = { fazer: [], agendar: [], delegar: [], eliminar: [] }
  for (const t of tarefas) {
    let chave = t.quadrante
    if (!chave || !grupos[chave]) {
      if (chave && !grupos[chave]) console.warn('[agruparPorQuadrante] quadrante invalido:', chave, 'para tarefa', t.id)
      chave = 'agendar'
    }
    grupos[chave].push(t)
  }
  for (const chave of Object.keys(grupos)) {
    grupos[chave] = sortEisenhower(grupos[chave], dir)
  }
  return grupos
}

export default function EisenhowerView({ tarefas, isLoading, dataInicio, dataFim, offset, onOffsetChange }: MatrizViewProps) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const navigate = useNavigate()
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [filtro, setFiltro] = useState<'all' | 'avaliadas' | 'pendentes'>('all')
  const [ocultarConcluidas, setOcultarConcluidas] = useState(false)

  const agrupadas = useMemo(() => {
    let ft = tarefas
    if (filtro === 'avaliadas') ft = tarefas.filter(t => t.quadrante != null && t.quadrante !== '')
    else if (filtro === 'pendentes') ft = tarefas.filter(t => t.quadrante == null || t.quadrante === '')
    if (ocultarConcluidas) ft = ft.filter(t => t.status !== 'feito')
    return agruparPorQuadrante(ft, sortDir)
  }, [tarefas, filtro, ocultarConcluidas, sortDir])

  const moverTarefa = useMutation({
    mutationFn: ({ id, quadrante }: { id: number; quadrante: string }) =>
      updateTarefa(id, { quadrante }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-matriz'] })
      const nomes: Record<string, string> = { fazer: 'Fazer', agendar: 'Agendar', delegar: 'Delegar', eliminar: 'Eliminar' }
      notify(`Movida para ${nomes[variables.quadrante] || variables.quadrante}`, 'success')
    },
    onError: (e) => { console.error('[EisenhowerView]', e); notify('Erro ao mover tarefa') },
  })

  const limparQuadrante = useMutation({
    mutationFn: (id: number) => updateTarefa(id, { quadrante: '' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tarefas-matriz'] }) },
    onError: (e) => { console.error('[Eisenhower] limpar', e); notify('Erro ao remover quadrante') },
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTarefa(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tarefas-matriz'] }) },
    onError: (e) => { console.error('[Eisenhower] toggle', e); notify('Erro ao alterar status') },
  })

  const excluir = useMutation({
    mutationFn: (id: number) => apiDelete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tarefas-matriz'] }); notify('Tarefa exclu\u00EDda') },
    onError: (e) => { console.error('[Eisenhower] delete', e); notify('Erro ao excluir — verifique v\u00EDnculos') },
  })

  const handleToggleStatus = useCallback((id: number) => {
    if (toggleStatus.isPending) return
    const t = tarefas?.find(t => t.id === id)
    if (!t) return
    toggleStatus.mutate({ id, status: t.status === 'feito' ? 'pendente' : 'feito' })
  }, [tarefas, toggleStatus])

  const handleDelete = useCallback((id: number) => {
    if (excluir.isPending) return
    excluir.mutate(id)
  }, [excluir])

  const handleLimparQuadrante = useCallback((id: number) => {
    if (limparQuadrante.isPending) return
    limparQuadrante.mutate(id)
  }, [limparQuadrante])

  const handleMoverQuadrante = useCallback((id: number, quadrante: string) => {
    if (moverTarefa.isPending) return
    moverTarefa.mutate({ id, quadrante })
  }, [moverTarefa])

  const handleCriarNota = useCallback((id: number) => {
    const t = tarefas?.find(t => t.id === id)
    if (!t) return
    createNota({ titulo: `📌 ${t.titulo}`, conteudo: `Lembrete de: ${t.titulo}` })
      .then(() => { queryClient.invalidateQueries({ queryKey: ['notas'] }); notify('Nota de lembrete criada', 'success') })
      .catch(e => { console.error('[Eisenhower] criar nota', e); notify('Erro ao criar nota') })
  }, [tarefas, queryClient, notify])

  const handleIniciarPomodoro = useCallback((id: number) => {
    const t = tarefas?.find(t => t.id === id)
    if (!t) return
    navigate(`/pomodoro?contexto_tipo=tarefa&contexto_id=${t.id}&nome=${encodeURIComponent(t.titulo)}`)
  }, [tarefas, navigate])

  const [activeId, setActiveId] = useState<number | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    if (!event.over) return
    const tarefaId = event.active.id as number
    const novoQuadrante = event.over.id as string
    if (!['fazer', 'agendar', 'delegar', 'eliminar'].includes(novoQuadrante)) return
    const t = tarefas?.find(t => t.id === tarefaId)
    if (t?.quadrante === novoQuadrante) return
    moverTarefa.mutate({ id: tarefaId, quadrante: novoQuadrante })
  }, [moverTarefa, tarefas])

  const draggedTarefa = activeId ? tarefas?.find(t => t.id === activeId) : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text-primary">Eisenhower</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted tabular-nums">{tarefas?.length || 0} tarefa{(tarefas?.length || 0) !== 1 ? 's' : ''}</span>
            <select value={filtro} onChange={e => setFiltro(e.target.value as typeof filtro)} aria-label="Filtrar tarefas"
            className="text-xs bg-bg-secondary border border-border/50 rounded px-3 py-1 text-text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors">
            <option value="all">Todas</option>
            <option value="avaliadas">Classificadas</option>
            <option value="pendentes">N\u00E3o classificadas</option>
          </select>
          <button onClick={() => onOffsetChange(offset - 1)} disabled={offset <= -52} title="Semana anterior" aria-label="Semana anterior"
            className="p-1 text-text-muted hover:text-text-primary disabled:opacity-disabled-heavy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 rounded">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs tabular-nums text-center w-28">
            {offset === 0 ? <span className="text-accent font-semibold">Esta semana</span> : <span className="text-text-muted">{formatDataRange(dataInicio, dataFim)}</span>}
          </span>
          <button onClick={() => onOffsetChange(offset + 1)} disabled={offset >= 0} title="Próxima semana" aria-label="Próxima semana"
            className="p-1 text-text-muted hover:text-text-primary disabled:opacity-disabled-heavy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 rounded">
            <ChevronRight size={14} />
          </button>
          <button onClick={() => setOcultarConcluidas(v => !v)}
            className={`text-xs px-2 py-1 rounded transition-colors ${ocultarConcluidas ? 'bg-accent text-accent-foreground' : 'text-text-muted hover:text-text-primary'}`}
            title={ocultarConcluidas ? 'Mostrar concluídas' : 'Ocultar concluídas'} aria-label={ocultarConcluidas ? 'Mostrar concluídas' : 'Ocultar concluídas'}>
            {ocultarConcluidas ? '\u2713' : '\u25CB'} {ocultarConcluidas ? 'Mostrando' : 'Ocultar'}
          </button>
          <KebabMenu items={[
            { label: <>{'\u2191'} Score {sortDir === 'desc' ? '\u2193' : '\u2191'}</>, onClick: () => setSortDir(d => d === 'desc' ? 'asc' : 'desc') },
          ]} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUADRANTES_EISENHOWER.map(q => (
            <div key={q.key} className={`rounded-xl border-2 ${q.cor} ${q.bg} p-4 flex flex-col`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-16 bg-bg-tertiary rounded animate-pulse" />
                <div className="h-3 w-24 bg-bg-tertiary rounded animate-pulse ml-auto" />
              </div>
              <div className="space-y-2">
                <div className="h-12 bg-bg-tertiary/60 rounded-lg animate-pulse" />
                <div className="h-12 bg-bg-tertiary/60 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {QUADRANTES_EISENHOWER.map(q => (
                <Quadrante key={q.key} quadrante={q} tarefas={agrupadas?.[q.key] || []}
                  onToggleStatus={handleToggleStatus} onDelete={handleDelete} onLimparQuadrante={handleLimparQuadrante}
                  onCriarNota={handleCriarNota} onIniciarPomodoro={handleIniciarPomodoro}
                  onMoverQuadrante={handleMoverQuadrante} />
              ))}
          </div>
          <DragOverlay>
            {draggedTarefa ? (
              <div className="bg-bg-secondary/90 border border-accent/40 rounded-lg p-3 text-xs shadow-elevation-4 rotate-2 max-w-xs">
                {draggedTarefa.titulo}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
