import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTipos } from '../api/tipos'
import { getQueries, createQuery, deleteQuery, executarQuery, batchEdit } from '../api/queries'
import { updateNota, createNota } from '../api/notas'
import ConfirmModal from '../components/ConfirmModal'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SchemaField {
  type: 'text' | 'number' | 'date' | 'url' | 'select'
  options?: string[]
}

interface FormularioViewProps {
  query: { tipo_objeto_id: number }
  tipo: { schema_campos: Record<string, SchemaField> } | undefined
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
  query: { tipo_objeto_id: number; campo_agrupamento?: string }
  result: { dados: Array<{ id: number; titulo: string; [key: string]: unknown }> } | undefined
  resLoad: boolean
  resErr: boolean
  onRefresh: () => void
}

function CalendarioView({ query, result, resLoad, resErr, onRefresh }: CalendarioViewProps) {
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
        <button onClick={() => setMesAtual(m => {
          const [a, m] = m.split('-').map(Number)
          const d = new Date(a, m - 2, 1)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        })} className="px-3 py-1.5 bg-bg-tertiary rounded-lg hover:bg-bg-hover">‹</button>
        <h3 className="text-lg font-semibold capitalize">{mesLabel}</h3>
        <button onClick={() => setMesAtual(m => {
          const [a, m] = m.split('-').map(Number)
          const d = new Date(a, m, 1)
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

  const { data: queries, isLoading: qLoad, isError: qErr } = useQuery({ queryKey: ['queries'], queryFn: getQueries })
  const { data: tipos } = useQuery({ queryKey: ['tipos'], queryFn: getTipos, staleTime: 300_000 })

  const { data: result, refetch: refetchResult, isLoading: resLoad, isError: resErr } = useQuery({
    queryKey: ['query-result', selectedQuery],
    queryFn: () => executarQuery(selectedQuery!),
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

  const queryAtual = queries?.find(q => q.id === selectedQuery)

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  interface CardItem { id: number; titulo: string; status?: string; prioridade?: string; tipo_id?: number; [key: string]: unknown }
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

  // Lista view: dense column with drag-and-drop
  function SortableItem({ item, index }: { item: CardItem; index: number }) {
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
  }

  async function handleDragEnd(e: { active: { id: CardItem['id'] }; over: { id: CardItem['id'] } | null }) {
    if (!e.over || e.active.id === e.over.id) return
    const activeIndex = result.dados.findIndex(d => d.id === e.active.id)
    const overIndex = result.dados.findIndex(d => d.id === e.over.id)
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
        {queryAtual ? (
          <div>
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
                <SortableContext items={result.dados.map(d => d.id)} strategy={verticalListSortingStrategy}
                  collisionDetection={sortableKeyboardCoordinates} onDragEnd={handleDragEnd}>
                  <ul className="divide-y divide-border bg-bg-secondary rounded-xl border border-border max-h-[60vh] overflow-y-auto">
                    {result.dados.map((item, index) => (
                      <SortableItem key={item.id} item={item} index={index} />
                    ))}
                  </ul>
                </SortableContext>
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
                tipo={tipos?.find(t => t.id === queryAtual.tipo_objeto_id)}
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
            ) : (
          </div>
        ) : (
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
