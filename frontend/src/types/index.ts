export interface InboxItem {
  id: number
  conteudo: string
  tipo_destino: string | null
  destino_id: number | null
  arquivado: boolean
  criado_em: string
}

export interface Habito {
  id: number
  nome: string
  tipo: 'binario' | 'quantitativo'
  meta: number | null
  unidade: string | null
  categoria: string | null
  cor: string | null
  ativo: boolean
  criado_em: string
}

export interface RegistroHabito {
  id: number
  habito_id: number
  data: string
  valor: number | null
  justificativa: string | null
  excecao_justificada: boolean
}

export interface BlocoRotina {
  id: number
  titulo: string
  hora_inicio: string
  hora_fim: string
  cor: string | null
  recorrente: boolean
  dias_semana: string | null
  data_especifica: string | null
}

export interface Tarefa {
  id: number
  titulo: string
  prioridade: string
  tempo_estimado: number | null
  status: string
  bloco_id: number | null
  data: string
  tipo_id: number | null
  criado_em: string
  propriedades?: Record<string, unknown>
}

export interface SessaoPomodoro {
  id: number
  contexto_tipo: string | null
  contexto_id: number | null
  duracao_min: number
  iniciado_em: string
  finalizado_em: string | null
  resumo_nota_id: number | null
}

export interface Nota {
  id: number
  titulo: string
  conteudo: string
  pasta_id: number | null
  tipo_id: number | null
  ordem: number | null
  criado_em: string
  atualizado_em: string
  propriedades?: Record<string, unknown>
  favoritado?: boolean
  acessos?: number
  ultimo_acesso?: string | null
}

export interface TipoObjeto {
  id: number
  nome: string
  icone: string
  schema_campos: Record<string, unknown>
  schema_relacoes: Record<string, unknown>
  criado_em: string
}

export interface Pasta {
  id: number
  nome: string
  pai_id: number | null
}

export interface Tag {
  id: number
  nome: string
  cor: string | null
}

export interface QuerieSalva {
  id: number
  nome: string
  tipo_objeto_id: number
  visualizacao: string
  campo_agrupamento: string | null
  filtros: Record<string, unknown>
  ordem: string
  criado_em: string
}

export interface ConexaoNota {
  id: number
  nota_origem_id: number
  nota_destino_id: number
  tipo: string
}

export interface Flashcard {
  id: number
  nota_id: number
  pergunta: string
  resposta: string
  intervalo: number
  facilidade: number
  revisoes: number
  ultima_revisao: string | null
  proxima_revisao: string
  criado_em: string
}

export interface NotaTag {
  nota_id: number
  tag_id: number
}

export interface Template {
  id: number
  nome: string
  descricao: string | null
  conteudo: string
  propriedades: Record<string, unknown>
  criado_em: string
}
