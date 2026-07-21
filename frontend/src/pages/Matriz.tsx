import { useState, useCallback, useMemo, useEffect } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Grid3x3 } from 'lucide-react'
import { getWeeklyStats } from '../api/stats'
import { getTarefasMatriz } from '../api/rotina'
import MatrixSelector from '../components/matriz/MatrixSelector'
import EisenhowerView from '../components/matriz/EisenhowerView'
import EsforcoImpactoView from '../components/matriz/EsforcoImpactoView'
import { MATRIZES, type MatrizTipo } from '../components/matriz/types'
import { getEI, classificar } from '../utils/scoring'

const ORDEM: MatrizTipo[] = ['eisenhower', 'esforco_impacto']

export default function Matriz() {
  const [tipo, setTipo] = useState<MatrizTipo | null>(null)
  const [offset, setOffset] = useState(0)

  const { data: stats } = useQuery({
    queryKey: ['stats-weekly', offset],
    queryFn: () => getWeeklyStats(offset),
    staleTime: 60_000,
  })

  const dataInicio = stats?.semana.inicio || ''
  const dataFim = stats?.semana.fim || ''

  const pageSize = 20

  const {
    data,
    isFetching,
    isError,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['tarefas-matriz', dataInicio, dataFim],
    queryFn: ({ pageParam = 0 }) => getTarefasMatriz(dataInicio, dataFim, pageSize, pageParam * pageSize),
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.has_more) return undefined
      return pages.length
    },
    enabled: !!dataInicio,
    staleTime: 30_000,
    initialPageParam: 0,
  })

  const allItems = useMemo(() => data?.pages.flatMap(p => p.items) || [], [data])

  const eiQuickWins = useMemo(() =>
    allItems.filter(t => {
      const s = getEI(t)
      return s && classificar(s.esforco, s.impacto) === 'quickwin'
    }).length,
  [allItems])

  const loadMore = useCallback(() => {
    fetchNextPage()
  }, [fetchNextPage])

  useEffect(() => {
    if (!tipo) return
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key === '1') { e.preventDefault(); setTipo(ORDEM[0]) }
      else if (e.key === '2') { e.preventDefault(); setTipo(ORDEM[1]) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [tipo])

  if (!stats) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-bg-secondary rounded w-48" />
        <div className="h-96 bg-bg-secondary rounded-xl" />
      </div>
    )
  }

  if (!tipo) {
    const inicio = stats?.semana.inicio ? new Date(stats.semana.inicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''
    const fim = stats?.semana.fim ? new Date(stats.semana.fim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''
    return (
      <div className="max-w-5xl mx-auto space-y-4 pt-8 md:pt-12">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <Grid3x3 className="size-5 text-accent" />
            <h1 className="text-xl font-bold text-text-primary tracking-wide">MATRIZES</h1>
          </div>
          <div className="w-12 h-0.5 rounded-full bg-accent/30" />
          {inicio && fim && <span className="text-[10px] text-text-muted">{inicio} a {fim}</span>}
        </div>
        <MatrixSelector onSelect={setTipo} tarefasCount={allItems.length} eiQuickWins={eiQuickWins} />
      </div>
    )
  }

  const viewProps = {
    tarefas: allItems,
    isLoading: isFetching && allItems.length === 0,
    dataInicio,
    dataFim,
    offset,
    onOffsetChange: setOffset,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 pt-8 md:pt-12">
      {isError && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-text-primary text-xs text-center">
          Erro ao carregar tarefas. Tente novamente.
        </div>
      )}
      <div className="flex items-center border-b border-border">
        <button onClick={() => setTipo(null)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary hover:bg-bg-secondary/50 transition-colors shrink-0 px-2 py-0.5 rounded-t"
          title="Voltar para todas as matrizes">
          <ArrowLeft className="size-3.5" />
          <span>Matrizes</span>
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <div className="flex items-center gap-1">
          {MATRIZES.map(m => {
            const count = m.tipo === 'eisenhower'
              ? allItems.filter(t => t.quadrante != null && t.quadrante !== '').length
              : allItems.filter(t => getEI(t) !== null).length
            const active = tipo === m.tipo
            return (
              <button key={m.tipo} onClick={() => setTipo(m.tipo)} title={m.descricao}
                className={`relative text-xs shrink-0 transition-all px-3 py-0.5 rounded-t flex items-center gap-1.5 ${
                  active
                    ? 'text-accent font-semibold border-b-2 border-accent bg-accent/8'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary/50 border-b-2 border-transparent'
                }`}>
                <span className={`transition-colors ${active ? 'text-accent' : 'text-text-muted'}`}>{m.icone}</span>
                {m.titulo}
                <span className={`tabular-nums text-[10px] px-2 py-0.5 rounded-full ${
                  active ? 'bg-accent text-accent-foreground' : 'bg-bg-tertiary text-text-muted'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="relative">
        {tipo === 'eisenhower' && <EisenhowerView {...viewProps} />}
        {tipo === 'esforco_impacto' && <EsforcoImpactoView {...viewProps} />}
        {isFetching && allItems.length > 0 && (
          <div className="absolute inset-0 bg-bg-primary/40 rounded-lg pointer-events-none" />
        )}
      </div>
      {hasNextPage && allItems.length > 0 && (
        <div className="flex justify-center pt-2">
          <button onClick={loadMore} disabled={isFetching}
            className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-primary hover:border-accent transition-colors disabled:opacity-disabled-heavy">
            {isFetching ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  )
}
