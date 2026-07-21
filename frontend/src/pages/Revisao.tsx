import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWeeklyStats, getHeatmapStats } from '../api/stats'
import { createNota } from '../api/notas'
import { useNotify } from '../store/notification'
import { hojeLocal } from '../utils/date'
import RevisaoToolbar from '../components/RevisaoToolbar'

function formatRange(inicio: string, fim: string) {
  const d1 = new Date(inicio + 'T12:00:00')
  const d2 = new Date(fim + 'T12:00:00')
  const f1 = d1.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const f2 = d2.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return `${f1} a ${f2}`
}

function formatData(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function barWidth(valor: number, max: number) {
  return max > 0 ? `${Math.min(100, Math.round((valor / max) * 100))}%` : '0%'
}

function MiniBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1 flex-1" title={`${value} ${label}`}>
      <div className="flex-1 h-1.5 bg-bg-hover rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: barWidth(value, max) }} />
      </div>
      <span className="w-4 text-right tabular-nums text-text-muted">{value}</span>
    </div>
  )
}

function MetricCard({ label, value, title }: { label: string; value: string | number; title?: string }) {
  return (
    <div className="bg-bg-secondary/50 rounded-xl p-3" title={title}>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="text-xl font-bold text-text-primary tabular-nums">{value}</div>
    </div>
  )
}

