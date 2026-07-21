import { createContext, useContext, useState, useReducer, useEffect, useRef, useMemo, useCallback, startTransition, type ReactNode, type Dispatch } from 'react'
import { useBroadcastSync } from '../hooks/useBroadcastSync'
import { usePushNotifications } from '../hooks/usePushNotifications'

export type Fase = 'foco' | 'pausa_curta' | 'pausa_longa'
export type PomodoroScreen = 'idle' | 'running' | 'pausado' | 'foco_end' | 'pausa_end' | 'livre'

export interface PomodoroConfig {
  focoMin: number
  pausaCurtaMin: number
  pausaLongaMin: number
  ciclosAtePausaLonga: number
  dailyFocusMin: number
  autoStart: boolean
  dnd: boolean
  descansoMin: number
}

const DEFAULT_CONFIG: PomodoroConfig = {
  focoMin: 25,
  pausaCurtaMin: 5,
  pausaLongaMin: 15,
  ciclosAtePausaLonga: 4,
  dailyFocusMin: 120,
  autoStart: false,
  dnd: false,
  descansoMin: 5,
}

const STORAGE_KEY = 'mindflow_pomodoro_config'

function loadConfig(): PomodoroConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_CONFIG, ...parsed }
    }
  } catch (e) { console.error('[pomodoro.loadConfig]', e) }
  return DEFAULT_CONFIG
}

function playAlarm(ctx: AudioContext) {
  const run = () => {
    try {
      const freqs = [660, 880, 1040]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'square'
        const t = ctx.currentTime + i * 0.15
        gain.gain.setValueAtTime(0.25, t)
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2)
        osc.start(t)
        osc.stop(t + 0.2)
      })
    } catch (e) { console.error('[pomodoro] beep audio', e) }
  }
  if (ctx.state === 'suspended') {
    ctx.resume().then(run).catch(run)
  } else {
    run()
  }
}

// --- State ---
export interface PomodoroState {
  minutos: number
  segundos: number
  ativo: boolean
  sessaoId: number | null
  resumo: string
  mostrarResumo: boolean
  cicloAtual: number
  fase: Fase
  screen: PomodoroScreen
  interrupcoes: string[]
  distracoes: number
  contexto: { tipo: string; id: number; nome: string } | null
}

const initialConfig = loadConfig()
const initialState: PomodoroState = {
  minutos: initialConfig.focoMin,
  segundos: 0,
  ativo: false,
  sessaoId: null,
  resumo: '',
  mostrarResumo: false,
  cicloAtual: 0,
  fase: 'foco',
  screen: 'idle',
  interrupcoes: [],
  distracoes: 0,
  contexto: null,
}

// --- Actions ---
export type PomodoroAction =
  | { type: 'SET_TIMER'; minutos: number; segundos: number }
  | { type: 'SET_ATIVO'; ativo: boolean }
  | { type: 'SET_SESSAO_ID'; sessaoId: number | null }
  | { type: 'SET_RESUMO'; resumo: string }
  | { type: 'SET_MOSTRAR_RESUMO'; mostrar: boolean }
  | { type: 'SET_CICLO'; ciclo: number }
  | { type: 'SET_FASE'; fase: Fase }
  | { type: 'SET_SCREEN'; screen: PomodoroScreen }
  | { type: 'SET_INTERRUPCOES'; interrupcoes: string[] }
  | { type: 'ADD_INTERRUPCAO'; texto: string }
  | { type: 'SET_DISTRACOES'; distracoes: number }
  | { type: 'INCREMENT_DISTRACAO' }
  | { type: 'RESET_DISTRACOES' }
  | { type: 'SET_CONTEXTO'; contexto: { tipo: string; id: number; nome: string } | null }
  | { type: 'ADVANCE_PHASE'; ciclosAtePausaLonga: number }
  | { type: 'RESET_TIMER'; durations: Record<Fase, number> }
  | { type: 'OVERWRITE_STATE'; state: Partial<PomodoroState> }

function canTransition(de: PomodoroScreen, para: PomodoroScreen): boolean {
  const valid: Record<PomodoroScreen, PomodoroScreen[]> = {
    idle: ['running', 'livre'],
    running: ['idle', 'pausado', 'foco_end', 'pausa_end'],
    pausado: ['idle', 'running'],
    livre: ['idle'],
    foco_end: ['idle', 'running'],
    pausa_end: ['idle', 'running'],
  }
  return valid[de].includes(para)
}

