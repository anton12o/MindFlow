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
}

export const getDashboardStats = () =>
  request<DashboardStats>('/stats/dashboard')

export const getWeeklyStats = (offset = 0) =>
  request<WeeklyStats>(`/stats/weekly?offset=${offset}`)
