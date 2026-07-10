import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './utils'
import Insights from '../pages/Insights'

vi.mock('../api/notas', () => ({
  getEstatisticas: vi.fn().mockResolvedValue({ por_dia: {}, total_mes: 0, streak: 0, ultimo_dia: 0 }),
  getNotas: vi.fn().mockResolvedValue([]),
  createNota: vi.fn().mockResolvedValue({ id: 1 }),
}))
vi.mock('../api/stats', () => ({
  getWeeklyStats: vi.fn().mockResolvedValue({
    semana: { inicio: '2026-06-22', fim: '2026-06-28', total_notas: 0, total_tarefas: 0, total_pomodoros: 0, total_minutos_foco: 0, taxa_habitos: 0, dias: [] },
    semana_passada: { inicio: '2026-06-15', fim: '2026-06-21', total_notas: 0, total_tarefas: 0, total_pomodoros: 0, total_minutos_foco: 0, taxa_habitos: 0, dias: [] },
    streak: 0,
    habitos_ativos: 0,
  }),
  getHeatmapStats: vi.fn().mockResolvedValue({
    por_dia: {},
    total_notas: 0,
    ultimo_dia: 30,
  }),
}))

describe('Insights', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renderiza o titulo Insights', () => {
    renderWithProviders(<Insights />)
    expect(screen.getByText('Insights')).toBeInTheDocument()
  })

  it('mostra abas Mensal e Semanal', () => {
    renderWithProviders(<Insights />)
    expect(screen.getByText('Mensal')).toBeInTheDocument()
    expect(screen.getByText('Semanal')).toBeInTheDocument()
  })

  it('alterna para aba Semanal ao clicar', () => {
    renderWithProviders(<Insights />)
    fireEvent.click(screen.getByText('Semanal'))
    expect(screen.getByText(/Revisão Semanal/)).toBeInTheDocument()
  })

  it('mostra heatmap de notas na aba Mensal', async () => {
    renderWithProviders(<Insights />)
    await waitFor(() => {
      expect(screen.getByText('Notas')).toBeInTheDocument()
    })
  })
})
