import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PomodoroProvider, usePomodoroContext } from '../store/pomodoro'
import { ThemeProvider } from '../store/theme'
import { KeybindingsProvider } from '../store/keybindings'
import { NotificationProvider } from '../store/notification'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

vi.mock('../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    requestPermission: vi.fn().mockResolvedValue(false),
    notify: vi.fn(),
  }),
}))

vi.mock('../hooks/useBroadcastSync', () => ({
  useBroadcastSync: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <KeybindingsProvider>
            <MemoryRouter>
              <PomodoroProvider>
                <NotificationProvider>
                  {children}
                </NotificationProvider>
              </PomodoroProvider>
            </MemoryRouter>
          </KeybindingsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    )
  }
}

describe('PomodoroProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-06-23T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('config', () => {
    it('carrega config padrao quando localStorage vazio', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      expect(result.current.config.focoMin).toBe(25)
      expect(result.current.config.autoStart).toBe(false)
      expect(result.current.config.dnd).toBe(false)
    })

    it('persiste config no localStorage ao mudar', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.setConfig(prev => ({ ...prev, focoMin: 30 })) })
      const stored = JSON.parse(localStorage.getItem('mindflow_pomodoro_config') || '{}')
      expect(stored.focoMin).toBe(30)
    })

    it('recupera config salva do localStorage', () => {
      localStorage.setItem('mindflow_pomodoro_config', JSON.stringify({ focoMin: 10, autoStart: true }))
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      expect(result.current.config.focoMin).toBe(10)
      expect(result.current.config.autoStart).toBe(true)
    })

    it('fallback para padrao se localStorage corrompido', () => {
      localStorage.setItem('mindflow_pomodoro_config', 'not-json')
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      expect(result.current.config.focoMin).toBe(25)
    })
  })

  describe('resetTimer', () => {
    it('reseta para duracao do foco quando fase=foco', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      expect(result.current.state.fase).toBe('foco')
      act(() => { result.current.resetTimer() })
      expect(result.current.state.minutos).toBe(25)
      expect(result.current.state.segundos).toBe(0)
    })

    it('reseta para duracao da pausa curta', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.dispatch({ type: 'SET_FASE', fase: 'pausa_curta' }) })
      act(() => { result.current.resetTimer() })
      expect(result.current.state.minutos).toBe(5)
      expect(result.current.state.segundos).toBe(0)
    })

    it('reseta para duracao da pausa longa', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.dispatch({ type: 'SET_FASE', fase: 'pausa_longa' }) })
      act(() => { result.current.resetTimer() })
      expect(result.current.state.minutos).toBe(15)
      expect(result.current.state.segundos).toBe(0)
    })
  })

  describe('advancePhase', () => {
    it('avanca de foco para pausa_curta e incrementa ciclo', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.dispatch({ type: 'SET_FASE', fase: 'foco' }); result.current.dispatch({ type: 'SET_CICLO', ciclo: 0 }) })
      act(() => { result.current.advancePhase() })
      expect(result.current.state.fase).toBe('pausa_curta')
      expect(result.current.state.cicloAtual).toBe(1)
    })

    it('avanca de pausa para foco', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.dispatch({ type: 'SET_FASE', fase: 'pausa_curta' }) })
      act(() => { result.current.advancePhase() })
      expect(result.current.state.fase).toBe('foco')
    })

    it('faz pausa longa no ciclo configurado (padrao=4)', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.dispatch({ type: 'SET_FASE', fase: 'foco' }); result.current.dispatch({ type: 'SET_CICLO', ciclo: 3 }) })
      act(() => { result.current.advancePhase() })
      expect(result.current.state.fase).toBe('pausa_longa')
    })

    it('ciclo 3 nao dispara pausa longa', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.dispatch({ type: 'SET_FASE', fase: 'foco' }); result.current.dispatch({ type: 'SET_CICLO', ciclo: 2 }) })
      act(() => { result.current.advancePhase() })
      expect(result.current.state.fase).toBe('pausa_curta')
    })
  })

  describe('heartbeat', () => {
    const HB_KEY = 'mindflow_pomodoro_heartbeat'

    it('tick loop grava heartbeat no localStorage quando screen=running', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => {
        result.current.dispatch({ type: 'SET_SCREEN', screen: 'running' })
        result.current.dispatch({ type: 'SET_ATIVO', ativo: true })
        result.current.startedAtRef.current = Date.now()
      })
      act(() => { vi.advanceTimersByTime(300) })
      expect(localStorage.getItem(HB_KEY)).not.toBeNull()
    })

    it('saveHeartbeat NAO escreve quando screen=idle', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.saveHeartbeat() })
      expect(localStorage.getItem(HB_KEY)).toBeNull()
    })

    it('clearHeartbeat remove do localStorage', () => {
      localStorage.setItem(HB_KEY, JSON.stringify({ savedAt: Date.now(), screen: 'running' }))
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.clearHeartbeat() })
      expect(localStorage.getItem(HB_KEY)).toBeNull()
    })

    it('heartbeat salva dados do contexto', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => {
        result.current.dispatch({ type: 'SET_SCREEN', screen: 'running' })
        result.current.dispatch({ type: 'SET_ATIVO', ativo: true })
        result.current.dispatch({ type: 'SET_FASE', fase: 'foco' })
        result.current.dispatch({ type: 'SET_CICLO', ciclo: 2 })
        result.current.dispatch({ type: 'SET_SESSAO_ID', sessaoId: 42 })
        result.current.dispatch({ type: 'SET_INTERRUPCOES', interrupcoes: ['interrupcao1'] })
        result.current.dispatch({ type: 'SET_CONTEXTO', contexto: { tipo: 'tarefa', id: 1, nome: 'Revisar PR' } })
        result.current.startedAtRef.current = Date.now()
      })
      act(() => { vi.advanceTimersByTime(300) })
      const hb = JSON.parse(localStorage.getItem(HB_KEY) || '{}')
      expect(hb.screen).toBe('running')
      expect(hb.fase).toBe('foco')
      expect(hb.cicloAtual).toBe(2)
      expect(hb.sessaoId).toBe(42)
      expect(hb.interrupcoes).toEqual(['interrupcao1'])
      expect(hb.contextoTipo).toBe('tarefa')
      expect(hb.contextoId).toBe(1)
      expect(hb.contextoNome).toBe('Revisar PR')
    })
  })

  describe('auto-start', () => {
    function irParaFocoEnd(result: { current: ReturnType<typeof usePomodoroContext> }) {
      act(() => {
        result.current.dispatch({ type: 'OVERWRITE_STATE', state: { screen: 'foco_end', ativo: false } })
      })
    }

    it('NAO inicia automaticamente se config.autoStart=false', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      irParaFocoEnd(result)
      expect(result.current.state.screen).toBe('foco_end')
      act(() => { vi.advanceTimersByTime(5000) })
      expect(result.current.state.screen).toBe('foco_end')
    })

    it('inicia automaticamente apos 3s quando autoStart=true e screen=foco_end', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.setConfig(prev => ({ ...prev, autoStart: true })) })
      irParaFocoEnd(result)
      expect(result.current.state.screen).toBe('foco_end')
      act(() => { vi.advanceTimersByTime(2999) })
      expect(result.current.state.screen).toBe('foco_end')
      act(() => { vi.advanceTimersByTime(1) })
      expect(result.current.state.screen).toBe('running')
      expect(result.current.state.ativo).toBe(true)
    })
  })

  describe('distracoes', () => {
    it('registra listener de blur quando screen=running', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.dispatch({ type: 'SET_SCREEN', screen: 'running' }) })
      expect(addSpy).toHaveBeenCalledWith('blur', expect.any(Function))
      addSpy.mockRestore()
    })

    it('incrementa distracoes via dispatch INCREMENT_DISTRACAO', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.dispatch({ type: 'INCREMENT_DISTRACAO' }) })
      expect(result.current.state.distracoes).toBe(1)
    })

    it('zera distracoes ao entrar em running', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => { result.current.dispatch({ type: 'SET_DISTRACOES', distracoes: 5 }) })
      act(() => { result.current.dispatch({ type: 'SET_SCREEN', screen: 'running' }) })
      expect(result.current.state.distracoes).toBe(0)
    })
  })

  describe('screen transitions', () => {
    it('estado inicial: idle, foco, ciclo 0', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      expect(result.current.state.screen).toBe('idle')
      expect(result.current.state.fase).toBe('foco')
      expect(result.current.state.cicloAtual).toBe(0)
      expect(result.current.state.ativo).toBe(false)
    })

    it('tick loop finaliza foco e vai para foco_end', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => {
        result.current.dispatch({ type: 'SET_SCREEN', screen: 'running' })
        result.current.dispatch({ type: 'SET_ATIVO', ativo: true })
        result.current.dispatch({ type: 'SET_FASE', fase: 'foco' })
        result.current.startedAtRef.current = Date.now() - 25 * 60 * 1000 - 1
      })
      act(() => { vi.advanceTimersByTime(300) })
      expect(result.current.state.screen).toBe('foco_end')
      expect(result.current.state.ativo).toBe(false)
    })

    it('modo livre exibe tempo decorrido', () => {
      const { result } = renderHook(() => usePomodoroContext(), { wrapper: createWrapper() })
      act(() => {
        result.current.dispatch({ type: 'SET_SCREEN', screen: 'livre' })
        result.current.dispatch({ type: 'SET_ATIVO', ativo: true })
        result.current.startedAtRef.current = Date.now() - 125 * 1000
      })
      act(() => { vi.advanceTimersByTime(300) })
      expect(result.current.state.minutos).toBe(2)
      expect(result.current.state.segundos).toBe(5)
    })
  })
})
