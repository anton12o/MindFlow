import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWeeklyStats, type DiaStats, type PeriodoStats } from '../api/stats'
import { createNota } from '../api/notas'
import { useNavigate } from 'react-router-dom'
import { useNotify } from '../store/notification'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function formatData(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function formatRange(inicio: string, fim: string) {
  const d1 = new Date(inicio + 'T12:00:00')
  const d2 = new Date(fim + 'T12:00:00')
  const f1 = d1.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const f2 = d2.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return `${f1} a ${f2}`
}

function pct(atual: number, passada: number): string {
  if (passada === 0 && atual === 0) return '➖'
  if (passada === 0) return '(novo)'
  const v = Math.round(((atual - passada) / passada) * 100)
  return v >= 0 ? `+${v}%` : `${v}%`
}

function arrow(passada: number, atual: number): string {
  if (atual > passada) return '📈'
  if (atual < passada) return '📉'
  return '\u2796'
}

function barWidth(valor: number, max: number) {
  return max > 0 ? `${Math.min(100, Math.round((valor / max) * 100))}%` : '0%'
}

function ComparativoMetrica({ label, atual, passada, suffix = '' }: { label: string; atual: number; passada: number; suffix?: string }) {
  const v = passada === 0 && atual === 0 ? null : passada === 0 ? 9999 : Math.round(((atual - passada) / passada) * 100)
  const seta = atual > passada ? '📈' : atual < passada ? '📉' : '➖'
  const cor = atual > passada ? 'text-success' : atual < passada ? 'text-danger' : 'text-text-muted'
  const labelVariacao = v === null ? '➖' : v === 9999 ? '(novo)' : v >= 0 ? `+${v}%` : `${v}%`
  return (
    <div className="flex items-center gap-3 text-sm" title={`Semana passada: ${passada}${suffix}`}>
      <span className="w-28 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary font-bold tabular-nums text-lg w-12">{atual}{suffix}</span>
      <span className={`text-xs font-medium tabular-nums ${cor}`}>{seta} {labelVariacao}</span>
    </div>
  )
}

function DiaRow({ dia, max }: { dia: DiaStats; max: { notas: number; tarefas: number; pomodoros: number } }) {
  const bg = dia.notas || dia.tarefas || dia.pomodoros ? 'bg-bg-secondary' : ''
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${bg}`}>
      <span className="w-20 shrink-0 text-text-muted">{formatData(dia.data)}</span>
      <MiniBar value={dia.notas} max={max.notas} color="bg-accent" label="notas" />
      <MiniBar value={dia.tarefas} max={max.tarefas} color="bg-success" label="tarefas" />
      <MiniBar value={dia.pomodoros} max={max.pomodoros} color="bg-warning" label="pomodoros" />
      <span className="w-14 text-right text-text-muted tabular-nums">{dia.minutos_foco}min</span>
    </div>
  )
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

function MetricCard({ label, value, passada, suffix = '', title }: {
  label: string; value: string | number; passada: number; suffix?: string; title?: string
}) {
  const val = typeof value === 'string' ? 0 : (value as number)
  const diff = val - passada
  const diffLabel = diff > 0 ? `+${diff}` : diff === 0 ? '0' : `${diff}`
  const diffColor = diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : 'text-text-muted'
  const pctLabel = passada === 0 && val === 0 ? '➖' : pct(val, passada)
  const seta = passada === 0 && val === 0 ? '' : arrow(val, passada)
  return (
    <div className="bg-bg-secondary/50 rounded-xl p-4" title={title}>
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className="text-2xl font-bold text-text-primary tabular-nums">{value}</div>
      <div className={`text-xs mt-1 tabular-nums ${diffColor}`}>
        {seta} {diffLabel}{suffix} ({pctLabel}) vs semana passada
      </div>
    </div>
  )
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function gerarMD(semana: PeriodoStats, passada: PeriodoStats, streak: number, habitosAtivos: number) {
  const cabecalho = [
    `# Revisão Semanal 📝 ${formatRange(semana.inicio, semana.fim)}`,
    '',
    `> Gerado em ${new Date().toLocaleDateString('pt-BR')} → Streak: ${streak} dia${streak === 1 ? '' : 's'}`,
    '',
    '## Resumo',
    '| Métrica | Esta semana | Semana passada | Variação |',
    '|---|---|---|---|',
    `| Notas criadas | ${semana.total_notas} | ${passada.total_notas} | ${pct(semana.total_notas, passada.total_notas)} |`,
    `| Tarefas concluídas | ${semana.total_tarefas} | ${passada.total_tarefas} | ${pct(semana.total_tarefas, passada.total_tarefas)} |`,
    `| Pomodoros | ${semana.total_pomodoros} | ${passada.total_pomodoros} | ${pct(semana.total_pomodoros, passada.total_pomodoros)} |`,
    `| Minutos de foco | ${semana.total_minutos_foco} | ${passada.total_minutos_foco} | ${pct(semana.total_minutos_foco, passada.total_minutos_foco)} |`,
    habitosAtivos > 0
      ? `| Taxa de hábitos | ${Math.round(semana.taxa_habitos * 100)}% | ${Math.round(passada.taxa_habitos * 100)}% | ${pct(Math.round(semana.taxa_habitos * 100), Math.round(passada.taxa_habitos * 100))} |`
      : '| Taxa de hábitos | ➖ (sem hábitos ativos) | ➖ | ➖ |',
    '',
    '## Detalhamento diário',
    '| Dia | Notas | Tarefas | Pomodoros | Foco |',
    '|---|---|---|---|---|',
  ]

  const linhas = semana.dias.map((d: DiaStats) => {
    const label = new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
    return `| ${label} | ${d.notas} | ${d.tarefas} | ${d.pomodoros} | ${d.minutos_foco}min |`
  })

  const reflexao = [
    '',
    '## Reflexão',
    '',
    '- O que funcionou bem esta semana?',
    '- O que poderia ter sido melhor?',
    '- Qual foi o aprendizado mais importante?',
    '- O que você quer focar na próxima semana?',
  ]

  return [...cabecalho, ...linhas, ...reflexao].join('\n')
}