export default function Revisao() {
  const [periodo, setPeriodo] = useState<'diaria' | 'semanal' | 'mensal'>('semanal')
  const notify = useNotify()
  const queryClient = useQueryClient()

  const hoje = new Date()
  const mesAtual = hoje.getMonth() + 1
  const anoAtual = hoje.getFullYear()

  const { data: weekly } = useQuery({
    queryKey: ['stats-weekly', 0],
    queryFn: () => getWeeklyStats(0),
    staleTime: 60_000,
  })

  const { data: heatmap } = useQuery({
    queryKey: ['stats-heatmap', mesAtual, anoAtual],
    queryFn: () => getHeatmapStats(mesAtual, anoAtual),
    staleTime: 60_000,
    enabled: periodo === 'mensal',
  })

  const createMut = useMutation({
    mutationFn: (data: { titulo: string; conteudo: string }) => createNota(data),
    onSuccess: () => {
      notify('Nota de revisão criada!', 'success')
      queryClient.invalidateQueries({ queryKey: ['notas'] })
    },
    onError: (e) => {
      console.error('[Revisao] create', e)
      notify('Erro ao criar nota de revisão')
    },
  })

  function buildTemplate(): string {
    const hojeStr = hojeLocal()
    let titulo: string
    let corpo: string

    if (periodo === 'diaria' && weekly) {
      const dia = weekly.semana.dias.find(d => d.data === hojeStr)
      titulo = `Revisão Diária - ${hojeStr}`
      corpo = [
        `## O que foi feito`,
        ``,
        `- **Tarefas concluídas:** ${dia?.tarefas || 0}`,
        `- **Notas criadas:** ${dia?.notas || 0}`,
        `- **Pomodoros:** ${dia?.pomodoros || 0}`,
        `- **Foco total:** ${dia?.minutos_foco || 0}min`,
        ``,
        `## O que aprendi`,
        ``,
        `-`,
        ``,
        `## Próximos passos`,
        ``,
        `-`,
      ].join('\n')
    } else if (periodo === 'semanal' && weekly) {
      titulo = `Revisão Semanal - ${formatRange(weekly.semana.inicio, weekly.semana.fim)}`
      corpo = [
        `## Métricas da semana`,
        ``,
        `- **Tarefas concluídas:** ${weekly.semana.total_tarefas}`,
        `- **Notas criadas:** ${weekly.semana.total_notas}`,
        `- **Pomodoros:** ${weekly.semana.total_pomodoros}`,
        `- **Foco total:** ${weekly.semana.total_minutos_foco}min`,
        `- **Streak atual:** ${weekly.streak_atual} dias`,
        ``,
        `## O que aprendi`,
        ``,
        `-`,
        ``,
        `## Próximos passos`,
        ``,
        `-`,
      ].join('\n')
    } else if (periodo === 'mensal' && heatmap) {
      const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long' })
      const dias = Object.values(heatmap.por_dia || {})
      const totalNotas = dias.reduce((s, d) => s + d.notas, 0)
      const totalTarefas = dias.reduce((s, d) => s + d.tarefas, 0)
      titulo = `Revisão Mensal - ${nomeMes} ${anoAtual}`
      corpo = [
        `## Métricas do mês`,
        ``,
        `- **Tarefas concluídas:** ${totalTarefas}`,
        `- **Notas criadas:** ${totalNotas}`,
        `- **Dias com atividade:** ${dias.length}`,
        ``,
        `## O que aprendi`,
        ``,
        `-`,
        ``,
        `## Próximos passos`,
        ``,
        `-`,
      ].join('\n')
    } else {
      titulo = `Revisão ${periodo === 'diaria' ? 'Diária' : periodo === 'semanal' ? 'Semanal' : 'Mensal'} - ${hojeStr}`
      corpo = [
        `## O que foi feito`,
        ``,
        `-`,
        ``,
        `## O que aprendi`,
        ``,
        `-`,
        ``,
        `## Próximos passos`,
        ``,
        `-`,
      ].join('\n')
    }

    return JSON.stringify({ titulo, conteudo: corpo })
  }

  function handleCreateNota() {
    const parsed = JSON.parse(buildTemplate())
    createMut.mutate(parsed)
  }

  const diaHoje = weekly?.semana.dias.find(d => d.data === hojeLocal())
  const maxDia = weekly ? {
    notas: Math.max(...weekly.semana.dias.map(d => d.notas), 1),
    tarefas: Math.max(...weekly.semana.dias.map(d => d.tarefas), 1),
    pomodoros: Math.max(...weekly.semana.dias.map(d => d.pomodoros), 1),
  } : { notas: 1, tarefas: 1, pomodoros: 1 }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Revisão</h1>
        <RevisaoToolbar periodo={periodo} onChangePeriodo={setPeriodo} onCreateNota={handleCreateNota} criando={createMut.isPending} />
      </div>

      {periodo === 'semanal' && weekly && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <MetricCard label="Notas" value={weekly.semana.total_notas} />
            <MetricCard label="Tarefas" value={weekly.semana.total_tarefas} />
            <MetricCard label="Pomodoros" value={weekly.semana.total_pomodoros} />
            <MetricCard label="Foco" value={`${weekly.semana.total_minutos_foco}min`} />
          </div>
          {weekly.streak_atual > 0 && (
            <p className="text-sm text-text-muted">Streak atual: {weekly.streak_atual} dias</p>
          )}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Dias</h3>
            {weekly.semana.dias.map(dia => (
              <div key={dia.data} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${dia.notas || dia.tarefas || dia.pomodoros ? 'bg-bg-secondary' : ''}`}>
                <span className="w-20 shrink-0 text-text-muted">{formatData(dia.data)}</span>
                <MiniBar value={dia.notas} max={maxDia.notas} color="bg-accent" label="notas" />
                <MiniBar value={dia.tarefas} max={maxDia.tarefas} color="bg-success" label="tarefas" />
                <MiniBar value={dia.pomodoros} max={maxDia.pomodoros} color="bg-warning" label="pomodoros" />
                <span className="w-14 text-right text-text-muted tabular-nums">{dia.minutos_foco}min</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {periodo === 'diaria' && (
        <div className="space-y-4">
          {diaHoje ? (
            <div className="grid grid-cols-4 gap-3">
              <MetricCard label="Notas hoje" value={diaHoje.notas} />
              <MetricCard label="Tarefas hoje" value={diaHoje.tarefas} />
              <MetricCard label="Pomodoros hoje" value={diaHoje.pomodoros} />
              <MetricCard label="Foco hoje" value={`${diaHoje.minutos_foco}min`} />
            </div>
          ) : (
            <p className="text-sm text-text-muted">Nenhum dado registrado hoje.</p>
          )}
          {weekly && weekly.semana.dias.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Dias da semana</h3>
              {weekly.semana.dias.map(dia => (
                <div key={dia.data} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${dia.data === hojeLocal() ? 'bg-accent/10' : dia.notas || dia.tarefas || dia.pomodoros ? 'bg-bg-secondary' : ''}`}>
                  <span className="w-20 shrink-0 text-text-muted">{formatData(dia.data)}</span>
                  <MiniBar value={dia.notas} max={maxDia.notas} color="bg-accent" label="notas" />
                  <MiniBar value={dia.tarefas} max={maxDia.tarefas} color="bg-success" label="tarefas" />
                  <MiniBar value={dia.pomodoros} max={maxDia.pomodoros} color="bg-warning" label="pomodoros" />
                  <span className="w-14 text-right text-text-muted tabular-nums">{dia.minutos_foco}min</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {periodo === 'mensal' && heatmap && (() => {
        const diasArr = Object.values(heatmap.por_dia || {})
        const totalNotas = diasArr.reduce((s, d) => s + d.notas, 0)
        const totalTarefas = diasArr.reduce((s, d) => s + d.tarefas, 0)
        return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Notas no mês" value={totalNotas} />
            <MetricCard label="Tarefas no mês" value={totalTarefas} />
            <MetricCard label="Dias com atividade" value={diasArr.length} />
          </div>
          {heatmap.por_dia && Object.keys(heatmap.por_dia).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Dias</h3>
              <div className="space-y-1">
                {Object.entries(heatmap.por_dia).map(([data, stats]) => (
                  <div key={data} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-bg-secondary">
                    <span className="w-20 shrink-0 text-text-muted">{formatData(data)}</span>
                    <span className="text-text-primary tabular-nums">{stats.notas} notas</span>
                    <span className="text-text-primary tabular-nums">{stats.tarefas} tarefas</span>
                    <span className="text-text-primary tabular-nums">{stats.pomodoros} pomodoros</span>
                    <span className="text-text-muted tabular-nums ml-auto">{stats.minutos_foco}min</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )})()}

      {(!weekly && periodo !== 'mensal') && (
        <p className="text-sm text-text-muted animate-pulse">Carregando dados...</p>
      )}
      {(periodo === 'mensal' && !heatmap) && (
        <p className="text-sm text-text-muted animate-pulse">Carregando dados do mês...</p>
      )}
    </div>
  )
}
