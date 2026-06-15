import request from './client'
import type { Nota, Pasta, Tag } from '../types'

export const getNotas = (q?: string, data?: string, tagIds?: number[], sort?: string) => {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (data) params.set('data', data)
  if (tagIds && tagIds.length > 0) params.set('tag_ids', tagIds.join(','))
  if (sort) params.set('sort', sort)
  const qs = params.toString()
  return request<Nota[]>(`/notas${qs ? `?${qs}` : ''}`)
}

export const getNotasRecentes = () => request<Nota[]>('/notas/recentes')

export const getEstatisticas = (mes: number, ano: number) =>
  request<{ por_dia: Record<string, number>; total_mes: number; streak: number; ultimo_dia: number }>(
    `/notas/estatisticas?mes=${mes}&ano=${ano}`
  )
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
export const updateTag = (id: number, data: Partial<Tag>) =>
  request<Tag>(`/notas/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const getNotaTags = (notaId: number) =>
  request<Tag[]>(`/notas/${notaId}/tags`)

export const favoritarNota = (id: number) =>
  request<Nota>(`/notas/${id}/favoritar`, { method: 'PATCH' })

export const batchDeleteNotas = (ids: number[]) =>
  request<{ ok: boolean; deleted: number }>('/notas/batch/delete', { method: 'POST', body: JSON.stringify({ ids }) })
