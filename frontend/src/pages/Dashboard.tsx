import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { updateTarefa } from '../api/rotina'
import { createRegistro } from '../api/habitos'
import { getNotas, createNota } from '../api/notas'
import { getDashboardStats } from '../api/stats'
import type { DashboardStats } from '../api/stats'
import PomodoroTimer from '../components/PomodoroTimer'
import { formatDateLocal, hojeLocal } from '../utils/date'
import type { Tarefa } from '../types'

function calcStreak(registros: { data: string }[]): number {
  const dias = new Set(registros.map(r => r.data))
  let streak = 0
  const d = new Date()
  while (true) {
    const chave = formatDateLocal(d)
    if (dias.has(chave)) { streak++; d.setDate(d.getDate() - 1) }
    else break
  }
  return streak
}

const Card = React.memo(function Card({ titulo, children, loading, erro, vazio, vazioChildren }: {
  titulo: string; children: React.ReactNode; loading?: boolean; erro?: boolean; vazio?: boolean; vazioChildren?: React.ReactNode
}) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">{titulo}</h2>
      {loading && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
      {erro && <p className="text-sm text-danger py-4">Erro ao carregar</p>}
      {vazio && (vazioChildren || <p className="text-sm text-text-muted py-4 text-center">Nenhum item</p>)}
      {!loading && !erro && !vazio && children}
    </div>
  )
})

