import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useConfig } from '../store/config'

interface ZenModeContextType {
  zenMode: boolean
  toggleZen: () => void
}

const ZenModeContext = createContext<ZenModeContextType | null>(null)

export function ZenModeProvider({ children }: { children: ReactNode }) {
  const { config } = useConfig()
  const disabled = config.zenModeDesativado
  const [zenMode, setZenMode] = useState(() => {
    if (disabled) return false
    try { return localStorage.getItem('mindflow_zen_mode') === 'true' } catch { return false }
  })

  useEffect(() => {
    if (disabled) setZenMode(false)
  }, [disabled])

  useEffect(() => {
    try { localStorage.setItem('mindflow_zen_mode', String(zenMode)) } catch { /* silent */ }
  }, [zenMode])

  useEffect(() => {
    const handler = () => { if (!disabled) setZenMode(p => !p) }
    window.addEventListener('toggle-zen', handler)
    return () => window.removeEventListener('toggle-zen', handler)
  }, [disabled])

  const toggleZen = useCallback(() => {
    setZenMode(p => !p)
  }, [])

  const value = { zenMode: disabled ? false : zenMode, toggleZen: disabled ? (() => {}) : toggleZen }

  return (
    <ZenModeContext.Provider value={value}>
      {children}
    </ZenModeContext.Provider>
  )
}

export function useZenMode() {
  const ctx = useContext(ZenModeContext)
  if (!ctx) throw new Error('useZenMode must be used within ZenModeProvider')
  return ctx
}
