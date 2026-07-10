import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { useBroadcastSync } from '../hooks/useBroadcastSync'

type Theme = 'dark' | 'light'
type ThemeMode = Theme | 'system'

type CustomTheme = Partial<Record<string, string>>

const CUSTOM_KEY = 'mindflow_custom_theme'

function loadCustom(): CustomTheme {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { /* silent */; return {} }
}

function saveCustom(t: CustomTheme) {
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(t)) } catch { /* silent */ }
}

function loadTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('mindflow-theme')
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch { /* silent */ }
  return 'dark'
}

function saveTheme(theme: ThemeMode) {
  try { localStorage.setItem('mindflow-theme', theme) } catch { /* silent */ }
}

function getSystemTheme(): Theme {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' }
  catch { /* silent */; return 'dark' }
}

function resolveTheme(mode: ThemeMode): Theme {
  return mode === 'system' ? getSystemTheme() : mode
}

const ThemeContext = createContext<{
  mode: ThemeMode
  theme: Theme
  cycleTheme: () => void
  customTheme: CustomTheme
  setCustomTheme: (t: CustomTheme) => void
  resetCustomTheme: () => void
}>({ mode: 'dark', theme: 'dark', cycleTheme: () => {}, customTheme: {}, setCustomTheme: () => {}, resetCustomTheme: () => {} })

const NEXT_MODE: Record<ThemeMode, ThemeMode> = { dark: 'light', light: 'system', system: 'dark' }
const MODE_ICON: Record<ThemeMode, string> = { dark: '🌙', light: '☀️', system: '🖥️' }

// eslint-disable-next-line react-refresh/only-export-components
export const PRESET_COLORS = [
  { name: 'Roxo', colors: { '--color-accent': '#8B5CF6', '--color-accent-hover': '#7C3AED' } },
  { name: 'Azul', colors: { '--color-accent': '#3B82F6', '--color-accent-hover': '#2563EB' } },
  { name: 'Verde', colors: { '--color-accent': '#10B981', '--color-accent-hover': '#059669' } },
  { name: 'Vermelho', colors: { '--color-accent': '#EF4444', '--color-accent-hover': '#DC2626' } },
  { name: 'Laranja', colors: { '--color-accent': '#F97316', '--color-accent-hover': '#EA580C' } },
  { name: 'Rosa', colors: { '--color-accent': '#EC4899', '--color-accent-hover': '#DB2777' } },
  { name: 'Ciano', colors: { '--color-accent': '#06B6D4', '--color-accent-hover': '#0891B2' } },
  { name: 'Amarelo', colors: { '--color-accent': '#EAB308', '--color-accent-hover': '#CA8A04' } },
  { name: 'Indigo', colors: { '--color-accent': '#6366F1', '--color-accent-hover': '#4F46E5' } },
  { name: 'Violeta', colors: { '--color-accent': '#A855F7', '--color-accent-hover': '#9333EA' } },
  { name: 'Teal', colors: { '--color-accent': '#14B8A6', '--color-accent-hover': '#0D9488' } },
  { name: 'Lime', colors: { '--color-accent': '#84CC16', '--color-accent-hover': '#65A30D' } },
  { name: 'Ambar', colors: { '--color-accent': '#F59E0B', '--color-accent-hover': '#D97706' } },
  { name: 'Slate', colors: { '--color-accent': '#94A3B8', '--color-accent-hover': '#64748B' } },
  { name: 'Default', colors: {} },
]

// eslint-disable-next-line react-refresh/only-export-components
export function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent))
  const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(loadTheme)
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(mode))
  const [customTheme, setCustomThemeState] = useState<CustomTheme>(loadCustom)
  const prevKeysRef = useRef<string[]>([])

  useEffect(() => {
    saveTheme(mode)
    document.documentElement.setAttribute('data-theme', theme)
  }, [mode, theme])

  useEffect(() => {
    saveCustom(customTheme)
    const root = document.documentElement
    const newKeys = Object.keys(customTheme)
    for (const key of prevKeysRef.current) {
      if (!(key in customTheme)) root.style.removeProperty(key)
    }
    for (const [key, val] of Object.entries(customTheme)) {
      if (val) root.style.setProperty(key, val)
    }
    prevKeysRef.current = newKeys
  }, [customTheme])

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

  function setCustomTheme(t: CustomTheme) {
    setCustomThemeState(prev => ({ ...prev, ...t }))
  }

  function resetCustomTheme() {
    setCustomThemeState({})
  }

  return (
    <ThemeContext.Provider value={{ mode, theme, cycleTheme, customTheme, setCustomTheme, resetCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext)
}

export { MODE_ICON }
