import request from './client'
import type { TipoObjeto } from '../types'

export const getTipos = () =>
  request<TipoObjeto[]>('/tipos')

export const createTipo = (data: { nome: string; icone: string }) =>
  request<TipoObjeto>('/tipos', { method: 'POST', body: JSON.stringify(data) })

export const updateTipo = (id: number, data: { nome: string; icone: string }) =>
  request<TipoObjeto>(`/tipos/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteTipo = (id: number) =>
  request(`/tipos/${id}`, { method: 'DELETE' })
