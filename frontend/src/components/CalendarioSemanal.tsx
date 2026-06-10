import { useQuery } from '@tanstack/react-query'
import { getBlocos, getTarefas } from '../api/rotina'

function getWeekDays(): { date: string; label: string }[] {
  const hoje = new Date()
  const dia = hoje.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda)
    d.setDate(segunda.getDate() + i)
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return { date: d.toISOString().split('T')[0], label: days[d.getDay()] }
  })
}

const HORAS = Array.from({ length: 13 }, (_, i) => String(i + 7).padStart(2, '0')) // 07h-19h

export default function CalendarioSemanal() {
  const weekDays = getWeekDays()
  const hoje = new Date().toISOString().split('T')[0]

  const queries = weekDays.map(d =>
    useQuery({
      queryKey: ['rotina', 'blocos', d.date],
      queryFn: () => getBlocos(d.date),
    })
  )

  const tarefasQueries = weekDays.map(d =>
    useQuery({
      queryKey: ['rotina', 'tarefas', d.date],
      queryFn: () => getTarefas(d.date),
    })
  )

  const blocosPorDia = weekDays.map((_, i) => queries[i].data || [])
  const tarefasPorDia = weekDays.map((_, i) => tarefasQueries[i].data || [])

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border">
          <div className="bg-bg-primary p-2" />
          {weekDays.map(day => (
            <div key={day.date} className={`bg-bg-secondary p-2 text-center ${day.date === hoje ? 'bg-accent/10' : ''}`}>
              <div className="text-xs text-text-muted">{day.label}</div>
              <div className={`text-sm font-semibold ${day.date === hoje ? 'text-accent' : 'text-text-primary'}`}>
                {new Date(day.date).getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Grid */}
        {HORAS.map(hora => (
          <div key={hora} className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border">
            <div className="bg-bg-primary p-1 text-xs text-text-muted text-right pr-2 font-mono">
              {hora}h
            </div>
            {blocosPorDia.map((blocos, diaIdx) => {
              const blocoNaHora = blocos.filter(b => b.hora_inicio.slice(0, 2) <= hora && b.hora_fim.slice(0, 2) > hora)
              const tarefasDoDia = tarefasPorDia[diaIdx].filter(t => t.status !== 'feito')
              return (
                <div key={diaIdx} className="bg-bg-primary min-h-[48px] p-0.5 relative">
                  {blocoNaHora.map(b => (
                    <div
                      key={b.id}
                      className="text-xs px-1 py-0.5 rounded mb-0.5 truncate"
                      style={{ backgroundColor: b.cor ? `${b.cor}30` : 'var(--color-accent-light)', color: b.cor || 'var(--color-accent)' }}
                    >
                      {b.titulo}
                    </div>
                  ))}
                  {hora === '07' && tarefasDoDia.length > 0 && (
                    <div className="text-xs text-text-muted mt-0.5 px-1 truncate">
                      {tarefasDoDia.length} tarefa(s)
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
