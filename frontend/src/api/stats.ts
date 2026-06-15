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
  gerado_em: string
}

export const getWeeklyStats = (offset = 0) =>
  request<WeeklyStats>(`/stats/weekly?offset=${offset}`)
