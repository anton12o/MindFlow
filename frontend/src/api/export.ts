import request from './client'
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
  exportado_em: string
  versao: string
}

export const exportAll = () =>
  request<ExportData>('/export')
