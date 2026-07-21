import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBlocos, createBloco, updateBloco, deleteBloco, getTarefas, createTarefa, updateTarefa, deleteTarefa, reorderTarefas, gerarRecorrentes } from '../api/rotina'
import { getPomodoroStats } from '../api/stats'
import { usePomodoroContext } from '../store/pomodoro'
import { broadcastInvalidate } from '../hooks/useBroadcastInvalidate'
import CalendarioSemanal from '../components/CalendarioSemanal'
import ConfirmModal from '../components/ConfirmModal'
import { BannerResumo } from '../components/rotina/BannerResumo'
import { TarefaItem } from '../components/rotina/TarefaItem'
import { BlocoCard } from '../components/rotina/BlocoCard'
import { KanbanView } from '../components/rotina/KanbanView'
import { TarefaForm } from '../components/rotina/TarefaForm'
import { BlocoForm as BlocoFormComponent } from '../components/rotina/BlocoForm'
import { hojeLocal, agoraLocal } from '../utils/date'
import { labelPrioridade, badgePrioridade } from '../utils/prioridade'
import { useNotify } from '../store/notification'
import type { BlocoRotina, Tarefa } from '../types'
import EmptyState from '../components/EmptyState'

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

const prioridadePeso: Record<string, number> = { urgente: 0, alta: 1, normal: 2, baixa: 3 }

function lerIntencao(hoje: string): string {
  try {
    const stored = localStorage.getItem(INTENCAO_KEY)
    if (stored) { const parsed = JSON.parse(stored); return parsed[hoje] || '' }
  } catch (e) { console.error('[Rotina.intencao]', e) }
  return ''
}

