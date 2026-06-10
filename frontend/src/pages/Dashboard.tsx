import { useState, useEffect } from 'react'
import { getTarefas } from '../api/rotina'
import { getHabitos } from '../api/habitos'
import { getBlocos } from '../api/rotina'
import PomodoroTimer from '../components/PomodoroTimer'
import { hojeLocal } from '../utils/date'
import type { Tarefa, Habito, BlocoRotina } from '../types'

export default function Dashboard() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [blocos, setBlocos] = useState<BlocoRotina[]>([])
  const hoje = hojeLocal()

  useEffect(() => {
    getTarefas(hoje).then(setTarefas)
    getHabitos(true).then(setHabitos)
    getBlocos(hoje).then(setBlocos)
  }, [])

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="text-sm text-text-muted mb-6">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Blocos do dia</h2>
          {blocos.length === 0 && <p className="text-sm text-text-muted">Nenhum bloco definido para hoje</p>}
          {blocos.map(b => (
            <div key={b.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <span className="text-xs font-mono text-text-secondary">{b.hora_inicio}–{b.hora_fim}</span>
              <span className="text-sm" style={{ color: b.cor || undefined }}>{b.titulo}</span>
            </div>
          ))}
        </div>

        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Tarefas de hoje</h2>
          {tarefas.filter(t => t.status !== 'feito').length === 0 && <p className="text-sm text-text-muted">Nenhuma tarefa pendente</p>}
          {tarefas.filter(t => t.status !== 'feito').map(t => (
            <div key={t.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
              <span className={`w-1.5 h-1.5 rounded-full ${t.prioridade === 'alta' ? 'bg-danger' : t.prioridade === 'baixa' ? 'bg-text-muted' : 'bg-warning'}`} />
              <span className="text-sm">{t.titulo}</span>
            </div>
          ))}
        </div>

        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Hábitos</h2>
          {habitos.filter(h => h.ativo).slice(0, 5).map(h => (
            <div key={h.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm">{h.nome}</span>
              <span className="text-xs text-accent">streak</span>
            </div>
          ))}
        </div>

        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Foco</h2>
          <PomodoroTimer />
        </div>
      </div>
    </div>
  )
}