function pomodoroReducer(state: PomodoroState, action: PomodoroAction): PomodoroState {
  switch (action.type) {
    case 'SET_TIMER':
      return { ...state, minutos: action.minutos, segundos: action.segundos }
    case 'SET_ATIVO':
      return { ...state, ativo: action.ativo }
    case 'SET_SESSAO_ID':
      return { ...state, sessaoId: action.sessaoId }
    case 'SET_RESUMO':
      return { ...state, resumo: action.resumo }
    case 'SET_MOSTRAR_RESUMO':
      return { ...state, mostrarResumo: action.mostrar }
    case 'SET_CICLO':
      return { ...state, cicloAtual: action.ciclo }
    case 'SET_FASE':
      return { ...state, fase: action.fase }
    case 'SET_SCREEN': {
      if (!canTransition(state.screen, action.screen)) return state
      return { ...state, screen: action.screen }
    }
    case 'SET_INTERRUPCOES':
      return { ...state, interrupcoes: action.interrupcoes }
    case 'ADD_INTERRUPCAO':
      return { ...state, interrupcoes: [...state.interrupcoes, action.texto] }
    case 'SET_DISTRACOES':
      return { ...state, distracoes: action.distracoes }
    case 'INCREMENT_DISTRACAO':
      return { ...state, distracoes: state.distracoes + 1 }
    case 'RESET_DISTRACOES':
      return { ...state, distracoes: 0 }
    case 'SET_CONTEXTO':
      return { ...state, contexto: action.contexto }
    case 'ADVANCE_PHASE': {
      if (state.fase === 'foco') {
        const nextCiclo = state.cicloAtual + 1
        const isPausaLonga = nextCiclo % action.ciclosAtePausaLonga === 0
        return {
          ...state,
          cicloAtual: nextCiclo,
          fase: isPausaLonga ? 'pausa_longa' : 'pausa_curta',
        }
      }
      return { ...state, fase: 'foco' }
    }
    case 'RESET_TIMER':
      return { ...state, minutos: action.durations[state.fase], segundos: 0 }
    case 'OVERWRITE_STATE':
      return { ...state, ...action.state }
  }
}

// --- Context ---
interface PomodoroContextType {
  state: PomodoroState
  dispatch: Dispatch<PomodoroAction>
  config: PomodoroConfig
  setConfig: React.Dispatch<React.SetStateAction<PomodoroConfig>>
  resetTimer: () => void
  advancePhase: () => void
  startedAtRef: React.MutableRefObject<number>
  audioCtxRef: React.MutableRefObject<AudioContext | null>
  saveHeartbeat: () => void
  clearHeartbeat: () => void
}

