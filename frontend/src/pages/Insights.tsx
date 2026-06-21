import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getEstatisticas, getNotas } from '../api/notas'


const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function heatColor(contagem: number): string {
  if (contagem === 0) return 'bg-bg-tertiary'
  if (contagem <= 2) return 'bg-accent/30'
  return 'bg-accent'
}

export default function Analise() {
  const navigate = useNavigate()
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['estatisticas', mes, ano],
    queryFn: () => getEstatisticas(mes, ano),
  })

  const { data: notasDoDia } = useQuery({
    queryKey: ['notas', 'data', diaSelecionado],
    queryFn: () => getNotas(undefined, diaSelecionado!),
    enabled: !!diaSelecionado,
    staleTime: 60_000,
  })

  function gerarGrid() {
    if (!stats) return []
    const primeiroDia = new Date(ano, mes - 1, 1).getDay()
    const dias: ({ dia: string } | null)[] = []
    for (let i = 0; i < primeiroDia; i++) dias.push(null)
    for (let d = 1; d <= stats.ultimo_dia; d++) {
      const chave = String(d).padStart(2, '0')
      dias.push({ dia: chave })
    }
    return dias
  }

  function mesAnterior() {
    if (mes === 1) { setMes(12); setAno(a => a - 1) }
    else setMes(m => m - 1)
  }

  function mesSeguinte() {
    if (mes === 12) { setMes(1); setAno(a => a + 1) }
    else setMes(m => m + 1)
  }

  const grid = gerarGrid()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Análise</h1>
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-muted">{stats.total_mes} notas no mês</span>
            <span className="text-success font-semibold">🔥 {stats.streak} dias seguidos</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={mesAnterior} className="px-3 py-1 text-sm bg-bg-tertiary rounded-lg hover:bg-bg-hover">&#8592;</button>
        <span className="text-lg font-semibold">
          {new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={mesSeguinte} className="px-3 py-1 text-sm bg-bg-tertiary rounded-lg hover:bg-bg-hover">&#8594;</button>
      </div>

      {isLoading && <div className="text-center text-sm text-text-muted py-8">Carregando...</div>}
      {isError && <div className="text-center text-sm text-danger py-8">Erro ao carregar dados. Verifique se o servidor está rodando.</div>}

      {stats && (
        <>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs text-text-muted font-medium py-1">{d}</div>
            ))}
            {grid.map((cell, i) =>
              cell ? (
                <button key={`${mes}-${cell.dia}`} onClick={() => setDiaSelecionado(`${ano}-${String(mes).padStart(2, '0')}-${cell.dia}`)}
                  className={`aspect-square rounded-lg text-xs font-medium transition-colors ${heatColor(stats.por_dia[cell.dia] || 0)} ${diaSelecionado?.endsWith(`-${cell.dia}`) ? 'ring-2 ring-accent' : ''}`}>
                  {cell.dia}
                </button>
              ) : (
                <div key={`pad-${i}`} className="aspect-square" />
              )
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-text-muted mb-6">
            <span>Menos</span>
            <div className="w-3 h-3 rounded bg-bg-tertiary" />
            <div className="w-3 h-3 rounded bg-accent/30" />
            <div className="w-3 h-3 rounded bg-accent" />
            <span>Mais</span>
          </div>
        </>
      )}

      {diaSelecionado && (
        <div>
          <h2 className="text-sm font-semibold mb-2">Notas de {diaSelecionado}</h2>
          <div className="space-y-1">
            {!notasDoDia && <p className="text-xs text-text-muted">Carregando...</p>}
            {notasDoDia?.length === 0 && (
              <p className="text-xs text-text-muted">Nenhuma nota neste dia</p>
            )}
            {notasDoDia?.map(n => (
              <button key={n.id} onClick={() => navigate(`/ideias?nota_id=${n.id}`)}
                className="w-full text-left bg-bg-secondary rounded-lg px-3 py-2 text-sm hover:bg-bg-hover transition-colors">
                {n.titulo}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
