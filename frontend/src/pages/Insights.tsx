import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEstatisticas, getNotas } from '../api/notas'


const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function heatColor(contagem: number): string {
  if (contagem === 0) return 'bg-bg-tertiary'
  if (contagem <= 2) return 'bg-accent/30'
  return 'bg-accent'
}

export default function Insights() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['estatisticas', mes, ano],
    queryFn: () => getEstatisticas(mes, ano),
  })

  const { data: notasDoDia } = useQuery({
    queryKey: ['notas', 'data', diaSelecionado],
    queryFn: () => getNotas(undefined, diaSelecionado!),
    enabled: !!diaSelecionado,
  })

  function gerarGrid() {
    if (!stats) return []
    const primeiroDia = new Date(ano, mes - 1, 1).getDay()
    const dias: ({ dia: string; vazio?: boolean } | null)[] = []
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
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Insights</h1>

      <div className="flex items-center justify-between mb-4">
        <button onClick={mesAnterior} className="px-3 py-1 text-sm bg-bg-tertiary rounded-lg hover:bg-bg-hover">◀</button>
        <span className="text-lg font-semibold">
          {new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={mesSeguinte} className="px-3 py-1 text-sm bg-bg-tertiary rounded-lg hover:bg-bg-hover">▶</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-xs text-text-muted font-medium py-1">{d}</div>
        ))}
        {grid.map((cell, i) =>
          cell ? (
            <button key={i} onClick={() => setDiaSelecionado(`${ano}-${String(mes).padStart(2, '0')}-${cell.dia}`)}
              className={`aspect-square rounded-lg text-xs font-medium transition-colors ${heatColor(stats?.por_dia[cell.dia] || 0)} ${diaSelecionado?.endsWith(cell.dia) ? 'ring-2 ring-accent' : ''}`}>
              {cell.dia}
            </button>
          ) : (
            <div key={i} />
          )
        )}
      </div>

      {stats && (
        <div className="flex gap-4 mb-6 text-sm">
          <div className="bg-bg-secondary rounded-xl px-4 py-3 flex-1">
            <div className="text-2xl font-bold text-accent">{stats.total_mes}</div>
            <div className="text-text-muted text-xs">Notas no mês</div>
          </div>
          <div className="bg-bg-secondary rounded-xl px-4 py-3 flex-1">
            <div className="text-2xl font-bold text-green-400">{stats.streak}</div>
            <div className="text-text-muted text-xs">Dias seguidos</div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-text-muted mb-6">
        <span>Menos</span>
        <div className="w-3 h-3 rounded bg-bg-tertiary" />
        <div className="w-3 h-3 rounded bg-accent/30" />
        <div className="w-3 h-3 rounded bg-accent" />
        <span>Mais</span>
      </div>

      {diaSelecionado && (
        <div>
          <h2 className="text-sm font-semibold mb-2">Notas de {diaSelecionado}</h2>
          <div className="space-y-1">
            {notasDoDia?.length === 0 && (
              <p className="text-xs text-text-muted">Nenhuma nota neste dia</p>
            )}
            {notasDoDia?.map(n => (
              <div key={n.id} className="bg-bg-secondary rounded-lg px-3 py-2 text-sm">
                {n.titulo}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
