import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getEstatisticas, getNotas } from '../api/notas'
import { getHeatmapStats } from '../api/stats'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import RevisaoSemanal from './RevisaoSemanal'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const METRICAS = [
  { key: 'notas' as const, label: 'Notas', unidade: 'nota(s)' },
  { key: 'tarefas' as const, label: 'Tarefas', unidade: 'tarefa(s)' },
  { key: 'pomodoros' as const, label: 'Pomodoros', unidade: 'sessão(ões)' },
  { key: 'minutos_foco' as const, label: 'Foco (min)', unidade: 'min' },
  { key: 'habitos' as const, label: 'Hábitos', unidade: 'hábito(s)' },
]

function heatColorMulti(valor: number, metrica: string): string {
  if (valor === 0) return 'bg-bg-tertiary'
  if (metrica === 'minutos_foco') {
    if (valor <= 30) return 'bg-accent/30'
    if (valor <= 60) return 'bg-accent/50'
    return 'bg-accent'
  }
  if (valor <= 1) return 'bg-accent/30'
  if (valor <= 3) return 'bg-accent/50'
  return 'bg-accent'
}

function VisaoMensal() {
  const navigate = useNavigate()
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [metrica, setMetrica] = useState('notas')

  const { data: heatmap, isLoading, isError, refetch } = useQuery({
    queryKey: ['heatmap', mes, ano],
    queryFn: () => getHeatmapStats(mes, ano),
  })

  const { data: stats } = useQuery({
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
    if (!heatmap) return []
    const primeiroDia = new Date(ano, mes - 1, 1).getDay()
    const dias: ({ dia: string } | null)[] = []
    for (let i = 0; i < primeiroDia; i++) dias.push(null)
    for (let d = 1; d <= heatmap.ultimo_dia; d++) {
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
  const metricaDef = METRICAS.find(m => m.key === metrica) || METRICAS[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-muted">Métrica:</span>
          <select value={metrica} onChange={e => setMetrica(e.target.value)}
            className="bg-bg-tertiary rounded px-2 py-1 text-xs outline-none text-text-primary">
            {METRICAS.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          {heatmap && (
            <span className="text-text-muted ml-2">
              {heatmap.por_dia[String(new Date().getDate()).padStart(2, '0')]?.[metrica as keyof typeof heatmap.por_dia[string]] || 0} hoje
            </span>
          )}
          {stats && metrica === 'notas' && (
            <span className="text-success font-semibold ml-2">🔥 {stats.streak} dias</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={mesAnterior} aria-label="Mês anterior" className="px-3 py-1 text-sm bg-bg-tertiary rounded-lg hover:bg-bg-hover active:scale-95 transition-all"><ChevronLeft size={16} /></button>
        <span className="text-lg font-semibold">
          {new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={mesSeguinte} aria-label="Mês seguinte" className="px-3 py-1 text-sm bg-bg-tertiary rounded-lg hover:bg-bg-hover active:scale-95 transition-all"><ChevronRight size={16} /></button>
      </div>

      {isLoading && <div className="text-center text-sm text-text-muted py-4 animate-pulse">Carregando...</div>}
      {isError && <div className="text-center text-sm text-danger py-4">Erro ao carregar dados. <button onClick={() => refetch()} className="text-accent hover:underline ml-2">Tentar novamente</button></div>}

      {heatmap && (
        <>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs text-text-muted font-medium py-1">{d}</div>
            ))}
            {grid.map((cell, i) => {
              if (!cell) return <div key={`pad-${i}`} className="aspect-square" />
              const valor = heatmap.por_dia[cell.dia]?.[metrica as keyof typeof heatmap.por_dia[string]] || 0
              return (
                <button key={`${mes}-${cell.dia}`} onClick={() => {
                  const novaData = `${ano}-${String(mes).padStart(2, '0')}-${cell.dia}`
                  setDiaSelecionado(prev => prev === novaData ? null : novaData)
                }} aria-label={`Dia ${cell.dia} — ${valor} ${metricaDef.unidade}`}
                  className={`aspect-square rounded-lg text-xs font-medium transition-all active:scale-95 ${heatColorMulti(valor, metrica)} ${diaSelecionado?.endsWith(`-${cell.dia}`) ? 'ring-2 ring-accent' : ''}`}>
                  {cell.dia}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-text-muted mb-6">
            <span className="mr-1">{metricaDef.label} por dia:</span>
            <span>0</span>
            <div className="w-3 h-3 rounded bg-bg-tertiary" />
            <div className="w-3 h-3 rounded bg-accent/30" />
            <div className="w-3 h-3 rounded bg-accent/50" />
            <div className="w-3 h-3 rounded bg-accent" />
            <span>{metrica === 'minutos_foco' ? '60+' : '3+'}</span>
          </div>
        </>
      )}

      {diaSelecionado && metrica === 'notas' && (
        <div>
          <h2 className="text-sm font-semibold mb-2">Notas de {diaSelecionado}</h2>
          <div className="space-y-1">
            {!notasDoDia && <p className="text-xs text-text-muted">Carregando...</p>}
            {notasDoDia?.length === 0 && (
              <p className="text-xs text-text-muted">Nenhuma nota neste dia</p>
            )}
            {notasDoDia?.map(n => (
              <button key={n.id} onClick={() => navigate(`/ideias?nota_id=${n.id}`)}
                className="w-full text-left bg-bg-secondary rounded-lg border border-border px-3 py-2 text-sm hover:bg-bg-hover transition-colors">
                {n.titulo}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Insights() {
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [aba, setAba] = useState<'mensal' | 'semanal'>(tabFromUrl === 'semanal' ? 'semanal' : 'mensal')

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Insights</h1>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        <button onClick={() => setAba('mensal')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${aba === 'mensal' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
          Mensal
        </button>
        <button onClick={() => setAba('semanal')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${aba === 'semanal' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
          Semanal
        </button>
      </div>

      {aba === 'mensal' ? <VisaoMensal /> : <RevisaoSemanal />}
    </div>
  )
}
