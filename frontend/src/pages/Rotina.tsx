import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBlocos, createBloco, updateBloco, deleteBloco, getTarefas, createTarefa, updateTarefa, deleteTarefa, reorderTarefas } from '../api/rotina'
import { getPomodoroStats } from '../api/stats'
import { usePomodoroContext } from '../store/pomodoro'
import { broadcastInvalidate } from '../hooks/useBroadcastInvalidate'
import CalendarioSemanal from '../components/CalendarioSemanal'
import ConfirmModal from '../components/ConfirmModal'
import { hojeLocal, agoraLocal } from '../utils/date'
import { labelPrioridade, badgePrioridade } from '../utils/prioridade'
import { useNotify } from '../store/notification'
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
function saudacao(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
function formatarData(dataStr: string): string {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const d = new Date(dataStr + 'T12:00:00')
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}`
}
const INTENCAO_KEY = 'mindflow_intencao_diaria'
export default function Rotina() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const { config } = usePomodoroContext()
  const [view, setView] = useState<'lista' | 'semana'>('lista')
  const [novaTarefa, setNovaTarefa] = useState('')
  const [novaTarefaRec, setNovaTarefaRec] = useState(false)
  const [novaTarefaRecTipo, setNovaTarefaRecTipo] = useState<string>('daily')
  const [novaTarefaRecIntervalo, setNovaTarefaRecIntervalo] = useState(1)
  const [showBlocoForm, setShowBlocoForm] = useState(false)
  const [blocoForm, setBlocoForm] = useState({ titulo: '', hora_inicio: '', hora_fim: '' })
  const [editBloco, setEditBloco] = useState<{ id: number; titulo: string; hora_inicio: string; hora_fim: string } | null>(null)
  const [blocoErrors, setBlocoErrors] = useState<Record<string, string>>({})
  const [tarefaErrors, setTarefaErrors] = useState('')
  const [editTarefa, setEditTarefa] = useState<{ id: number; titulo: string; recorrente?: boolean; recorrencia_tipo?: string | null; recorrencia_intervalo?: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'bloco' | 'tarefa'; id: number; label: string } | null>(null)
  const [descExpand, setDescExpand] = useState<Record<number, boolean>>({})
  const [hideDone, setHideDone] = useState(false)
  const hoje = hojeLocal()
  const [intencao, setIntencao] = useState(() => {
    try {
      const stored = localStorage.getItem(INTENCAO_KEY)
      if (stored) { const parsed = JSON.parse(stored); return parsed[hoje] || '' }
    } catch (e) { console.error('[Rotina.useState.intencao]', e) }
    return ''
  })
  const queryKey = ['rotina', 'tarefas', hoje] as const
  const { data: blocos, isLoading: blocosLoad, isError: blocosErr } = useQuery({
    queryKey: ['rotina', 'blocos', hoje],
    queryFn: () => getBlocos(hoje),
    staleTime: 30_000,
  })
  const { data: tarefas, isLoading: tarefasLoad, isError: tarefasErr } = useQuery({
    queryKey,
    queryFn: () => getTarefas(hoje),
    staleTime: 30_000,
  })
  const { data: pStats, isLoading: pLoad } = useQuery({
    queryKey: ['pomodoro', 'stats'],
    queryFn: getPomodoroStats,
    staleTime: 15_000,
  })
  const createTarefaMut = useMutation({
    mutationFn: (payload: { titulo: string; recorrente: boolean; recorrencia_tipo: string | null; recorrencia_intervalo: number }) =>
      createTarefa({ titulo: payload.titulo, data: hoje, recorrente: payload.recorrente, recorrencia_tipo: payload.recorrencia_tipo, recorrencia_intervalo: payload.recorrencia_intervalo }),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Tarefa[]>(queryKey)
      const optimistic: Tarefa = {
        id: Date.now(),
        titulo: payload.titulo,
        data: hoje,
        prioridade: 'normal',
        status: 'pendente',
        tempo_estimado: null,
        bloco_id: null,
        tipo_id: null,
        criado_em: agoraLocal(),
        descricao: '',
        recorrente: payload.recorrente,
        recorrencia_tipo: payload.recorrencia_tipo,
        recorrencia_intervalo: payload.recorrencia_intervalo,
        total_foco_min: 0,
        ordem: 0,
      }
      queryClient.setQueryData<Tarefa[]>(queryKey, old => [...(old || []), optimistic])
      setNovaTarefa('')
      setNovaTarefaRec(false)
      setNovaTarefaRecTipo('daily')
      setNovaTarefaRecIntervalo(1)
      return { previous }
    },
    onError: (err, _payload, context) => {
      console.error('[Rotina]', err)
      notify('Erro ao criar tarefa')
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
      broadcastInvalidate([[...queryKey]])
    },
  })
  const toggleTarefaMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTarefa(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
    },
    onError: (e) => { console.error('[Rotina] toggleTarefa', e); notify('Erro ao alternar tarefa') },
  })
  const createBlocoMut = useMutation({
    mutationFn: (data: Partial<BlocoRotina>) => createBloco({ ...data, data_especifica: hoje }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'blocos'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
      setShowBlocoForm(false)
      setBlocoForm({ titulo: '', hora_inicio: '', hora_fim: '' })
    },
  })
  const deleteBlocoMut = useMutation({
    mutationFn: (id: number) => deleteBloco(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'blocos'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
    },
    onError: (e) => { console.error('[Rotina] deleteBloco', e); notify('Erro ao excluir bloco') },
  })
  const updateBlocoMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BlocoRotina> }) => updateBloco(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'blocos'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
      setEditBloco(null)
    },
    onError: (e) => { console.error('[Rotina] updateBloco', e); notify('Erro ao salvar bloco') },
  })
  const updateTarefaMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Tarefa> }) => updateTarefa(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
      setEditTarefa(null)
    },
    onError: (e) => { console.error('[Rotina] updateTarefa', e); notify('Erro ao salvar tarefa') },
  })
  const deleteTarefaMut = useMutation({
    mutationFn: (id: number) => deleteTarefa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
    },
    onError: (e) => { console.error('[Rotina] deleteTarefa', e); notify('Erro ao excluir tarefa') },
  })
  const [dragItem, setDragItem] = useState<number | null>(null)
  const reorderTarefasMut = useMutation({
    mutationFn: (items: { id: number; ordem: number }[]) => reorderTarefas(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['tarefas'] })
    },
    onError: (e) => { console.error('[Rotina] reorderTarefas', e); notify('Erro ao reordenar tarefas') },
  })
  function handleAddTarefa(e: React.FormEvent) {
    e.preventDefault()
    if (!novaTarefa.trim()) { setTarefaErrors('Digite o nome da tarefa'); return }
    setTarefaErrors('')
    createTarefaMut.mutate({
      titulo: novaTarefa.trim(),
      recorrente: novaTarefaRec,
      recorrencia_tipo: novaTarefaRec ? novaTarefaRecTipo : null,
      recorrencia_intervalo: novaTarefaRecIntervalo,
    })
  }
  function handleToggleTarefa(t: Tarefa) {
    toggleTarefaMut.mutate({ id: t.id, status: t.status === 'feito' ? 'pendente' : 'feito' })
  }
  function handleCreateBloco(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!blocoForm.titulo.trim()) errors.titulo = 'Informe um título'
    if (!blocoForm.hora_inicio.trim()) errors.hora_inicio = 'Informe o início'
    if (!blocoForm.hora_fim.trim()) errors.hora_fim = 'Informe o fim'
    setBlocoErrors(errors)
    if (Object.keys(errors).length > 0) return
    createBlocoMut.mutate(blocoForm)
  }
  function handleIntencaoChange(texto: string) {
    setIntencao(texto)
    try {
      const stored = localStorage.getItem(INTENCAO_KEY)
      const parsed = stored ? JSON.parse(stored) : {}
      parsed[hoje] = texto
      localStorage.setItem(INTENCAO_KEY, JSON.stringify(parsed))
    } catch (e) { console.error('[Rotina.handleIntencaoChange]', e) }
  }
  const prioridadePeso: Record<string, number> = { urgente: 0, alta: 1, normal: 2, baixa: 3 }
  const blocosOrdenados = [...(blocos || [])].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  const tarefasFiltradas = (tarefas || []).filter(t => !hideDone || t.status !== 'feito')
  const tarefasComBloco = tarefasFiltradas.filter(t => t.bloco_id).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  const tarefasSemBloco = tarefasFiltradas
    .filter(t => !t.bloco_id)
    .sort((a, b) => {
      const oa = a.ordem ?? 0
      const ob = b.ordem ?? 0
      if (oa !== ob) return oa - ob
      return (prioridadePeso[a.prioridade] ?? 2) - (prioridadePeso[b.prioridade] ?? 2)
    })
  const agora = new Date()
  const agoraStr = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  const blocoAtual = blocosOrdenados.find(b => statusBloco(b.hora_inicio, b.hora_fim)?.label === 'Agora')
  const proximoBloco = blocoAtual || blocosOrdenados.find(b => b.hora_inicio > agoraStr)
  const tarefasTotal = tarefas?.length || 0
  const tarefasFeitas = tarefas?.filter(t => t.status === 'feito').length || 0
  const tarefaPct = tarefasTotal > 0 ? Math.round((tarefasFeitas / tarefasTotal) * 100) : 0
  const focusMin = pStats?.total_min_hoje ?? 0
  const focusPct = pStats ? Math.min(100, Math.round((focusMin / config.dailyFocusMin) * 100)) : 0
  const top3 = (tarefas || [])
    .filter(t => t.status !== 'feito')
    .sort((a, b) => (prioridadePeso[a.prioridade] ?? 2) - (prioridadePeso[b.prioridade] ?? 2))
    .slice(0, 3)
  function renderTarefaItem(t: Tarefa) {
    const editing = editTarefa?.id === t.id
    const expanded = descExpand[t.id] || false
    return (
      <div key={t.id}>
        <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-bg-hover transition-colors group">
          <button onClick={() => handleToggleTarefa(t)}
            disabled={toggleTarefaMut.isPending}
            className={`w-4 h-4 rounded border flex items-center justify-center text-xs transition-colors shrink-0 disabled:opacity-50
              ${t.status === 'feito' ? 'bg-accent border-accent text-white' : 'border-border hover:border-accent'}`}>
            {t.status === 'feito' && '✓'}
          </button>
          {editing ? (
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-2">
                <input value={editTarefa.titulo} onChange={e => setEditTarefa(prev => ({ ...prev!, titulo: e.target.value }))}
                  className="flex-1 bg-bg-primary rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-accent" />
                <button onClick={() => {
                  const data: Partial<Tarefa> = { titulo: editTarefa.titulo }
                  if (editTarefa.recorrente !== undefined) data.recorrente = editTarefa.recorrente
                  if (editTarefa.recorrencia_tipo !== undefined) data.recorrencia_tipo = editTarefa.recorrencia_tipo
                  if (editTarefa.recorrencia_intervalo !== undefined) data.recorrencia_intervalo = editTarefa.recorrencia_intervalo
                  updateTarefaMut.mutate({ id: t.id, data })
                }}
                  disabled={updateTarefaMut.isPending} className="text-xs text-success disabled:opacity-50">{updateTarefaMut.isPending ? '...' : 'OK'}</button>
                <button onClick={() => setEditTarefa(null)} className="text-xs text-text-muted">Cancelar</button>
              </div>
              <div className="flex items-center gap-2 ml-1">
                <label className="flex items-center gap-1 text-xs text-text-muted cursor-pointer">
                  <input type="checkbox" checked={editTarefa.recorrente ?? false}
                    onChange={e => setEditTarefa(prev => ({ ...prev!, recorrente: e.target.checked }))} className="accent-accent" />
                  Recorrente
                </label>
                {editTarefa.recorrente && (
                  <>
                    <select value={editTarefa.recorrencia_tipo ?? 'daily'} onChange={e => setEditTarefa(prev => ({ ...prev!, recorrencia_tipo: e.target.value }))}
                      className="bg-bg-tertiary rounded px-1.5 py-0.5 text-xs outline-none">
                      <option value="daily">Diária</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                      <option value="weekday">Dia útil</option>
                    </select>
                    <span className="text-xs text-text-muted">a cada</span>
                    <input type="number" min={1} value={editTarefa.recorrencia_intervalo ?? 1}
                      onChange={e => setEditTarefa(prev => ({ ...prev!, recorrencia_intervalo: Math.max(1, Number(e.target.value)) }))}
                      className="w-12 bg-bg-tertiary rounded px-1.5 py-0.5 text-xs outline-none text-center" />
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <span className={`text-sm flex-1 ${t.status === 'feito' ? 'line-through text-text-muted' : ''}`}>{t.titulo}</span>
              {t.recorrente && <span className="text-xs text-accent" title="Recorrente">🔁</span>}
              <span className={`text-xs px-1.5 py-0.5 rounded ${badgePrioridade(t.prioridade)}`}>
                {labelPrioridade(t.prioridade)}
              </span>
              <button onClick={() => window.location.href = `/pomodoro?contexto_tipo=tarefa&contexto_id=${t.id}&contexto_nome=${encodeURIComponent(t.titulo)}`}
                className="text-xs text-accent hover:text-accent-hover opacity-0 group-hover:opacity-100 transition-opacity" title="Focar nesta tarefa">▶️</button>
              <button onClick={() => setEditTarefa({ id: t.id, titulo: t.titulo, recorrente: t.recorrente, recorrencia_tipo: t.recorrencia_tipo, recorrencia_intervalo: t.recorrencia_intervalo ?? undefined })}
                className="text-xs text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Editar tarefa">✏️</button>
              <button onClick={() => setConfirmDelete({ type: 'tarefa', id: t.id, label: t.titulo })}
                className="text-xs text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Excluir tarefa">🗑️</button>
            </>
          )}
        </div>
        {t.descricao && !editing && (
          <div className="px-2 pb-1">
            <button onClick={() => setDescExpand(p => ({ ...p, [t.id]: !p[t.id] }))} className="text-xs text-text-muted hover:text-accent">
              {expanded ? '▲ ocultar' : '▼ descrição'}
            </button>
            {expanded && <p className="text-sm text-text-secondary mt-0.5 px-1 whitespace-pre-wrap">{t.descricao}</p>}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Rotina Diária</h1>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView('lista')}
            className={`px-3 py-1 text-sm transition-all active:scale-95 ${view === 'lista' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-muted hover:text-text-primary'}`}>
            Lista
          </button>
          <button onClick={() => setView('semana')}
            className={`px-3 py-1 text-sm transition-all active:scale-95 ${view === 'semana' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-muted hover:text-text-primary'}`}>
            Semana
          </button>
        </div>
      </div>
      {view === 'semana' ? (
        <CalendarioSemanal />
      ) : (
        <div className="flex flex-col gap-6">
          {blocosLoad || tarefasLoad || pLoad ? (
            <div className="bg-bg-secondary rounded-xl border border-border p-5 space-y-3">
              <div className="h-5 bg-bg-tertiary rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-bg-tertiary rounded w-2/3 animate-pulse" />
              <div className="h-4 bg-bg-tertiary rounded w-1/2 animate-pulse" />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-accent/[0.04] to-bg-secondary rounded-xl border border-border/80 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-lg font-semibold text-text-primary">{saudacao()}! <span className="text-text-muted font-normal">{formatarData(hoje)}</span></p>
                  {proximoBloco && (
                    <p className="text-sm text-text-muted mt-0.5">
                      ⏰ Próximo: <span className="text-text-primary font-medium">{proximoBloco.titulo}</span>
                      {proximoBloco === blocoAtual
                        ? <span className="text-success ml-1">(agora)</span>
                        : <span className="text-text-secondary ml-1">às {proximoBloco.hora_inicio}</span>
                      }
                    </p>
                  )}
                </div>
                {!proximoBloco && blocosOrdenados.length > 0 && (
                  <p className="text-sm text-text-muted">📋 Todos os blocos concluídos</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted w-14 shrink-0">Tarefas</span>
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${tarefaPct >= 100 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${tarefaPct}%` }} />
                  </div>
                  <span className="text-xs text-text-muted w-20 text-right">{tarefasFeitas}/{tarefasTotal}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted w-14 shrink-0">Foco</span>
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${focusPct >= 100 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${focusPct}%` }} />
                  </div>
                  <span className="text-xs text-text-muted w-20 text-right">{focusMin}/{config.dailyFocusMin}min</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50">
                <input value={intencao}
                  onChange={e => { const v = e.target.value; if (v.length <= 280) handleIntencaoChange(v) }}
                  onBlur={() => { if (intencao) notify('Foco salvo!', 'success') }}
                  onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur() } }}
                  placeholder="🎯 Qual seu foco hoje?"
                  className="w-full bg-bg-primary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
                {intencao && <p className="text-xs text-text-muted mt-1 flex items-center gap-1"><span className="text-success">✓</span> {intencao.length}/280</p>}
              </div>
            </div>
          )}
          {top3.length > 0 && (
            <div className="bg-accent/[0.04] border border-accent/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">🏆 Top 3 do dia</p>
              <div className="space-y-1">
                {top3.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-mono text-text-muted w-4 shrink-0">{i + 1}.</span>
                    <span className="flex-1 truncate">{t.titulo}</span>
                    <span className={`text-[10px] px-1 py-0.5 rounded ${badgePrioridade(t.prioridade)}`}>{labelPrioridade(t.prioridade)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Linha do tempo</h2>
              <div className="flex items-center gap-3">
                {(tarefas || []).some(t => t.status === 'feito') && (
                  <button onClick={() => setHideDone(p => !p)}
                    className={`text-xs transition-colors ${hideDone ? 'text-accent' : 'text-text-muted hover:text-text-primary'}`}>
                    {hideDone ? 'Mostrar concluídas' : 'Ocultar concluídas'}
                  </button>
                )}

              </div>
            </div>
            {showBlocoForm && (
              <form onSubmit={handleCreateBloco} className="flex flex-wrap gap-2 mb-4 p-3 bg-bg-tertiary rounded-lg ml-5">
                <div className="flex-1 min-w-[120px]">
                  <input value={blocoForm.titulo} onChange={e => { setBlocoForm(f => ({ ...f, titulo: e.target.value })); if (blocoErrors.titulo) setBlocoErrors(p => { const n = {...p}; delete n.titulo; return n }) }} placeholder="Título" maxLength={60}
                    className={`w-full bg-bg-primary rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ${blocoErrors.titulo ? 'ring-1 ring-danger border-danger' : 'focus:ring-accent'}`} />
                  {blocoErrors.titulo && <p className="text-xs text-danger mt-0.5">{blocoErrors.titulo}</p>}
                </div>
                <div>
                  <input type="time" value={blocoForm.hora_inicio} onChange={e => { setBlocoForm(f => ({ ...f, hora_inicio: e.target.value })); if (blocoErrors.hora_inicio) setBlocoErrors(p => { const n = {...p}; delete n.hora_inicio; return n }) }}
                    className={`bg-bg-primary rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ${blocoErrors.hora_inicio ? 'ring-1 ring-danger border-danger' : 'focus:ring-accent'}`} />
                  {blocoErrors.hora_inicio && <p className="text-xs text-danger mt-0.5">{blocoErrors.hora_inicio}</p>}
                </div>
                <div>
                  <input type="time" value={blocoForm.hora_fim} onChange={e => { setBlocoForm(f => ({ ...f, hora_fim: e.target.value })); if (blocoErrors.hora_fim) setBlocoErrors(p => { const n = {...p}; delete n.hora_fim; return n }) }}
                    className={`bg-bg-primary rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ${blocoErrors.hora_fim ? 'ring-1 ring-danger border-danger' : 'focus:ring-accent'}`} />
                  {blocoErrors.hora_fim && <p className="text-xs text-danger mt-0.5">{blocoErrors.hora_fim}</p>}
                </div>
                <button type="submit" disabled={createBlocoMut.isPending} className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg transition-all active:scale-95 disabled:opacity-50">{createBlocoMut.isPending ? '...' : 'OK'}</button>
              </form>
            )}
            {blocosLoad && (
              <div className="space-y-4 py-4 ml-5">
                {[1,2,3].map(i => <div key={i} className="flex gap-4">
                  <div className="w-12 shrink-0 flex flex-col items-center">
                    <div className="w-0.5 h-4 bg-bg-tertiary" />
                    <div className="w-3 h-3 rounded-full bg-bg-tertiary" />
                    <div className="w-0.5 flex-1 bg-bg-tertiary" />
                  </div>
                  <div className="flex-1 h-12 bg-bg-tertiary rounded-lg animate-pulse" />
                </div>)}
              </div>
            )}
            {blocosErr && <p className="text-sm text-danger py-4 text-center">Erro ao carregar blocos</p>}
            {!blocosLoad && !blocosErr && blocosOrdenados.length > 0 && (
              <div className="relative">
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-0">
                  {blocosOrdenados.map((b, bi) => {
                    const s = statusBloco(b.hora_inicio, b.hora_fim)
                    const editing = editBloco?.id === b.id
                    const bTarefas = tarefasComBloco.filter(t => t.bloco_id === b.id)
                    const isCurrent = s?.label === 'Agora'
                    const isPast = s?.label === 'Concluído'
                    return (
                      <div key={b.id} className={`relative pl-10 pb-4 ${isPast ? 'opacity-50' : ''}`}>
                        <div className="absolute left-[11px] top-[5px] flex flex-col items-center">
                          <div className={`w-4 h-4 rounded-full border-2 transition-all ${isCurrent
                            ? 'bg-success border-success shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                            : 'bg-bg-secondary border-border'}`} />
                          {bi < blocosOrdenados.length - 1 && (
                            <div className="w-0.5 h-full min-h-[24px] bg-border mt-0.5" />
                          )}
                        </div>
                        <div className={`rounded-xl border p-3 transition-all ${isCurrent
                          ? 'border-success/30 bg-success/[0.03] shadow-sm'
                          : 'border-border bg-bg-primary'}`}>
                          {editing ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <input value={editBloco.titulo} onChange={e => setEditBloco(prev => ({ ...prev!, titulo: e.target.value }))}
                                className="bg-bg-primary rounded px-2 py-1 text-sm w-28 outline-none focus:ring-1 focus:ring-accent" />
                              <input type="time" value={editBloco.hora_inicio} onChange={e => setEditBloco(prev => ({ ...prev!, hora_inicio: e.target.value }))}
                                className="bg-bg-primary rounded px-2 py-1 text-sm outline-none" />
                              <input type="time" value={editBloco.hora_fim} onChange={e => setEditBloco(prev => ({ ...prev!, hora_fim: e.target.value }))}
                                className="bg-bg-primary rounded px-2 py-1 text-sm outline-none" />
                              <button onClick={() => updateBlocoMut.mutate({ id: b.id, data: { titulo: editBloco.titulo, hora_inicio: editBloco.hora_inicio, hora_fim: editBloco.hora_fim } })}
                                disabled={updateBlocoMut.isPending} className="text-xs text-success disabled:opacity-50">{updateBlocoMut.isPending ? '...' : 'OK'}</button>
                              <button onClick={() => setEditBloco(null)} className="text-xs text-text-muted">Cancelar</button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-mono text-text-secondary shrink-0">{b.hora_inicio}→{b.hora_fim}</span>
                                  <span className="text-sm font-medium truncate" style={{ color: b.cor || undefined }}>{b.titulo}</span>
                                  {s && isCurrent && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.cor}`}>{s.label}</span>}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <button onClick={() => setEditBloco({ id: b.id, titulo: b.titulo, hora_inicio: b.hora_inicio, hora_fim: b.hora_fim })}
                                    className="text-xs text-text-muted hover:text-accent" aria-label="Editar bloco">✏️</button>
                                  <button onClick={() => setConfirmDelete({ type: 'bloco', id: b.id, label: b.titulo })}
                                    className="text-xs text-text-muted hover:text-danger" aria-label="Excluir bloco">🗑️</button>
                                </div>
                              </div>
                              {bTarefas.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/50 space-y-0.5">
                                  {bTarefas.map(renderTarefaItem)}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {!blocosLoad && !blocosErr && blocosOrdenados.length === 0 && (
              <div className="ml-5 py-8 text-center">
                <p className="text-sm text-text-muted mb-3">Nenhum bloco definido para hoje</p>
                <button onClick={() => setShowBlocoForm(true)} className="text-sm text-accent hover:underline">+ Criar primeiro bloco</button>
              </div>
            )}
          </div>
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Sem horário fixo</h2>
              <span className="text-xs text-text-muted">{tarefasSemBloco.filter(t => t.status !== 'feito').length} pendentes</span>
            </div>
            <form onSubmit={handleAddTarefa} className="mb-2">
              <input value={novaTarefa} onChange={e => { setNovaTarefa(e.target.value); if (tarefaErrors) setTarefaErrors('') }}
                placeholder="Adicionar tarefa..."
                className={`w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 ${tarefaErrors ? 'ring-1 ring-danger border-danger' : 'focus:ring-accent'}`} />
              {tarefaErrors && <p className="text-xs text-danger mt-0.5">{tarefaErrors}</p>}
            </form>
            <div className="flex items-center gap-2 mb-3 px-1">
              <label className="flex items-center gap-1 text-xs text-text-muted cursor-pointer select-none">
                <input type="checkbox" checked={novaTarefaRec}
                  onChange={e => setNovaTarefaRec(e.target.checked)} className="accent-accent" />
                Recorrente
              </label>
              {novaTarefaRec && (
                <>
                  <select value={novaTarefaRecTipo} onChange={e => setNovaTarefaRecTipo(e.target.value)}
                    className="bg-bg-tertiary rounded px-1.5 py-0.5 text-xs outline-none">
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="weekday">Dia útil</option>
                  </select>
                  <span className="text-xs text-text-muted">a cada</span>
                  <input type="number" min={1} value={novaTarefaRecIntervalo}
                    onChange={e => setNovaTarefaRecIntervalo(Math.max(1, Number(e.target.value)))}
                    className="w-12 bg-bg-tertiary rounded px-1.5 py-0.5 text-xs outline-none text-center" />
                </>
              )}
            </div>
            <div className="space-y-0.5"
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
              onDrop={e => {
                e.preventDefault()
                const fromId = Number(e.dataTransfer.getData('text/tarefa-id'))
                if (!fromId) return
                const targetEl = (e.target as HTMLElement).closest('[data-tarefa-id]')
                const toId = targetEl ? Number(targetEl.getAttribute('data-tarefa-id')) : null
                const items = tarefasSemBloco.map((t, i) => ({ id: t.id, ordem: i }))
                if (fromId !== toId && toId !== null) {
                  const from = items.find(x => x.id === fromId)
                  const to = items.find(x => x.id === toId)
                  if (from && to) {
                    const fromIdx = items.indexOf(from)
                    const toIdx = items.indexOf(to)
                    items.splice(fromIdx, 1)
                    items.splice(toIdx, 0, from)
                    items.forEach((item, i) => item.ordem = i)
                    reorderTarefasMut.mutate(items)
                  }
                }
                setDragItem(null)
              }}>
              {tarefasLoad && (
                <div className="space-y-2 py-4">
                  {[1,2,3].map(i => <div key={i} className="h-10 bg-bg-tertiary rounded-lg animate-pulse" />)}
                </div>
              )}
              {tarefasErr && <p className="text-sm text-danger py-4 text-center">Erro ao carregar tarefas</p>}
              {!tarefasLoad && !tarefasErr && tarefasSemBloco.map(t => (
                <div key={t.id} data-tarefa-id={t.id}
                  draggable
                  onDragStart={e => { setDragItem(t.id); e.dataTransfer.setData('text/tarefa-id', String(t.id)); e.dataTransfer.effectAllowed = 'move' }}
                  onDragEnd={() => setDragItem(null)}
                  className={`rounded-lg transition-opacity ${dragItem === t.id ? 'opacity-40' : ''}`}>
                  {renderTarefaItem(t)}
                </div>
              ))}
              {!tarefasLoad && !tarefasErr && tarefasSemBloco.length === 0 && (
                <p className="text-sm text-text-muted py-4 text-center">Nenhuma tarefa sem horário</p>
              )}
            </div>
          </div>
        </div>
      )}
      {view === 'lista' && (
        <button onClick={() => setShowBlocoForm(!showBlocoForm)}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-accent text-white rounded-full shadow-lg hover:bg-accent-hover transition-all active:scale-95 flex items-center justify-center text-xl"
          title="Adicionar bloco">
          +
        </button>
      )}
      {confirmDelete && (
        <ConfirmModal
          titulo={`Remover ${confirmDelete.type === 'bloco' ? 'bloco' : 'tarefa'}`}
          mensagem={`Tem certeza que deseja remover "${confirmDelete.label}"?`}
          destructive
          confirmLabel="Remover"
          disabled={deleteBlocoMut.isPending || deleteTarefaMut.isPending}
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
