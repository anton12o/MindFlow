import request from './client'
import type { InboxItem } from '../types'

export const getInbox = (arquivado = false) =>
  request<InboxItem[]>(`/inbox?arquivado=${arquivado}`)

export const createInbox = (conteudo: string, tipo_destino?: string | null) =>
  request<InboxItem>('/inbox', { method: 'POST', body: JSON.stringify({ conteudo, tipo_destino }) })

export const deleteInbox = (id: number) =>
  request<{ ok: boolean }>(`/inbox/${id}`, { method: 'DELETE' })

export const archiveInboxBatch = (ids: number[]) =>
  request<{ archived: number }>('/inbox/archive', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
