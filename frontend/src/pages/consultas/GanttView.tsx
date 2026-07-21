import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateNota } from '../../api/notas'
import { broadcastInvalidate } from '../../hooks/useBroadcastInvalidate'
import { useNotify } from '../../store/notification'
interface GanttViewProps {
  query: { tipo_objeto_id: number; campo_agrupamento?: string | null }
  result: { dados: Array<{ id: number; titulo: string; propriedades?: Record<string, unknown>; [key: string]: unknown }>; total?: number } | undefined
  resLoad: boolean
  resErr: boolean
  onRefresh?: () => void
  errorMsg?: string
}
export default function GanttView({ query, result, resLoad, resErr, errorMsg }: GanttViewProps) {
  const qc = useQueryClient()
  const notify = useNotify()
  const [scale, setScale] = useState<'day' | 'week' | 'month'>('day')
  const dragRef = useRef<{ itemId: number; type: string; inicio: string; fim: string; left: number; width: number } | null>(null)
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => updateNota(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['query-result'] })
      broadcastInvalidate([['notas']])
    },
    onError: (e) => { console.error('[GanttView] update', e); notify('Erro ao atualizar data') },
  })
  const total = result?.total || 0
  const truncated = total > 100
  const getDateRange = () => {
    if (!result?.dados || !query.campo_agrupamento) return { min: new Date(), max: new Date() }
    let min = new Date('2099-12-31')
    let max = new Date('1970-01-01')
    for (const item of result.dados) {
      const inicio = item.propriedades?.['data_inicio'] as string
      const fim = item.propriedades?.['data_fim'] as string
      if (inicio) {
        const d = new Date(inicio)
        if (d < min) min = d
      }
      if (fim) {
        const d = new Date(fim)
        if (d > max) max = d
      }
    }
    if (min > max) {
      const now = new Date()
      min = new Date(now.getFullYear(), now.getMonth(), 1)
      max = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    }
    min.setDate(1)
    max = new Date(max.getFullYear(), max.getMonth() + 1, 0)
    return { min, max }
  }
  const { min, max } = getDateRange()
  const daysDiff = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24))
  const dayWidth = scale === 'day' ? 40 : scale === 'week' ? 200 : 600
  if (resLoad) return <p className="text-text-muted text-sm text-center py-8 animate-pulse">Carregando...</p>
  if (resErr) return <p className="text-danger text-sm text-center py-8">{errorMsg || 'Erro ao executar consulta'}</p>
  if (!query.campo_agrupamento) return <p className="text-text-muted text-center py-8">Selecione um campo de agrupamento (campo_agrupamento) na consulta</p>
  if (!result?.dados?.length) return <p className="text-text-muted text-center py-8">Nenhum item com data_inicio e data_fim</p>
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Gantt · {result.dados.length} itens {truncated && <span className="text-warning text-sm">(limitado a 100 de {total})</span>}</h3>
        <div className="flex gap-2">
          <select value={scale} onChange={e => setScale(e.target.value as 'day' | 'week' | 'month')}
            className="bg-bg-tertiary rounded px-2 py-1 text-xs outline-none">
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </select>
        </div>
      </div>
      {truncated && (
        <div className="mb-3 p-2 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm text-center">
          Mostrando 100 de {total} itens. Refine os filtros para ver todos.
        </div>
      )}
      <div className="flex-1 overflow-auto relative">
        <div className="sticky top-0 bg-bg-secondary border-b border-border z-10" style={{ width: (daysDiff + 1) * dayWidth }}>
          <div className="flex" style={{ width: (daysDiff + 1) * dayWidth }}>
            {Array.from({ length: daysDiff + 1 }, (_, i) => {
              const d = new Date(min)
              d.setDate(d.getDate() + i)
              return (
                <div key={i} className="border-r border-border text-center text-xs font-medium text-text-muted py-1"
                  style={{ width: dayWidth, minWidth: dayWidth }}>
                  {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ width: (daysDiff + 1) * dayWidth }}>
          {result.dados.map(item => {
            const inicio = item.propriedades?.['data_inicio'] as string
            const fim = item.propriedades?.['data_fim'] as string
            if (!inicio || !fim) return null
            const start = new Date(inicio)
            const end = new Date(fim)
            const startOffset = Math.max(0, Math.ceil((start.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)))
            const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
            const left = startOffset * dayWidth
            const width = duration * dayWidth
            return (
              <div key={item.id} className="relative h-10 border-b border-border/50"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const drag = dragRef.current
                  if (!drag || updateMut.isPending) return
                  const container = (e.currentTarget as HTMLElement).closest('.overflow-auto') as HTMLElement
                  if (!container) return
                  const rect = container.getBoundingClientRect()
                  const x = e.clientX - rect.left + container.scrollLeft
                  const dayOffset = Math.round(x / dayWidth)
                  const newDate = new Date(min)
                  newDate.setDate(newDate.getDate() + dayOffset)
                  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  const props: Record<string, string> = {}
                  if (drag.type === 'move') {
                    const oldStart = new Date(drag.inicio)
                    const delta = dayOffset - Math.round(drag.left / dayWidth)
                    const s = new Date(oldStart)
                    s.setDate(s.getDate() + delta)
                    const e2 = new Date(drag.fim)
                    e2.setDate(e2.getDate() + delta)
                    props.data_inicio = fmt(s)
                    props.data_fim = fmt(e2)
                  } else if (drag.type === 'resize-start') {
                    props.data_inicio = fmt(newDate)
                    props.data_fim = drag.fim
                  } else if (drag.type === 'resize-end') {
                    props.data_inicio = drag.inicio
                    props.data_fim = fmt(newDate)
                  }
                  const fullProps = { ...(item.propriedades || {}), ...props }
                  updateMut.mutate({ id: drag.itemId, data: { propriedades: fullProps } })
                  dragRef.current = null
                }}
              >
                <div
                  className="absolute top-1 bg-accent rounded h-8 transition-all cursor-grab hover:shadow-elevation-2"
                  style={{ left, width, minWidth: 40 }}
                  draggable
                  onDragStart={() => {
                    dragRef.current = { itemId: item.id as number, type: 'move', inicio, fim, left, width }
                  }}
                >
                  <div className="px-2 py-1 text-xs text-accent-foreground truncate" title={item.titulo}>{item.titulo}</div>
                </div>
                <div className="absolute left-0 top-1 w-1 h-8 bg-transparent border-l-2 border-white/50 cursor-w-resize"
                  draggable
                  onDragStart={() => {
                    dragRef.current = { itemId: item.id as number, type: 'resize-start', inicio, fim, left, width }
                  }}
                />
                <div className="absolute right-0 top-1 w-1 h-8 bg-transparent border-r-2 border-white/50 cursor-e-resize"
                  draggable
                  onDragStart={() => {
                    dragRef.current = { itemId: item.id as number, type: 'resize-end', inicio, fim, left, width }
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
