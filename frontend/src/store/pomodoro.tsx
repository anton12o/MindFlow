import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, startTransition, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { useBroadcastSync } from '../hooks/useBroadcastSync'

export type Fase = 'foco' | 'pausa_curta' | 'pausa_longa'
export type PomodoroScreen = 'idle' | 'running' | 'pausado' | 'foco_end' | 'pausa_end' | 'livre'

interface PomodoroConfig {
  focoMin: number
  pausaCurtaMin: number
  pausaLongaMin: number
  ciclosAtePausaLonga: number
}

const DEFAULT_CONFIG: PomodoroConfig = {
  focoMin: 25,
  pausaCurtaMin: 5,
  pausaLongaMin: 15,
  ciclosAtePausaLonga: 4,
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
    } catch { /* audio not available */ }
  }
  if (ctx.state === 'suspended') {
    ctx.resume().then(run).catch(run)
  } else {
    run()
  }
}

interface PomodoroContextType {
  // Timer state
  minutos: number
  segundos: number
  setMinutos: Dispatch<SetStateAction<number>>
  setSegundos: Dispatch<SetStateAction<number>>
  ativo: boolean
  setAtivo: Dispatch<SetStateAction<boolean>>
  sessaoId: number | null
  setSessaoId: Dispatch<SetStateAction<number | null>>
  resumo: string
  setResumo: Dispatch<SetStateAction<string>>
  mostrarResumo: boolean
  setMostrarResumo: Dispatch<SetStateAction<boolean>>
  // Config
  config: PomodoroConfig
  setConfig: Dispatch<SetStateAction<PomodoroConfig>>
  // Cycle state
  cicloAtual: number
  setCicloAtual: Dispatch<SetStateAction<number>>
  fase: Fase
  setFase: Dispatch<SetStateAction<Fase>>
  // Actions
  resetTimer: () => void
  advancePhase: () => void
  // Timestamp ref for smooth resume
  startedAtRef: React.MutableRefObject<number>
  // Global Pomodoro screen/state
  screen: PomodoroScreen
  setScreen: Dispatch<SetStateAction<PomodoroScreen>>
  interrupcoes: string[]
  setInterrupcoes: Dispatch<SetStateAction<string[]>>
  contexto: { tipo: string; id: number; nome: string } | null
  setContexto: Dispatch<SetStateAction<{ tipo: string; id: number; nome: string } | null>>
  audioCtxRef: React.MutableRefObject<AudioContext | null>
  saveHeartbeat: () => void
  clearHeartbeat: () => void
}

