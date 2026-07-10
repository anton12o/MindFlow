import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from './utils'
import Rotina from '../pages/Rotina'
import { getBlocos, getTarefas } from '../api/rotina'
import { getPomodoroStats } from '../api/stats'

vi.mock('../api/rotina')
vi.mock('../api/stats')
vi.mock('../utils/date', () => ({
  hojeLocal: () => '2026-06-23',
  formatDateLocal: (d: Date) => d.toISOString().slice(0, 10),
  agoraLocal: () => '2026-06-23T10:00:00',
}))

const mockBlocos = [
  { id: 1, titulo: 'Foco matinal', hora_inicio: '08:00', hora_fim: '10:00', cor: null, recorrente: true, dias_semana: '0,1,2,3,4', data_especifica: null },
  { id: 2, titulo: 'Reuniões', hora_inicio: '10:00', hora_fim: '11:30', cor: '#FF6B6B', recorrente: false, dias_semana: null, data_especifica: '2026-06-23' },
]
const mockTarefas = [
  { id: 1, titulo: 'Tarefa no bloco', status: 'pendente', prioridade: 'normal', bloco_id: 1, data: '2026-06-23', tempo_estimado: null, tipo_id: null, criado_em: '2026-06-23T09:00:00', descricao: '', recorrente: false, recorrencia_tipo: null, recorrencia_intervalo: 1 },
  { id: 2, titulo: 'Tarefa sem horário', status: 'pendente', prioridade: 'alta', bloco_id: null, data: '2026-06-23', tempo_estimado: null, tipo_id: null, criado_em: '2026-06-23T09:00:00', descricao: '', recorrente: false, recorrencia_tipo: null, recorrencia_intervalo: 1 },
  { id: 3, titulo: 'Tarefa concluída', status: 'feito', prioridade: 'baixa', bloco_id: null, data: '2026-06-23', tempo_estimado: null, tipo_id: null, criado_em: '2026-06-23T08:00:00', descricao: '', recorrente: false, recorrencia_tipo: null, recorrencia_intervalo: 1 },
]
const mockPomodoro = { total_min_hoje: 50, total_sessoes_hoje: 2, streak_dias: 3 }

const INTENCAO_KEY = 'mindflow_intencao_diaria'

describe('Rotina', () => {
  beforeEach(() => {
    vi.mocked(getBlocos).mockResolvedValue(mockBlocos)
    vi.mocked(getTarefas).mockResolvedValue(mockTarefas)
    vi.mocked(getPomodoroStats).mockResolvedValue(mockPomodoro)
    localStorage.clear()
  })

  it('renderiza titulo', async () => {
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getByText('Rotina Diária')).toBeInTheDocument()
    })
  })

  it('exibe saudacao e data no banner', async () => {
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getByText(/Bom dia|Boa tarde|Boa noite/i)).toBeInTheDocument()
      expect(screen.getByText(/23 de junho/i)).toBeInTheDocument()
    })
  })

  it('mostra blocos na timeline', async () => {
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getAllByText('Foco matinal').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Reuniões').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('mostra tarefas na secao Sem horario fixo', async () => {
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getAllByText('Tarefa sem horário').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('mostra tarefas aninhadas dentro do bloco', async () => {
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getAllByText('Tarefa no bloco').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('mostra barra de progresso de tarefas', async () => {
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getByText('1/3')).toBeInTheDocument()
    })
  })

  it('mostra progresso de foco', async () => {
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getByText('50/120min')).toBeInTheDocument()
    })
  })

  it('mostra input de intencao diaria', async () => {
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Qual seu foco/)).toBeInTheDocument()
    })
  })

  it('mostra mensagem de blocos vazios quando nao ha blocos', async () => {
    vi.mocked(getBlocos).mockResolvedValue([])
    vi.mocked(getTarefas).mockResolvedValue([])
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getByText('Nenhum bloco definido para hoje')).toBeInTheDocument()
    })
  })

  it('mostra erro ao carregar blocos quando query falha', async () => {
    vi.mocked(getBlocos).mockRejectedValue(new Error('fail'))
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar blocos')).toBeInTheDocument()
    })
  })

  it('toggle ocultar concluidas aparece quando ha tarefas feitas', async () => {
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getByText('Ocultar concluídas')).toBeInTheDocument()
    })
  })

  it('exibe intencao salva do localStorage', async () => {
    localStorage.setItem(INTENCAO_KEY, JSON.stringify({ '2026-06-23': 'Foco no projeto' }))
    renderWithProviders(<Rotina />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Foco no projeto')).toBeInTheDocument()
    })
  })
})
