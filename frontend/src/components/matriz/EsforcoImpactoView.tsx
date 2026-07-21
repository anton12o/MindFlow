import { useCallback, useMemo, useState, useEffect, useRef, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, DragOverlay, useDroppable, useDraggable, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { updateTarefa, type TarefasMatrizResponse } from '../../api/rotina'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDataRange, type MatrizViewProps } from './types'
import { useNotify } from '../../store/notification'
import { deleteTarefa as apiDelete } from '../../api/rotina'
import TaskCard from './TaskCard'
import KebabMenu from './KebabMenu'
import { sliderGradient } from './types'
import type { Tarefa } from '../../types'
import type { EIScore } from './types'
import { QUADRANTES, getEI, classificar } from '../../utils/scoring'

const SCORE_POR_QUADRANTE: Record<string, EIScore> = {
  quickwin: { esforco: 1, impacto: 5 },
  grandeprojeto: { esforco: 5, impacto: 5 },
  preenchimento: { esforco: 1, impacto: 1 },
  ingrata: { esforco: 5, impacto: 1 },
}

function EISlider({ label, value, onChange, onCommit }: { label: string; value: number; onChange: (v: number) => void; onCommit?: () => void }) {
  const pct = ((value - 1) / 4) * 100
  const color = value >= 4 ? 'var(--color-danger)' : value >= 3 ? 'var(--color-warning)' : value >= 2 ? 'var(--color-warning)' : 'var(--color-success)'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onChange(Math.max(1, value - 1)); onCommit?.() }}
            className="w-4 h-4 rounded flex items-center justify-center text-xs text-text-muted hover:text-text-primary hover:bg-bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
            aria-label={label + ' diminuir'}>
            {'\u2212'}
          </button>
          <span className="text-xs text-text-muted tabular-nums w-3 text-center">{value}</span>
          <button onClick={(e) => { e.stopPropagation(); onChange(Math.min(5, value + 1)); onCommit?.() }}
            className="w-4 h-4 rounded flex items-center justify-center text-xs text-text-muted hover:text-text-primary hover:bg-bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
            aria-label={label + ' aumentar'}>
            +
          </button>
        </div>
      </div>
      <div className="relative">
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: sliderGradient(color, pct) }} />
        <input type="range" min={1} max={5} step={1} value={value}
          onMouseDown={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); onChange(Number(e.target.value)) }}
          onMouseUp={(e) => { e.stopPropagation(); onCommit?.() }}
          onKeyUp={(e) => { e.stopPropagation(); if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') onCommit?.() }}
          onBlur={() => onCommit?.()}
          aria-label={label}
          className="relative w-full h-1.5 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-text-primary
            [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-text-primary" />
      </div>
    </div>
  )
}

function DraggableEICard({ tarefa, onSave, collapseVersion, onToggleStatus, onDelete, onLimparQuadrante }: {
  tarefa: Tarefa; onSave: (id: number, score: EIScore) => void; collapseVersion: number;
  onToggleStatus: (id: number) => void; onDelete: (id: number) => void; onLimparQuadrante?: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: tarefa.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined
  const moveItems = QUADRANTES.map(q => ({
    label: <><span className="mr-1">{q.acao.icone}</span>{q.titulo}</>,
    onClick: () => { const s = SCORE_POR_QUADRANTE[q.key]; if (s) onSave(tarefa.id, s) },
  }))
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`cursor-grab active:cursor-grabbing transition-shadow hover:shadow-[--elevation-1] ${isDragging ? 'opacity-50 shadow-lg' : ''}`}>
      <EICard tarefa={tarefa} onSave={onSave} collapseVersion={collapseVersion}
        onToggleStatus={onToggleStatus} onDelete={onDelete} onLimparQuadrante={onLimparQuadrante}
        extraKebabItems={moveItems} />
    </div>
  )
}

