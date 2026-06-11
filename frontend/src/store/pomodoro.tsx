import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'

interface PomodoroContextType {
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
}

const PomodoroContext = createContext<PomodoroContextType | null>(null)

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [minutos, setMinutos] = useState(25)
  const [segundos, setSegundos] = useState(0)
  const [ativo, setAtivo] = useState(false)
  const [sessaoId, setSessaoId] = useState<number | null>(null)
  const [resumo, setResumo] = useState('')
  const [mostrarResumo, setMostrarResumo] = useState(false)

  return (
    <PomodoroContext.Provider value={{ minutos, setMinutos, segundos, setSegundos, ativo, setAtivo, sessaoId, setSessaoId, resumo, setResumo, mostrarResumo, setMostrarResumo }}>
      {children}
    </PomodoroContext.Provider>
  )
}

export function usePomodoroContext() {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error('usePomodoroContext must be inside PomodoroProvider')
  return ctx
}