export default function Dashboard() {
  const navigate = useNavigate()
  const hoje = hojeLocal()
  const queryClient = useQueryClient()
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const onbRef = React.useRef<HTMLDivElement>(null)
  useFocusTrap(onbRef, onboardingOpen)

  useEffect(() => {
    const done = localStorage.getItem('mindflow_onboarding_done')
    if (!done) setOnboardingOpen(true)
  }, [])

  const { data: dash, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  })

  const [diarioId, setDiarioId] = useState<number | null>(null)
  useEffect(() => {
    if (!dash || diarioId) return
    const d = dash.notas_hoje.find(n => n.titulo?.toLowerCase().startsWith('diário'))
    if (d) { setDiarioId(d.id); return }
    const dataBR = new Date().toLocaleDateString('pt-BR')
    createNota({ titulo: `Diário — ${dataBR}`, conteudo: '' }).then(n => setDiarioId(n.id)).catch(() => {})
  }, [dash, diarioId])

  const toggleTarefaMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTarefa(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['tarefas'] })
    },
  })

  const checkHabitoMut = useMutation({
    mutationFn: ({ habitoId, data }: { habitoId: number; data: string }) =>
      createRegistro(habitoId, { habito_id: habitoId, data, valor: 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habitos'] }),
  })

  function handleToggleTarefa(t: Tarefa) {
    if (toggleTarefaMut.isPending) return
    toggleTarefaMut.mutate({ id: t.id, status: t.status === 'feito' ? 'pendente' : 'feito' })
  }

  function handleCheckHabito(id: number) {
    if (checkHabitoMut.isPending) return
    checkHabitoMut.mutate({ habitoId: id, data: hoje })
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {diarioId && (
          <button onClick={() => navigate(`/ideias?nota_id=${diarioId}`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary hover:bg-bg-hover transition-colors">
            📓 Diário de hoje
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Inbox */}
        <Card titulo="📥 Inbox" loading={isLoading} erro={isError} vazio={pendentes === 0 && !isLoading && !isError}
          vazioChildren={<div className="text-center py-4"><p className="text-sm text-text-muted mb-2">Nenhum item pendente</p><button onClick={() => window.dispatchEvent(new Event('open-inbox'))} className="text-sm text-accent hover:underline">Abrir inbox →</button></div>}>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">{pendentes} {pendentes === 1 ? 'item pendente' : 'itens pendentes'}</span>
            <button onClick={() => window.dispatchEvent(new Event('open-inbox'))}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
              Abrir inbox
            </button>
          </div>
        </Card>

        {/* Blocos do dia */}
        <Card titulo="⏰ Blocos do dia" loading={isLoading} erro={isError} vazio={(!dash?.blocos || dash.blocos.length === 0) && !isLoading && !isError}
          vazioChildren={<div className="text-center py-4"><p className="text-sm text-text-muted mb-2">Nenhum bloco hoje</p><button onClick={() => navigate('/rotina')} className="text-sm text-accent hover:underline">Criar bloco →</button></div>}>
          {dash?.blocos?.map(b => (
            <div key={b.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-bg-hover transition-colors rounded-lg px-2 -mx-2">
              <span className="text-xs font-mono text-text-secondary w-20 shrink-0">{b.hora_inicio}–{b.hora_fim}</span>
              <span className="text-sm truncate" style={{ color: b.cor || undefined }}>{b.titulo}</span>
            </div>
          ))}
        </Card>

        {/* Tarefas de hoje */}
        <Card titulo="✅ Tarefas de hoje" loading={isLoading} erro={isError} vazio={pending.length === 0 && !isLoading && !isError}
          vazioChildren={<div className="text-center py-4"><p className="text-sm text-text-muted mb-2">Nenhuma tarefa hoje</p><button onClick={() => navigate('/rotina')} className="text-sm text-accent hover:underline">Criar tarefa →</button></div>}>
          {dash?.tarefas?.map(t => (
            <div key={t.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0 hover:bg-bg-hover transition-colors rounded-lg px-2 -mx-2">
              <button onClick={() => handleToggleTarefa(t)}
                className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-xs transition-colors
                  ${t.status === 'feito' ? 'bg-accent border-accent text-white' : 'border-border hover:border-accent'}`}>
                {t.status === 'feito' ? '✓' : ''}
              </button>
              <span className={`text-sm flex-1 ${t.status === 'feito' ? 'line-through text-text-muted' : ''}`}>{t.titulo}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${t.prioridade === 'alta' ? 'bg-danger/20 text-danger' : t.prioridade === 'baixa' ? 'bg-text-muted/20 text-text-muted' : 'bg-warning/20 text-warning'}`}>
                {t.prioridade}
              </span>
            </div>
          ))}
          {dash?.tarefas && dash?.tarefas.length > 0 && pending.length === 0 && (
            <p className="text-xs text-success mt-2">Todas as tarefas concluídas ✓</p>
          )}
        </Card>

        {/* Hábitos */}
        <Card titulo="🎯 Hábitos" loading={isLoading} erro={isError} vazio={(!dash?.habitos || dash?.habitos?.filter(h => h.ativo).length === 0) && !isLoading && !isError}
          vazioChildren={<div className="text-center py-4"><p className="text-sm text-text-muted mb-2">Nenhum hábito ativo</p><button onClick={() => navigate('/habitos')} className="text-sm text-accent hover:underline">Criar hábito →</button></div>}>
          {dash?.habitos?.filter(h => h.ativo).slice(0, 6).map(h => <HabitItem key={h.id} h={h} hoje={hoje} onCheck={handleCheckHabito} />)}
        </Card>

        {/* Foco */}
        <div className="bg-accent/[0.06] border-accent/20 rounded-xl border p-4 md:col-span-2">
          <h2 className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">🎯 Foco</h2>
          <PomodoroTimer />
        </div>

      </div>

      {onboardingOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={() => { setOnboardingOpen(false); localStorage.setItem('mindflow_onboarding_done', '1') }}>
          <div ref={onbRef} className="bg-bg-secondary rounded-xl border border-border shadow-2xl w-full max-w-lg mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Bem-vindo ao MindFlow</h2>
            <div className="space-y-3 mb-6">
              <div className="flex gap-3 bg-bg-tertiary rounded-lg p-3">
                <span className="text-xl shrink-0">📥</span>
                <div><p className="text-sm font-medium">Captura rápida</p><p className="text-xs text-text-muted">Use Ctrl+I ou o botão Inbox na sidebar para capturar ideias sem perder o foco.</p></div>
              </div>
              <div className="flex gap-3 bg-bg-tertiary rounded-lg p-3">
                <span className="text-xl shrink-0">📝</span>
                <div><p className="text-sm font-medium">Notas + Wikis</p><p className="text-xs text-text-muted">Crie notas com Markdown, use [[links]] para conectar ideias, e veja o grafo de conexões.</p></div>
              </div>
              <div className="flex gap-3 bg-bg-tertiary rounded-lg p-3">
                <span className="text-xl shrink-0">⏱️</span>
                <div><p className="text-sm font-medium">Pomodoro + Hábitos</p><p className="text-xs text-text-muted">Timer de foco com ciclos automáticos. Registre hábitos e associe sessões de foco a tarefas.</p></div>
              </div>
              <div className="flex gap-3 bg-bg-tertiary rounded-lg p-3">
                <span className="text-xl shrink-0">💾</span>
                <div><p className="text-sm font-medium">Tudo local</p><p className="text-xs text-text-muted">Seus dados ficam no seu computador. Exporte e importe quando quiser.</p></div>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => { setOnboardingOpen(false); localStorage.setItem('mindflow_onboarding_done', '1') }}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm">
                Começar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HabitItem({ h, hoje, onCheck }: { h: DashboardStats['habitos'][number]; hoje: string; onCheck: (id: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-bg-hover transition-colors rounded-lg px-2 -mx-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.cor || '#5B8DEF' }} />
        <span className="text-sm truncate">{h.nome}</span>
        {h.streak > 0 && <span className="text-xs text-accent font-medium shrink-0">🔥{h.streak}</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {h.feito_hoje ? (
          <span className="text-xs text-success">✓</span>
        ) : (
          <button onClick={() => onCheck(h.id)}
            className="w-6 h-6 rounded border border-border hover:bg-accent/20 hover:border-accent flex items-center justify-center text-xs transition-colors"
            title="Marcar hoje">✓</button>
        )}
      </div>
    </div>
  )
}
