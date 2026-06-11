import request from './client'
import type { SessaoPomodoro } from '../types'

export const getSessoes = () =>
  request<SessaoPomodoro[]>('/pomodoro/sessoes')

export const createSessao = (data: Partial<SessaoPomodoro>) =>
  request<SessaoPomodoro>('/pomodoro/sessoes', { method: 'POST', body: JSON.stringify(data) })

export const finalizarSessao = (id: number, params: { conteudo_resumo?: string; contexto_nome?: string }) =>
  request<SessaoPomodoro>(`/pomodoro/sessoes/${id}/finalizar`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })
