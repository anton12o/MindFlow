import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, render } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { NotificationProvider } from '../store/notification'
import type { PomodoroScreen, Fase, PomodoroConfig } from '../store/pomodoro'
import PomodoroTimer from '../components/PomodoroTimer'

vi.mock('../api/pomodoro')
vi.mock('../api/notas')
vi.mock('../utils/ambientSound', () => ({
  startAmbient: vi.fn(),
  stopAmbient: vi.fn(),
}))

const defaultConfig: PomodoroConfig = {
  focoMin: 25, pausaCurtaMin: 5, pausaLongaMin: 15,
  ciclosAtePausaLonga: 4, dailyFocusMin: 120,
  autoStart: false, dnd: false, descansoMin: 5,
}

let mockContext: Record<string, unknown> = {}

vi.mock('../store/pomodoro', () => ({
  usePomodoroContext: () => mockContext,
}))

const defaultState = {
  minutos: 25, segundos: 0, ativo: false,
  sessaoId: null, resumo: '', mostrarResumo: false,
  cicloAtual: 0, fase: 'foco' as Fase,
  screen: 'idle' as PomodoroScreen,
  interrupcoes: [], distracoes: 0, contexto: null,
}

function resetContext(overrides: Record<string, unknown> = {}) {
  const hasStateKey = 'state' in overrides
  mockContext = {
    state: { ...defaultState, ...(hasStateKey ? (overrides.state as Record<string, unknown>) : overrides) } as typeof defaultState,
    dispatch: vi.fn(),
    config: { ...defaultConfig },
    setConfig: vi.fn(),
    advancePhase: vi.fn(),
    resetTimer: vi.fn(),
    startedAtRef: { current: 0 },
    audioCtxRef: { current: null },
    saveHeartbeat: vi.fn(),
    clearHeartbeat: vi.fn(),
    ...(hasStateKey ? overrides : {}),
  }
}

const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

function renderTimer() {
  return render(
    <QueryClientProvider client={qc}>
      <NotificationProvider>
        <PomodoroTimer />
      </NotificationProvider>
    </QueryClientProvider>
  )
}

describe('PomodoroTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContext()
    localStorage.clear()
  })

  it('exibe display no formato MM:SS', () => {
    resetContext({ minutos: 5, segundos: 3 })
    renderTimer()
    expect(screen.getByText('05:03')).toBeInTheDocument()
  })

  it('botões idle: Iniciar, Livre, ☕', () => {
    renderTimer()
    expect(screen.getByText('Iniciar')).toBeInTheDocument()
    expect(screen.getByText('Livre')).toBeInTheDocument()
    expect(screen.getByText(/min/)).toBeInTheDocument()
  })

  it('botões running: Pausar, Parar', () => {
    resetContext({ screen: 'running', ativo: true, minutos: 20 })
    renderTimer()
    expect(screen.getByText('Pausar')).toBeInTheDocument()
    expect(screen.getByText('Parar')).toBeInTheDocument()
  })

  it('botões pausado: Continuar, Parar', () => {
    resetContext({ screen: 'pausado', ativo: false, minutos: 15 })
    renderTimer()
    expect(screen.getByText('Continuar')).toBeInTheDocument()
    expect(screen.getByText('Parar')).toBeInTheDocument()
  })

  it('botão Parar no modo livre', () => {
    resetContext({ screen: 'livre', ativo: true })
    renderTimer()
    expect(screen.getAllByText('Parar').length).toBeGreaterThanOrEqual(1)
  })

  it('exibe label da fase atual', () => {
    resetContext({ fase: 'foco' })
    renderTimer()
    expect(screen.getByText('⚡ Foco')).toBeInTheDocument()
  })

  it('exibe label pausa curta', () => {
    resetContext({ fase: 'pausa_curta' })
    renderTimer()
    expect(screen.getByText('☕ Pausa curta')).toBeInTheDocument()
  })

  it('exibe contagem de ciclo', () => {
    resetContext({ cicloAtual: 2 })
    renderTimer()
    expect(screen.getByText('Ciclo 3 de 4')).toBeInTheDocument()
  })

  it('input de distração visível durante running', () => {
    resetContext({ screen: 'running', ativo: true })
    renderTimer()
    expect(screen.getByPlaceholderText('Anotar distração...')).toBeInTheDocument()
  })

  it('input de tarefa visível no idle sem contexto', () => {
    renderTimer()
    expect(screen.getByPlaceholderText('O que você vai fazer neste ciclo? (Opcional)')).toBeInTheDocument()
  })

  it('mostra distrações quando > 0', () => {
    resetContext({ distracoes: 3 })
    renderTimer()
    expect(screen.getByText(/3 distrações/)).toBeInTheDocument()
  })

  it('distração singular para 1', () => {
    resetContext({ distracoes: 1 })
    renderTimer()
    expect(screen.getByText(/1 distração/)).toBeInTheDocument()
  })

  it('config panel collapse toggle', () => {
    renderTimer()
    expect(screen.queryByText('Foco (min)')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText(/Configurações/))
    expect(screen.getByText('Foco (min)')).toBeInTheDocument()
  })

  it('botão Configurações disabled quando ativo', () => {
    resetContext({ screen: 'running', ativo: true })
    renderTimer()
    expect(screen.getByRole('button', { name: /Configurações/ })).toBeDisabled()
  })

  it('config inputs não disabled quando idle', () => {
    resetContext()
    renderTimer()
    fireEvent.click(screen.getByText(/Configurações/))
    const inputs = screen.getAllByRole('spinbutton')
    inputs.forEach(input => expect(input).not.toBeDisabled())
  })

  it('botão Novo Pomodoro visível no idle com timer zerado', () => {
    resetContext({ minutos: 0, segundos: 0 })
    renderTimer()
    expect(screen.getByText('Novo Pomodoro')).toBeInTheDocument()
  })

  it('texto accent no display durante running', () => {
    resetContext({ screen: 'running', ativo: true, minutos: 20 })
    renderTimer()
    const display = screen.getByText('20:00')
    expect(display.className).toContain('text-accent')
  })

  it('interrupções são listadas', () => {
    resetContext({ screen: 'running', ativo: true, interrupcoes: ['foo', 'bar'] })
    renderTimer()
    expect(screen.getByText('foo')).toBeInTheDocument()
    expect(screen.getByText('bar')).toBeInTheDocument()
  })

  it('foco_end exibe resumo e botões', () => {
    resetContext({ screen: 'foco_end' })
    renderTimer()
    expect(screen.getByText('Pular resumo e iniciar pausa')).toBeInTheDocument()
    expect(screen.getByText('Salvar resumo e iniciar pausa')).toBeInTheDocument()
  })

  it('restore banner aparece quando showRestore', async () => {
    localStorage.setItem('mindflow_pomodoro_heartbeat', JSON.stringify({
      screen: 'running', remainingMs: 600000, minutos: 10, segundos: 0,
      interrupcoes: [], contextoTipo: null, contextoId: null,
      fase: 'foco', cicloAtual: 0, savedAt: Date.now(),
    }))
    renderTimer()
    expect(await screen.findByText(/Sessão interrompida/)).toBeInTheDocument()
    expect(screen.getByText('Continuar sessão')).toBeInTheDocument()
    expect(screen.getByText('Descartar')).toBeInTheDocument()
  })

  it('mostra contexto quando fornecido via prop', () => {
    render(
      <QueryClientProvider client={qc}>
        <NotificationProvider>
          <PomodoroTimer contexto={{ tipo: 'habito', id: 1, nome: 'Meditar' }} />
        </NotificationProvider>
      </QueryClientProvider>
    )
    expect(screen.getByText('Meditar')).toBeInTheDocument()
  })
})
