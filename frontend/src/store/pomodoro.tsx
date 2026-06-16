import { createContext, useContext, useState, useEffect, useRef, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { useBroadcastSync } from '../hooks/useBroadcastSync'

type Fase = 'foco' | 'pausa_curta' | 'pausa_longa'

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
  } catch {}
  return DEFAULT_CONFIG
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
  const startedAtRef = useRef(0)

  // Persist config
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {}
  }, [config])

  // Reset timer to current phase duration
  const resetTimer = () => {
    const durations: Record<Fase, number> = {
      foco: config.focoMin,
      pausa_curta: config.pausaCurtaMin,
      pausa_longa: config.pausaLongaMin,
    }
    setMinutos(durations[fase])
    setSegundos(0)
  }

  // Advance to next phase
  const advancePhase = () => {
    if (fase === 'foco') {
      const nextCiclo = cicloAtual + 1
      setCicloAtual(nextCiclo)
      const isPausaLonga = nextCiclo % config.ciclosAtePausaLonga === 0
      setFase(isPausaLonga ? 'pausa_longa' : 'pausa_curta')
    } else {
      setFase('foco')
    }
  }

  // Reset timer when phase changes
  useEffect(() => {
    resetTimer()
  }, [fase, config])

  useBroadcastSync('sync:pomodoro', { sessaoId, minutos, segundos, ativo, fase, cicloAtual }, (data) => {
    setSessaoId(data.sessaoId ?? null)
    setMinutos(data.minutos)
    setSegundos(data.segundos)
    setAtivo(data.ativo)
    setFase(data.fase as Fase)
    setCicloAtual(data.cicloAtual)
    startedAtRef.current = Date.now()
  }, !!sessaoId || ativo)

  return (
    <PomodoroContext.Provider value={{
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
    }}>
      {children}
    </PomodoroContext.Provider>
  )
}

export function usePomodoroContext() {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error('usePomodoroContext must be inside PomodoroProvider')
  return ctx
}
