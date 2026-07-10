import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { renderWithProviders } from './utils'
import Dashboard from '../pages/Dashboard'
import type { DashboardStats, LeituraStats } from '../api/stats'

vi.mock('../api/stats', () => ({
  getDashboardStats: vi.fn().mockRejectedValue(new Error('not found')),
  getLeituraStats: vi.fn().mockRejectedValue(new Error('not found')),
}))

vi.mock('../utils/date', () => ({
  hojeLocal: () => '2026-06-23',
  formatDateLocal: (d: Date) => d.toISOString().slice(0, 10),
  agoraLocal: () => '2026-06-23T10:00:00',
}))

const mockDashboard: DashboardStats = {
  inbox_count: 3,
  blocos: [
    { id: 1, titulo: 'Trabalho', hora_inicio: '09:00', hora_fim: '12:00', cor: null },
    { id: 2, titulo: 'Almoço', hora_inicio: '12:00', hora_fim: '13:00', cor: '#FF6B6B' },
  ],
  tarefas: [
    { id: 1, titulo: 'Fazer café', status: 'pendente', prioridade: 'normal' },
    { id: 2, titulo: 'Reunião equipe', status: 'feito', prioridade: 'alta' },
  ],
  habitos: [
    { id: 1, nome: 'Beber água', cor: '#3B82F6', ativo: true, feito_hoje: false, streak: 5 },
    { id: 2, nome: 'Meditar', cor: '#10B981', ativo: true, feito_hoje: true, streak: 12 },
  ],
  notas_hoje: [{ id: 10, titulo: 'Diário 📓 2026-06-23' }],
  data: '2026-06-23',
  total_notas: 15,
  total_tarefas: 42,
  total_flashcards: 8,
  total_sessoes: 12,
  db_size_mb: 1.5,
}

const mockLeitura: LeituraStats = {
  total_acessos: 47,
  notas_lidas: 12,
  top_notas: [
    { id: 1, titulo: 'Nota mais lida', acessos: 10 },
    { id: 2, titulo: 'Segunda', acessos: 5 },
  ],
  streak_leitura: 3,
}

function createSeededClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
  qc.setQueryData(['dashboard'], mockDashboard)
  qc.setQueryData(['stats', 'leitura'], mockLeitura)
  return qc
}

describe('Dashboard', () => {
  it('renderiza titulo', async () => {
    renderWithProviders(<Dashboard />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  it('mostra contadores de estatisticas', async () => {
    renderWithProviders(<Dashboard />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('mostra card inbox com contagem', async () => {
    renderWithProviders(<Dashboard />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText('3 itens pendentes')).toBeInTheDocument()
    })
  })

  it('mostra blocos do dia', async () => {
    renderWithProviders(<Dashboard />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText('Trabalho')).toBeInTheDocument()
      expect(screen.getByText('Almoço')).toBeInTheDocument()
    })
  })

  it('mostra tarefas com badge de prioridade', async () => {
    renderWithProviders(<Dashboard />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText('Fazer café')).toBeInTheDocument()
      expect(screen.getByText('Reunião equipe')).toBeInTheDocument()
      expect(screen.getByText('normal')).toBeInTheDocument()
    })
  })

  it('mostra botao diario quando nota diaria existe', async () => {
    renderWithProviders(<Dashboard />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText('📓 Diário de hoje')).toBeInTheDocument()
    })
  })

  it('mostra dados de leitura', async () => {
    renderWithProviders(<Dashboard />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText('47')).toBeInTheDocument()
      expect(screen.getByText('Nota mais lida')).toBeInTheDocument()
    })
  })

  it('mostra estado de erro quando query falha', async () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
    renderWithProviders(<Dashboard />, { queryClient: qc })
    await waitFor(() => {
      const errors = screen.getAllByText('Erro ao carregar')
      expect(errors.length).toBeGreaterThanOrEqual(4)
    })
  })

  it('mostra estado vazio no inbox quando count = 0', async () => {
    const dashVazio = { ...mockDashboard, inbox_count: 0 }
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: Infinity },
        mutations: { retry: false },
      },
    })
    qc.setQueryData(['dashboard'], dashVazio)
    qc.setQueryData(['stats', 'leitura'], mockLeitura)
    renderWithProviders(<Dashboard />, { queryClient: qc })
    await waitFor(() => {
      expect(screen.getByText('📥 Tudo em dia')).toBeInTheDocument()
    })
  })
})
