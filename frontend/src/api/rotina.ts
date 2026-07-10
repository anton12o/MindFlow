import request from './client'
import type { BlocoRotina, Tarefa } from '../types'

export const getBlocos = (data?: string) =>
  request<BlocoRotina[]>(`/rotina/blocos${data ? `?data=${data}` : ''}`)

export const createBloco = (data: Partial<BlocoRotina>) =>
  request<BlocoRotina>('/rotina/blocos', { method: 'POST', body: JSON.stringify(data) })

export const updateBloco = (id: number, data: Partial<BlocoRotina>) =>
  request<BlocoRotina>(`/rotina/blocos/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteBloco = (id: number) =>
  request<{ ok: boolean }>(`/rotina/blocos/${id}`, { method: 'DELETE' })

export const getTarefas = (data?: string) =>
  request<Tarefa[]>(`/rotina/tarefas${data ? `?data=${data}` : ''}`)

export const createTarefa = (data: Partial<Tarefa>) =>
  request<Tarefa>('/rotina/tarefas', { method: 'POST', body: JSON.stringify(data) })

export const updateTarefa = (id: number, data: Partial<Tarefa>) =>
  request<Tarefa>(`/rotina/tarefas/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteTarefa = (id: number) =>
  request<{ ok: boolean }>(`/rotina/tarefas/${id}`, { method: 'DELETE' })

export const reorderTarefas = (items: { id: number; ordem: number }[]) =>
  request<{ ok: boolean }>('/rotina/tarefas/reorder', { method: 'PATCH', body: JSON.stringify(items) })
