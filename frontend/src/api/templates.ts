import request from './client'
import type { Nota, Template } from '../types'

export const getTemplates = () =>
  request<Template[]>('/notas/templates')

export const aplicarTemplate = (templateId: number) =>
  request<Nota>(`/notas/templates/${templateId}/aplicar`, { method: 'POST' })
