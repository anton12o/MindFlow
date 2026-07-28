import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWeeklyStats, getHeatmapStats, type WeeklyStats, type HeatmapStats, type ScoreConfig } from '../api/stats'
import { createNota } from '../api/notas'
import { useNotify } from '../store/notification'
import { hojeLocal } from '../utils/date'
import RevisaoToolbar from '../components/RevisaoToolbar'
import { useNotaTemplates } from '../hooks/useNotaTemplates'
import { useConfig } from '../hooks/useConfig'

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

function getVars(periodo: string, weekly: WeeklyStats | undefined, heatmap: HeatmapStats | undefined): Record<string, string> {
  const hojeStr = hojeLocal()
  const hoje = new Date()
  const vars: Record<string, string> = {
    data: hojeStr,
    notas: '0',
    tarefas: '0',
    pomodoros: '0',
    foco_min: '0',
    streak: '0',
    periodo_inicio: '',
    periodo_fim: '',
  }
  if (periodo === 'diaria' && weekly) {
    const dia = weekly.semana.dias.find((d: any) => d.data === hojeStr)
    vars.notas = String(dia?.notas || 0)
    vars.tarefas = String(dia?.tarefas || 0)
    vars.pomodoros = String(dia?.pomodoros || 0)
    vars.foco_min = String(dia?.minutos_foco || 0)
    vars.streak = String(weekly.streak_atual || 0)
    vars.periodo_inicio = hojeStr
    vars.periodo_fim = hojeStr
  } else if (periodo === 'semanal' && weekly) {
    vars.notas = String(weekly.semana.total_notas)
    vars.tarefas = String(weekly.semana.total_tarefas)
    vars.pomodoros = String(weekly.semana.total_pomodoros)
    vars.foco_min = String(weekly.semana.total_minutos_foco)
    vars.streak = String(weekly.streak_atual || 0)
    vars.periodo_inicio = weekly.semana.inicio
    vars.periodo_fim = weekly.semana.fim
  } else if (periodo === 'mensal' && heatmap) {
    const dias = Object.values(heatmap.por_dia || {}) as any[]
    const totalNotas = dias.reduce((s: number, d) => s + d.notas, 0)
    const totalTarefas = dias.reduce((s: number, d) => s + d.tarefas, 0)
    const totalPomodoros = dias.reduce((s: number, d) => s + d.pomodoros, 0)
    const totalFoco = dias.reduce((s: number, d) => s + d.minutos_foco, 0)
    vars.notas = String(totalNotas)
    vars.tarefas = String(totalTarefas)
    vars.pomodoros = String(totalPomodoros)
    vars.foco_min = String(totalFoco)
    vars.periodo_inicio = `${hoje.getMonth() + 1}/${hoje.getFullYear()}`
    vars.periodo_fim = vars.periodo_inicio
  }
  return vars
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

export default function Revisao() {
  const [periodo, setPeriodo] = useState<'diaria' | 'semanal' | 'mensal'>('semanal')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const notify = useNotify()
  const queryClient = useQueryClient()
  const { templates, addTemplate } = useNotaTemplates()
  const { config } = useConfig()

  const hoje = new Date()
  const mesAtual = hoje.getMonth() + 1
  const anoAtual = hoje.getFullYear()

  const sc: ScoreConfig = {
    primeiroDia: config.primeiroDiaSemana === 'domingo' ? 6 : 0,
    pesoFoco: config.pesosScore.foco,
    pesoTarefas: config.pesosScore.tarefas,
    pesoHabitos: config.pesosScore.habitos,
    pesoNotas: config.pesosScore.notas,
    metaFocoMin: config.metasScore.focoMin,
    metaTarefas: config.metasScore.tarefas,
    metaNotas: config.metasScore.notas,
    streakGrace: config.toleranciaStreak,
  }

  const { data: weekly } = useQuery({
    queryKey: ['stats-weekly', 0],
    queryFn: () => getWeeklyStats(0, sc),
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

  function buildDefaultTemplate(): string {
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
    const vars = getVars(periodo, weekly, heatmap)
    const sel = templates.find(t => t.id === templateId)
    if (sel) {
      const titulo = applyTemplate(sel.titulo, vars) || `Revisão ${periodo}`
      const conteudo = applyTemplate(sel.conteudo, vars)
      createMut.mutate({ titulo, conteudo })
    } else {
      const parsed = JSON.parse(buildDefaultTemplate())
      createMut.mutate(parsed)
    }
  }

  const diaHoje = weekly?.semana?.dias?.find(d => d.data === hojeLocal())
  const maxDia = weekly?.semana?.dias ? {
    notas: Math.max(...weekly.semana.dias.map(d => d.notas), 1),
    tarefas: Math.max(...weekly.semana.dias.map(d => d.tarefas), 1),
    pomodoros: Math.max(...weekly.semana.dias.map(d => d.pomodoros), 1),
  } : { notas: 1, tarefas: 1, pomodoros: 1 }

  return (
    <div className="p-6 animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Revisão</h1>
        <div className="flex items-center gap-2">
          <select value={templateId || ''} onChange={e => {
            if (e.target.value === '__salvar__') {
              const parsed = JSON.parse(buildDefaultTemplate())
              const nome = prompt('Nome do modelo:', `Revisão ${periodo}`)
              if (nome) {
                addTemplate(nome, `# ${parsed.titulo}\n\n{{notas}}\n{{tarefas}}\n{{pomodoros}}\n{{foco_min}}`)
                notify('Modelo salvo! Edite o conteúdo em Notas > Novo a partir de modelo.', 'success')
              }
              return
            }
            setTemplateId(e.target.value || null)
          }}
            className="bg-bg-tertiary rounded px-2 py-1.5 text-xs text-text-primary outline-none">
            <option value="">Modelo padrão</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
            <option value="__salvar__">Salvar como modelo...</option>
          </select>
          <RevisaoToolbar periodo={periodo} onChangePeriodo={setPeriodo} onCreateNota={handleCreateNota} criando={createMut.isPending} />
        </div>
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
          {weekly?.semana?.dias?.length > 0 && (
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
                {Object.entries(heatmap.por_dia).map(([data, stats]) => {
                  const dataISO = `${anoAtual}-${String(mesAtual).padStart(2,'0')}-${data}`
                  return (
                  <div key={data} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-bg-secondary">
                    <span className="w-20 shrink-0 text-text-muted">{formatData(dataISO)}</span>
                    <span className="text-text-primary tabular-nums">{stats.notas} notas</span>
                    <span className="text-text-primary tabular-nums">{stats.tarefas} tarefas</span>
                    <span className="text-text-primary tabular-nums">{stats.pomodoros} pomodoros</span>
                    <span className="text-text-muted tabular-nums ml-auto">{stats.minutos_foco}min</span>
                  </div>
                )})}
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
