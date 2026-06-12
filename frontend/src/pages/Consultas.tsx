import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTipos } from '../api/tipos'
import { getQueries, createQuery, deleteQuery, executarQuery, batchEdit } from '../api/queries'
import { updateNota, createNota } from '../api/notas'
import ConfirmModal from '../components/ConfirmModal'
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useSortable, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SchemaField {
  type: 'text' | 'number' | 'date' | 'url' | 'select'
  options?: string[]
}

interface FormularioViewProps {
  query: { tipo_objeto_id: number }
  tipo: { icone?: string; nome?: string; schema_campos: Record<string, SchemaField> } | undefined
  onClose: () => void
  onCreate: () => void
}

function FormularioView({ query, tipo, onClose, onCreate }: FormularioViewProps) {
  const schema = tipo?.schema_campos || {}
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [titulo, setTitulo] = useState('')
  const [saving, setSaving] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    setSaving(true)
    const payload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(formData)) {
      if (!value.trim()) continue
      const field = schema[key]
      if (field?.type === 'number') {
        payload[key] = Number(value)
      } else {
        payload[key] = value
      }
    }
    createNota({ titulo, tipo_id: query.tipo_objeto_id, propriedades: payload })
      .then(() => {
        onCreate()
        onClose()
      })
      .catch(err => console.error('[Formulario] create failed:', err))
      .finally(() => setSaving(false))
  }

  if (!Object.keys(schema).length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <p className="text-center">Este tipo não tem schema_campos definido.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-accent text-white rounded-lg">Fechar</button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-bg-secondary rounded-xl border border-border">
      <h3 className="text-lg font-semibold mb-4">Nova nota — {tipo?.icone} {tipo?.nome}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Título *</label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)}
            className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" required />
        </div>
        {Object.entries(schema).map(([key, field]) => (
          <div key={key}>
            <label className="block text-xs text-text-muted mb-1">{key}</label>
            {field.type === 'select' && field.options ? (
              <select
                value={formData[key] || ''}
                onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Selecione...</option>
                {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : field.type === 'date' ? (
              <input type="date"
                value={formData[key] || ''}
                onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
            ) : field.type === 'number' ? (
              <input type="number"
                value={formData[key] || ''}
                onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
            ) : field.type === 'url' ? (
              <input type="url"
                value={formData[key] || ''}
                onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" placeholder="https://..." />
            ) : (
              <input type="text"
                value={formData[key] || ''}
                onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-bg-hover">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !titulo.trim()}
            className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50">
            {saving ? 'Criando...' : `Criar ${tipo?.nome || 'nota'}`}
          </button>
        </div>
      </form>
    </div>
  )
}

interface CalendarioViewProps {
  query: { tipo_objeto_id: number; campo_agrupamento?: string | null }
  result: { dados: Array<{ id: number; titulo: string; [key: string]: unknown }> } | undefined
  resLoad: boolean
  resErr: boolean
  onRefresh: () => void
}

function CalendarioView({ query, result, resLoad, resErr, onRefresh: _onRefresh }: CalendarioViewProps) {
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  function getDiasDoMes(anoMes: string) {
    const [ano, mes] = anoMes.split('-').map(Number)
    const primeiroDia = new Date(ano, mes - 1, 1)
    const ultimoDia = new Date(ano, mes, 0)
    const diasNoMes = ultimoDia.getDate()
    const primeiroDiaSemana = primeiroDia.getDay()
    const dias = []
    for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null)
    for (let d = 1; d <= diasNoMes; d++) dias.push(d)
    return dias
  }

  const dias = getDiasDoMes(mesAtual)
  const semanas = []
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))

  const notasPorDia: Record<number, Array<{ id: number; titulo: string }>> = {}
  if (result?.dados) {
    for (const nota of result.dados) {
      const campo = query.campo_agrupamento
      if (!campo) continue
      const valor = nota[campo] as string | undefined
      if (!valor) continue
      const dia = Number(valor.split('-')[2])
      if (!isNaN(dia)) {
        if (!notasPorDia[dia]) notasPorDia[dia] = []
        notasPorDia[dia].push({ id: nota.id, titulo: nota.titulo })
      }
    }
  }

  const mesLabel = new Date(mesAtual + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  if (resLoad) return <p className="text-text-muted text-sm text-center py-8 animate-pulse">Carregando...</p>
  if (resErr) return <p className="text-danger text-sm text-center py-8">Erro ao executar consulta</p>
  if (!query.campo_agrupamento) return <p className="text-text-muted text-center py-8">Selecione um campo de data (campo_agrupamento) na consulta</p>

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMesAtual(mesStr => {
          const [a, mesNum] = mesStr.split('-').map(Number)
          const d = new Date(a, mesNum - 2, 1)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        })} className="px-3 py-1.5 bg-bg-tertiary rounded-lg hover:bg-bg-hover">‹</button>
        <h3 className="text-lg font-semibold capitalize">{mesLabel}</h3>
        <button onClick={() => setMesAtual(mesStr => {
          const [a, mesNum] = mesStr.split('-').map(Number)
          const d = new Date(a, mesNum, 1)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        })} className="px-3 py-1.5 bg-bg-tertiary rounded-lg hover:bg-bg-hover">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasSemana.map(d => <div key={d} className="text-center text-xs font-semibold text-text-muted py-1">{d}</div>)}
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {semanas.map((semana, si) => (
          <div key={si} className="grid grid-cols-7 gap-1">
            {semana.map((dia, di) => {
              if (dia === null) return <div key={di} className="h-20 bg-bg-tertiary/50" />
              const notas = notasPorDia[dia] || []
              return (
                <div key={di} className="relative h-20 bg-bg-secondary border border-border rounded-lg p-1 transition-colors hover:bg-bg-hover">
                  <div className="text-xs font-semibold text-text-muted mb-1">{dia}</div>
                  <div className="space-y-1 overflow-y-auto h-[calc(100%-18px)]">
                    {notas.slice(0, 3).map(n => (
                      <div key={n.id} draggable className="text-xs bg-bg-tertiary rounded px-1.5 py-0.5 truncate cursor-grab hover:bg-bg-hover">
                        {n.titulo}
                      </div>
                    ))}
                    {notas.length > 3 && <div className="text-xs text-text-muted">+{notas.length - 3} mais</div>}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

interface GanttViewProps {
  query: { tipo_objeto_id: number; campo_agrupamento?: string | null }
  result: { dados: Array<{ id: number; titulo: string; propriedades?: Record<string, unknown>; [key: string]: unknown }>; total?: number } | undefined
  resLoad: boolean
  resErr: boolean
  onRefresh: () => void
}

function GanttView({ query, result, resLoad, resErr, onRefresh: _onRefresh }: GanttViewProps) {
  const [scale, setScale] = useState<'day' | 'week' | 'month'>('day')
  const total = result?.total || 0
  const truncated = total > 100

  const getDateRange = () => {
    if (!result?.dados || !query.campo_agrupamento) return { min: new Date(), max: new Date() }
    let min = new Date('2099-12-31')
    let max = new Date('1970-01-01')
    for (const item of result.dados) {
      const inicio = item.propriedades?.['data_inicio'] as string
      const fim = item.propriedades?.['data_fim'] as string
      if (inicio) {
        const d = new Date(inicio)
        if (d < min) min = d
      }
      if (fim) {
        const d = new Date(fim)
        if (d > max) max = d
      }
    }
    if (min > max) {
      const now = new Date()
      min = new Date(now.getFullYear(), now.getMonth(), 1)
      max = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    }
    min.setDate(1)
    max = new Date(max.getFullYear(), max.getMonth() + 1, 0)
    return { min, max }
  }

  const { min, max } = getDateRange()
  const daysDiff = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24))
  const dayWidth = scale === 'day' ? 40 : scale === 'week' ? 200 : 600
  const totalWidth = Math.max(daysDiff * dayWidth, 800)

  const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  if (resLoad) return <p className="text-text-muted text-sm text-center py-8 animate-pulse">Carregando...</p>
  if (resErr) return <p className="text-danger text-sm text-center py-8">Erro ao executar consulta</p>
  if (!query.campo_agrupamento) return <p className="text-text-muted text-center py-8">Selecione um campo de data (campo_agrupamento) na consulta</p>
  if (!result?.dados?.length) return <p className="text-text-muted text-center py-8">Nenhum item com data_inicio e data_fim</p>

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Gantt — {result.dados.length} itens {truncated && <span className="text-warning text-sm">(limitado a 100 de {total})</span>}</h3>
        <div className="flex gap-2">
          <select value={scale} onChange={e => setScale(e.target.value as any)}
            className="bg-bg-tertiary rounded px-2 py-1 text-xs outline-none">
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </select>
        </div>
      </div>
      {truncated && (
        <div className="mb-3 p-2 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm text-center">
          Mostrando 100 de {total} itens. Refine os filtros para ver todos.
        </div>
      )}
      <div className="flex-1 overflow-auto relative" style={{ width: totalWidth }}>
        {/* Time header */}
        <div className="sticky top-0 bg-bg-secondary border-b border-border z-10" style={{ width: totalWidth }}>
          <div className="flex" style={{ width: totalWidth }}>
            {Array.from({ length: daysDiff + 1 }, (_, i) => {
              const d = new Date(min)
              d.setDate(d.getDate() + i)
              return (
                <div key={i} className="border-r border-border text-center text-xs font-medium text-text-muted py-1"
                  style={{ width: dayWidth, minWidth: dayWidth }}>
                  {scale === 'day' ? formatDate(d) : formatDate(d)}
                </div>
              )
            })}
          </div>
        </div>
        {/* Rows */}
        <div style={{ width: totalWidth }}>
          {result.dados.map((item, _rowIndex) => {
            const inicio = item.propriedades?.['data_inicio'] as string
            const fim = item.propriedades?.['data_fim'] as string
            if (!inicio || !fim) return null
            const start = new Date(inicio)
            const end = new Date(fim)
            const startOffset = Math.max(0, Math.ceil((start.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)))
            const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
            const left = startOffset * dayWidth
            const width = duration * dayWidth
            return (
              <div key={item.id} className="relative h-10 border-b border-border/50"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                }}
              >
                <div
                  className="absolute top-1 bg-accent rounded h-8 transition-all cursor-grab hover:shadow-md"
                  style={{ left, width, minWidth: 40 }}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('itemId', String(item.id))
                    e.dataTransfer.setData('type', 'move')
                  }}
                  onDragEnd={e => {
                    e.preventDefault()
                  }}
                >
                  <div className="px-2 py-1 text-xs text-white truncate" title={item.titulo}>{item.titulo}</div>
                </div>
                <div className="absolute left-0 top-1 w-1 h-8 bg-transparent border-l-2 border-white/50 cursor-w-resize"
                  onDragStart={e => {
                    e.dataTransfer.setData('itemId', String(item.id))
                    e.dataTransfer.setData('type', 'resize-start')
                    e.dataTransfer.setData('originalLeft', String(left))
                    e.dataTransfer.setData('originalWidth', String(width))
                  }}
                />
                <div className="absolute right-0 top-1 w-1 h-8 bg-transparent border-r-2 border-white/50 cursor-e-resize"
                  onDragStart={e => {
                    e.dataTransfer.setData('itemId', String(item.id))
                    e.dataTransfer.setData('type', 'resize-end')
                    e.dataTransfer.setData('originalLeft', String(left))
                    e.dataTransfer.setData('originalWidth', String(width))
                  }}
                />
              </div>
            )}
          )}
        </div>
      </div>
    </div>
  )
}

interface CardItem { id: number; titulo: string; status?: string; prioridade?: string; tipo_id?: number; [key: string]: unknown }

interface SortableItemProps {
  item: CardItem
  tipos: Array<{ id: number; icone?: string }> | undefined
  selectedIds: Set<number>
  toggleSelect: (id: number) => void
}

const SortableItem = React.memo(function SortableItem({ item, tipos, selectedIds, toggleSelect }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const tipo = tipos?.find(t => t.id === item.tipo_id)
  const secondaryProp = Object.entries(item).find(([k, v]) => k !== 'id' && k !== 'titulo' && k !== 'status' && k !== 'prioridade' && k !== 'tipo_id' && v)
  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`bg-bg-secondary rounded-lg border p-2 cursor-grab transition-colors ${selectedIds.has(item.id) ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-accent/50'} ${isDragging ? 'opacity-50 shadow-lg' : ''}`}>
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab text-text-muted hover:text-accent">⋮⋮</div>
        <input type="checkbox" checked={selectedIds.has(item.id)}
          onChange={() => toggleSelect(item.id)} className="accent-accent" />
        {tipo && <span className="text-sm">{tipo.icone}</span>}
        <span className="text-sm font-medium truncate flex-1">{item.titulo}</span>
        {secondaryProp && <span className="text-xs text-text-muted">{secondaryProp[0]}: {String(secondaryProp[1]).slice(0, 30)}</span>}
        {item.status && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${item.status === 'feito' ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted'}`}>
            {item.status}
          </span>
        )}
        {item.prioridade && <span className="text-xs text-text-muted">{item.prioridade}</span>}
      </div>
    </li>
  )
})

