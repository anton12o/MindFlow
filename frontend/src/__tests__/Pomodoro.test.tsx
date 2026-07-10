import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './utils'
import Pomodoro from '../pages/Pomodoro'
import { getSessoes, deleteSessoes } from '../api/pomodoro'
import { getPomodoroStats } from '../api/stats'
import { getHabitos } from '../api/habitos'
import { getTarefas } from '../api/rotina'
import type { Habito, Tarefa, SessaoPomodoro } from '../types'

vi.mock('../api/pomodoro')
vi.mock('../api/stats')
vi.mock('../api/habitos')
vi.mock('../api/rotina')
vi.mock('../utils/date', () => ({
  hojeLocal: () => '2026-06-23',
}))

const mockStats = { total_min_hoje: 50, total_sessoes_hoje: 3, streak_dias: 5 }

const defaultConfig = { focoMin: 25, pausaCurtaMin: 5, pausaLongaMin: 15, ciclosAtePausaLonga: 4, dailyFocusMin: 120, autoStart: false, dnd: false, descansoMin: 5 }

const mockSessoes: SessaoPomodoro[] = [
  { id: 1, contexto_tipo: null, contexto_id: null, duracao_min: 25, iniciado_em: '2026-06-23T10:00:00', finalizado_em: '2026-06-23T10:25:00', resumo_nota_id: null },
  { id: 2, contexto_tipo: 'habito', contexto_id: 1, duracao_min: 25, iniciado_em: '2026-06-23T11:00:00', finalizado_em: '2026-06-23T11:25:00', resumo_nota_id: 99 },
]
const mockHabitos: Habito[] = [
  { id: 1, nome: 'Meditar', tipo: 'binario', meta: null, unidade: null, categoria: null, cor: null, ativo: true, criado_em: '2026-06-01T00:00:00', dias_semana: null },
]
const mockTarefas: Tarefa[] = [
  { id: 1, titulo: 'Revisar PR', prioridade: 'alta', tempo_estimado: 30, status: 'pendente', bloco_id: null, data: '2026-06-23', tipo_id: null, criado_em: '2026-06-22T00:00:00', descricao: '', recorrente: false, recorrencia_tipo: null, recorrencia_intervalo: 0 },
]

