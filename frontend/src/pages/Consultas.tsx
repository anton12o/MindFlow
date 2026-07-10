import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTipos } from '../api/tipos'
import { getQueries, createQuery, deleteQuery, executarQuery, batchEdit } from '../api/queries'
import { broadcastInvalidate } from '../hooks/useBroadcastInvalidate'
import { updateNota } from '../api/notas'
import ConfirmModal from '../components/ConfirmModal'
import { useNotify } from '../store/notification'
import { X, GripVertical } from 'lucide-react'
import FormularioView from './consultas/FormularioView'
import CalendarioView from './consultas/CalendarioView'
import GanttView from './consultas/GanttView'
import { labelPrioridade, badgePrioridade } from '../utils/prioridade'
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useSortable, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'



interface CardItem { id: number; titulo: string; status?: string; prioridade?: string; tipo_id?: number; cover_url?: string; [key: string]: unknown }
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
    <li ref={setNodeRef} style={style}
      className={`bg-bg-secondary rounded-lg border p-2 transition-colors ${selectedIds.has(item.id) ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-accent/50'} ${isDragging ? 'opacity-50 shadow-lg' : ''}`}>
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab text-text-muted hover:text-accent"><GripVertical size={14} /></div>
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
        {item.prioridade && <span className={`text-xs px-1.5 py-0.5 rounded ${badgePrioridade(item.prioridade)}`}>{labelPrioridade(item.prioridade)}</span>}
      </div>
    </li>
  )
})
export default function Consultas() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [selectedQuery, setSelectedQuery] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [newName, setNewName] = useState('')
  const [newTipoId, setNewTipoId] = useState(1)
  const [newView, setNewView] = useState('grid')
  const [newGroup, setNewGroup] = useState('')
  const [queryFormError, setQueryFormError] = useState('')
  const [queryGroupError, setQueryGroupError] = useState('')
  const [batchField, setBatchField] = useState('')
  const [batchValue, setBatchValue] = useState('')
  const [calendarioMes, setCalendarioMes] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [tempView, setTempView] = useState<string | null>(null)
  const { data: queries, isLoading: qLoad, isError: qErr } = useQuery({ queryKey: ['queries'], queryFn: getQueries })
  const { data: tipos } = useQuery({ queryKey: ['tipos'], queryFn: getTipos, staleTime: 300_000 })
  const queryAtual = queries?.find(q => q.id === selectedQuery)
  const viewAtual = tempView || queryAtual?.visualizacao
  const { data: result, refetch: refetchResult, isLoading: resLoad, isError: resErr, error: resError } = useQuery({
    queryKey: ['query-result', selectedQuery, queryAtual?.visualizacao, queryAtual?.visualizacao === 'calendario' ? calendarioMes : undefined],
    queryFn: () => executarQuery(
      selectedQuery!,
      queryAtual?.visualizacao === 'calendario' ? calendarioMes : undefined,
      queryAtual?.visualizacao === 'gantt'
    ),
    enabled: !!selectedQuery,
  })
  const createMut = useMutation({
    mutationFn: () => createQuery({ nome: newName, tipo_objeto_id: newTipoId, visualizacao: newView, campo_agrupamento: newGroup || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queries'] })
      broadcastInvalidate([['queries']])
      setNewName('')
    },
    onError: (e) => { console.error('[Consultas] create', e); notify('Erro ao criar consulta') },
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteQuery(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['queries'] })
      broadcastInvalidate([['queries']])
      setSelectedQuery(prev => prev === id ? null : prev)
    },
    onError: (e) => { console.error('[Consultas] delete', e); notify('Erro ao excluir consulta') },
  })
  const batchMut = useMutation({
    mutationFn: () => batchEdit(selectedQuery!, [...selectedIds], { [batchField]: batchValue }),
    onSuccess: () => {
      refetchResult()
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      broadcastInvalidate([['notas']])
      setSelectedIds(new Set())
    },
    onError: (e) => { console.error('[Consultas] batch', e); notify('Erro ao editar itens') },
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
          <span className={`text-xs px-1.5 py-0.5 rounded ${badgePrioridade(item.prioridade)}`}>{labelPrioridade(item.prioridade)}</span>
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
      if ((newDados[i].ordem as number | undefined) !== i) {
        try {
          await updateNota(newDados[i].id, { ordem: i })
        } catch (err) {
          console.error('[Consultas] ordem update failed:', err)
          notify('Erro ao reordenar itens')
        }
      }
    }
    // Optimistic update - we'll refetch
    refetchResult()
  }
  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border p-4 shrink-0 flex flex-col h-full overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Consultas</h1>
        <form onSubmit={e => { e.preventDefault(); setQueryFormError(''); setQueryGroupError('')
          if (!newName.trim()) { setQueryFormError('Informe o nome'); return }
          if (newView === 'calendario' && !newGroup) { setQueryGroupError('Selecione um campo de data'); return }
          if (newView === 'gantt' && !newGroup) { setQueryGroupError('Selecione um campo de agrupamento'); return }
          if (newView === 'kanban' && !newGroup) { setQueryGroupError('Selecione um campo de agrupamento'); return }
          createMut.mutate()
        }} className="mb-4 flex flex-col gap-2">
          <input value={newName} onChange={e => { setNewName(e.target.value); if (queryFormError) setQueryFormError('') }} placeholder="Nome da consulta"
            className={`w-full bg-bg-tertiary rounded px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent ${queryFormError ? 'ring-1 ring-danger border-danger' : ''}`} />
          {queryFormError && <p className="text-xs text-danger">{queryFormError}</p>}
          <select value={newTipoId} onChange={e => setNewTipoId(Number(e.target.value))}
            className="w-full bg-bg-tertiary rounded px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {(tipos || []).map(t => <option key={t.id} value={t.id}>{t.icone} {t.nome}</option>)}
          </select>
          <select value={newView} onChange={e => { setNewView(e.target.value); setNewGroup(''); if (queryGroupError) setQueryGroupError('') }}
            className="w-full bg-bg-tertiary rounded px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <option value="grid">Grid (cards)</option>
            <option value="kanban">Kanban (colunas)</option>
            <option value="lista">Lista (densa)</option>
            <option value="galeria">Galeria (cards com imagem)</option>
            <option value="formulario">Formulário (criar nota)</option>
            <option value="calendario">Calendário (mensal)</option>
            <option value="gantt">Gantt (cronograma)</option>
          </select>
          {(newView === 'kanban' || newView === 'calendario' || newView === 'gantt') && (
            <div>
              <select value={newGroup} onChange={e => { setNewGroup(e.target.value); if (queryGroupError) setQueryGroupError('') }}
                className={`w-full bg-bg-tertiary rounded px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent ${queryGroupError ? 'ring-1 ring-danger border-danger' : ''}`}>
                {newView === 'calendario' ? (
                  <>
                    <option value="">Campo de data...</option>
                    <option value="criado_em">Criado em</option>
                    <option value="atualizado_em">Atualizado em</option>
                    <option value="data_inicio">Data início</option>
                    <option value="data_fim">Data fim</option>
                    <option value="vencimento">Vencimento</option>
                    <option value="lido_em">Lido em</option>
                  </>
                ) : (
                  <>
                    <option value="">Campo para agrupar...</option>
                    <option value="status">Status</option>
                    <option value="prioridade">Prioridade</option>
                    <option value="tipo_id">Tipo</option>
                    <option value="data">Data</option>
                  </>
                )}
              </select>
              {queryGroupError && <p className="text-xs text-danger">{queryGroupError}</p>}
            </div>
          )}
          <button type="submit" disabled={createMut.isPending}
            className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg transition-all active:scale-95 disabled:opacity-50">{createMut.isPending ? 'Criando...' : 'Criar'}</button>
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
                className="text-xs text-text-muted hover:text-danger"><X size={12} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {queryAtual ? <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{queryAtual.nome}</h2>
              <select value={viewAtual || 'grid'} onChange={e => setTempView(e.target.value)}
                className="bg-bg-tertiary rounded px-2 py-1 text-xs outline-none ml-2">
                <option value="grid">Grid</option>
                <option value="kanban">Kanban</option>
                <option value="lista">Lista</option>
                <option value="galeria">Galeria</option>
                <option value="calendario">Calendário</option>
                <option value="formulario">Formulário</option>
                <option value="gantt">Gantt</option>
              </select>
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
                  <button onClick={() => { if (!batchField) { notify('Selecione um campo'); return }; batchMut.mutate() }}
                    disabled={batchMut.isPending}
                    className="px-3 py-1 bg-accent text-white text-xs rounded-lg transition-all active:scale-95 disabled:opacity-50">
                    {batchMut.isPending ? 'Aplicando...' : `Aplicar (${selectedIds.size})`}
                  </button>
                </div>
              )}
            </div>
            {viewAtual === 'kanban' ? (
              resLoad ? (
                <p className="text-text-muted text-sm text-center py-4 animate-pulse">Carregando...</p>
              ) : resErr ? (
                <p className="text-danger text-sm text-center py-4">{resError instanceof Error ? resError.message : 'Erro ao executar consulta'}</p>
              ) : !result?.dados || result.dados.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">Nenhum resultado</p>
              ) : (
              <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
                {(() => {
                  const grupos: Record<string, unknown[]> = {}
                  const campo = queryAtual.campo_agrupamento || 'status'
                  for (const item of result.dados) {
                    const chave = String(item[campo] ?? 'Sem valor')
                    if (!grupos[chave]) grupos[chave] = []
                    grupos[chave].push(item)
                  }
                  const STATUS_LABEL: Record<string, string> = {
                    'pendente': 'Pendente',
                    'em_andamento': 'Em andamento',
                    'feito': 'Feito',
                    'alta': 'Alta',
                    'normal': 'Normal',
                    'baixa': 'Baixa',
                    'urgente': 'Urgente',
                  }
                  const colunas = ['pendente', 'em_andamento', 'feito', 'alta', 'normal', 'baixa', 'Sem valor']
                  const ordem = colunas.filter(c => c in grupos)
                  const extra = Object.keys(grupos).filter(c => !colunas.includes(c))
                  return [...ordem, ...extra].map(col => (
                      <div key={col} className="bg-bg-secondary rounded-xl border border-border min-w-[220px] flex-shrink-0 flex flex-col">
                      <div className="px-3 py-2 border-b border-border font-medium text-sm sticky top-0 bg-bg-secondary rounded-t-xl">
                        {STATUS_LABEL[col] || col}
                        <span className="text-text-muted text-xs ml-2">({grupos[col].length})</span>
                      </div>
                      <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                        {grupos[col].map(item => renderCard(item as CardItem))}
                      </div>
                    </div>
                  ))
                })()}
              </div>
              )
            ) : viewAtual === 'lista' ? (
              resLoad ? (
                <p className="text-text-muted text-sm text-center py-4 animate-pulse">Carregando...</p>
              ) : resErr ? (
                <p className="text-danger text-sm text-center py-4">{resError instanceof Error ? resError.message : 'Erro ao executar consulta'}</p>
              ) : !result?.dados || result.dados.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">Nenhum resultado</p>
              ) : (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={result.dados.map(d => d.id)} strategy={verticalListSortingStrategy}>
                  <ul className="divide-y divide-border bg-bg-secondary rounded-xl border border-border max-h-[60vh] overflow-y-auto">
                    {result.dados.map((item) => (
                      <SortableItem key={item.id} item={item as CardItem} tipos={tipos} selectedIds={selectedIds} toggleSelect={toggleSelect} />
                    ))}
                  </ul>
                </SortableContext>
                </DndContext>
              )
            ) : viewAtual === 'galeria' ? (
              resLoad ? (
                <p className="text-text-muted text-sm text-center py-4 animate-pulse">Carregando...</p>
              ) : resErr ? (
                <p className="text-danger text-sm text-center py-4">{resError instanceof Error ? resError.message : 'Erro ao executar consulta'}</p>
              ) : !result?.dados || result.dados.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">Nenhum resultado</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(result?.dados || []).map(item => {
                    const card = item as CardItem
                    const tipo = tipos?.find(t => t.id === card.tipo_id)
                    const coverUrl = card.cover_url
                    const hasImage = coverUrl && coverUrl.startsWith('http')
                    return (
                      <div key={card.id} onClick={() => toggleSelect(card.id)}
                        className={`group bg-bg-secondary rounded-xl border border-border overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl ${selectedIds.has(card.id) ? 'border-accent ring-2 ring-accent' : 'border-border'}`}>
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-accent/20 to-accent/5">
                          {hasImage ? (
                            <img src={coverUrl} alt={card.titulo}
                              className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                              loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-4xl font-bold text-accent/50">{card.titulo.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {tipo && <span className="text-lg">{tipo.icone}</span>}
                            <span className="text-sm font-medium truncate flex-1">{card.titulo}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            {card.status && (
                              <span className={`px-1.5 py-0.5 rounded ${card.status === 'feito' ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary'}`}>
                                {card.status}
                              </span>
                            )}
                            {card.prioridade && <span className={`text-xs px-1.5 py-0.5 rounded ${badgePrioridade(card.prioridade)}`}>{labelPrioridade(card.prioridade)}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : viewAtual === 'calendario' ? (
              <CalendarioView
                query={queryAtual}
                result={result}
                resLoad={resLoad}
                resErr={resErr}
                onRefresh={refetchResult}
                mesAtual={calendarioMes}
                onMesChange={setCalendarioMes}
                errorMsg={resError instanceof Error ? resError.message : undefined}
              />
            ) : viewAtual === 'formulario' ? (
              <FormularioView
                query={queryAtual}
                tipo={tipos?.find(t => t.id === queryAtual.tipo_objeto_id)}
                onClose={() => setSelectedQuery(null)}
                onCreate={refetchResult}
              />
            ) : viewAtual === 'gantt' ? (
              <GanttView
                query={queryAtual}
                result={result}
                resLoad={resLoad}
                resErr={resErr}
                onRefresh={refetchResult}
                errorMsg={resError instanceof Error ? resError.message : undefined}
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
          disabled={deleteMut.isPending}
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
