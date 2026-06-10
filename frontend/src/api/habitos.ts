import request from './client'
import type { Habito, RegistroHabito } from '../types'

export const getHabitos = (ativos = true) =>
  request<Habito[]>(`/habitos?ativos=${ativos}`)

export const createHabito = (data: Partial<Habito>) =>
  request<Habito>('/habitos', { method: 'POST', body: JSON.stringify(data) })

export const deleteHabito = (id: number) =>
  request<{ ok: boolean }>(`/habitos/${id}`, { method: 'DELETE' })

export const getRegistros = (habitoId: number) =>
  request<RegistroHabito[]>(`/habitos/${habitoId}/registros`)

export const createRegistro = (habitoId: number, data: Partial<RegistroHabito>) =>
  request<RegistroHabito>(`/habitos/${habitoId}/registros`, { method: 'POST', body: JSON.stringify(data) })
