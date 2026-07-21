import { useState, useEffect, startTransition, memo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getSessoes, deleteSessoes } from '../api/pomodoro'
import { getPomodoroStats } from '../api/stats'
import { getHabitos } from '../api/habitos'
import { getTarefas } from '../api/rotina'
import PomodoroTimer from '../components/PomodoroTimer'
import SimpleTimer from '../components/SimpleTimer'
import Stopwatch from '../components/Stopwatch'
import ConfirmModal from '../components/ConfirmModal'
import { usePomodoroContext } from '../store/pomodoro'
import { useNotify } from '../store/notification'
import { hojeLocal } from '../utils/date'
import EmptyState from '../components/EmptyState'
const PomodoroPage = memo(function PomodoroPage() {
  const [searchParams] = useSearchParams()
  const [aba, setAba] = useState<'pomodoro' | 'timer' | 'cronometro'>('pomodoro')
  const [contexto, setContexto] = useState<{ tipo: string; id: number; nome: string } | undefined>()
  useEffect(() => {
    const tipo = searchParams.get('contexto_tipo')
    const id = searchParams.get('contexto_id')
    const nome = searchParams.get('nome')
    if (tipo && id && nome) {
      startTransition(() => setContexto({ tipo, id: Number(id), nome: decodeURIComponent(nome) }))
    }
  }, [searchParams])
  const [showCleanup, setShowCleanup] = useState(false)
  const [cleanupDate, setCleanupDate] = useState('')
  const [confirmCleanup, setConfirmCleanup] = useState(false)
  const queryClient = useQueryClient()
  const notify = useNotify()
  const hoje = hojeLocal()
  const { data: sessoes, isLoading: sLoad, isError: sErr } = useQuery({
    queryKey: ['pomodoro', 'sessoes'],
    queryFn: getSessoes,
    staleTime: 15_000,
  })
  const cleanupMut = useMutation({
    mutationFn: () => deleteSessoes(cleanupDate || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'sessoes'] })
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
      setShowCleanup(false)
      setCleanupDate('')
      setConfirmCleanup(false)
    },
    onError: (e) => { console.error('[Pomodoro] cleanup', e); notify('Erro ao limpar sessões') },
  })
  const { data: habitos, isLoading: hLoad, isError: hErr } = useQuery({
    queryKey: ['habitos'],
    queryFn: () => getHabitos(true),
    staleTime: 60_000,
  })
  const { data: tarefas, isLoading: tLoad, isError: tErr } = useQuery({
    queryKey: ['tarefas', hoje],
    queryFn: () => getTarefas(hoje),
  })

  const { data: pStats, isLoading: pLoad } = useQuery({
    queryKey: ['pomodoro', 'stats'],
    queryFn: getPomodoroStats,
    staleTime: 15_000,
  })

  const { config } = usePomodoroContext()
  const metaPct = pStats ? Math.min(100, Math.round((pStats.total_min_hoje / config.dailyFocusMin) * 100)) : 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Pomodoro + Foco</h1>
      <div className="flex gap-1 mb-4">
        {(['pomodoro', 'timer', 'cronometro'] as const).map(t => (
          <button key={t} onClick={() => setAba(t)}
            className={`px-4 py-2 text-sm rounded-lg transition-all active:scale-95 ${aba === t ? 'bg-accent text-accent-foreground' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}>
            {t === 'pomodoro' ? 'Pomodoro' : t === 'timer' ? 'Timer' : 'Cronômetro'}
          </button>
        ))}
      </div>
      <div className="bg-bg-secondary rounded-xl border border-border p-4 mb-6 text-center">
        {aba === 'pomodoro' && <PomodoroTimer contexto={contexto} onFinalizar={() => setContexto(undefined)} />}
        {aba === 'timer' && <SimpleTimer />}
        {aba === 'cronometro' && <Stopwatch />}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-bg-secondary rounded-xl border border-border px-4 py-3 text-center">
          <p className="text-xl font-bold text-text-primary">{pLoad ? '-' : pStats?.total_min_hoje ?? 0}</p>
          <p className="text-[10px] font-normal text-text-muted uppercase tracking-wide">Min hoje</p>
        </div>
        <div className="bg-bg-secondary rounded-xl border border-border px-4 py-3 text-center">
          <p className="text-xl font-bold text-text-primary">{pLoad ? '-' : pStats?.total_sessoes_hoje ?? 0}</p>
          <p className="text-[10px] font-normal text-text-muted uppercase tracking-wide">Sessões</p>
        </div>
        <div className="bg-bg-secondary rounded-xl border border-border px-4 py-3 text-center">
          <p className="text-xl font-bold text-text-primary">{pLoad ? '-' : pStats?.streak_dias ?? 0}</p>
          <p className="text-[10px] font-normal text-text-muted uppercase tracking-wide">Dias 🔥</p>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border px-4 py-3 mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-normal text-text-muted uppercase tracking-wide">Meta diária</span>
          <span className="text-xs text-text-muted">{pStats?.total_min_hoje ?? 0} / {config.dailyFocusMin} min ({metaPct}%)</span>
        </div>
        <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${metaPct >= 100 ? 'bg-success' : 'bg-accent'}`}
            style={{ width: `${metaPct}%` }} />
        </div>
      </div>

      {!contexto && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Iniciar de um hábito</h2>
            {hLoad && <p className="text-sm text-text-muted py-4 animate-pulse">Carregando...</p>}
            {hErr && <p className="text-sm text-danger py-4">Erro ao carregar hábitos</p>}
            {!hLoad && !hErr && (!habitos || habitos.filter(h => h.ativo).length === 0) && (
              <EmptyState mensagem="Nenhum hábito ativo" />
            )}
            {!hLoad && !hErr && (
              <div className="max-h-[400px] overflow-y-auto">
                {habitos?.filter(h => h.ativo).map(h => (
                  <button key={h.id} onClick={() => setContexto({ tipo: 'habito', id: h.id, nome: h.nome })}
                    className="w-full text-left py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors text-sm">
                    {h.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Iniciar de uma tarefa</h2>
            {tLoad && <p className="text-sm text-text-muted py-4 animate-pulse">Carregando...</p>}
            {tErr && <p className="text-sm text-danger py-4">Erro ao carregar tarefas</p>}
            {!tLoad && !tErr && (!tarefas || tarefas.filter(t => t.status !== 'feito').length === 0) && (
              <EmptyState mensagem="Nenhuma tarefa pendente" />
            )}
            {!tLoad && !tErr && (
              <div className="max-h-[400px] overflow-y-auto">
                {tarefas?.filter(t => t.status !== 'feito').map(t => (
                  <button key={t.id} onClick={() => setContexto({ tipo: 'tarefa', id: t.id, nome: t.titulo })}
                    className="w-full text-left py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors text-sm">
                    {t.titulo}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {contexto && (
        <button onClick={() => setContexto(undefined)} className="mt-4 text-sm text-accent hover:underline">
          Limpar contexto
        </button>
      )}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
          Sessões anteriores ({sessoes?.length || 0})
        </h2>
        {sLoad ? (
          <p className="text-sm text-text-muted text-center py-4 animate-pulse">Carregando...</p>
        ) : sErr ? (
          <p className="text-sm text-danger text-center py-4">Erro ao carregar sessões</p>
        ) : !sessoes || sessoes.length === 0 ? (
          <EmptyState mensagem="Nenhuma sessão registrada" />
        ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sessoes.slice(0, 20).map(s => (
            <div key={s.id} className="bg-bg-secondary rounded-lg border border-border px-4 py-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span>{s.contexto_tipo || 'Livre'} · {s.duracao_min}min</span>
                {s.resumo_nota_id && (
                  <span className="text-xs text-accent">✅ resumo salvo</span>
                )}
              </div>
              <span className="text-text-muted text-xs">{new Date(s.iniciado_em).toLocaleString('pt-BR')}</span>
            </div>
          ))}
        </div>
        )}
        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => setShowCleanup(p => !p)}
            className="text-sm text-danger hover:underline">
            {showCleanup ? 'Cancelar' : 'Limpar histórico'}
          </button>
        </div>
        {showCleanup && (
          <div className="mt-2 bg-bg-secondary border border-border rounded-lg p-3 animate-fade-in">
            <label className="block text-xs text-text-muted mb-1">
              Deletar sessões antes de: <span className="text-text-muted/60">(deixe em branco para TODAS)</span>
            </label>
            <input type="date" value={cleanupDate} onChange={e => setCleanupDate(e.target.value)}
              className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none mb-3" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowCleanup(false); setCleanupDate('') }}
                className="px-4 py-2 text-sm rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors">
                Cancelar
              </button>
              <button onClick={() => setConfirmCleanup(true)}
                className="px-4 py-2 text-sm rounded-lg bg-danger text-white transition-colors hover:bg-danger/80">
                {cleanupDate ? 'Limpar anteriores' : 'Limpar tudo'}
              </button>
            </div>
          </div>
        )}
      </div>
      {confirmCleanup && (
        <ConfirmModal
          titulo="Limpar histórico de sessões"
          mensagem={cleanupDate
            ? `Isso vai deletar todas as sessões iniciadas antes de ${cleanupDate}. Esta ação não pode ser desfeita.`
            : 'Isso vai deletar TODAS as sessões de pomodoro. Esta ação não pode ser desfeita.'}
          confirmLabel={cleanupDate ? 'Sim, limpar anteriores' : 'Sim, limpar tudo'}
          destructive
          disabled={cleanupMut.isPending}
          onConfirm={() => cleanupMut.mutate()}
          onCancel={() => setConfirmCleanup(false)}
        />
      )}
    </div>
  )
})

export default PomodoroPage