const PomodoroContext = createContext<PomodoroContextType | null>(null)

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PomodoroConfig>(() => loadConfig())
  const [minutos, setMinutos] = useState(config.focoMin)
  const [segundos, setSegundos] = useState(0)
  const [ativo, setAtivo] = useState(false)
  const [sessaoId, setSessaoId] = useState<number | null>(null)
  const [resumo, setResumo] = useState('')
  const [mostrarResumo, setMostrarResumo] = useState(false)
  const [cicloAtual, setCicloAtual] = useState(0)
  const [fase, setFase] = useState<Fase>('foco')
  const [screen, setScreen] = useState<PomodoroScreen>('idle')
  const [interrupcoes, setInterrupcoes] = useState<string[]>([])
  const [contexto, setContexto] = useState<{ tipo: string; id: number; nome: string } | null>(null)
  
  const startedAtRef = useRef(0)
  const lastDisplaySecRef = useRef(-1)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    return () => { audioCtxRef.current?.close() }
  }, [])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  // Persist config
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch (e) { console.error('[pomodoro.persist]', e) }
  }, [config])

  // Reset timer to current phase duration
  const resetTimer = useCallback(() => {
    const durations: Record<Fase, number> = {
      foco: config.focoMin,
      pausa_curta: config.pausaCurtaMin,
      pausa_longa: config.pausaLongaMin,
    }
    setMinutos(durations[fase])
    setSegundos(0)
  }, [config, fase])

  // Advance to next phase
  const advancePhase = useCallback(() => {
    if (fase === 'foco') {
      const nextCiclo = cicloAtual + 1
      setCicloAtual(nextCiclo)
      const isPausaLonga = nextCiclo % config.ciclosAtePausaLonga === 0
      setFase(isPausaLonga ? 'pausa_longa' : 'pausa_curta')
    } else {
      setFase('foco')
    }
  }, [cicloAtual, config, fase])

  // Reset timer when phase changes
  useEffect(() => {
    startTransition(() => resetTimer())
  }, [fase, config])

  // Heartbeat
  const HB_KEY = 'mindflow_pomodoro_heartbeat'
  const saveHeartbeat = () => {
    if (screen !== 'running' && screen !== 'pausado' && screen !== 'livre') return
    const elapsed = Date.now() - startedAtRef.current
    const remainingMs = screen === 'livre' ? 0 : Math.max(0, (fase === 'foco' ? config.focoMin : fase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000 - elapsed)
    try {
      localStorage.setItem(HB_KEY, JSON.stringify({
        savedAt: Date.now(), screen, fase, cicloAtual, sessaoId,
        interrupcoes, remainingMs, minutos, segundos,
        contextoTipo: contexto?.tipo || null,
        contextoId: contexto?.id || null,
        contextoNome: contexto?.nome || null,
      }))
    } catch (e) { console.error('[pomodoro.saveHeartbeat]', e) }
  }
  const clearHeartbeat = () => { try { localStorage.removeItem(HB_KEY) } catch (e) { console.error('[pomodoro.clearHeartbeat]', e) } }

  // Tick loop
  useEffect(() => {
    if (!ativo || (screen !== 'running' && screen !== 'livre')) return

    if (screen === 'livre') {
      const checkTimer = () => {
        const elapsed = Date.now() - startedAtRef.current
        const totalSec = Math.floor(elapsed / 1000)
        if (totalSec !== lastDisplaySecRef.current) {
          lastDisplaySecRef.current = totalSec
          setMinutos(Math.floor(totalSec / 60))
          setSegundos(totalSec % 60)
          saveHeartbeat()
        }
      }
      checkTimer()
      const interval = setInterval(checkTimer, 200)
      return () => clearInterval(interval)
    }

    const phaseMs = (fase === 'foco' ? config.focoMin : fase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000

    const checkTimer = () => {
      const elapsed = Date.now() - startedAtRef.current
      const remainingMs = Math.max(0, phaseMs - elapsed)
      const totalSec = Math.ceil(remainingMs / 1000)

      if (totalSec !== lastDisplaySecRef.current) {
        lastDisplaySecRef.current = totalSec
        setMinutos(Math.max(0, Math.floor(totalSec / 60)))
        setSegundos(Math.max(0, totalSec % 60))
        saveHeartbeat()
      }

      if (elapsed >= phaseMs) {
        clearHeartbeat()
        setAtivo(false)
        setScreen(fase === 'foco' ? 'foco_end' : 'pausa_end')
        
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          playAlarm(audioCtxRef.current)
        }
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('MindFlow', {
            body: fase === 'foco' ? 'Foco finalizado!' : 'Pausa finalizada!',
            icon: '/icon-192.svg',
          })
        }
      }
    }

    checkTimer()

    const interval = setInterval(checkTimer, 200)
    return () => clearInterval(interval)
  }, [ativo, screen, fase, config, interrupcoes, contexto])

  const broadcastState = useMemo(() => ({
    sessaoId, minutos, segundos, ativo, fase, cicloAtual, screen, interrupcoes,
  }), [sessaoId, minutos, segundos, ativo, fase, cicloAtual, screen, interrupcoes])

  useBroadcastSync('sync:pomodoro', broadcastState, (data) => {
    setSessaoId(data.sessaoId ?? null)
    setMinutos(data.minutos)
    setSegundos(data.segundos)
    setAtivo(data.ativo)
    setFase(data.fase as Fase)
    setCicloAtual(data.cicloAtual)
    setScreen(data.screen as PomodoroScreen)
    setInterrupcoes(data.interrupcoes || [])
    startedAtRef.current = Date.now()
  }, !!sessaoId || ativo)

  const contextValue = useMemo(() => ({
    minutos, setMinutos, segundos, setSegundos,
    ativo, setAtivo,
    sessaoId, setSessaoId,
    resumo, setResumo,
    mostrarResumo, setMostrarResumo,
    config, setConfig,
    cicloAtual, setCicloAtual,
    fase, setFase,
    resetTimer,
    advancePhase,
    startedAtRef,
    screen, setScreen,
    interrupcoes, setInterrupcoes,
    contexto, setContexto,
    audioCtxRef,
    saveHeartbeat,
    clearHeartbeat,
  }), [
    minutos, segundos, ativo, sessaoId, resumo, mostrarResumo,
    config, cicloAtual, fase, screen, interrupcoes, contexto,
    resetTimer, advancePhase, saveHeartbeat, clearHeartbeat,
  ])

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