function QuadranteEI({ quadrante, tarefas, collapseVersion, onSave, onToggleStatus, onDelete, onLimparQuadrante }: {
  quadrante: typeof QUADRANTES[0]; tarefas: Tarefa[]; collapseVersion: number;
  onSave: (id: number, score: EIScore) => void; onToggleStatus: (id: number) => void;
  onDelete: (id: number) => void; onLimparQuadrante?: (id: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrante.key })
  return (
    <div ref={setNodeRef}
      className={`rounded-xl border-2 ${quadrante.cor} ${quadrante.bg} p-4 flex flex-col transition-colors ${isOver ? 'ring-2 ring-accent' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-primary">{quadrante.titulo}</span>
        {tarefas.length > 0 && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full min-w-[18px] text-center leading-none ${quadrante.badge} ${quadrante.badgeText}`}>
            {tarefas.length}
          </span>
        )}
        <span className={`text-xs font-normal px-2 py-1 rounded ${quadrante.acao.cor}`}>{quadrante.acao.icone} {quadrante.acao.label}</span>
        <span className="text-xs text-text-muted ml-auto truncate min-w-0">{quadrante.desc}</span>
      </div>
      <div className="text-[10px] text-text-muted/60 mb-2 font-mono">
        {(() => { const s = SCORE_POR_QUADRANTE[quadrante.key]; return s ? `E:${s.esforco} \u00B7 I:${s.impacto}` : '' })()}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-96 scrollbar-gutter-stable">
        {tarefas.length === 0 ? (
          <p className="text-xs text-text-muted italic">Nenhuma tarefa</p>
        ) : (
          tarefas.map(t => <DraggableEICard key={t.id} tarefa={t} onSave={onSave}
            collapseVersion={collapseVersion}
            onToggleStatus={onToggleStatus} onDelete={onDelete} onLimparQuadrante={onLimparQuadrante} />)
        )}
      </div>
    </div>
  )
}

