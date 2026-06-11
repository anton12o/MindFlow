import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBlocos, createBloco, updateBloco, deleteBloco, getTarefas, createTarefa, updateTarefa, deleteTarefa } from '../api/rotina'
import CalendarioSemanal from '../components/CalendarioSemanal'
import ConfirmModal from '../components/ConfirmModal'
import { hojeLocal } from '../utils/date'
import type { BlocoRotina, Tarefa } from '../types'

function statusBloco(horaInicio: string, horaFim: string): { label: string; cor: string } | null {
  const agora = new Date()
  const h = String(agora.getHours()).padStart(2, '0')
  const m = String(agora.getMinutes()).padStart(2, '0')
  const agoraStr = `${h}:${m}`
  if (agoraStr >= horaInicio && agoraStr <= horaFim) return { label: 'Agora', cor: 'bg-success/20 text-success' }
  if (agoraStr > horaFim) return { label: 'Concluído', cor: 'bg-text-muted/10 text-text-muted' }
  return { label: 'Previsto', cor: 'bg-accent/10 text-accent' }
}

export default function Rotina() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'lista' | 'semana'>('lista')
  const [novaTarefa, setNovaTarefa] = useState('')
  const [showBlocoForm, setShowBlocoForm] = useState(false)
  const [blocoForm, setBlocoForm] = useState({ titulo: '', hora_inicio: '', hora_fim: '' })
  const [editBloco, setEditBloco] = useState<{ id: number; titulo: string; hora_inicio: string; hora_fim: string } | null>(null)
  const [editTarefa, setEditTarefa] = useState<{ id: number; titulo: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'bloco' | 'tarefa'; id: number; label: string } | null>(null)
  const hoje = hojeLocal()
  const queryKey = ['rotina', 'tarefas', hoje] as const

  const { data: blocos, isLoading: blocosLoad, isError: blocosErr } = useQuery({
    queryKey: ['rotina', 'blocos', hoje],
    queryFn: () => getBlocos(hoje),
  })

  const { data: tarefas, isLoading: tarefasLoad, isError: tarefasErr } = useQuery({
    queryKey,
    queryFn: () => getTarefas(hoje),
  })

  const createTarefaMut = useMutation({
    mutationFn: (titulo: string) => createTarefa({ titulo, data: hoje }),
    onMutate: async (titulo) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Tarefa[]>(queryKey)
      const optimistic: Tarefa = {
        id: Date.now(),
        titulo,
        data: hoje,
        prioridade: 'normal',
        status: 'pendente',
        tempo_estimado: null,
        bloco_id: null,
        tipo_id: null,
        criado_em: new Date().toISOString(),
      }
      queryClient.setQueryData<Tarefa[]>(queryKey, old => [...(old || []), optimistic])
      setNovaTarefa('')
      return { previous }
    },
    onError: (_err, _titulo, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const toggleTarefaMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTarefa(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] }),
  })

  const createBlocoMut = useMutation({
    mutationFn: (data: Partial<BlocoRotina>) => createBloco({ ...data, data_especifica: hoje }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'blocos'] })
      setShowBlocoForm(false)
      setBlocoForm({ titulo: '', hora_inicio: '', hora_fim: '' })
    },
  })

  const deleteBlocoMut = useMutation({
    mutationFn: (id: number) => deleteBloco(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rotina', 'blocos'] }),
  })

  const updateBlocoMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BlocoRotina> }) => updateBloco(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'blocos'] })
      setEditBloco(null)
    },
  })

  const updateTarefaMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Tarefa> }) => updateTarefa(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] })
      setEditTarefa(null)
    },
  })

  const deleteTarefaMut = useMutation({
    mutationFn: (id: number) => deleteTarefa(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] }),
  })

  function handleAddTarefa(e: React.FormEvent) {
    e.preventDefault()
    if (!novaTarefa.trim()) return
    createTarefaMut.mutate(novaTarefa.trim())
  }

  function handleToggleTarefa(t: Tarefa) {
    toggleTarefaMut.mutate({ id: t.id, status: t.status === 'feito' ? 'pendente' : 'feito' })
  }

  function handleCreateBloco(e: React.FormEvent) {
    e.preventDefault()
    createBlocoMut.mutate(blocoForm)
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Rotina Diária</h1>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView('lista')}
            className={`px-3 py-1 text-sm ${view === 'lista' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-muted hover:text-text-primary'}`}>
            Lista
          </button>
          <button onClick={() => setView('semana')}
            className={`px-3 py-1 text-sm ${view === 'semana' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-muted hover:text-text-primary'}`}>
            Semana
          </button>
        </div>
      </div>

      {view === 'semana' ? (
        <CalendarioSemanal />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Blocos de tempo</h2>
              <button onClick={() => setShowBlocoForm(!showBlocoForm)} className="text-xs text-accent hover:underline">+ bloco</button>
            </div>

            {showBlocoForm && (
              <form onSubmit={handleCreateBloco} className="flex flex-wrap gap-2 mb-4 p-3 bg-bg-tertiary rounded-lg">
                <input value={blocoForm.titulo} onChange={e => setBlocoForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título" maxLength={60} className="flex-1 min-w-[120px] bg-bg-primary rounded px-2 py-1.5 text-sm outline-none" />
                <input type="time" value={blocoForm.hora_inicio} onChange={e => setBlocoForm(f => ({ ...f, hora_inicio: e.target.value }))} className="bg-bg-primary rounded px-2 py-1.5 text-sm outline-none" />
                <input type="time" value={blocoForm.hora_fim} onChange={e => setBlocoForm(f => ({ ...f, hora_fim: e.target.value }))} className="bg-bg-primary rounded px-2 py-1.5 text-sm outline-none" />
                <button type="submit" className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg">OK</button>
              </form>
            )}

            <div className="space-y-1">
              {blocosLoad && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
              {blocosErr && <p className="text-sm text-danger py-4 text-center">Erro ao carregar blocos</p>}
              {!blocosLoad && !blocosErr && blocos && blocos.length > 0 && [...blocos].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)).map(b => {
                const s = statusBloco(b.hora_inicio, b.hora_fim)
                const editing = editBloco?.id === b.id
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors">
                    {editing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input value={editBloco.titulo} onChange={e => setEditBloco(prev => ({ ...prev!, titulo: e.target.value }))}
                          className="bg-bg-primary rounded px-2 py-1 text-sm w-28 outline-none" />
                        <input type="time" value={editBloco.hora_inicio} onChange={e => setEditBloco(prev => ({ ...prev!, hora_inicio: e.target.value }))}
                          className="bg-bg-primary rounded px-2 py-1 text-sm outline-none" />
                        <input type="time" value={editBloco.hora_fim} onChange={e => setEditBloco(prev => ({ ...prev!, hora_fim: e.target.value }))}
                          className="bg-bg-primary rounded px-2 py-1 text-sm outline-none" />
                        <button onClick={() => updateBlocoMut.mutate({ id: b.id, data: { titulo: editBloco.titulo, hora_inicio: editBloco.hora_inicio, hora_fim: editBloco.hora_fim } })}
                          className="text-xs text-success">OK</button>
                        <button onClick={() => setEditBloco(null)} className="text-xs text-text-muted">Cancelar</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-text-secondary w-24">{b.hora_inicio}–{b.hora_fim}</span>
                        <span className="text-sm" style={{ color: b.cor || undefined }}>{b.titulo}</span>
                        {s && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.cor}`}>{s.label}</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditBloco({ id: b.id, titulo: b.titulo, hora_inicio: b.hora_inicio, hora_fim: b.hora_fim })}
                        className="text-xs text-text-muted hover:text-accent">✎</button>
                      <button onClick={() => setConfirmDelete({ type: 'bloco', id: b.id, label: b.titulo })}
                        className="text-xs text-text-muted hover:text-danger">✕</button>
                    </div>
                  </div>
                )
              })}
              {!blocosLoad && !blocosErr && (!blocos || blocos.length === 0) && <p className="text-sm text-text-muted py-4 text-center">Nenhum bloco definido</p>}
            </div>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Tarefas do dia</h2>

            <form onSubmit={handleAddTarefa} className="mb-4">
              <input
                value={novaTarefa}
                onChange={e => setNovaTarefa(e.target.value)}
                placeholder="Adicionar tarefa..."
                className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
              />
            </form>

            <div className="space-y-1">
              {tarefasLoad && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
              {tarefasErr && <p className="text-sm text-danger py-4 text-center">Erro ao carregar tarefas</p>}
              {!tarefasLoad && !tarefasErr && (tarefas || []).map(t => {
                const editing = editTarefa?.id === t.id
                return (
                <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors">
                  <button onClick={() => handleToggleTarefa(t)}
                    className={`w-4 h-4 rounded border flex items-center justify-center text-xs transition-colors shrink-0
                      ${t.status === 'feito' ? 'bg-accent border-accent text-white' : 'border-border hover:border-accent'}`}>
                    {t.status === 'feito' && '✓'}
                  </button>
                  {editing ? (
                    <>
                      <input value={editTarefa.titulo} onChange={e => setEditTarefa(prev => ({ ...prev!, titulo: e.target.value }))}
                        className="flex-1 bg-bg-tertiary rounded px-2 py-1 text-sm outline-none" />
                      <button onClick={() => updateTarefaMut.mutate({ id: t.id, data: { titulo: editTarefa.titulo } })}
                        className="text-xs text-success">OK</button>
                      <button onClick={() => setEditTarefa(null)} className="text-xs text-text-muted">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <span className={`text-sm flex-1 ${t.status === 'feito' ? 'line-through text-text-muted' : ''}`}>{t.titulo}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${t.prioridade === 'alta' ? 'bg-danger/20 text-danger' : t.prioridade === 'baixa' ? 'bg-text-muted/20 text-text-muted' : 'bg-warning/20 text-warning'}`}>
                        {t.prioridade}
                      </span>
                      <button onClick={() => setEditTarefa({ id: t.id, titulo: t.titulo })}
                        className="text-xs text-text-muted hover:text-accent">✎</button>
                      <button onClick={() => setConfirmDelete({ type: 'tarefa', id: t.id, label: t.titulo })}
                        className="text-xs text-text-muted hover:text-danger">✕</button>
                    </>
                  )}
                </div>
              )})}
              {!tarefasLoad && !tarefasErr && (!tarefas || tarefas.length === 0) && <p className="text-sm text-text-muted py-4 text-center">Nenhuma tarefa hoje</p>}
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          titulo={`Remover ${confirmDelete.type === 'bloco' ? 'bloco' : 'tarefa'}`}
          mensagem={`Tem certeza que deseja remover "${confirmDelete.label}"?`}
          destructive
          confirmLabel="Remover"
          onConfirm={() => {
            if (confirmDelete.type === 'bloco') deleteBlocoMut.mutate(confirmDelete.id)
            else deleteTarefaMut.mutate(confirmDelete.id)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
