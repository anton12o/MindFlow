import request from './client'
import type { Nota, Pasta, Tag } from '../types'

export const getNotas = (q?: string) => request<Nota[]>(`/notas${q ? `?q=${q}` : ''}`)
export const getNota = (id: number) => request<Nota>(`/notas/${id}`)
export const createNota = (data: Partial<Nota>) =>
  request<Nota>('/notas', { method: 'POST', body: JSON.stringify(data) })
export const updateNota = (id: number, data: Partial<Nota>) =>
  request<Nota>(`/notas/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteNota = (id: number) =>
  request<{ ok: boolean }>(`/notas/${id}`, { method: 'DELETE' })
export const extrairBloco = (id: number, trecho: string, tipoId?: number | null) =>
  request<Nota>(`/notas/${id}/extrair`, { method: 'POST', body: JSON.stringify({ trecho, tipo_id: tipoId }) })

export const getPastas = () => request<Pasta[]>('/notas/pastas')
export const createPasta = (data: Partial<Pasta>) =>
  request<Pasta>('/notas/pastas', { method: 'POST', body: JSON.stringify(data) })

export const getTags = () => request<Tag[]>('/notas/tags')
export const createTag = (data: Partial<Tag>) =>
  request<Tag>('/notas/tags', { method: 'POST', body: JSON.stringify(data) })