function EICard({ tarefa, onSave, collapseVersion, onToggleStatus, onDelete, onLimparQuadrante, extraKebabItems }: {
  tarefa: Tarefa; onSave: (id: number, score: EIScore) => void; collapseVersion: number;
  onToggleStatus: (id: number) => void; onDelete: (id: number) => void; onLimparQuadrante?: (id: number) => void;
  extraKebabItems?: { label: ReactNode; onClick: () => void; danger?: boolean }[]
}) {
  const existing = getEI(tarefa)
  const [esforco, setEsforco] = useState(existing?.esforco ?? 1)
  const [impacto, setImpacto] = useState(existing?.impacto ?? 1)
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setExpanded(false) }, [collapseVersion])

  useEffect(() => {
    setEsforco(existing?.esforco ?? 1)
    setImpacto(existing?.impacto ?? 1)
  }, [existing?.esforco, existing?.impacto])

  const label = existing ? (QUADRANTES.find(q => q.key === classificar(esforco, impacto))?.titulo ?? '—') : 'N\u00E3o classificado'

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const touched = useRef({ esforco: false, impacto: false })
  useEffect(() => {
    if (!expanded) { touched.current = { esforco: false, impacto: false } }
  }, [expanded])
  useEffect(() => { return () => { clearTimeout(debounceRef.current) } }, [])
  const commit = useCallback(() => {
    if (!touched.current.esforco || !touched.current.impacto) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSave(tarefa.id, { esforco, impacto })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }, 300)
  }, [onSave, tarefa.id, esforco, impacto])

  const handleToggle = useCallback(() => setExpanded(v => !v), [])

  return (
    <div className="space-y-1 group/card">
      <TaskCard tarefa={tarefa} onToggleStatus={onToggleStatus} onDelete={onDelete} onLimparQuadrante={onLimparQuadrante ? () => onLimparQuadrante(tarefa.id) : undefined} extraKebabItems={extraKebabItems}>
        <button onClick={handleToggle} className="w-full flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 rounded">
          <span className="text-xs font-normal text-text-muted">{label || 'Sem classifica\u00E7\u00E3o'}</span>
          {!expanded && !existing && (
            <span className="text-xs text-text-muted italic">{'\u25CB'} Clique para classificar</span>
          )}
        </button>
        <div className={`overflow-hidden transition-all duration-200 ${expanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
          <EISlider label="Esfor\u00E7o" value={esforco} onChange={v => { setEsforco(v); touched.current.esforco = true }} onCommit={commit} />
          <EISlider label="Impacto" value={impacto} onChange={v => { setImpacto(v); touched.current.impacto = true }} onCommit={commit} />
          {(() => {
            const q = QUADRANTES.find(q => q.key === classificar(esforco, impacto))
            if (!q) return null
            return (
              <div className="flex items-center gap-2 pt-1">
                <span className={`text-xs font-semibold ${q.labelCor}`}>{q.acao.icone} {q.titulo}</span>
                <span className="text-xs text-text-muted">{q.desc}</span>
                {saved && <span className="text-xs text-success ml-auto animate-fade-in">{'\u2713'} salvo</span>}
              </div>
            )
          })()}
        </div>
      </TaskCard>
    </div>
  )
}

export default function EsforcoImpactoView({ tarefas, isLoading, dataInicio, dataFim, offset, onOffsetChange }: MatrizViewProps) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [collapseVersion, setCollapseVersion] = useState(0)
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [filtro, setFiltro] = useState<'all' | 'avaliadas' | 'pendentes'>('all')
  const [activeId, setActiveId] = useState<number | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const salvarEI = useMutation({
    mutationFn: ({ id, score }: { id: number; score: EIScore }) => {
      const all = queryClient.getQueriesData<TarefasMatrizResponse>({ queryKey: ['tarefas-matriz', dataInicio, dataFim] })
      const t = all.flatMap(([_, data]) => data?.items || []).find(t => t.id === id)
      const existingProps = t?.propriedades || {}
      return updateTarefa(id, { propriedades: { ...existingProps, matriz_ei: score } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-matriz'] })
    },
    onError: (e) => { console.error('[EIView]', e); notify('Erro ao salvar') },
  })

  const handleSave = useCallback((id: number, score: EIScore) => {
    salvarEI.mutate({ id, score })
  }, [salvarEI])

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTarefa(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tarefas-matriz'] }) },
    onError: (e) => { console.error('[EIView] toggle', e); notify('Erro ao alterar status') },
  })

  const excluir = useMutation({
    mutationFn: (id: number) => apiDelete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tarefas-matriz'] }); notify('Tarefa exclu\u00EDda') },
    onError: (e) => { console.error('[EIView] delete', e); notify('Erro ao excluir — verifique v\u00EDnculos') },
  })

  const handleToggleStatus = useCallback((id: number) => {
    const t = tarefas?.find(t => t.id === id)
    if (!t) return
    toggleStatus.mutate({ id, status: t.status === 'feito' ? 'pendente' : 'feito' })
  }, [tarefas, toggleStatus])

  const handleDelete = useCallback((id: number) => {
    excluir.mutate(id)
  }, [excluir])

  const limparScore = useMutation({
    mutationFn: (id: number) => {
      const all = queryClient.getQueriesData<TarefasMatrizResponse>({ queryKey: ['tarefas-matriz', dataInicio, dataFim] })
      const t = all.flatMap(([_, data]) => data?.items || []).find(t => t.id === id)
      const existingProps = t?.propriedades || {}
      const { matriz_ei: _, ...rest } = existingProps
      return updateTarefa(id, { propriedades: Object.keys(rest).length > 0 ? rest : {} })
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tarefas-matriz'] }) },
    onError: (e) => { console.error('[EIView] limpar', e); notify('Erro ao remover classificação') },
  })

  const handleLimparQuadrante = useCallback((id: number) => {
    limparScore.mutate(id)
  }, [limparScore])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    if (!event.over) return
    const tarefaId = event.active.id as number
    const novoQuadrante = event.over.id as string
    const score = SCORE_POR_QUADRANTE[novoQuadrante]
    if (!score) return
    const t = tarefas?.find(t => t.id === tarefaId)
    if (!t) return
    const existing = getEI(t)
    if (existing && existing.esforco === score.esforco && existing.impacto === score.impacto) return
    handleSave(tarefaId, score)
  }, [tarefas, handleSave, salvarEI])

  const draggedTarefa = activeId ? tarefas?.find(t => t.id === activeId) : undefined

  const agrupadas = useMemo(() => {
    if (!tarefas) return null
    const d = sortDir === 'desc' ? 1 : -1
    let lista = tarefas
    if (filtro === 'avaliadas') lista = lista.filter(t => getEI(t) !== null)
    else if (filtro === 'pendentes') lista = lista.filter(t => getEI(t) === null)
    const grupos: Record<string, Tarefa[]> = {
      quickwin: [], grandeprojeto: [], preenchimento: [], ingrata: [],
    }
    const semClassificacao: Tarefa[] = []
    for (const t of lista) {
      const score = getEI(t)
      if (!score) { semClassificacao.push(t); continue }
      const chave = classificar(score.esforco, score.impacto)
      grupos[chave].push(t)
    }
    for (const chave of Object.keys(grupos)) {
      grupos[chave].sort((a, b) => {
        const sa = getEI(a)
        const sb = getEI(b)
        if (!sa || !sb) return 0
        const diff = (sb.impacto - sb.esforco) - (sa.impacto - sa.esforco)
        if (diff !== 0) return diff * d
        return a.titulo.localeCompare(b.titulo)
      })
    }
    return { ...grupos, semClassificacao } as Record<string, Tarefa[]>
  }, [tarefas, sortDir, filtro])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-text-primary">Esforço x Impacto</h2>
          <span className="text-xs text-text-muted tabular-nums">{tarefas?.length || 0} tarefa{(tarefas?.length || 0) !== 1 ? 's' : ''}</span>
          <select value={filtro} onChange={e => setFiltro(e.target.value as typeof filtro)} aria-label="Filtrar tarefas"
            className="text-xs bg-bg-secondary border border-border/50 rounded px-3 py-1 text-text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors">
            <option value="all">Todas</option>
            <option value="avaliadas">Classificadas</option>
            <option value="pendentes">N\u00E3o classificadas</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onOffsetChange(offset - 1)} disabled={offset <= -52}
            className="p-1 text-text-muted hover:text-text-primary disabled:opacity-disabled-heavy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 rounded" aria-label="Semana anterior">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs tabular-nums w-28 text-center">{offset === 0 ? <span className="text-accent font-semibold">Esta semana</span> : <span className="text-text-muted">{formatDataRange(dataInicio, dataFim)}</span>}</span>
          <button onClick={() => onOffsetChange(offset + 1)} disabled={offset >= 0}
            className="p-1 text-text-muted hover:text-text-primary disabled:opacity-disabled-heavy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 rounded" aria-label="Próxima semana">
            <ChevronRight size={14} />
          </button>
          <KebabMenu items={[
            { label: <>Colapsar todos</>, onClick: () => setCollapseVersion(v => v + 1) },
            { label: <>{'\u2191'} Score {sortDir === 'desc' ? '\u2193' : '\u2191'}</>, onClick: () => setSortDir(d => d === 'desc' ? 'asc' : 'desc') },
          ]} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUADRANTES.map(q => (
            <div key={q.key} className={`rounded-xl border-2 ${q.cor} ${q.bg} p-4 flex flex-col`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-16 bg-bg-tertiary rounded animate-pulse" />
                <div className="h-3 w-16 bg-bg-tertiary rounded animate-pulse ml-auto" />
                <div className="h-3 w-24 bg-bg-tertiary rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-bg-tertiary/60 rounded-lg animate-pulse" />
                <div className="h-16 bg-bg-tertiary/60 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : !tarefas || tarefas.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-8 italic">Nenhuma tarefa nesta semana</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {QUADRANTES.map(q => {
              const lista = agrupadas?.[q.key] || []
              return <QuadranteEI key={q.key} quadrante={q} tarefas={lista} collapseVersion={collapseVersion}
                onSave={handleSave} onToggleStatus={handleToggleStatus} onDelete={handleDelete}
                onLimparQuadrante={handleLimparQuadrante} />
            })}
          </div>
          {agrupadas?.semClassificacao && agrupadas.semClassificacao.length > 0 && (
            <div className="rounded-xl border-2 border-dashed border-border bg-bg-secondary/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Sem classifica\u00E7\u00E3o</span>
                <span className="text-xs font-bold px-2 py-1 rounded-full min-w-[18px] text-center leading-none bg-bg-tertiary text-text-muted">
                  {agrupadas.semClassificacao.length}
                </span>
                <span className="text-xs text-text-muted ml-auto">Arraste para um quadrante acima</span>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-96 scrollbar-gutter-stable">
                {agrupadas.semClassificacao.map(t => <DraggableEICard key={t.id} tarefa={t}
                  onSave={handleSave} collapseVersion={collapseVersion}
                  onToggleStatus={handleToggleStatus} onDelete={handleDelete} onLimparQuadrante={handleLimparQuadrante} />)}
              </div>
            </div>
          )}
          <DragOverlay>
            {draggedTarefa ? (
              <div className="bg-bg-secondary/90 border border-accent/40 rounded-lg p-3 text-xs shadow-elevation-4 -rotate-2 max-w-xs">
                {draggedTarefa.titulo}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
