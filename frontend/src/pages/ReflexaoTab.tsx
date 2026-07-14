import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReflexoes, createNota } from '../api/notas'
import { getWeeklyStats } from '../api/stats'
import type { Nota } from '../types'
import { useNotify } from '../store/notification'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PERGUNTAS = [
  'O que funcionou bem esta semana?',
  'O que poderia ter sido melhor?',
  'Qual foi o aprendizado mais importante?',
  'O que você quer focar na próxima semana?',
]

function formatRange(inicio: string, fim: string) {
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
  const queryClient = useQueryClient()
  const notify = useNotify()

  const { data: stats } = useQuery({
    queryKey: ['stats-weekly', offset],
    queryFn: () => getWeeklyStats(offset),
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
  const respostasIniciais = reflexaoAtual
    ? PERGUNTAS.map(p => {
        const linhas = (reflexaoAtual.conteudo || '').split('\n')
        const idx = linhas.findIndex(l => l.startsWith('## ') && l.includes(p))
        if (idx === -1) return ''
        const fim = linhas.slice(idx + 1).findIndex(l => l.startsWith('## '))
        const trecho = linhas.slice(idx + 1, fim === -1 ? undefined : idx + 1 + fim)
        return trecho.filter(l => l && !l.startsWith('> ')).join('\n').trim()
      })
    : ['', '', '', '']

  const [respostas, setRespostas] = useState(respostasIniciais)

  useEffect(() => {
    if (reflexaoAtual) {
      const r = PERGUNTAS.map(p => {
        const linhas = (reflexaoAtual.conteudo || '').split('\n')
        const idx = linhas.findIndex(l => l.startsWith('## ') && l.includes(p))
        if (idx === -1) return ''
        const fim = linhas.slice(idx + 1).findIndex(l => l.startsWith('## '))
        const trecho = linhas.slice(idx + 1, fim === -1 ? undefined : idx + 1 + fim)
        return trecho.filter(l => l && !l.startsWith('> ')).join('\n').trim()
      })
      setRespostas(r)
    }
  }, [reflexaoAtual])

  const salvarReflexao = useMutation({
    mutationFn: () => {
      if (!stats) throw new Error('Sem dados')
      const linhas = [`# Reflexão Semanal`, '', `> ${formatRange(stats.semana.inicio, stats.semana.fim)}`, '']
      respostas.forEach((r, i) => {
        if (r.trim()) {
          linhas.push(`## ${PERGUNTAS[i]}`, '', r, '')
        }
      })
      return createNota({
        titulo: `Reflexão Semanal 📝 ${stats.semana.inicio}`,
        conteudo: linhas.join('\n'),
        propriedades: { tipo: 'reflexao_semanal', semana_inicio: stats.semana.inicio },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reflexoes'] })
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      notify('Reflexão salva')
    },
    onError: (e) => { console.error('[ReflexaoTab]', e); notify('Erro ao salvar reflexão') },
  })

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
          <button onClick={() => setOffset(o => o - 1)} title="Semana anterior" className="p-1 text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-text-muted tabular-nums w-28 text-center">
            {formatRange(stats.semana.inicio, stats.semana.fim)}
          </span>
          <button onClick={() => setOffset(o => o + 1)} disabled={offset >= 0} title="Próxima semana" className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="bg-bg-secondary/50 rounded-xl p-4 space-y-3">
        <div className="space-y-3">
          {PERGUNTAS.map((p, i) => (
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
            className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-all active:scale-95"
          >
            {salvarReflexao.isPending ? 'Salvando...' : reflexaoAtual ? 'Atualizar reflexão' : 'Salvar reflexão'}
          </button>
          {salvarReflexao.isSuccess && (
            <span className="text-xs text-success animate-fade-in">✅ Salvo!</span>
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
