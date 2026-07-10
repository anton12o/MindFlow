import { ChevronLeft, ChevronRight } from 'lucide-react'
interface CalendarioViewProps {
  query: { tipo_objeto_id: number; campo_agrupamento?: string | null }
  result: { dados: Array<{ id: number; titulo: string; [key: string]: unknown }> } | undefined
  resLoad: boolean
  resErr: boolean
  mesAtual: string
  onMesChange: (mes: string) => void
  onRefresh?: () => void
  errorMsg?: string
}
export default function CalendarioView({ query, result, resLoad, resErr, mesAtual, onMesChange, errorMsg }: CalendarioViewProps) {
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  function getDiasDoMes(anoMes: string) {
    const [ano, mes] = anoMes.split('-').map(Number)
    const primeiroDia = new Date(ano, mes - 1, 1)
    const ultimoDia = new Date(ano, mes, 0)
    const diasNoMes = ultimoDia.getDate()
    const primeiroDiaSemana = primeiroDia.getDay()
    const dias: (number | null)[] = []
    for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null)
    for (let d = 1; d <= diasNoMes; d++) dias.push(d)
    return dias
  }
  const dias = getDiasDoMes(mesAtual)
  const semanas = []
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))
  const notasPorDia: Record<number, Array<{ id: number; titulo: string }>> = {}
  if (result?.dados) {
    for (const nota of result.dados) {
      const campo = query.campo_agrupamento
      if (!campo) continue
      const valor = nota[campo] as string | undefined
      if (!valor) continue
      const dia = Number(valor.split('-')[2])
      if (!isNaN(dia)) {
        if (!notasPorDia[dia]) notasPorDia[dia] = []
        notasPorDia[dia].push({ id: nota.id, titulo: nota.titulo })
      }
    }
  }
  const mesLabel = new Date(mesAtual + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  if (resLoad) return <p className="text-text-muted text-sm text-center py-4 animate-pulse">Carregando...</p>
  if (resErr) return <p className="text-danger text-sm text-center py-4">{errorMsg || 'Erro ao executar consulta'}</p>
  if (!query.campo_agrupamento) return <p className="text-text-muted text-center py-4">Selecione um campo de data (campo_agrupamento) na consulta</p>
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => {
          const [a, mesNum] = mesAtual.split('-').map(Number)
          const d = new Date(a, mesNum - 2, 1)
          onMesChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }} className="px-3 py-1.5 bg-bg-tertiary rounded-lg hover:bg-bg-hover"><ChevronLeft size={16} /></button>
        <h3 className="text-lg font-semibold capitalize">{mesLabel}</h3>
        <button onClick={() => {
          const [a, mesNum] = mesAtual.split('-').map(Number)
          const d = new Date(a, mesNum, 1)
          onMesChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }} className="px-3 py-1.5 bg-bg-tertiary rounded-lg hover:bg-bg-hover"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasSemana.map(d => <div key={d} className="text-center text-xs font-semibold text-text-muted py-1">{d}</div>)}
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {semanas.map((semana, si) => (
          <div key={si} className="grid grid-cols-7 gap-1">
            {semana.map((dia, di) => {
              if (dia === null) return <div key={di} className="h-20 bg-bg-tertiary/50" />
              const notas = notasPorDia[dia] || []
              return (
                <div key={di} className="relative h-20 bg-bg-secondary border border-border rounded-lg p-1 transition-colors hover:bg-bg-hover">
                  <div className="text-xs font-semibold text-text-muted mb-1">{dia}</div>
                  <div className="space-y-1 overflow-y-auto h-[calc(100%-18px)]">
                    {notas.slice(0, 3).map(n => (
                      <div key={n.id} draggable className="text-xs bg-bg-tertiary rounded px-1.5 py-0.5 truncate cursor-grab hover:bg-bg-hover">
                        {n.titulo}
                      </div>
                    ))}
                    {notas.length > 3 && <div className="text-xs text-text-muted">+{notas.length - 3} mais</div>}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
