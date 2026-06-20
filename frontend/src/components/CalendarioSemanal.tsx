import React, { useState } from 'react'
import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBlocos, getTarefas, updateBloco } from '../api/rotina'
import { formatDateLocal, hojeLocal } from '../utils/date'
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ConfirmModal from './ConfirmModal'
import type { BlocoRotina } from '../types'
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
      staleTime: 60_000,
      gcTime: 120_000,
    })),
  })
  const tarefasResults = useQueries({
    queries: weekDays.map(d => ({
      queryKey: ['rotina', 'tarefas', d.date],
      queryFn: () => getTarefas(d.date),
      staleTime: 60_000,
      gcTime: 120_000,
    })),
  })
  const [showRecurrentModal, setShowRecurrentModal] = useState<{ blocoId: number; diaIdx: number; novaHoraInicio: string; novaHoraFim: string } | null>(null)
  const queryClient = useQueryClient()
  const updateBlocoMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BlocoRotina> }) => updateBloco(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'blocos'] })
    },
  })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const blocosLoading = blocosResults.some(r => r.isLoading)
  const blocosError = blocosResults.some(r => r.isError)
  const tarefasLoading = tarefasResults.some(r => r.isLoading)
  const tarefasError = tarefasResults.some(r => r.isError)
  const blocosPorDia = weekDays.map((_, i) => blocosResults[i].data || [])
  const tarefasPorDia = weekDays.map((_, i) => tarefasResults[i].data || [])
  if (blocosLoading || tarefasLoading) {
    return <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando calendário...</p>
  }
  if (blocosError || tarefasError) {
    return <p className="text-sm text-danger py-4 text-center">Erro ao carregar calendário</p>
  }
  function formatShort(d: string) {
    const [, m, day] = d.split('-')
    return `${day}/${m}`
  }
  const primeiro = weekDays[0].date
  const ultimo = weekDays[6].date
  const semanaLabel = `Semana de ${formatShort(primeiro)} a ${formatShort(ultimo)}`
  function horaParaMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number)
    return h * 60 + m
  }
  function minutosParaHora(minutos: number): string {
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const blocoId = e.active.id as number
    const targetCell = String(e.over.id) // format: "diaIdx-hora"
    const [diaIdxStr, hora] = targetCell.split('-')
    const diaIdx = Number(diaIdxStr)
    if (isNaN(diaIdx) || !hora) return
    const bloco = blocosPorDia.flat().find(b => b.id === blocoId)
    if (!bloco) return
    const duracao = horaParaMinutos(bloco.hora_fim) - horaParaMinutos(bloco.hora_inicio)
    const novaHoraInicio = hora
    const novaHoraFim = minutosParaHora(horaParaMinutos(hora) + duracao)
    // Check minimum 30min
    if (duracao < 30) return
    // Check if cell is occupied
    const conflito = blocosPorDia[diaIdx].some(b =>
      b.id !== blocoId &&
      b.hora_inicio.slice(0, 2) <= hora &&
      b.hora_fim.slice(0, 2) > hora
    )
    if (conflito) return
    if (bloco.recorrente) {
      setShowRecurrentModal({ blocoId, diaIdx, novaHoraInicio, novaHoraFim })
      return
    }
    updateBlocoMut.mutate({
      id: blocoId,
      data: { hora_inicio: novaHoraInicio, hora_fim: novaHoraFim, data_especifica: weekDays[diaIdx].date },
    })
  }
  return (
    <>
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
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={blocosPorDia.flat().map(b => b.id)} strategy={verticalListSortingStrategy}>
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
                      <SortableItem key={b.id} bloco={b} />
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
        </SortableContext>
        </DndContext>
      </div>
    </div>
      {showRecurrentModal && (
        <ConfirmModal
          titulo="Bloco recorrente"
          mensagem="Mover só este dia (cria exceção) ou todos os dias recorrentes?"
          confirmLabel="Só este dia"
          cancelLabel="Todos os dias"
          onConfirm={() => {
            if (showRecurrentModal) {
              updateBlocoMut.mutate({
                id: showRecurrentModal.blocoId,
                data: {
                  hora_inicio: showRecurrentModal.novaHoraInicio,
                  hora_fim: showRecurrentModal.novaHoraFim,
                  data_especifica: weekDays[showRecurrentModal.diaIdx].date,
                },
              })
              setShowRecurrentModal(null)
            }
          }}
          onCancel={() => {
            if (showRecurrentModal) {
              updateBlocoMut.mutate({
                id: showRecurrentModal.blocoId,
                data: { hora_inicio: showRecurrentModal.novaHoraInicio, hora_fim: showRecurrentModal.novaHoraFim },
              })
              setShowRecurrentModal(null)
            }
          }}
        />
      )}
    </>
  )
}
const SortableItem = React.memo(function SortableItem({ bloco }: { bloco: BlocoRotina }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bloco.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
    backgroundColor: bloco.cor ? `${bloco.cor}30` : 'var(--color-accent-light)',
    color: bloco.cor || 'var(--color-accent)',
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`text-xs px-1 py-0.5 rounded mb-0.5 truncate cursor-grab transition-colors ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-accent' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab text-text-muted hover:text-accent select-none">⠿</div>
      {bloco.titulo}
    </div>
  )
})
