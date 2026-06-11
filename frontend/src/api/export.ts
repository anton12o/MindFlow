import request from './client'

export interface ExportData {
  inbox: any[]
  habitos: any[]
  registros_habito: any[]
  blocos_rotina: any[]
  tarefas: any[]
  sessoes_pomodoro: any[]
  notas: any[]
  conexoes_notas: any[]
  pastas: any[]
  tags: any[]
  notas_tags: any[]
  flashcards: any[]
  templates: any[]
  tipos_objeto: any[]
  queries_salvas: any[]
  exportado_em: string
  versao: string
}

export const exportAll = () =>
  request<ExportData>('/export')
