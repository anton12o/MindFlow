import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSessoes } from '../api/pomodoro'
import { getHabitos } from '../api/habitos'
import { getTarefas } from '../api/rotina'
import PomodoroTimer from '../components/PomodoroTimer'

export default function PomodoroPage() {
  const [contexto, setContexto] = useState<{ tipo: string; id: number; nome: string } | undefined>()

  const hoje = new Date().toISOString().split('T')[0]

  const { data: sessoes } = useQuery({
    queryKey: ['pomodoro', 'sessoes'],
    queryFn: getSessoes,
  })

  const { data: habitos } = useQuery({
    queryKey: ['habitos'],
    queryFn: () => getHabitos(true),
  })

  const { data: tarefas } = useQuery({
    queryKey: ['tarefas', hoje],
    queryFn: () => getTarefas(hoje),
  })

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Pomodoro + Foco</h1>

      <div className="bg-bg-secondary rounded-xl border border-border p-6 mb-6 text-center">
        <PomodoroTimer contexto={contexto} onFinalizar={() => setContexto(undefined)} />
      </div>

      {!contexto && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Iniciar de um hábito</h2>
            {habitos?.filter(h => h.ativo).map(h => (
              <button key={h.id} onClick={() => setContexto({ tipo: 'habito', id: h.id, nome: h.nome })}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors text-sm">
                {h.nome}
              </button>
            ))}
            {(!habitos || habitos.filter(h => h.ativo).length === 0) && (
              <p className="text-sm text-text-muted py-2">Nenhum hábito ativo</p>
            )}
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Iniciar de uma tarefa</h2>
            {tarefas?.filter(t => t.status !== 'feito').map(t => (
              <button key={t.id} onClick={() => setContexto({ tipo: 'tarefa', id: t.id, nome: t.titulo })}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors text-sm">
                {t.titulo}
              </button>
            ))}
            {(!tarefas || tarefas.filter(t => t.status !== 'feito').length === 0) && (
              <p className="text-sm text-text-muted py-2">Nenhuma tarefa pendente</p>
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
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
          Sessões anteriores ({sessoes?.length || 0})
        </h2>
        <div className="space-y-2">
          {sessoes?.slice(0, 20).map(s => (
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
      </div>
    </div>
  )
}
