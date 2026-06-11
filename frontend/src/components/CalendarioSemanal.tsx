import { useQueries } from '@tanstack/react-query'
import { getBlocos, getTarefas } from '../api/rotina'
import { formatDateLocal, hojeLocal } from '../utils/date'

function getWeekDays(): { date: string; label: string }[] {
  const hoje = new Date()
  const dia = hoje.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() + diff)
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda)
    d.setDate(segunda.getDate() + i)
    return { date: formatDateLocal(d), label: days[d.getDay()] }
  })
}

const HORAS = Array.from({ length: 13 }, (_, i) => String(i + 7).padStart(2, '0'))

export default function CalendarioSemanal() {
  const weekDays = getWeekDays()
  const hoje = hojeLocal()

  const blocosResults = useQueries({
    queries: weekDays.map(d => ({
      queryKey: ['rotina', 'blocos', d.date],
      queryFn: () => getBlocos(d.date),
    })),
  })

  const tarefasResults = useQueries({
    queries: weekDays.map(d => ({
      queryKey: ['rotina', 'tarefas', d.date],
      queryFn: () => getTarefas(d.date),
    })),
  })

  const blocosPorDia = weekDays.map((_, i) => blocosResults[i].data || [])
  const tarefasPorDia = weekDays.map((_, i) => tarefasResults[i].data || [])

  function formatShort(d: string) {
    const [, m, day] = d.split('-')
    return `${day}/${m}`
  }

  const primeiro = weekDays[0].date
  const ultimo = weekDays[6].date
  const semanaLabel = `Semana de ${formatShort(primeiro)} a ${formatShort(ultimo)}`

  return (
    <div className="overflow-x-auto">
      <div className="text-sm text-text-muted mb-2">{semanaLabel}</div>
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border">
          <div className="bg-bg-primary p-2" />
          {weekDays.map(day => (
            <div key={day.date} className={`bg-bg-secondary p-2 text-center ${day.date === hoje ? 'bg-accent/10' : ''}`}>
              <div className="text-xs text-text-muted">{day.label}</div>
              <div className={`text-sm font-semibold ${day.date === hoje ? 'text-accent' : 'text-text-primary'}`}>
                {formatShort(day.date)}
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
                <div key={weekDays[diaIdx].date} className="bg-bg-primary min-h-[48px] p-0.5 relative">
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
