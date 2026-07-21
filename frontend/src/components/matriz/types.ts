import type { Tarefa } from '../../types'

export type MatrizTipo = 'eisenhower' | 'esforco_impacto'

export interface MatrizViewProps {
  tarefas: Tarefa[]
  isLoading: boolean
  dataInicio: string
  dataFim: string
  offset: number
  onOffsetChange: (offset: number) => void
}

export interface MatrizMeta {
  tipo: MatrizTipo
  titulo: string
  descricao: string
  icone: string
  dica: string
}

export const MATRIZES: MatrizMeta[] = [
  {
    tipo: 'eisenhower',
    titulo: 'Eisenhower',
    descricao: 'Organize tarefas por urgência e importância nos 4 quadrantes',
    icone: '⊞',
    dica: 'O que é urgente vs. importante',
  },
  {
    tipo: 'esforco_impacto',
    titulo: 'Esforço x Impacto',
    descricao: 'Decida o que implementar equilibrando esforço técnico e valor',
    icone: '⚡↗',
    dica: 'Estratégico? Meça custo vs. valor.',
  },
]

export interface EIScore {
  esforco: number
  impacto: number
}

export function formatDataRange(inicio: string, fim: string): string {
  if (!inicio || !fim) return ''
  const d1 = new Date(inicio + 'T12:00:00')
  const d2 = new Date(fim + 'T12:00:00')
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return ''
  const f1 = d1.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const f2 = d2.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return `${f1} a ${f2}`
}

export function sliderGradient(color: string, pct: number): string {
  return `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, var(--color-bg-tertiary) ${pct}%, var(--color-bg-tertiary) 100%)`
}
