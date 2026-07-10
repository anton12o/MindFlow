import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from './utils'
import InboxReminder from '../components/InboxReminder'
import { getDashboardStats } from '../api/stats'

vi.mock('../api/stats')

const mockStats = (inboxCount: number) =>
  vi.mocked(getDashboardStats).mockResolvedValue({
    total_notas: 10, total_tarefas: 0, total_flashcards: 0,
    total_habitos: 0, streak_atual: 0, streak_max: 0,
    inbox_count: inboxCount,
    metricas_tempo: { foco_total_min: 0, pausas_total_min: 0, sessoes_hoje: 0, media_foco_diario: 0 },
    leitura: null,
    noticias: null,
    meta_diaria: null,
  })

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('InboxReminder', () => {
  it('nao renderiza quando inbox_count = 0', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockStats(0)
    renderWithProviders(<InboxReminder />)
    await waitFor(() => expect(getDashboardStats).toHaveBeenCalled())
    expect(screen.queryByText('Inbox não vazio')).not.toBeInTheDocument()
  })

  it('mostra quando inbox > 0 e hora >= 18', async () => {
    vi.useFakeTimers({ now: new Date('2026-07-08T20:00:00'), shouldAdvanceTime: true })
    mockStats(3)
    renderWithProviders(<InboxReminder />)
    await waitFor(() => {
      expect(screen.getByText('Inbox não vazio')).toBeInTheDocument()
    })
    expect(screen.getByText('3 itens pendentes para revisar')).toBeInTheDocument()
  })

  it('mostra texto singular para 1 item', async () => {
    vi.useFakeTimers({ now: new Date('2026-07-08T20:00:00'), shouldAdvanceTime: true })
    mockStats(1)
    renderWithProviders(<InboxReminder />)
    await waitFor(() => {
      expect(screen.getByText('1 item pendente para revisar')).toBeInTheDocument()
    })
  })

  it('nao renderiza quando hora < 18 mesmo com inbox > 0', async () => {
    vi.useFakeTimers({ now: new Date('2026-07-08T10:00:00'), shouldAdvanceTime: true })
    mockStats(5)
    renderWithProviders(<InboxReminder />)
    await waitFor(() => expect(getDashboardStats).toHaveBeenCalled())
    expect(screen.queryByText('Inbox não vazio')).not.toBeInTheDocument()
  })

  it('nao renderiza quando ja foi dispensado hoje', async () => {
    localStorage.setItem('mindflow_inbox_reminder_dismissed', '2026-07-08')
    vi.useFakeTimers({ now: new Date('2026-07-08T20:00:00'), shouldAdvanceTime: true })
    mockStats(3)
    renderWithProviders(<InboxReminder />)
    await waitFor(() => expect(getDashboardStats).toHaveBeenCalled())
    expect(screen.queryByText('Inbox não vazio')).not.toBeInTheDocument()
  })

  it('mostra botoes Revisar agora e Dispensar hoje', async () => {
    vi.useFakeTimers({ now: new Date('2026-07-08T20:00:00'), shouldAdvanceTime: true })
    mockStats(2)
    renderWithProviders(<InboxReminder />)
    await waitFor(() => {
      expect(screen.getByText('Revisar agora')).toBeInTheDocument()
    })
    expect(screen.getByText('Dispensar hoje')).toBeInTheDocument()
  })

  it('clique em Revisar agora dispara evento open-inbox', async () => {
    vi.useFakeTimers({ now: new Date('2026-07-08T20:00:00'), shouldAdvanceTime: true })
    mockStats(2)
    renderWithProviders(<InboxReminder />)
    await waitFor(() => {
      expect(screen.getByText('Revisar agora')).toBeInTheDocument()
    })
    const listener = vi.fn()
    window.addEventListener('open-inbox', listener)
    screen.getByText('Revisar agora').click()
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('open-inbox', listener)
  })

  it('clique em Dispensar hoje esconde o card', async () => {
    vi.useFakeTimers({ now: new Date('2026-07-08T20:00:00'), shouldAdvanceTime: true })
    mockStats(3)
    renderWithProviders(<InboxReminder />)
    await waitFor(() => {
      expect(screen.getByText('Inbox não vazio')).toBeInTheDocument()
    })
    screen.getByText('Dispensar hoje').click()
    await waitFor(() => {
      expect(screen.queryByText('Inbox não vazio')).not.toBeInTheDocument()
    })
    expect(localStorage.getItem('mindflow_inbox_reminder_dismissed')).toBe('2026-07-08')
  })
})