export default function Consultas() {
  const queryClient = useQueryClient()
  const [selectedQuery, setSelectedQuery] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [newName, setNewName] = useState('')
  const [newTipoId, setNewTipoId] = useState(1)
  const [newView, setNewView] = useState('grid')
  const [newGroup, setNewGroup] = useState('')
  const [batchField, setBatchField] = useState('')
  const [batchValue, setBatchValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [mesAtual, _setMesAtual] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const { data: queries, isLoading: qLoad, isError: qErr } = useQuery({ queryKey: ['queries'], queryFn: getQueries })
  const { data: tipos } = useQuery({ queryKey: ['tipos'], queryFn: getTipos, staleTime: 300_000 })

  const queryAtual = queries?.find(q => q.id === selectedQuery)

  const { data: result, refetch: refetchResult, isLoading: resLoad, isError: resErr } = useQuery({
    queryKey: ['query-result', selectedQuery, queryAtual?.visualizacao],
    queryFn: () => executarQuery(
      selectedQuery!,
      queryAtual?.visualizacao === 'calendario' ? mesAtual : undefined,
      queryAtual?.visualizacao === 'gantt'
    ),
    enabled: !!selectedQuery,
  })

  const createMut = useMutation({
    mutationFn: () => createQuery({ nome: newName, tipo_objeto_id: newTipoId, visualizacao: newView, campo_agrupamento: newGroup || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queries'] })
      setNewName('')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteQuery(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['queries'] })
      setSelectedQuery(prev => prev === id ? null : prev)
    },
  })

  const batchMut = useMutation({
    mutationFn: () => batchEdit(selectedQuery!, [...selectedIds], { [batchField]: batchValue }),
    onSuccess: () => {
      refetchResult()
      setSelectedIds(new Set())
    },
  })

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  function renderCard(item: CardItem) {
    return (
      <div key={item.id} onClick={() => toggleSelect(item.id)}
        className={`bg-bg-secondary rounded-xl border p-3 cursor-pointer transition-colors ${selectedIds.has(item.id) ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-accent/50'}`}>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={selectedIds.has(item.id)}
            onChange={() => toggleSelect(item.id)} className="accent-accent" />
          <span className="text-sm font-medium truncate">{item.titulo}</span>
        </div>
        {item.status && (
          <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${item.status === 'feito' ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted'}`}>
            {item.status}
          </span>
        )}
        {item.prioridade && (
          <span className="text-xs text-text-muted ml-1">{item.prioridade}</span>
        )}
      </div>
    )
  }



  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(e: DragEndEvent) {
    const over = e.over
    if (!over || e.active.id === over.id || !result) return
    const activeId = e.active.id as number
    const overId = over.id as number
    const activeIndex = result.dados.findIndex(d => d.id === activeId)
    const overIndex = result.dados.findIndex(d => d.id === overId)
    if (activeIndex === -1 || overIndex === -1) return

    const newDados = [...result.dados]
    const [moved] = newDados.splice(activeIndex, 1)
    newDados.splice(overIndex, 0, moved)

    // Update ordem for affected items
    for (let i = 0; i < newDados.length; i++) {
      if (newDados[i].ordem !== i) {
        try {
          await updateNota(newDados[i].id, { ordem: i })
        } catch (err) {
          console.error('[Consultas] ordem update failed:', err)
        }
      }
    }

    // Optimistic update - we'll refetch
    refetchResult()
  }

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border p-4 shrink-0 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Consultas</h1>

        <form onSubmit={e => { e.preventDefault(); createMut.mutate() }} className="mb-4 flex flex-col gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da consulta"
            className="w-full bg-bg-tertiary rounded px-3 py-1.5 text-sm outline-none" />
          <select value={newTipoId} onChange={e => setNewTipoId(Number(e.target.value))}
            className="w-full bg-bg-tertiary rounded px-3 py-1.5 text-sm outline-none">
            {(tipos || []).map(t => <option key={t.id} value={t.id}>{t.icone} {t.nome}</option>)}
          </select>
          <select value={newView} onChange={e => setNewView(e.target.value)}
            className="w-full bg-bg-tertiary rounded px-3 py-1.5 text-sm outline-none">
            <option value="grid">Grid (cards)</option>
            <option value="kanban">Kanban (colunas)</option>
            <option value="lista">Lista (densa)</option>
            <option value="galeria">Galeria (cards com imagem)</option>
            <option value="formulario">Formulário (criar nota)</option>
            <option value="calendario">Calendário (mensal)</option>
            <option value="gantt">Gantt (cronograma)</option>
          </select>
          {newView === 'kanban' && (
            <select value={newGroup} onChange={e => setNewGroup(e.target.value)}
              className="w-full bg-bg-tertiary rounded px-3 py-1.5 text-sm outline-none">
              <option value="">Campo para agrupar...</option>
              <option value="status">Status</option>
              <option value="prioridade">Prioridade</option>
              <option value="tipo_id">Tipo</option>
              <option value="data">Data</option>
            </select>
          )}
          <button type="submit" disabled={!newName.trim() || (newView === 'kanban' && !newGroup)}
            className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg disabled:opacity-50">Criar</button>
        </form>

        <div className="space-y-1">
          {qLoad && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
          {qErr && <p className="text-sm text-danger py-4 text-center">Erro ao carregar consultas</p>}
          {!qLoad && !qErr && (!queries || queries.length === 0) && (
            <p className="text-sm text-text-muted py-4 text-center">Nenhuma consulta criada</p>
          )}
          {!qLoad && !qErr && (queries || []).map(q => (
            <div key={q.id} className="flex items-center gap-1">
              <button onClick={() => setSelectedQuery(q.id)}
                className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedQuery === q.id ? 'bg-accent/20 text-accent' : 'hover:bg-bg-hover text-text-primary'}`}>
                {q.nome}
                <div className="text-xs text-text-muted">{q.visualizacao}{q.visualizacao === 'kanban' ? ` por ${q.campo_agrupamento}` : ''}</div>
              </button>
              <button onClick={() => setConfirmDeleteId(q.id)}
                className="text-xs text-text-muted hover:text-danger">✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {queryAtual ? <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{queryAtual.nome}</h2>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <select value={batchField} onChange={e => setBatchField(e.target.value)}
                    className="bg-bg-tertiary rounded px-2 py-1 text-xs outline-none">
                    <option value="">Campo</option>
                    <option value="status">Status</option>
                    <option value="prioridade">Prioridade</option>
                    <option value="tipo_id">Tipo</option>
                  </select>
                  <input value={batchValue} onChange={e => setBatchValue(e.target.value)}
                    placeholder="Valor" className="bg-bg-tertiary rounded px-2 py-1 text-xs outline-none w-24" />
                  <button onClick={() => batchMut.mutate()}
                    className="px-3 py-1 bg-accent text-white text-xs rounded-lg">
                    Aplicar ({selectedIds.size})
                  </button>
                </div>
              )}
            </div>

            {queryAtual.visualizacao === 'kanban' ? (
              resLoad ? (
                <p className="text-text-muted text-sm text-center py-8 animate-pulse">Carregando...</p>
              ) : resErr ? (
                <p className="text-danger text-sm text-center py-8">Erro ao executar consulta</p>
              ) : !result?.dados || result.dados.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-8">Nenhum resultado</p>
              ) : (
              <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
                {(() => {
                  const grupos: Record<string, any[]> = {}
                  const campo = queryAtual.campo_agrupamento || 'status'
                  for (const item of result.dados) {
                    const chave = String(item[campo] ?? 'Sem valor')
                    if (!grupos[chave]) grupos[chave] = []
                    grupos[chave].push(item)
                  }
                  const colunas = ['pendente', 'feito', 'alta', 'normal', 'baixa', 'Sem valor']
                  const ordem = colunas.filter(c => c in grupos)
                  const extra = Object.keys(grupos).filter(c => !colunas.includes(c))
                  return [...ordem, ...extra].map(col => (
                    <div key={col} className="bg-bg-secondary rounded-xl border border-border min-w-[220px] flex-shrink-0 flex flex-col">
                      <div className="px-3 py-2 border-b border-border font-medium text-sm sticky top-0 bg-bg-secondary rounded-t-xl">
                        {col}
                        <span className="text-text-muted text-xs ml-2">({grupos[col].length})</span>
                      </div>
                      <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                        {grupos[col].map(renderCard)}
                      </div>
                    </div>
                  ))
                })()}
              </div>
              )
            ) : queryAtual.visualizacao === 'lista' ? (
              resLoad ? (
                <p className="text-text-muted text-sm text-center py-8 animate-pulse">Carregando...</p>
              ) : resErr ? (
                <p className="text-danger text-sm text-center py-8">Erro ao executar consulta</p>
              ) : !result?.dados || result.dados.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-8">Nenhum resultado</p>
              ) : (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={result.dados.map(d => d.id)} strategy={verticalListSortingStrategy}>
                  <ul className="divide-y divide-border bg-bg-secondary rounded-xl border border-border max-h-[60vh] overflow-y-auto">
                    {result.dados.map((item) => (
                      <SortableItem key={item.id} item={item} tipos={tipos} selectedIds={selectedIds} toggleSelect={toggleSelect} />
                    ))}
                  </ul>
                </SortableContext>
                </DndContext>
              )
            ) : queryAtual.visualizacao === 'galeria' ? (
              resLoad ? (
                <p className="text-text-muted text-sm text-center py-8 animate-pulse">Carregando...</p>
              ) : resErr ? (
                <p className="text-danger text-sm text-center py-8">Erro ao executar consulta</p>
              ) : !result?.dados || result.dados.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-8">Nenhum resultado</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(result?.dados || []).map(item => {
                    const tipo = tipos?.find(t => t.id === item.tipo_id)
                    const coverUrl = item.cover_url
                    const hasImage = coverUrl && coverUrl.startsWith('http')
                    return (
                      <div key={item.id} onClick={() => toggleSelect(item.id)}
                        className={`group bg-bg-secondary rounded-xl border border-border overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl ${selectedIds.has(item.id) ? 'border-accent ring-2 ring-accent' : 'border-border'}`}>
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-accent/20 to-accent/5">
                          {hasImage ? (
                            <img src={coverUrl} alt={item.titulo}
                              className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                              loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-4xl font-bold text-accent/50">{item.titulo.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {tipo && <span className="text-lg">{tipo.icone}</span>}
                            <span className="text-sm font-medium truncate flex-1">{item.titulo}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            {item.status && (
                              <span className={`px-1.5 py-0.5 rounded ${item.status === 'feito' ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary'}`}>
                                {item.status}
                              </span>
                            )}
                            {item.prioridade && <span>{item.prioridade}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : queryAtual.visualizacao === 'calendario' ? (
              <CalendarioView
                query={queryAtual}
                result={result}
                resLoad={resLoad}
                resErr={resErr}
                onRefresh={refetchResult}
              />
            ) : queryAtual.visualizacao === 'formulario' ? (
              <FormularioView
                query={queryAtual}
                tipo={tipos?.find(t => t.id === queryAtual.tipo_objeto_id)}
                onClose={() => setSelectedQuery(null)}
                onCreate={refetchResult}
              />
            ) : queryAtual.visualizacao === 'gantt' ? (
              <GanttView
                query={queryAtual}
                result={result}
                resLoad={resLoad}
                resErr={resErr}
                onRefresh={refetchResult}
              />
            ) : null}
          </div>
        : (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            Selecione ou crie uma consulta
          </div>
        )}
      </div>

      {confirmDeleteId !== null && (
        <ConfirmModal
          titulo="Remover consulta"
          mensagem={`Tem certeza que deseja remover esta consulta?`}
          destructive
          confirmLabel="Remover"
          onConfirm={() => {
            deleteMut.mutate(confirmDeleteId)
            setConfirmDeleteId(null)
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
