import request from './client'
import type { Nota } from '../types'

export interface Template {
  id: number
  nome: string
  descricao: string | null
  conteudo: string
  criado_em: string
}

export const getTemplates = () =>
  request<Template[]>('/notas/templates')

export const aplicarTemplate = (templateId: number) =>
  request<Nota>(`/notas/templates/${templateId}/aplicar`, { method: 'POST' })
