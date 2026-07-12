import React, { useState, useEffect, useRef, useMemo, startTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMutateNotify } from '../hooks/useMutateNotify'
import { updateTarefa } from '../api/rotina'
import { createNota } from '../api/notas'
import { getDashboardStats, getLeituraStats } from '../api/stats'
import { getQueries } from '../api/queries'
import type { DashboardStats } from '../api/stats'
import PomodoroTimer from '../components/PomodoroTimer'
import TourModal from '../components/TourModal'
import { broadcastInvalidate } from '../hooks/useBroadcastInvalidate'
import { hojeLocal } from '../utils/date'
import { labelPrioridade, badgePrioridade } from '../utils/prioridade'

const Card = React.memo(function Card({ titulo, children, loading, erro, vazio, vazioChildren, onRetry, linkTo }: {
  titulo: string; children: React.ReactNode; loading?: boolean; erro?: boolean; vazio?: boolean; vazioChildren?: React.ReactNode; onRetry?: () => void; linkTo?: string
}) {
  const navigate = useNavigate()
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4">
      <h2 onClick={linkTo ? () => navigate(linkTo) : undefined} className={`text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 ${linkTo ? 'cursor-pointer hover:text-text-primary transition-colors' : ''}`}>{titulo}</h2>
      {loading && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
      {erro && <div className="flex flex-col items-center gap-2 py-4"><p className="text-sm text-danger">Erro ao carregar</p><button onClick={onRetry} className="text-xs text-accent hover:text-accent-hover transition-colors">Tentar novamente</button></div>}
      {vazio && (vazioChildren || <p className="text-sm text-text-muted py-4 text-center">Nenhum item</p>)}
      {!loading && !erro && !vazio && children}
    </div>
  )
})

