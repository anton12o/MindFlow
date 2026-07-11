import request from './client'

export interface GrafoNode {
  id: string
  label: string
  tipo_nome: string | null
}

export interface GrafoLink {
  source: string
  target: string
}

export const getGrafo = () =>
  request<{ nodes: GrafoNode[]; links: GrafoLink[] }>('/notas/grafo')
