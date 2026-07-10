import { hojeLocal } from '../utils/date'
import request, { API_BASE } from './client'
import type { InboxItem, Habito, RegistroHabito, BlocoRotina, Tarefa, SessaoPomodoro, Nota, ConexaoNota, Pasta, Tag, NotaTag, Flashcard, Template, TipoObjeto, QuerieSalva } from '../types'

export interface ExportData {
  inbox: InboxItem[]
  habitos: Habito[]
  registros_habito: RegistroHabito[]
  blocos_rotina: BlocoRotina[]
  tarefas: Tarefa[]
  sessoes_pomodoro: SessaoPomodoro[]
  notas: Nota[]
  conexoes_notas: ConexaoNota[]
  pastas: Pasta[]
  tags: Tag[]
  notas_tags: NotaTag[]
  flashcards: Flashcard[]
  templates: Template[]
  tipos_objeto: TipoObjeto[]
  queries_salvas: QuerieSalva[]
  truncated: boolean
  exportado_em: string
  versao: string
}

export const exportAll = () =>
  request<ExportData>('/export')

export const vacuumDB = () =>
  request<{ ok: boolean; mensagem: string }>('/db/vacuum', { method: 'POST' })

export const backupDB = () =>
  request<{ ok: boolean; mensagem: string }>('/db/backup', { method: 'POST' })

export const listBackups = () =>
  request<{ nome: string; tamanho: number; modificado: number }[]>('/db/backups')

export const downloadBackup = async (nome: string) => {
  const res = await fetch(API_BASE + `/db/backups/${encodeURIComponent(nome)}`)
  if (!res.ok) throw new Error('Falha ao baixar backup')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

export const exportCSV = async () => {
  const res = await fetch(API_BASE + '/export/csv')
  if (!res.ok) throw new Error('Falha ao exportar CSV')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mindflow-export-${hojeLocal()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export const exportTarefasFeitas = async () => {
  const res = await fetch(API_BASE + '/export/tarefas-feitas')
  if (!res.ok) throw new Error('Falha ao exportar tarefas')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tarefas-feitas-${hojeLocal()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
