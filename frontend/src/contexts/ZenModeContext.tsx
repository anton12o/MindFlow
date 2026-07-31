/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useConfig } from '../store/config'

interface ZenModeContextType {
  zenMode: boolean
  toggleZen: () => void
}

const ZenModeContext = createContext<ZenModeContextType | null>(null)

const NOOP = () => {}

export function ZenModeProvider({ children }: { children: ReactNode }) {
  const { config } = useConfig()
  const disabled = config.zenModeDesativado
  const [internalZen, setInternalZen] = useState(() => {
    try { return localStorage.getItem('mindflow_zen_mode') === 'true' } catch { return false }
  })

  const zenMode = disabled ? false : internalZen

  useEffect(() => {
    try { localStorage.setItem('mindflow_zen_mode', String(internalZen)) } catch { /* silent */ }
  }, [internalZen])

  useEffect(() => {
    const handler = () => { if (!disabled) setInternalZen(p => !p) }
    window.addEventListener('toggle-zen', handler)
    return () => window.removeEventListener('toggle-zen', handler)
  }, [disabled])

  const toggleZen = useCallback(() => {
    setInternalZen(p => !p)
  }, [])

  const value = useMemo(() => ({
    zenMode,
    toggleZen: disabled ? NOOP : toggleZen,
  }), [zenMode, disabled, toggleZen])

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
