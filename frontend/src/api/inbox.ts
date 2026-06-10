import request from './client'
import type { InboxItem } from '../types'

export const getInbox = (arquivado = false) =>
  request<InboxItem[]>(`/inbox?arquivado=${arquivado}`)

export const createInbox = (conteudo: string) =>
  request<InboxItem>('/inbox', { method: 'POST', body: JSON.stringify({ conteudo }) })

export const deleteInbox = (id: number) =>
  request<{ ok: boolean }>(`/inbox/${id}`, { method: 'DELETE' })
