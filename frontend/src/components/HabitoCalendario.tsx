import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRegistros, createRegistro, deleteRegistro } from '../api/habitos'
import type { RegistroHabito } from '../types'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface Props {
  habitoId: number
  cor: string
}

export default function HabitoCalendario({ habitoId, cor }: Props) {
  const queryClient = useQueryClient()
  const hoje = new Date()
  const [monthOffset, setMonthOffset] = useState(0)

  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + monthOffset

  // Normalize month to prevent going too far
  const safeAno = ano + Math.floor(mes / 12)
  const safeMes = ((mes % 12) + 12) % 12

  const { data: registros = [] } = useQuery({
    queryKey: ['registros', habitoId],
    queryFn: () => getRegistros(habitoId),
  })

  const createMut = useMutation({
    mutationFn: (data: { habito_id: number; data: string; valor: number }) =>
      createRegistro(habitoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros', habitoId] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (data: string) => deleteRegistro(habitoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros', habitoId] })
    },
  })

  const primeiroDia = new Date(safeAno, safeMes, 1).getDay()
  const diasNoMes = new Date(safeAno, safeMes + 1, 0).getDate()

  const registroMap = new Map<string, RegistroHabito>()
  for (const r of registros) {
    registroMap.set(r.data, r)
  }

  function handleDayClick(dia: number) {
    const dataStr = `${safeAno}-${String(safeMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    // Future: no-op
    if (safeAno > hoje.getFullYear() || (safeAno === hoje.getFullYear() && safeMes > hoje.getMonth()) || (safeAno === hoje.getFullYear() && safeMes === hoje.getMonth() && dia > hoje.getDate())) {
      return
    }
    const existing = registroMap.get(dataStr)
    if (existing) {
      deleteMut.mutate(dataStr)
    } else {
      createMut.mutate({ habito_id: habitoId, data: dataStr, valor: 1 })
    }
  }

  // Build grid: fill leading blanks, then days
  const cells: (number | null)[] = Array(primeiroDia).fill(null)
  for (let d = 1; d <= diasNoMes; d++) {
    cells.push(d)
  }

  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

  return (
    <div className="mt-3 pt-3 border-t border-border">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setMonthOffset(m => m - 1)}
          className="text-xs text-text-muted hover:text-accent px-1"
        >
          &lt;
        </button>
        <span className="text-xs font-medium text-text-primary">
          {MESES[safeMes]} {safeAno}
        </span>
        <button
          onClick={() => setMonthOffset(m => m + 1)}
          className="text-xs text-text-muted hover:text-accent px-1"
        >
          &gt;
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-0 text-center mb-1">
        {DIAS_SEMANA.map(d => (
          <span key={d} className="text-[10px] text-text-muted font-medium">{d}</span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0">
        {cells.map((dia, i) => {
          if (dia === null) {
            return <div key={`empty-${i}`} />
          }
          const dataStr = `${safeAno}-${String(safeMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
          const hasRegistro = registroMap.has(dataStr)
          const isToday = dataStr === hojeStr
          const isFuture = safeAno > hoje.getFullYear() || (safeAno === hoje.getFullYear() && safeMes > hoje.getMonth()) || (safeAno === hoje.getFullYear() && safeMes === hoje.getMonth() && dia > hoje.getDate())

          return (
            <div
              key={dia}
              onClick={() => handleDayClick(dia)}
              className={`flex flex-col items-center py-0.5 cursor-pointer transition-colors ${isFuture ? 'opacity-30 cursor-default' : 'hover:bg-bg-hover rounded'}`}
            >
              <span className={`text-[11px] leading-none mb-0.5 ${isToday ? 'font-bold text-accent' : 'text-text-secondary'}`}>
                {dia}
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: hasRegistro ? cor : 'transparent',
                  border: `2px solid ${hasRegistro ? cor : 'var(--color-border)'}`,
                }}
              />
            </div>
          )
        })}
      </div>

      {createMut.isPending && (
        <p className="text-[10px] text-text-muted text-center mt-1 animate-pulse">Salvando...</p>
      )}
    </div>
  )
}
