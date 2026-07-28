import request from './client'

export interface DiaStats {
  data: string
  notas: number
  tarefas: number
  pomodoros: number
  minutos_foco: number
}

export interface PeriodoStats {
  inicio: string
  fim: string
  total_notas: number
  total_tarefas: number
  total_pomodoros: number
  total_minutos_foco: number
  taxa_habitos: number
  dias: DiaStats[]
}

export interface WeeklyStats {
  offset: number
  semana: PeriodoStats
  semana_passada: PeriodoStats
  streak_atual: number
  total_habitos_ativos: number
  score: {
    total: number
    foco: number
    tarefas: number
    habitos: number
    notas: number
  }
  gerado_em: string
}

export interface DashboardBloco {
  id: number; titulo: string; hora_inicio: string; hora_fim: string; cor: string | null
}

export interface DashboardTarefa {
  id: number; titulo: string; status: string; prioridade: string
}

export interface DashboardHabito {
  id: number; nome: string; cor: string | null; ativo: boolean; feito_hoje: boolean; streak: number
}

export interface DashboardNota {
  id: number; titulo: string
}

export interface DashboardStats {
  inbox_count: number
  blocos: DashboardBloco[]
  tarefas: DashboardTarefa[]
  habitos: DashboardHabito[]
  notas_hoje: DashboardNota[]
  data: string
  total_notas: number
  total_tarefas: number
  total_flashcards: number
  total_sessoes: number
  db_size_mb: number
}

export const getDashboardStats = () =>
  request<DashboardStats>('/stats/dashboard')

export interface PomodoroStats {
  total_min_hoje: number
  total_sessoes_hoje: number
  streak_dias: number
}

export const getPomodoroStats = () =>
  request<PomodoroStats>('/stats/pomodoro')

export interface FlashcardStats {
  total_cards: number
  cards_hoje: number
  cards_revisados_hoje: number
  taxa_acerto_7d: number | null
}

export const getFlashcardStats = () =>
  request<FlashcardStats>('/stats/flashcards')

export interface ScoreConfig {
  primeiroDia?: number
  pesoFoco?: number
  pesoTarefas?: number
  pesoHabitos?: number
  pesoNotas?: number
  metaFocoMin?: number
  metaTarefas?: number
  metaNotas?: number
  streakGrace?: number
}

export const getWeeklyStats = (offset = 0, config?: ScoreConfig) => {
  const params = new URLSearchParams({ offset: String(offset) })
  if (config) {
    if (config.primeiroDia !== undefined) params.set('primeiro_dia', String(config.primeiroDia))
    if (config.pesoFoco !== undefined) params.set('peso_foco', String(config.pesoFoco))
    if (config.pesoTarefas !== undefined) params.set('peso_tarefas', String(config.pesoTarefas))
    if (config.pesoHabitos !== undefined) params.set('peso_habitos', String(config.pesoHabitos))
    if (config.pesoNotas !== undefined) params.set('peso_notas', String(config.pesoNotas))
    if (config.metaFocoMin !== undefined) params.set('meta_foco_min', String(config.metaFocoMin))
    if (config.metaTarefas !== undefined) params.set('meta_tarefas', String(config.metaTarefas))
    if (config.metaNotas !== undefined) params.set('meta_notas', String(config.metaNotas))
    if (config.streakGrace !== undefined) params.set('streak_grace', String(config.streakGrace))
  }
  return request<WeeklyStats>(`/stats/weekly?${params}`)
}

export interface LeituraStats {
  total_acessos: number
  notas_lidas: number
  top_notas: Array<{ id: number; titulo: string; acessos: number }>
  streak_leitura: number
}

export const getLeituraStats = () =>
  request<LeituraStats>('/stats/leitura')

export interface HeatmapDia {
  notas: number; tarefas: number; pomodoros: number; minutos_foco: number; habitos: number
}

export interface HeatmapStats {
  por_dia: Record<string, HeatmapDia>
  total_notas: number
  ultimo_dia: number
}

export const getHeatmapStats = (mes: number, ano: number) =>
  request<HeatmapStats>(`/stats/heatmap?mes=${mes}&ano=${ano}`)