export default function RevisaoSemanal() {
  const [offset, setOffset] = useState(0)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notify = useNotify()

  const { data, isLoading, error } = useQuery({
    queryKey: ['stats-weekly', offset],
    queryFn: () => getWeeklyStats(offset),
    staleTime: 60_000,
  })

  const criarRevisao = useMutation({
    mutationFn: () => {
      if (!data) throw new Error('Sem dados')
      const { semana, semana_passada } = data
      const conteudo = [
        `# Revisão Semanal 📝 ${formatRange(semana.inicio, semana.fim)}`,
        '',
        '## Resumo',
        `- **Notas criadas:** ${semana.total_notas} (${pct(semana.total_notas, semana_passada.total_notas)} vs semana passada)`,
        `- **Tarefas concluídas:** ${semana.total_tarefas} (${pct(semana.total_tarefas, semana_passada.total_tarefas)} vs semana passada)`,
        `- **Pomodoros:** ${semana.total_pomodoros} (${pct(semana.total_pomodoros, semana_passada.total_pomodoros)} vs semana passada)`,
        `- **Minutos de foco:** ${semana.total_minutos_foco} min (${pct(semana.total_minutos_foco, semana_passada.total_minutos_foco)} vs semana passada)`,
        `- **Taxa de hábitos:** ${Math.round(semana.taxa_habitos * 100)}%`,
        '',
        '## Reflexão',
        '- O que funcionou bem esta semana?',
        '- O que poderia ter sido melhor?',
        '- Qual foi o aprendizado mais importante?',
        '- O que você quer focar na próxima semana?',
      ].join('\n')
      return createNota({ titulo: `Revisão Semanal 📝 ${semana.inicio}`, conteudo })
    },
    onSuccess: (nota) => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      navigate(`/ideias?nota_id=${nota.id}`)
    },
    onError: () => notify('Erro ao criar revisão semanal'),
  })

  const [respostas, setRespostas] = useState(['', '', '', ''])
  const perguntasReflexao = [
    'O que funcionou bem esta semana?',
    'O que poderia ter sido melhor?',
    'Qual foi o aprendizado mais importante?',
    'O que você quer focar na próxima semana?',
  ]

  const salvarReflexao = useMutation({
    mutationFn: () => {
      const linhas = [`# Reflexão Semanal`, '', `> ${formatRange(semana.inicio, semana.fim)}`, '']
      respostas.forEach((r, i) => {
        if (r.trim()) {
          linhas.push(`## ${perguntasReflexao[i]}`, '', r, '')
        }
      })
      return createNota({ titulo: `Reflexão Semanal 📝 ${semana.inicio}`, conteudo: linhas.join('\n') })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
    },
    onError: () => notify('Erro ao salvar reflexão'),
  })

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Revisão Semanal</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-bg-secondary rounded-xl" />
          <div className="h-48 bg-bg-secondary rounded-xl" />
          <div className="h-32 bg-bg-secondary rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Revisão Semanal</h1>
        <p className="text-danger">Erro ao carregar dados da semana.</p>
      </div>
    )
  }

  const { semana, semana_passada, streak_atual, total_habitos_ativos, score } = data
  const maxDia = {
    notas: Math.max(...semana.dias.map(d => d.notas), 1),
    tarefas: Math.max(...semana.dias.map(d => d.tarefas), 1),
    pomodoros: Math.max(...semana.dias.map(d => d.pomodoros), 1),
  }

  const scoreColor = score.total >= 70 ? 'text-success' : score.total >= 40 ? 'text-warning' : 'text-danger'
  const barColor = score.total >= 70 ? 'bg-success' : score.total >= 40 ? 'bg-warning' : 'bg-danger'

  // Celebration
  const celebration = score.total >= 70
  const scoreMessages: Record<string, string> = {
    foco: 'Minutos de foco',
    tarefas: 'Tarefas concluídas',
    habitos: 'Taxa de hábitos',
    notas: 'Notas criadas',
  }
  const maxScores = { foco: 25, tarefas: 25, habitos: 25, notas: 25 } as const
  type ScoreKey = keyof typeof maxScores
  const lacunas = (Object.keys(maxScores) as ScoreKey[])
    .filter(k => score[k] < maxScores[k] * 0.6)
    .map(k => ({ key: k, label: scoreMessages[k], atual: score[k], max: maxScores[k] }))

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Revisão Semanal</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOffset(o => o - 1)}
              className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-text-muted tabular-nums w-28 text-center">
              {formatRange(semana.inicio, semana.fim)}
            </span>
            <button
              onClick={() => setOffset(o => o + 1)}
              disabled={offset >= 0}
              className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Próxima semana"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const md = gerarMD(semana, semana_passada, streak_atual, total_habitos_ativos)
              downloadBlob(md, `revisao-semanal-${semana.inicio}.md`, 'text/markdown')
            }}
            className="px-3 py-1.5 text-sm bg-bg-hover text-text-primary rounded-lg hover:bg-bg-secondary transition-colors"
            title="Exportar como Markdown"
          >
            🗥 .md
          </button>
          <button
            onClick={() => criarRevisao.mutate()}
            disabled={criarRevisao.isPending}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {criarRevisao.isPending ? 'Criando...' : 'Criar nota de revisão'}
          </button>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-accent" title="Streak de atividade" />
            <span className="tabular-nums font-medium text-accent">{streak_atual}</span>
            {streak_atual === 1 ? 'dia ativo consecutivo' : 'dias ativos consecutivos'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Notas" value={semana.total_notas} passada={semana_passada.total_notas} title="Baseado em criado_em" />
        <MetricCard label="Tarefas" value={semana.total_tarefas} passada={semana_passada.total_tarefas} title="Baseado em data (concluída)" />
        <MetricCard label="Pomodoros" value={semana.total_pomodoros} passada={semana_passada.total_pomodoros} title="Baseado em finalizado_em" />
        <MetricCard label="Foco" value={`${semana.total_minutos_foco}min`} passada={semana_passada.total_minutos_foco} suffix="min" title="Soma de duracao_min por finalizado_em" />
      </div>

      <section className="bg-bg-secondary/50 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Comparativo com a semana passada</h2>
        <ComparativoMetrica label="Notas criadas" atual={semana.total_notas} passada={semana_passada.total_notas} />
        <ComparativoMetrica label="Tarefas concluídas" atual={semana.total_tarefas} passada={semana_passada.total_tarefas} />
        <ComparativoMetrica label="Pomodoros" atual={semana.total_pomodoros} passada={semana_passada.total_pomodoros} />
        <ComparativoMetrica label="Minutos de foco" atual={semana.total_minutos_foco} passada={semana_passada.total_minutos_foco} />
        {total_habitos_ativos === 0 ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="w-28 shrink-0 text-text-muted">Taxa de hábitos</span>
            <span className="text-text-muted italic">➖ (sem hábitos ativos)</span>
          </div>
        ) : (
          <ComparativoMetrica
            label="Taxa de hábitos"
            atual={Math.round(semana.taxa_habitos * 100)}
            passada={Math.round(semana_passada.taxa_habitos * 100)}
            suffix="%"
          />
        )}
      </section>

      {/* Score composto */}
      <section className="bg-bg-secondary/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Score da Semana</h2>
          <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{score.total}/100</span>
        </div>
        <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score.total}%` }} />
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          {(['foco', 'tarefas', 'habitos', 'notas'] as ScoreKey[]).map(k => (
            <div key={k} className="text-center">
              <div className="text-text-muted capitalize">{k}</div>
              <div className="font-bold tabular-nums">{score[k]}/25</div>
            </div>
          ))}
        </div>
        {celebration && (
          <p className="text-sm text-success font-medium">Semana produtiva! Continue assim 💪</p>
        )}
      </section>

      {/* Lacunas */}
      {lacunas.length > 0 && (
        <section className="bg-danger/5 border border-danger/10 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Oportunidades de melhoria</h2>
          <div className="space-y-2">
            {lacunas.map(l => (
              <div key={l.key} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{l.label}</span>
                <span className="text-text-muted">{l.atual}/{l.max} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-bg-secondary/50 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Atividade por dia</h2>
        <div className="flex items-end gap-1.5 h-32">
          {semana.dias.map(d => {
            const total = d.notas + d.tarefas + d.pomodoros
            const maxTotal = Math.max(...semana.dias.map(x => x.notas + x.tarefas + x.pomodoros), 1)
            const h = (total / maxTotal) * 100
            const label = new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)
            return (
              <div key={d.data} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="flex flex-col items-center gap-px w-full" style={{ height: `${Math.max(h, total > 0 ? 8 : 0)}%` }}>
                  {d.notas > 0 && <div className="w-full bg-accent rounded-t-sm" style={{ height: `${(d.notas / total) * 100}%`, minHeight: '4px' }} title={`${d.notas} notas`} />}
                  {d.tarefas > 0 && <div className="w-full bg-success rounded-sm" style={{ height: `${(d.tarefas / total) * 100}%`, minHeight: '4px' }} title={`${d.tarefas} tarefas`} />}
                  {d.pomodoros > 0 && <div className="w-full bg-warning rounded-sm" style={{ height: `${(d.pomodoros / total) * 100}%`, minHeight: '4px' }} title={`${d.pomodoros} pomodoros`} />}
                </div>
                <span className="text-[10px] text-text-muted leading-none">{label}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-text-muted">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-accent" /> Notas</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-success" /> Tarefas</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-warning" /> Pomodoros</span>
        </div>
      </section>

      <section className="bg-bg-secondary/50 rounded-xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Detalhamento diário</h2>
        <div className="space-y-1">
          {semana.dias.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhum dado nesta semana.</p>
          ) : (
            semana.dias.map(dia => (
              <DiaRow key={dia.data} dia={dia} max={maxDia} />
            ))
          )}
        </div>
      </section>

      <section className="bg-bg-secondary/50 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Reflexão</h2>
        <div className="space-y-3">
          {perguntasReflexao.map((p, i) => (
            <div key={i}>
              <p className="text-xs text-text-muted mb-1">{p}</p>
              <textarea
                value={respostas[i]}
                onChange={e => setRespostas(prev => { const next = [...prev]; next[i] = e.target.value; return next })}
                className="w-full bg-bg-primary border border-border rounded-lg p-2 text-sm text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[60px]"
                placeholder="Digite sua reflexão..."
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => salvarReflexao.mutate()}
            disabled={salvarReflexao.isPending || respostas.every(r => !r.trim())}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {salvarReflexao.isPending ? 'Salvando...' : 'Salvar reflexão'}
          </button>
          {salvarReflexao.isSuccess && (
            <span className="text-xs text-success animate-fade-in">✅ Nota criada!</span>
          )}
        </div>
      </section>
    </div>
  )
}
