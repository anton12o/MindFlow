import request from './client'
import type { QuerieSalva } from '../types'

export const getQueries = () =>
  request<QuerieSalva[]>('/queries')

export const createQuery = (data: { nome: string; tipo_objeto_id: number; visualizacao?: string; campo_agrupamento?: string; filtros?: object }) =>
  request<QuerieSalva>('/queries', { method: 'POST', body: JSON.stringify(data) })

export const deleteQuery = (id: number) =>
  request(`/queries/${id}`, { method: 'DELETE' })

export const executarQuery = (id: number, mes?: string, gantt?: boolean) =>
  request<{ tipo: string; dados: any[]; total?: number }>(`/queries/${id}/executar${mes || gantt ? `?${[mes && `mes=${mes}`, gantt && 'gantt=true'].filter(Boolean).join('&')}` : ''}`, { method: 'POST' })

export const batchEdit = (queryId: number, ids: number[], alteracoes: object) =>
  request<{ ok: boolean }>(`/queries/${queryId}/batch`, {
    method: 'PATCH',
    body: JSON.stringify({ ids, alteracoes }),
  })
