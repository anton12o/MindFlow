import request from './client'
import type { Nota, Pasta, Tag, VersaoNota } from '../types'

export const getNotas = (q?: string, data?: string, tagIds?: number[], sort?: string, limit?: number, offset?: number) => {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (data) params.set('data', data)
  if (tagIds && tagIds.length > 0) params.set('tag_ids', tagIds.join(','))
  if (sort) params.set('sort', sort)
  if (limit) params.set('limit', String(limit))
  if (offset) params.set('offset', String(offset))
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
export const extrairBloco = (id: number, trecho: string, tipoId?: number | null, pastaId?: number | null) =>
  request<Nota>(`/notas/${id}/extrair`, { method: 'POST', body: JSON.stringify({ trecho, tipo_id: tipoId, pasta_id: pastaId }) })

export const getPastas = () => request<Pasta[]>('/notas/pastas')
export const createPasta = (data: Partial<Pasta>) =>
  request<Pasta>('/notas/pastas', { method: 'POST', body: JSON.stringify(data) })
export const deletePasta = (id: number) =>
  request<{ ok: boolean }>(`/notas/pastas/${id}`, { method: 'DELETE' })

export const getTags = () => request<Tag[]>('/notas/tags')
export const createTag = (data: Partial<Tag>) =>
  request<Tag>('/notas/tags', { method: 'POST', body: JSON.stringify(data) })
export const updateTag = (id: number, data: Partial<Tag>) =>
  request<Tag>(`/notas/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const getNotaTags = (notaId: number) =>
  request<Tag[]>(`/notas/${notaId}/tags`)
export const deleteTag = (id: number) =>
  request<{ ok: boolean }>(`/notas/tags/${id}`, { method: 'DELETE' })
export const getTagsByNotaIds = (ids: number[]) =>
  request<Record<number, Tag[]>>('/notas/tags-by-ids', { method: 'POST', body: JSON.stringify(ids) })
export const mergeTags = (origemId: number, destinoId: number) =>
  request<{ ok: boolean }>('/notas/tags/merge', { method: 'POST', body: JSON.stringify({ origem_id: origemId, destino_id: destinoId }) })

export const favoritarNota = (id: number) =>
  request<Nota>(`/notas/${id}/favoritar`, { method: 'PATCH' })

export const batchDeleteNotas = (ids: number[]) =>
  request<{ ok: boolean; deleted: number }>('/notas/batch/delete', { method: 'POST', body: JSON.stringify({ ids }) })

export const getNotasNaoAcessadas = (dias = 30) =>
  request<Nota[]>(`/notas/nao-acessadas?dias=${dias}`)

export const sugerirTags = (notaId: number) =>
  request<{ tag_id: number; score: number }[]>(`/notas/${notaId}/sugerir-tags`, { method: 'POST' })
export const getNotasRelacionadas = (notaId: number) =>
  request<{ id: number; titulo: string; tags_compartilhadas: number; similaridade: number }[]>(`/notas/${notaId}/relacionadas`)
export const addTagToNota = (notaId: number, tagId: number) =>
  request<{ ok: boolean }>(`/notas/${notaId}/tags/${tagId}`, { method: 'POST' })

export const createFromWikilink = (titulo: string) =>
  request<Nota>('/notas/from-wikilink', { method: 'POST', body: JSON.stringify({ titulo }) })

export const getVersoes = (nota_id: number) =>
  request<VersaoNota[]>(`/notas/${nota_id}/versoes`)

export const getVersao = (nota_id: number, versao_id: number) =>
  request<VersaoNota>(`/notas/${nota_id}/versoes/${versao_id}`)

export const restaurarVersao = (nota_id: number, versao_id: number) =>
  request<Nota>(`/notas/${nota_id}/restaurar/${versao_id}`, { method: 'POST' })
