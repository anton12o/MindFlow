import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from './utils'
import RevisaoSemanal from '../pages/RevisaoSemanal'
import { getWeeklyStats } from '../api/stats'

vi.mock('../api/stats')
vi.mock('../api/notas', () => ({
  createNota: vi.fn().mockResolvedValue({ id: 1 }),
}))

const mockWeekly = {
  offset: 0,
  semana: { inicio: '2026-06-22', fim: '2026-06-28', total_notas: 5, total_tarefas: 3, total_pomodoros: 4, total_minutos_foco: 120, taxa_habitos: 0.75, dias: [] },
  semana_passada: { inicio: '2026-06-15', fim: '2026-06-21', total_notas: 3, total_tarefas: 2, total_pomodoros: 2, total_minutos_foco: 60, taxa_habitos: 0.5, dias: [] },
  streak_atual: 3,
  total_habitos_ativos: 2,
  score: { total: 50, foco: 10, tarefas: 10, habitos: 15, notas: 15 },
  gerado_em: '2026-06-29T00:00:00',
}

describe('RevisaoSemanal', () => {
  beforeEach(() => {
    vi.mocked(getWeeklyStats).mockResolvedValue(mockWeekly)
  })

  it('renderiza o titulo Revisão Semanal', async () => {
    renderWithProviders(<RevisaoSemanal />)
    await waitFor(() => {
      expect(screen.getByText(/Revisão Semanal/)).toBeInTheDocument()
    })
  })

  it('mostra dias ativos consecutivos', async () => {
    renderWithProviders(<RevisaoSemanal />)
    await waitFor(() => {
      expect(screen.getByText('dias ativos consecutivos')).toBeInTheDocument()
    })
  })

  it('mostra perguntas de reflexão', async () => {
    renderWithProviders(<RevisaoSemanal />)
    await waitFor(() => {
      expect(screen.getByText('O que funcionou bem esta semana?')).toBeInTheDocument()
    })
  })

  it('mostra botão de criar nota de revisão', async () => {
    renderWithProviders(<RevisaoSemanal />)
    await waitFor(() => {
      expect(screen.getByText('Criar nota de revisão')).toBeInTheDocument()
    })
  })

  it('mostra comparativo com semana passada', async () => {
    renderWithProviders(<RevisaoSemanal />)
    await waitFor(() => {
      expect(screen.getByText('Comparativo com a semana passada')).toBeInTheDocument()
    })
  })
})