describe('Pomodoro', () => {
  beforeEach(() => {
    vi.mocked(getPomodoroStats).mockResolvedValue(mockStats)
    vi.mocked(getSessoes).mockResolvedValue(mockSessoes)
    vi.mocked(getHabitos).mockResolvedValue(mockHabitos)
    vi.mocked(getTarefas).mockResolvedValue(mockTarefas)
    vi.mocked(deleteSessoes).mockResolvedValue({ deletadas: 2 })
    localStorage.clear()
  })

  it('renderiza titulo', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Pomodoro + Foco')).toBeInTheDocument()
    })
  })

  it('exibe stats de pomodoro', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Min hoje')).toBeInTheDocument()
      expect(screen.getByText('Sessões')).toBeInTheDocument()
      expect(screen.getByText('Dias 🔥')).toBeInTheDocument()
    })
  })

  it('exibe seção de hábitos para contexto', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Iniciar de um hábito')).toBeInTheDocument()
    })
  })

  it('exibe seção de tarefas para contexto', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Iniciar de uma tarefa')).toBeInTheDocument()
    })
  })

  it('exibe lista de sessoes anteriores', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText(/Sessões anteriores/)).toBeInTheDocument()
    })
  })

  it('mostra indicador de resumo salvo', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('✅ resumo salvo')).toBeInTheDocument()
    })
  })

  it('mostra estado de carregamento nas sessoes', async () => {
    vi.mocked(getSessoes).mockResolvedValue(new Promise(() => {}))
    renderWithProviders(<Pomodoro />)
    const carregando = screen.getAllByText('Carregando...')
    expect(carregando.length).toBeGreaterThanOrEqual(1)
  })

  it('mostra erro ao carregar sessoes', async () => {
    vi.mocked(getSessoes).mockRejectedValue(new Error('fail'))
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar sessões')).toBeInTheDocument()
    })
  })

  it('mostra mensagem de sessoes vazias', async () => {
    vi.mocked(getSessoes).mockResolvedValue([])
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Nenhuma sessão registrada')).toBeInTheDocument()
    })
  })

  it('mostra botao de limpar historico', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Limpar histórico')).toBeInTheDocument()
    })
  })

  it('exibe meta diária com progresso', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText(/Meta diária/)).toBeInTheDocument()
      expect(screen.getByText(/50 \/ 120 min \(42%\)/)).toBeInTheDocument()
    })
  })

  it('exibe valores corretos das stats', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      const mins = screen.getAllByText('50')
      expect(mins.length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('exibe nome do hábito na lista de contexto', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Meditar')).toBeInTheDocument()
    })
  })

  it('exibe nome da tarefa na lista de contexto', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Revisar PR')).toBeInTheDocument()
    })
  })

  it('sessão com contexto "Livre" exibe texto', async () => {
    vi.mocked(getSessoes).mockResolvedValue([
      { id: 3, contexto_tipo: null, contexto_id: null, duracao_min: 15, iniciado_em: '2026-06-23T12:00:00', finalizado_em: '2026-06-23T12:15:00', resumo_nota_id: null },
    ])
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText(/Livre/)).toBeInTheDocument()
    })
  })

  it('meta 100% quando ultrapassa dailyFocusMin', async () => {
    vi.mocked(getPomodoroStats).mockResolvedValue({ total_min_hoje: 120, total_sessoes_hoje: 5, streak_dias: 5 })
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText(/120 \/ 120 min \(100%\)/)).toBeInTheDocument()
    })
  })

  it('loading para hábitos mostra skeleton', async () => {
    vi.mocked(getHabitos).mockResolvedValue(new Promise(() => {}))
    renderWithProviders(<Pomodoro />)
    expect(screen.getAllByText('Carregando...').length).toBeGreaterThanOrEqual(1)
  })

  it('erro ao carregar hábitos', async () => {
    vi.mocked(getHabitos).mockRejectedValue(new Error('fail'))
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar hábitos')).toBeInTheDocument()
    })
  })

  it('erro ao carregar tarefas', async () => {
    vi.mocked(getTarefas).mockRejectedValue(new Error('fail'))
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar tarefas')).toBeInTheDocument()
    })
  })

  it('mostra cleanup date input ao clicar Limpar histórico', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Limpar histórico'))
    })
    expect(screen.getByText(/Deletar sessões antes de/)).toBeInTheDocument()
    expect(screen.getByText('Limpar tudo')).toBeInTheDocument()
  })

  it('ConfirmModal aparece ao clicar Limpar tudo', async () => {
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Limpar histórico'))
    })
    fireEvent.click(screen.getByText('Limpar tudo'))
    expect(screen.getByText('Limpar histórico de sessões')).toBeInTheDocument()
    expect(screen.getByText(/TODAS as sessões/)).toBeInTheDocument()
  })

  it('estado vazio para hábitos inativos', async () => {
    vi.mocked(getHabitos).mockResolvedValue([{ ...mockHabitos[0], ativo: false }])
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Nenhum hábito ativo')).toBeInTheDocument()
    })
  })

  it('estado vazio para tarefas feitas', async () => {
    vi.mocked(getTarefas).mockResolvedValue([{ ...mockTarefas[0], status: 'feito' }])
    renderWithProviders(<Pomodoro />)
    await waitFor(() => {
      expect(screen.getByText('Nenhuma tarefa pendente')).toBeInTheDocument()
    })
  })

  it('mostra "-" enquanto stats carregam', async () => {
    vi.mocked(getPomodoroStats).mockResolvedValue(new Promise(() => {}))
    renderWithProviders(<Pomodoro />)
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })
})