export default function Rotina() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const { config } = usePomodoroContext()
  const optCounterRef = useRef(0)

  const [view, setView] = useState<'lista' | 'semana' | 'kanban'>('lista')
  const [novaTarefa, setNovaTarefa] = useState('')
  const [tarefaErrors, setTarefaErrors] = useState('')
  const [novaTarefaRec, setNovaTarefaRec] = useState(false)
  const [novaTarefaRecTipo, setNovaTarefaRecTipo] = useState('daily')
  const [novaTarefaRecIntervalo, setNovaTarefaRecIntervalo] = useState(1)
  const [novaTarefaPrioridade, setNovaTarefaPrioridade] = useState('normal')
  const [showBlocoForm, setShowBlocoForm] = useState(false)
  const [blocoForm, setBlocoForm] = useState({ titulo: '', hora_inicio: '', hora_fim: '' })
  const [editBloco, setEditBloco] = useState<{ id: number; titulo: string; hora_inicio: string; hora_fim: string } | null>(null)
  const [blocoErrors, setBlocoErrors] = useState<Record<string, string>>({})
  const [editTarefa, setEditTarefa] = useState<{ id: number; titulo: string; prioridade?: string; recorrente?: boolean; recorrencia_tipo?: string | null; recorrencia_intervalo?: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'bloco' | 'tarefa'; id: number; label: string } | null>(null)
  const [descExpand, setDescExpand] = useState<Record<number, boolean>>({})
  const [hideDone, setHideDone] = useState(false)

  const hoje = hojeLocal()
  const [intencao, setIntencao] = useState(() => lerIntencao(hoje))

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

  const gerarRecMut = useMutation({
    mutationFn: gerarRecorrentes,
    onSuccess: (data) => {
      if (data.geradas > 0) {
        queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] })
      }
    },
    onError: (e) => console.error('[Rotina] gerarRecorrentes', e),
  })
  useEffect(() => { gerarRecMut.mutate() }, [])

  const [searchParams] = useSearchParams()
  useEffect(() => {
    if (blocosLoad) return
    const blocoId = searchParams.get('bloco')
    if (!blocoId) return
    const el = document.getElementById(`bloco-${blocoId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-accent', 'ring-offset-2', 'rounded-xl')
      setTimeout(() => el.classList.remove('ring-2', 'ring-accent', 'ring-offset-2', 'rounded-xl'), 3000)
    }
  }, [blocos, blocosLoad, searchParams])

  function invalidateTarefas() {
    queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] })
    queryClient.invalidateQueries({ queryKey: ['tarefas'] })
    queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
    queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
  }

  function invalidateBlocos() {
    queryClient.invalidateQueries({ queryKey: ['rotina', 'blocos'] })
    queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
    queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
  }

  const createTarefaMut = useMutation({
    mutationFn: (payload: { titulo: string; prioridade: string; recorrente: boolean; recorrencia_tipo: string | null; recorrencia_intervalo: number }) =>
      createTarefa({ titulo: payload.titulo, prioridade: payload.prioridade, data: hoje, recorrente: payload.recorrente, recorrencia_tipo: payload.recorrencia_tipo, recorrencia_intervalo: payload.recorrencia_intervalo }),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Tarefa[]>(queryKey)
      const optimistic: Tarefa = {
        id: --optCounterRef.current, titulo: payload.titulo, data: hoje, prioridade: payload.prioridade,
        quadrante: 'agendar', status: 'pendente', tempo_estimado: null, bloco_id: null, tipo_id: null,
        criado_em: agoraLocal(), descricao: '', recorrente: payload.recorrente,
        recorrencia_tipo: payload.recorrencia_tipo, recorrencia_intervalo: payload.recorrencia_intervalo,
        total_foco_min: 0, ordem: 0,
      }
      queryClient.setQueryData<Tarefa[]>(queryKey, old => [...(old || []), optimistic])
      setNovaTarefa(''); setNovaTarefaRec(false); setNovaTarefaRecTipo('daily'); setNovaTarefaRecIntervalo(1); setNovaTarefaPrioridade('normal')
      return { previous }
    },
    onError: (err, _payload, context) => {
      console.error('[Rotina]', err); notify('Erro ao criar tarefa')
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => { invalidateTarefas(); broadcastInvalidate([[...queryKey]]) },
  })

  const toggleTarefaMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTarefa(id, { status }),
    onSuccess: () => invalidateTarefas(),
    onError: (e) => { console.error('[Rotina] toggleTarefa', e); notify('Erro ao alternar tarefa') },
  })

  const createBlocoMut = useMutation({
    mutationFn: (data: Partial<BlocoRotina>) => createBloco({ ...data, data_especifica: hoje }),
    onSuccess: () => {
      invalidateBlocos(); setShowBlocoForm(false)
      setBlocoForm({ titulo: '', hora_inicio: '', hora_fim: '' })
    },
  })

  const deleteBlocoMut = useMutation({
    mutationFn: (id: number) => deleteBloco(id),
    onSuccess: () => invalidateBlocos(),
    onError: (e) => { console.error('[Rotina] deleteBloco', e); notify('Erro ao excluir bloco') },
  })

  const updateBlocoMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BlocoRotina> }) => updateBloco(id, data),
    onSuccess: () => { invalidateBlocos(); setEditBloco(null) },
    onError: (e) => { console.error('[Rotina] updateBloco', e); notify('Erro ao salvar bloco') },
  })

  const updateTarefaMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Tarefa> }) => updateTarefa(id, data),
    onSuccess: () => { invalidateTarefas(); setEditTarefa(null) },
    onError: (e) => { console.error('[Rotina] updateTarefa', e); notify('Erro ao salvar tarefa') },
  })

  const deleteTarefaMut = useMutation({
    mutationFn: (id: number) => deleteTarefa(id),
    onSuccess: () => invalidateTarefas(),
    onError: (e) => { console.error('[Rotina] deleteTarefa', e); notify('Erro ao excluir tarefa') },
  })

  const [dragItem, setDragItem] = useState<number | null>(null)
  const reorderTarefasMut = useMutation({
    mutationFn: (items: { id: number; ordem: number }[]) => reorderTarefas(items),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] }); queryClient.invalidateQueries({ queryKey: ['tarefas'] }) },
    onError: (e) => { console.error('[Rotina] reorderTarefas', e); notify('Erro ao reordenar tarefas') },
  })

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTarefa(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Tarefa[]>(queryKey)
      queryClient.setQueryData<Tarefa[]>(queryKey, old => old?.map(t => t.id === id ? { ...t, status } : t))
      return { previous }
    },
    onError: (err, _payload, context) => {
      console.error('[Rotina] updateStatus', err); notify('Erro ao mover tarefa')
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => invalidateTarefas(),
  })

  function handleAddTarefa(e: React.FormEvent) {
    e.preventDefault()
    if (!novaTarefa.trim()) { setTarefaErrors('Digite o nome da tarefa'); return }
    setTarefaErrors('')
    createTarefaMut.mutate({
      titulo: novaTarefa.trim(), prioridade: novaTarefaPrioridade, recorrente: novaTarefaRec,
      recorrencia_tipo: novaTarefaRec ? novaTarefaRecTipo : null, recorrencia_intervalo: novaTarefaRecIntervalo,
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

  function handleBlocoFormChange(field: keyof typeof blocoForm, value: string) {
    setBlocoForm(f => ({ ...f, [field]: value }))
    setBlocoErrors(p => { if (p[field]) { const n = { ...p }; delete n[field]; return n }; return p })
  }

  function handleNovaTarefaChange(value: string) {
    setNovaTarefa(value)
    if (tarefaErrors) setTarefaErrors('')
  }

  const blocosOrdenados = [...(blocos || [])].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  const tarefasFiltradas = (tarefas || []).filter(t => !hideDone || t.status !== 'feito')
  const tarefasComBloco = tarefasFiltradas.filter(t => t.bloco_id).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  const tarefasSemBloco = tarefasFiltradas
    .filter(t => !t.bloco_id)
    .sort((a, b) => {
      const oa = a.ordem ?? 0; const ob = b.ordem ?? 0
      if (oa !== ob) return oa - ob
      return (prioridadePeso[a.prioridade] ?? 2) - (prioridadePeso[b.prioridade] ?? 2)
    })
  const agoraStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
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
    return (
      <TarefaItem
        key={t.id}
        tarefa={t}
        isEditing={editing}
        editingTitle={editing ? editTarefa.titulo : ''}
        editingPrioridade={editing ? (editTarefa.prioridade ?? t.prioridade) : 'normal'}
        editingRecorrente={editing ? (editTarefa.recorrente ?? false) : false}
        editingRecTipo={editing ? (editTarefa.recorrencia_tipo ?? null) : null}
        editingRecIntervalo={editing ? (editTarefa.recorrencia_intervalo ?? 1) : 1}
        expanded={descExpand[t.id] || false}
        isPendingToggle={toggleTarefaMut.isPending}
        isPendingUpdate={updateTarefaMut.isPending}
        onToggle={() => handleToggleTarefa(t)}
        onStartEdit={() => setEditTarefa({ id: t.id, titulo: t.titulo, prioridade: t.prioridade, recorrente: t.recorrente, recorrencia_tipo: t.recorrencia_tipo, recorrencia_intervalo: t.recorrencia_intervalo ?? undefined })}
        onEditTitleChange={v => setEditTarefa(prev => ({ ...prev!, titulo: v }))}
        onEditPrioridadeChange={v => setEditTarefa(prev => ({ ...prev!, prioridade: v }))}
        onEditRecorrenteChange={v => setEditTarefa(prev => ({ ...prev!, recorrente: v }))}
        onEditRecTipoChange={v => setEditTarefa(prev => ({ ...prev!, recorrencia_tipo: v }))}
        onEditRecIntervaloChange={v => setEditTarefa(prev => ({ ...prev!, recorrencia_intervalo: v }))}
        onSaveEdit={() => {
          const et = editTarefa!
          const data: Partial<Tarefa> = { titulo: et.titulo }
          if (et.prioridade !== undefined) data.prioridade = et.prioridade
          if (et.recorrente !== undefined) data.recorrente = et.recorrente
          if (et.recorrencia_tipo !== undefined) data.recorrencia_tipo = et.recorrencia_tipo
          if (et.recorrencia_intervalo !== undefined) data.recorrencia_intervalo = et.recorrencia_intervalo
          updateTarefaMut.mutate({ id: t.id, data })
        }}
        onCancelEdit={() => setEditTarefa(null)}
        onDelete={() => setConfirmDelete({ type: 'tarefa', id: t.id, label: t.titulo })}
        onFocusPomodoro={() => navigate(`/pomodoro?contexto_tipo=tarefa&contexto_id=${t.id}&nome=${encodeURIComponent(t.titulo)}`)}
        onToggleDesc={() => setDescExpand(p => ({ ...p, [t.id]: !p[t.id] }))}
      />
    )
  }

  const bannerLoading = blocosLoad || tarefasLoad || pLoad

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Rotina Diária</h1>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView('lista')}
            className={`px-3 py-1 text-[10px] transition-all active:scale-95 ${view === 'lista' ? 'bg-accent text-accent-foreground' : 'bg-bg-secondary text-text-muted hover:text-text-primary'}`}>
            Lista
          </button>
          <button onClick={() => setView('semana')}
            className={`px-3 py-1 text-[10px] transition-all active:scale-95 ${view === 'semana' ? 'bg-accent text-accent-foreground' : 'bg-bg-secondary text-text-muted hover:text-text-primary'}`}>
            Semana
          </button>
          <button onClick={() => setView('kanban')}
            className={`px-3 py-1 text-[10px] transition-all active:scale-95 ${view === 'kanban' ? 'bg-accent text-accent-foreground' : 'bg-bg-secondary text-text-muted hover:text-text-primary'}`}>
            Kanban
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanView
          tarefas={tarefas || []}
          isLoading={tarefasLoad}
          isError={tarefasErr}
          onDropTarefa={(tarefaId, novoStatus) => updateStatusMut.mutate({ id: tarefaId, status: novoStatus })}
        />
      ) : view === 'semana' ? (
        <CalendarioSemanal />
      ) : (
        <div className="flex flex-col gap-6">
          {bannerLoading ? (
            <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3">
              <div className="h-5 bg-bg-tertiary rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-bg-tertiary rounded w-2/3 animate-pulse" />
              <div className="h-4 bg-bg-tertiary rounded w-1/2 animate-pulse" />
            </div>
          ) : (
            <BannerResumo
              saudacao={saudacao()}
              dataFormatada={formatarData(hoje)}
              proximoBlocoTitulo={proximoBloco?.titulo ?? null}
              proximoBlocoEhAtual={proximoBloco === blocoAtual}
              proximoBlocoHorario={proximoBloco?.hora_inicio ?? null}
              todosConcluidos={!proximoBloco && blocosOrdenados.length > 0}
              tarefaPct={tarefaPct}
              tarefasFeitas={tarefasFeitas}
              tarefasTotal={tarefasTotal}
              focusPct={focusPct}
              focusMin={focusMin}
              dailyFocusMin={config.dailyFocusMin}
              intencao={intencao}
              onIntencaoChange={handleIntencaoChange}
              onIntencaoBlur={() => { if (intencao) notify('Foco salvo!', 'success') }}
              onIntencaoKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur() } }}
            />
          )}

          {top3.length > 0 && (
            <div className="bg-accent/[0.04] border border-accent/20 rounded-xl p-3">
              <p className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">🏆 Top 3 do dia</p>
              <div className="space-y-1">
                {top3.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-mono text-text-muted w-4 shrink-0">{i + 1}.</span>
                    <span className="flex-1 truncate">{t.titulo}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgePrioridade(t.prioridade)}`}>{labelPrioridade(t.prioridade)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Linha do tempo</h2>
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
              <BlocoFormComponent
                titulo={blocoForm.titulo}
                horaInicio={blocoForm.hora_inicio}
                horaFim={blocoForm.hora_fim}
                errors={blocoErrors}
                isPending={createBlocoMut.isPending}
                onTituloChange={v => handleBlocoFormChange('titulo', v)}
                onHoraInicioChange={v => handleBlocoFormChange('hora_inicio', v)}
                onHoraFimChange={v => handleBlocoFormChange('hora_fim', v)}
                onSubmit={handleCreateBloco}
              />
            )}

            {blocosLoad && (
              <div className="space-y-4 py-4 ml-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4">
                    <div className="w-12 shrink-0 flex flex-col items-center">
                      <div className="w-0.5 h-4 bg-bg-tertiary" />
                      <div className="w-3 h-3 rounded-full bg-bg-tertiary" />
                      <div className="w-0.5 flex-1 bg-bg-tertiary" />
                    </div>
                    <div className="flex-1 h-12 bg-bg-tertiary rounded-lg animate-pulse" />
                  </div>
                ))}
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
                    return (
                      <BlocoCard
                        key={b.id}
                        id={b.id}
                        horaInicio={b.hora_inicio}
                        horaFim={b.hora_fim}
                        titulo={b.titulo}
                        cor={b.cor}
                        isCurrent={s?.label === 'Agora'}
                        isPast={s?.label === 'Concluído'}
                        statusLabel={s?.label ?? null}
                        statusColor={s?.cor ?? null}
                        isEditing={editing}
                        editTitulo={editing ? editBloco.titulo : ''}
                        editHoraInicio={editing ? editBloco.hora_inicio : ''}
                        editHoraFim={editing ? editBloco.hora_fim : ''}
                        isPendingUpdate={updateBlocoMut.isPending}
                        isLast={bi === blocosOrdenados.length - 1}
                        onEditTitleChange={v => setEditBloco(prev => ({ ...prev!, titulo: v }))}
                        onEditHoraInicioChange={v => setEditBloco(prev => ({ ...prev!, hora_inicio: v }))}
                        onEditHoraFimChange={v => setEditBloco(prev => ({ ...prev!, hora_fim: v }))}
                        onSaveEdit={() => { const eb = editBloco!; updateBlocoMut.mutate({ id: b.id, data: { titulo: eb.titulo, hora_inicio: eb.hora_inicio, hora_fim: eb.hora_fim } }) }}
                        onCancelEdit={() => setEditBloco(null)}
                        onStartEdit={() => setEditBloco({ id: b.id, titulo: b.titulo, hora_inicio: b.hora_inicio, hora_fim: b.hora_fim })}
                        onDelete={() => setConfirmDelete({ type: 'bloco', id: b.id, label: b.titulo })}>
                        {bTarefas.map(renderTarefaItem)}
                      </BlocoCard>
                    )
                  })}
                </div>
              </div>
            )}

            {!blocosLoad && !blocosErr && blocosOrdenados.length === 0 && (
              <div className="ml-6 py-8 text-center">
                <EmptyState icon="📋" mensagem="Nenhum bloco definido para hoje" />
                <button onClick={() => setShowBlocoForm(true)} className="text-sm text-accent hover:underline">+ Criar primeiro bloco</button>
              </div>
            )}
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Sem horário fixo</h2>
              <span className="text-xs text-text-muted">{tarefasSemBloco.filter(t => t.status !== 'feito').length} pendentes</span>
            </div>

            <TarefaForm
              value={novaTarefa}
              error={tarefaErrors}
              recorrente={novaTarefaRec}
              recTipo={novaTarefaRecTipo}
              recIntervalo={novaTarefaRecIntervalo}
              prioridade={novaTarefaPrioridade}
              onValueChange={handleNovaTarefaChange}
              onRecorrenteChange={setNovaTarefaRec}
              onRecTipoChange={setNovaTarefaRecTipo}
              onRecIntervaloChange={setNovaTarefaRecIntervalo}
              onPrioridadeChange={setNovaTarefaPrioridade}
              onSubmit={handleAddTarefa}
            />

            <div className="space-y-0.5 max-h-72 overflow-y-auto"
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
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-bg-tertiary rounded-lg animate-pulse" />)}
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
                <EmptyState mensagem="Nenhuma tarefa sem horário" />
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'lista' && (
        <button onClick={() => setShowBlocoForm(!showBlocoForm)}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-accent text-accent-foreground rounded-full shadow-elevation-4 hover:bg-accent-hover transition-all active:scale-95 flex items-center justify-center text-xl"
          title="Adicionar bloco">+</button>
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