function QueriesSection() {
  const navigate = useNavigate()
  const { data: queries } = useQuery({ queryKey: ['queries'], queryFn: getQueries, staleTime: 60_000 })
  if (!queries || queries.length === 0) return null
  const pinned = queries.slice(0, 4)
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 px-1">📌 Consultas</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {pinned.map(q => (
          <button key={q.id} onClick={() => navigate(`/consultas?id=${q.id}`)}
            className="bg-bg-secondary border border-border rounded-xl p-4 text-left hover:border-accent/30 hover:bg-bg-hover transition-all text-sm group">
            <p className="font-medium text-text-primary truncate group-hover:text-accent transition-colors">{q.nome}</p>
            <p className="text-xs text-text-muted mt-1 capitalize">{q.visualizacao}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const onErrorTarefa = useMutateNotify('alternar tarefa')

  const [onboardingOpen, setOnboardingOpen] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem('mindflow_onboarding_done')
    const show = localStorage.getItem('mindflow_show_onboarding')
    if (show === '1' || !done) startTransition(() => setOnboardingOpen(true))
  }, [])

  function closeTour() {
    setOnboardingOpen(false)
  }

  const { data: dash, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  })

  const { data: leitura } = useQuery({
    queryKey: ['stats', 'leitura'],
    queryFn: getLeituraStats,
    staleTime: 60_000,
  })

  const pending = useMemo(() => dash?.tarefas?.filter(t => t.status !== 'feito') || [], [dash?.tarefas])

  const [diarioId, setDiarioId] = useState<number | null>(null)
  const diarioCreating = useRef(false)
  useEffect(() => {
    if (!dash || diarioId || diarioCreating.current) return
    const d = dash.notas_hoje.find(n => n.titulo?.toLowerCase().startsWith('diário'))
    if (d) { startTransition(() => setDiarioId(d.id)); return }
    diarioCreating.current = true
    const dataBR = hojeLocal()
    createNota({ titulo: `Diário 📓 ${dataBR}`, conteudo: '' }).then(n => { setDiarioId(n.id); diarioCreating.current = false }).catch(e => { console.error('[Dashboard]', e); diarioCreating.current = false })
  }, [dash, diarioId])

  const toggleTarefaMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTarefa(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['tarefas'] })
      broadcastInvalidate([['rotina', 'tarefas'], ['tarefas']])
    },
    ...onErrorTarefa,
  })

  function handleToggleTarefa(t: DashboardStats['tarefas'][number]) {
    if (toggleTarefaMut.isPending) return
    toggleTarefaMut.mutate({ id: t.id, status: t.status === 'feito' ? 'pendente' : 'feito' })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {diarioId && (
            <button onClick={() => navigate(`/ideias?nota_id=${diarioId}`)}
              className="flex items-center gap-1.5 px-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary hover:bg-bg-hover transition-colors">
              📓 Diário de hoje
            </button>
          )}
          <button onClick={() => setOnboardingOpen(true)}
            className="w-8 h-8 rounded-lg bg-bg-secondary border border-border text-sm text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors flex items-center justify-center"
            title="Ajuda / Tour">?</button>
        </div>
      </div>

      <div className="flex items-center mb-6 px-4 py-3 bg-bg-secondary rounded-xl border border-border">
        <button onClick={() => navigate('/ideias')} className="flex-1 flex items-center justify-center gap-2 hover:bg-bg-hover transition-colors rounded-lg py-1">
          <span className="text-xl font-extrabold text-text-primary tabular-nums">{dash?.total_notas ?? '-'}</span>
          <span className="text-xs text-text-muted uppercase tracking-wider">Notas</span>
        </button>
        <div className="w-px h-6 bg-border shrink-0" />
        <button onClick={() => navigate('/rotina')} className="flex-1 flex items-center justify-center gap-2 hover:bg-bg-hover transition-colors rounded-lg py-1">
          <span className="text-xl font-extrabold text-text-primary tabular-nums">{dash?.total_tarefas ?? '-'}</span>
          <span className="text-xs text-text-muted uppercase tracking-wider">Tarefas</span>
        </button>
        <div className="w-px h-6 bg-border shrink-0" />
        <button onClick={() => navigate('/flashcards')} className="flex-1 flex items-center justify-center gap-2 hover:bg-bg-hover transition-colors rounded-lg py-1">
          <span className="text-xl font-extrabold text-text-primary tabular-nums">{dash?.total_flashcards ?? '-'}</span>
          <span className="text-xs text-text-muted uppercase tracking-wider">Flashcards</span>
        </button>
        <div className="w-px h-6 bg-border shrink-0" />
        <button onClick={() => navigate('/pomodoro')} className="flex-1 flex items-center justify-center gap-2 hover:bg-bg-hover transition-colors rounded-lg py-1">
          <span className="text-xl font-extrabold text-text-primary tabular-nums">{dash?.total_sessoes ?? '-'}</span>
          <span className="text-xs text-text-muted uppercase tracking-wider">Sessões</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Inbox */}
        <Card titulo="📥 Inbox" loading={isLoading} erro={isError} onRetry={refetch} vazio={(dash?.inbox_count ?? 0) === 0 && !isLoading && !isError}
          vazioChildren={<p className="text-sm text-text-muted text-center py-3">📥 Tudo em dia</p>}>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">{dash?.inbox_count ?? 0} {(dash?.inbox_count ?? 0) === 1 ? 'item pendente' : 'itens pendentes'}</span>
            <button onClick={() => window.dispatchEvent(new Event('open-inbox'))}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-all active:scale-95">
              Abrir inbox
            </button>
          </div>
        </Card>

        {/* Blocos do dia */}
        <Card titulo="📋 Blocos do dia" linkTo="/rotina" loading={isLoading} erro={isError} onRetry={refetch} vazio={(!dash?.blocos || dash.blocos.length === 0) && !isLoading && !isError}
          vazioChildren={<p className="text-sm text-text-muted text-center py-3">📋 Nenhum bloco hoje</p>}>
          {dash?.blocos?.map(b => (
            <div key={b.id} onClick={() => navigate('/rotina')} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0 cursor-pointer hover:bg-bg-hover rounded-lg px-2 -mx-2 transition-colors">
              <span className="text-xs font-mono text-text-secondary w-16 shrink-0">{b.hora_inicio}-{b.hora_fim}</span>
              <span className="text-sm truncate" style={{ color: b.cor || undefined }}>{b.titulo}</span>
            </div>
          ))}
        </Card>

        {/* Tarefas de hoje */}
        <Card titulo="✅ Tarefas de hoje" linkTo="/rotina" loading={isLoading} erro={isError} onRetry={refetch} vazio={pending.length === 0 && !isLoading && !isError}
          vazioChildren={<p className="text-sm text-text-muted text-center py-3">✅ Nenhuma tarefa hoje</p>}>
          {dash?.tarefas?.map(t => (
            <div key={t.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0 rounded-lg px-2 -mx-2">
              <button onClick={(e) => { e.stopPropagation(); handleToggleTarefa(t) }}
                className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-xs transition-colors
                  ${t.status === 'feito' ? 'bg-accent border-accent text-white' : 'border-border hover:border-accent'}`}>
                {t.status === 'feito' ? '✓' : ''}
              </button>
              <button type="button" onClick={() => navigate('/rotina')} className="text-sm flex-1 text-left hover:text-accent transition-colors cursor-pointer bg-transparent border-none p-0 ${t.status === 'feito' ? 'line-through text-text-muted' : 'text-text-primary'}">{t.titulo}</button>
              <span className={`text-xs px-1.5 py-0.5 rounded ${badgePrioridade(t.prioridade)}`}>
                {labelPrioridade(t.prioridade)}
              </span>
            </div>
          ))}
          {dash?.tarefas && dash?.tarefas.length > 0 && pending.length === 0 && (
            <p className="text-xs text-success mt-2">Todas as tarefas concluídas ✅</p>
          )}
        </Card>

        {/* Leitura */}
        <Card titulo="📖 Leitura" loading={isLoading} erro={isError} onRetry={refetch}
          vazio={!leitura?.top_notas?.length && !isLoading && !isError}
          vazioChildren={<p className="text-sm text-text-muted text-center py-3">📖 Abra uma nota para começar</p>}>
          <div className="flex gap-3 mb-3">
            <div className="flex-1 text-center">
              <p className="text-lg font-bold">{leitura?.total_acessos ?? '-'}</p>
              <p className="text-xs text-text-muted">Total acessos</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-lg font-bold">{leitura?.notas_lidas ?? '-'}</p>
              <p className="text-xs text-text-muted">Notas lidas</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-lg font-bold">🔥{leitura?.streak_leitura ?? 0}</p>
              <p className="text-xs text-text-muted">Dias lendo</p>
            </div>
          </div>
          {leitura?.top_notas?.slice(0, 3)?.map(n => (
            <button key={n.id} onClick={() => navigate(`/ideias?nota_id=${n.id}`)}
              className="w-full flex items-center justify-between py-1.5 border-b border-border last:border-0 hover:bg-bg-hover transition-colors rounded px-1">
              <span className="text-sm truncate flex-1 text-left">{n.titulo}</span>
              <span className="text-xs text-text-muted ml-2 shrink-0">{n.acessos}×</span>
            </button>
          ))}
        </Card>

        {/* Foco */}
        <div className="bg-accent/[0.06] border-accent/20 rounded-xl border p-4 md:col-span-2">
          <h2 className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">🎯 Foco</h2>
          <PomodoroTimer />
        </div>

      </div>

      <QueriesSection />
      <TourModal open={onboardingOpen} onClose={closeTour} />
    </div>
  )
}


