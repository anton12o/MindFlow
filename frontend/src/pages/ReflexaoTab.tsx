import { useState, useEffect, startTransition } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReflexoes, createNota, updateNota } from '../api/notas'
import { getWeeklyStats, type ScoreConfig } from '../api/stats'
import type { Nota } from '../types'
import { useNotify } from '../store/notification'
import { ChevronLeft, ChevronRight, Settings, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { useReflexaoQuestions } from '../hooks/useReflexaoQuestions'
import { useConfig } from '../hooks/useConfig'

export function extractRespostasPorOrdem(conteudo: string, numPerguntas: number): string[] {
  const linhas = (conteudo || '').split('\n')
  const indices: number[] = []
  linhas.forEach((l, i) => { if (l.startsWith('## ')) indices.push(i) })
  const respostas: string[] = []
  for (let i = 0; i < numPerguntas; i++) {
    if (i < indices.length) {
      const inicio = indices[i] + 1
      const fim = indices[i + 1] ?? linhas.length
      const trecho = linhas.slice(inicio, fim).filter(l => l && !l.startsWith('> ')).join('\n').trim()
      respostas.push(trecho)
    } else {
      respostas.push('')
    }
  }
  return respostas
}

export function formatRange(inicio: string, fim: string) {
  const d1 = new Date(inicio + 'T12:00:00')
  const d2 = new Date(fim + 'T12:00:00')
  const f1 = d1.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const f2 = d2.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return `${f1} a ${f2}`
}

function ReflexaoItem({ r }: { r: Nota }) {
  const props = r.propriedades as Record<string, unknown> | undefined
  const semana = props?.semana_inicio as string | undefined
  const [aberto, setAberto] = useState(false)
  return (
    <div className="bg-bg-secondary/50 rounded-xl border border-border overflow-hidden">
      <button onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors">
        <span>{semana ? `Semana de ${semana}` : r.titulo}</span>
        <span className="text-text-muted text-xs">{aberto ? '▲' : '▼'}</span>
      </button>
      {aberto && (
        <div className="px-4 pb-3 text-sm text-text-muted whitespace-pre-wrap max-h-60 overflow-y-auto">
          {r.conteudo}
        </div>
      )}
    </div>
  )
}

export default function ReflexaoTab() {
  const [offset, setOffset] = useState(0)
  const [editandoPerguntas, setEditandoPerguntas] = useState(false)
  const [novaPergunta, setNovaPergunta] = useState('')
  const queryClient = useQueryClient()
  const notify = useNotify()
  const { questions, addQuestion, removeQuestion, updateQuestion, moveQuestion, resetQuestions } = useReflexaoQuestions()
  const { config } = useConfig()
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

  const { data: stats } = useQuery({
    queryKey: ['stats-weekly', offset],
    queryFn: () => getWeeklyStats(offset, sc),
    staleTime: 60_000,
  })

  const { data: todasReflexoes } = useQuery({
    queryKey: ['reflexoes'],
    queryFn: () => getReflexoes(),
    staleTime: 30_000,
  })

  const semanaInicio = stats?.semana.inicio
  const reflexaoAtual = todasReflexoes?.find(r => {
    const props = r.propriedades as Record<string, unknown> | undefined
    return props?.semana_inicio === semanaInicio
  })
  const [respostas, setRespostas] = useState<string[]>([])

  useEffect(() => {
    if (reflexaoAtual) {
      const r = extractRespostasPorOrdem(reflexaoAtual.conteudo || '', questions.length)
      startTransition(() => setRespostas(r))
    } else {
      setRespostas(new Array(questions.length).fill(''))
    }
  }, [reflexaoAtual, questions])

  const salvarReflexao = useMutation({
    mutationFn: () => {
      if (!stats) throw new Error('Sem dados')
      const linhas = [`# Reflexão Semanal`, '', `> ${formatRange(stats.semana.inicio, stats.semana.fim)}`, '']
      respostas.forEach((r, i) => {
        if (r.trim()) {
          linhas.push(`## ${questions[i]}`, '', r, '')
        }
      })
      const payload = {
        titulo: `Reflexão Semanal 📝 ${stats.semana.inicio}`,
        conteudo: linhas.join('\n'),
        propriedades: { tipo: 'reflexao_semanal', semana_inicio: stats.semana.inicio },
      }
      if (reflexaoAtual) return updateNota(reflexaoAtual.id, payload)
      return createNota(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reflexoes'] })
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      notify(reflexaoAtual ? 'Reflexão atualizada' : 'Reflexão salva')
    },
    onError: (e) => { console.error('[ReflexaoTab]', e); notify('Erro ao salvar reflexão') },
  })

  function handleAddPergunta() {
    const t = novaPergunta.trim()
    if (!t) return
    addQuestion(t)
    setNovaPergunta('')
  }

  if (!stats) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-bg-secondary rounded w-48" />
        <div className="h-64 bg-bg-secondary rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Reflexão Semanal</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditandoPerguntas(!editandoPerguntas); setNovaPergunta('') }}
            title="Gerenciar perguntas"
            className={`p-1.5 rounded-lg transition-colors ${editandoPerguntas ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'}`}>
            <Settings size={16} />
          </button>
          <button onClick={() => setOffset(o => o - 1)} title="Semana anterior" className="p-1 text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-text-muted tabular-nums w-28 text-center">
            {formatRange(stats.semana.inicio, stats.semana.fim)}
          </span>
          <button onClick={() => setOffset(o => o + 1)} disabled={offset >= 0} title="Próxima semana" className="p-1 text-text-muted hover:text-text-primary disabled:opacity-disabled-heavy transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {editandoPerguntas && (
        <div className="bg-bg-secondary/80 rounded-xl border border-border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Gerenciar Perguntas</h3>
            <button onClick={resetQuestions}
              className="text-xs text-text-muted hover:text-text-primary underline">
              Restaurar padrão
            </button>
          </div>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={q + '-' + i} className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveQuestion(i, i - 1)} disabled={i === 0}
                    className="p-1 text-text-muted hover:text-text-primary disabled:opacity-disabled-heavy transition-colors">
                    <ChevronUp size={12} />
                  </button>
                  <button onClick={() => moveQuestion(i, i + 1)} disabled={i === questions.length - 1}
                    className="p-1 text-text-muted hover:text-text-primary disabled:opacity-disabled-heavy transition-colors">
                    <ChevronDown size={12} />
                  </button>
                </div>
                <input
                  value={q}
                  onChange={e => updateQuestion(i, e.target.value)}
                  maxLength={200}
                  className="flex-1 bg-bg-primary border border-border rounded px-2 py-1.5 text-sm text-text-primary outline-none focus-visible:ring-1 focus-visible:ring-accent"
                />
                <button onClick={() => removeQuestion(i)}
                  className="p-1.5 text-danger/60 hover:text-danger transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={novaPergunta}
              onChange={e => setNovaPergunta(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPergunta() } }}
              placeholder="Nova pergunta..."
              maxLength={200}
              className="flex-1 bg-bg-primary border border-border rounded px-2 py-1.5 text-sm text-text-primary outline-none focus-visible:ring-1 focus-visible:ring-accent"
            />
            <button onClick={handleAddPergunta}
              className="p-1.5 text-accent hover:text-accent-hover transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <p className="text-xs text-text-muted">As perguntas são salvas automaticamente no navegador.</p>
        </div>
      )}

      <div className="bg-bg-secondary/50 rounded-xl p-3 space-y-3">
        <div className="space-y-3">
          {questions.map((p, i) => (
            <div key={'resp-' + p + '-' + i}>
              <p className="text-xs text-text-muted mb-1">{p}</p>
              <textarea
                value={respostas[i]}
                onChange={e => setRespostas(prev => { const next = [...prev]; next[i] = e.target.value; return next })}
                className="w-full bg-bg-primary border border-border rounded-lg p-2 text-sm text-text-primary resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 min-h-[60px]"
                placeholder="Digite sua reflexão..."
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => salvarReflexao.mutate()}
            disabled={salvarReflexao.isPending || respostas.every(r => !r.trim())}
            className="px-3 py-1.5 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover disabled:opacity-disabled transition-all active:scale-95"
          >
            {salvarReflexao.isPending ? 'Salvando...' : reflexaoAtual ? 'Atualizar reflexão' : 'Salvar reflexão'}
          </button>
          {salvarReflexao.isSuccess && (
            <span className="text-xs text-success animate-fade-in">Salvo!</span>
          )}
        </div>
      </div>

      {todasReflexoes && todasReflexoes.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Histórico</h2>
          {todasReflexoes.map(r => <ReflexaoItem key={r.id} r={r} />)}
        </div>
      )}
    </div>
  )
}