const PomodoroContext = createContext<PomodoroContextType | null>(null)

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PomodoroConfig>(() => loadConfig())
  const [state, dispatch] = useReducer(pomodoroReducer, initialState)

  const startedAtRef = useRef(0)
  const lastDisplaySecRef = useRef(-1)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const { requestPermission, notify } = usePushNotifications()

  useEffect(() => {
    requestPermission()
    return () => { audioCtxRef.current?.close() }
  }, [requestPermission])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  useEffect(() => {
    if (state.screen === 'running' || state.screen === 'livre') {
      startTransition(() => dispatch({ type: 'RESET_DISTRACOES' }))
    }
  }, [state.screen])

  useEffect(() => {
    if (state.screen !== 'running' && state.screen !== 'livre') return
    const handler = () => dispatch({ type: 'INCREMENT_DISTRACAO' })
    window.addEventListener('blur', handler)
    return () => window.removeEventListener('blur', handler)
  }, [state.screen])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch (e) { console.error('[pomodoro.persist]', e) }
  }, [config])

  const resetTimer = useCallback(() => {
    const durations: Record<Fase, number> = {
      foco: config.focoMin,
      pausa_curta: config.pausaCurtaMin,
      pausa_longa: config.pausaLongaMin,
    }
    dispatch({ type: 'RESET_TIMER', durations })
  }, [config])

  const advancePhase = useCallback(() => {
    dispatch({ type: 'ADVANCE_PHASE', ciclosAtePausaLonga: config.ciclosAtePausaLonga })
  }, [config.ciclosAtePausaLonga])

  useEffect(() => {
    startTransition(() => resetTimer())
  }, [state.fase, config])

  const HB_KEY = 'mindflow_pomodoro_heartbeat'
  const clearHeartbeat = useCallback(() => {
    try { localStorage.removeItem(HB_KEY) } catch (e) { console.error('[pomodoro.clearHeartbeat]', e) }
  }, [])
  const saveHeartbeat = useCallback(() => {
    if (state.screen !== 'running' && state.screen !== 'pausado' && state.screen !== 'livre') return
    const elapsed = Date.now() - startedAtRef.current
    const remainingMs = state.screen === 'livre' ? 0 : Math.max(0, (state.fase === 'foco' ? config.focoMin : state.fase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000 - elapsed)
    try {
      localStorage.setItem(HB_KEY, JSON.stringify({
        savedAt: Date.now(), screen: state.screen, fase: state.fase, cicloAtual: state.cicloAtual, sessaoId: state.sessaoId,
        interrupcoes: state.interrupcoes, distracoes: state.distracoes, remainingMs, minutos: state.minutos, segundos: state.segundos,
        contextoTipo: state.contexto?.tipo || null,
        contextoId: state.contexto?.id || null,
        contextoNome: state.contexto?.nome || null,
      }))
    } catch (e) { console.error('[pomodoro.saveHeartbeat]', e) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.screen, state.fase, state.cicloAtual, state.sessaoId, state.distracoes, state.minutos, state.segundos, state.contexto, config])

  useEffect(() => {
    if (!config.autoStart) return
    if (state.screen === 'foco_end' || state.screen === 'pausa_end') {
      const timer = setTimeout(() => {
        advancePhase()
        dispatch({ type: 'SET_SCREEN', screen: 'running' })
        dispatch({ type: 'SET_ATIVO', ativo: true })
        startedAtRef.current = Date.now()
        clearHeartbeat()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [state.screen, config.autoStart, advancePhase, clearHeartbeat])

  useEffect(() => {
    if (!state.ativo || (state.screen !== 'running' && state.screen !== 'livre')) return

    if (state.screen === 'livre') {
      const checkTimer = () => {
        const elapsed = Date.now() - startedAtRef.current
        const totalSec = Math.floor(elapsed / 1000)
        if (totalSec !== lastDisplaySecRef.current) {
          lastDisplaySecRef.current = totalSec
          dispatch({ type: 'SET_TIMER', minutos: Math.floor(totalSec / 60), segundos: totalSec % 60 })
          saveHeartbeat()
        }
      }
      checkTimer()
      const interval = setInterval(checkTimer, 200)
      return () => clearInterval(interval)
    }

    const phaseMs = (state.fase === 'foco' ? config.focoMin : state.fase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000

    const checkTimer = () => {
      const elapsed = Date.now() - startedAtRef.current
      const remainingMs = Math.max(0, phaseMs - elapsed)
      const totalSec = Math.ceil(remainingMs / 1000)

      if (totalSec !== lastDisplaySecRef.current) {
        lastDisplaySecRef.current = totalSec
        dispatch({ type: 'SET_TIMER', minutos: Math.max(0, Math.floor(totalSec / 60)), segundos: Math.max(0, totalSec % 60) })
        saveHeartbeat()
      }

      if (elapsed >= phaseMs) {
        clearHeartbeat()
        dispatch({ type: 'SET_ATIVO', ativo: false })
        dispatch({ type: 'SET_SCREEN', screen: state.fase === 'foco' ? 'foco_end' : 'pausa_end' })

        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          playAlarm(audioCtxRef.current)
        }
        notify(state.fase === 'foco' ? 'Foco finalizado!' : 'Pausa finalizada!')
      }
    }

    checkTimer()
    const interval = setInterval(checkTimer, 200)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ativo, state.screen, state.fase, config, state.interrupcoes, state.contexto])

  // eslint-disable-next-line react-hooks/refs
  const broadcastState = useMemo(() => ({
    sessaoId: state.sessaoId, minutos: state.minutos, segundos: state.segundos,
    ativo: state.ativo, fase: state.fase, cicloAtual: state.cicloAtual,
    screen: state.screen, interrupcoes: state.interrupcoes,
    distracoes: state.distracoes, startedAt: startedAtRef.current,
  }), [state.sessaoId, state.minutos, state.segundos, state.ativo, state.fase, state.cicloAtual, state.screen, state.interrupcoes, state.distracoes])

  useBroadcastSync('sync:pomodoro', broadcastState, (data) => {
    dispatch({ type: 'OVERWRITE_STATE', state: {
      sessaoId: data.sessaoId ?? null,
      minutos: data.minutos,
      segundos: data.segundos,
      ativo: data.ativo,
      fase: data.fase as Fase,
      cicloAtual: data.cicloAtual,
      screen: data.screen as PomodoroScreen,
      interrupcoes: data.interrupcoes || [],
    }})
    if (data.startedAt && typeof data.startedAt === 'number') {
      startedAtRef.current = data.startedAt
    }
  }, !!state.sessaoId || state.ativo)

  const contextValue = useMemo(() => ({
    state, dispatch,
    config, setConfig,
    resetTimer, advancePhase,
    startedAtRef, audioCtxRef,
    saveHeartbeat, clearHeartbeat,
  }), [state, config, resetTimer, advancePhase, saveHeartbeat, clearHeartbeat])

  return (
    <PomodoroContext.Provider value={contextValue}>
      {children}
    </PomodoroContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePomodoroContext() {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error('usePomodoroContext must be inside PomodoroProvider')
  return ctx
}
