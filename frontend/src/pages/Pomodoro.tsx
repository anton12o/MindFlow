import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getSessoes, deleteSessoes } from '../api/pomodoro'
import { getHabitos } from '../api/habitos'
import { getTarefas } from '../api/rotina'
import PomodoroTimer from '../components/PomodoroTimer'
import ConfirmModal from '../components/ConfirmModal'
import { hojeLocal } from '../utils/date'

export default function PomodoroPage() {
  const [searchParams] = useSearchParams()
  const [contexto, setContexto] = useState<{ tipo: string; id: number; nome: string } | undefined>()

  useEffect(() => {
    const tipo = searchParams.get('contexto_tipo')
    const id = searchParams.get('contexto_id')
    const nome = searchParams.get('nome')
    if (tipo && id && nome) {
      setContexto({ tipo, id: Number(id), nome: decodeURIComponent(nome) })
    }
  }, [searchParams])

  const [showCleanup, setShowCleanup] = useState(false)
  const [cleanupDate, setCleanupDate] = useState('')
  const [confirmCleanup, setConfirmCleanup] = useState(false)

  const queryClient = useQueryClient()

  const hoje = hojeLocal()

  const { data: sessoes, isLoading: sLoad, isError: sErr } = useQuery({
    queryKey: ['pomodoro', 'sessoes'],
    queryFn: getSessoes,
  })

  const cleanupMut = useMutation({
    mutationFn: () => deleteSessoes(cleanupDate || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'sessoes'] })
      setShowCleanup(false)
      setCleanupDate('')
      setConfirmCleanup(false)
    },
  })

  const { data: habitos, isLoading: hLoad, isError: hErr } = useQuery({
    queryKey: ['habitos'],
    queryFn: () => getHabitos(true),
  })

  const { data: tarefas, isLoading: tLoad, isError: tErr } = useQuery({
    queryKey: ['tarefas', hoje],
    queryFn: () => getTarefas(hoje),
  })

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Pomodoro + Foco</h1>

      <div className="bg-bg-secondary rounded-xl border border-border p-4 mb-6 text-center">
        <PomodoroTimer contexto={contexto} onFinalizar={() => setContexto(undefined)} />
      </div>

      {!contexto && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Iniciar de um hábito</h2>
            {hLoad && <p className="text-sm text-text-muted py-2 animate-pulse">Carregando...</p>}
            {hErr && <p className="text-sm text-danger py-2">Erro ao carregar hábitos</p>}
            {!hLoad && !hErr && (!habitos || habitos.filter(h => h.ativo).length === 0) && (
              <p className="text-sm text-text-muted py-2">Nenhum hábito ativo</p>
            )}
            {!hLoad && !hErr && habitos?.filter(h => h.ativo).map(h => (
              <button key={h.id} onClick={() => setContexto({ tipo: 'habito', id: h.id, nome: h.nome })}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors text-sm">
                {h.nome}
              </button>
            ))}
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Iniciar de uma tarefa</h2>
            {tLoad && <p className="text-sm text-text-muted py-2 animate-pulse">Carregando...</p>}
            {tErr && <p className="text-sm text-danger py-2">Erro ao carregar tarefas</p>}
            {!tLoad && !tErr && (!tarefas || tarefas.filter(t => t.status !== 'feito').length === 0) && (
              <p className="text-sm text-text-muted py-2">Nenhuma tarefa pendente</p>
            )}
            {!tLoad && !tErr && tarefas?.filter(t => t.status !== 'feito').map(t => (
              <button key={t.id} onClick={() => setContexto({ tipo: 'tarefa', id: t.id, nome: t.titulo })}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors text-sm">
                {t.titulo}
              </button>
            ))}
          </div>
        </div>
      )}

      {contexto && (
        <button onClick={() => setContexto(undefined)} className="mt-4 text-sm text-accent hover:underline">
          Limpar contexto
        </button>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
          Sessões anteriores ({sessoes?.length || 0})
        </h2>
        {sLoad ? (
          <p className="text-sm text-text-muted text-center py-4 animate-pulse">Carregando...</p>
        ) : sErr ? (
          <p className="text-sm text-danger text-center py-4">Erro ao carregar sessões</p>
        ) : !sessoes || sessoes.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">Nenhuma sessão registrada</p>
        ) : (
        <div className="space-y-2">
          {sessoes.slice(0, 20).map(s => (
            <div key={s.id} className="bg-bg-secondary rounded-lg border border-border px-4 py-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span>{s.contexto_tipo || 'Livre'} · {s.duracao_min}min</span>
                {s.resumo_nota_id && (
                  <span className="text-xs text-accent">📝 resumo salvo</span>
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
              className="w-full bg-bg-primary rounded px-3 py-1.5 text-sm outline-none mb-3" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowCleanup(false); setCleanupDate('') }}
                className="px-4 py-1.5 text-sm rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors">
                Cancelar
              </button>
              <button onClick={() => setConfirmCleanup(true)}
                className="px-4 py-1.5 text-sm rounded-lg bg-danger text-white transition-colors hover:bg-danger/80">
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
          onConfirm={() => cleanupMut.mutate()}
          onCancel={() => setConfirmCleanup(false)}
        />
      )}
    </div>
  )
}
