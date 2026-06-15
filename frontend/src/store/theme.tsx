import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useBroadcastSync } from '../hooks/useBroadcastSync'

type Theme = 'dark' | 'light'
type ThemeMode = Theme | 'system'

function loadTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('mindflow-theme')
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // localStorage indisponível (modo privado, etc.)
  }
  return 'dark'
}

function saveTheme(theme: ThemeMode) {
  try {
    localStorage.setItem('mindflow-theme', theme)
  } catch {
    // falha silenciosa
  }
}

function getSystemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'dark'
  }
}

function resolveTheme(mode: ThemeMode): Theme {
  return mode === 'system' ? getSystemTheme() : mode
}

const ThemeContext = createContext<{
  mode: ThemeMode
  theme: Theme
  cycleTheme: () => void
}>({ mode: 'dark', theme: 'dark', cycleTheme: () => {} })

const NEXT_MODE: Record<ThemeMode, ThemeMode> = { dark: 'light', light: 'system', system: 'dark' }
const MODE_ICON: Record<ThemeMode, string> = { dark: '☾', light: '☀', system: '💻' }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(loadTheme)
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(mode))

  // Apply theme to DOM
  useEffect(() => {
    saveTheme(mode)
    document.documentElement.setAttribute('data-theme', theme)
  }, [mode, theme])

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setTheme(getSystemTheme())
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  useBroadcastSync('sync:theme', mode, (next) => {
    if (next !== mode) {
      setMode(next as typeof mode)
      setTheme(resolveTheme(next as typeof mode))
    }
  })

  function cycleTheme() {
    setMode(m => {
      const next = NEXT_MODE[m]
      setTheme(resolveTheme(next))
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ mode, theme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export { MODE_ICON }
