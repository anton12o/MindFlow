import request from './client'
import type { ConexaoNota } from '../types'

export const getConexoes = (notaId: number) =>
  request<ConexaoNota[]>(`/notas/${notaId}/conexoes`)
