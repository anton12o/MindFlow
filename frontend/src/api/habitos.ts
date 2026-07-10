import request from './client'
import type { Habito, RegistroHabito } from '../types'

export const getHabitos = (ativos = true) =>
  request<Habito[]>(`/habitos?ativos=${ativos}`)

export const createHabito = (data: Partial<Habito>) =>
  request<Habito>('/habitos', { method: 'POST', body: JSON.stringify(data) })

export const updateHabito = (id: number, data: Partial<Habito>) =>
  request<Habito>(`/habitos/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteHabito = (id: number) =>
  request<{ ok: boolean }>(`/habitos/${id}`, { method: 'DELETE' })

export const getRegistros = (habitoId: number) =>
  request<RegistroHabito[]>(`/habitos/${habitoId}/registros`)

export const getRegistrosBatch = (ids: number[]) =>
  request<Record<number, RegistroHabito[]>>('/habitos/registros/batch', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })

export const createRegistro = (habitoId: number, data: Partial<RegistroHabito>) =>
  request<RegistroHabito>(`/habitos/${habitoId}/registros`, { method: 'POST', body: JSON.stringify(data) })

export const deleteRegistro = (habitoId: number, data: string) =>
  request<{ ok: boolean }>(`/habitos/${habitoId}/registros/${encodeURIComponent(data)}`, { method: 'DELETE' })
