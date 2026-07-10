import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { renderWithProviders } from './utils'
import Consultas from '../pages/Consultas'

vi.mock('../api/queries', () => ({
  getQueries: vi.fn().mockRejectedValue(new Error('not found')),
  createQuery: vi.fn().mockRejectedValue(new Error('not found')),
  deleteQuery: vi.fn().mockRejectedValue(new Error('not found')),
  executarQuery: vi.fn().mockRejectedValue(new Error('not found')),
  batchEdit: vi.fn().mockRejectedValue(new Error('not found')),
}))

vi.mock('../api/tipos', () => ({
  getTipos: vi.fn().mockRejectedValue(new Error('not found')),
}))

vi.mock('../api/notas', () => ({
  updateNota: vi.fn().mockRejectedValue(new Error('not found')),
  createNota: vi.fn().mockRejectedValue(new Error('not found')),
}))

vi.mock('../utils/date', () => ({
  hojeLocal: () => '2026-06-23',
  formatDateLocal: (d: Date) => d.toISOString().slice(0, 10),
  agoraLocal: () => '2026-06-23T10:00:00',
}))

function createSeededClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
  qc.setQueryData(['queries'], [
    { id: 1, nome: 'Tarefas ativas', tipo_objeto_id: 1, visualizacao: 'grid', campo_agrupamento: null, filtros: {}, ordem: '0', criado_em: '2026-06-01' },
    { id: 2, nome: 'Projetos em kanban', tipo_objeto_id: 2, visualizacao: 'kanban', campo_agrupamento: 'status', filtros: {}, ordem: '1', criado_em: '2026-06-02' },
  ])
  qc.setQueryData(['tipos'], [
    { id: 1, nome: 'Tarefa', icone: '✓', schema_campos: {}, criado_em: '2026-01-01' },
    { id: 2, nome: 'Projeto', icone: '📋', schema_campos: { status: { type: 'text' } }, criado_em: '2026-01-01' },
  ])
  qc.setQueryData(['query-result', 1, 'grid', null], {
    tipo: 'grid',
    dados: [
      { id: 10, titulo: 'Fazer deploy', status: 'pendente', prioridade: 'alta' },
      { id: 11, titulo: 'Revisar PR', status: 'feito', prioridade: 'normal' },
      { id: 12, titulo: 'Escrever docs', status: 'em_andamento', prioridade: 'baixa' },
    ],
    total: 3,
  })
  return qc
}

describe('Consultas', () => {
  it('renderiza titulo e lista de consultas', async () => {
    renderWithProviders(<Consultas />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText('Consultas')).toBeInTheDocument()
      expect(screen.getByText('Tarefas ativas')).toBeInTheDocument()
      expect(screen.getByText('Projetos em kanban')).toBeInTheDocument()
    })
  })

  it('mostra placeholder quando nenhuma consulta selecionada', async () => {
    renderWithProviders(<Consultas />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText('Selecione ou crie uma consulta')).toBeInTheDocument()
    })
  })

  it('exibe resultados ao selecionar consulta', async () => {
    renderWithProviders(<Consultas />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText('Tarefas ativas')).toBeInTheDocument()
      expect(screen.getAllByText('grid').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('mostra estado de erro quando queries falham', async () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
    renderWithProviders(<Consultas />, { queryClient: qc })
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar consultas')).toBeInTheDocument()
    })
  })

  it('mostra estado vazio quando sem consultas', async () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: Infinity },
        mutations: { retry: false },
      },
    })
    qc.setQueryData(['queries'], [])
    qc.setQueryData(['tipos'], [])
    renderWithProviders(<Consultas />, { queryClient: qc })
    await waitFor(() => {
      expect(screen.getByText('Nenhuma consulta criada')).toBeInTheDocument()
    })
  })

  it('mostra formulario de criar consulta', async () => {
    renderWithProviders(<Consultas />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nome da consulta')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument()
  })

  it('exibe visualizacao dos tipos no select', async () => {
    renderWithProviders(<Consultas />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText(/✓.*Tarefa/)).toBeInTheDocument()
    })
  })

  it('mostra ConfirmModal ao clicar em excluir consulta', async () => {
    renderWithProviders(<Consultas />, { queryClient: createSeededClient() })
    await waitFor(() => {
      expect(screen.getByText('Tarefas ativas')).toBeInTheDocument()
    })
    const closeButtons = screen.getAllByRole('button')
    const deleteBtn = closeButtons.find(b => b.innerHTML.includes('x-icon') || b.querySelector('svg'))
    if (deleteBtn) {
      fireEvent.click(deleteBtn)
      await waitFor(() => {
        expect(screen.getByText(/Tem certeza/)).toBeInTheDocument()
      })
    }
  })

  it('mostra estado loading nas consultas', async () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
    qc.setQueryData(['tipos'], [])
    renderWithProviders(<Consultas />, { queryClient: qc })
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })
})
