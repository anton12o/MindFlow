import request from './client'

export interface GrafoNode {
  id: number
  label: string
  tipo_id: number | null
  tipo_nome: string | null
}

export interface GrafoLink {
  source: number
  target: number
}

export const getGrafo = () =>
  request<{ nodes: GrafoNode[]; links: GrafoLink[] }>('/notas/grafo')
