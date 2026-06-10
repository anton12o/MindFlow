import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem('mindflow-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // localStorage indisponível (modo privado, etc.)
  }
  return 'dark'
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem('mindflow-theme', theme)
  } catch {
    // falha silenciosa
  }
}

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
}>({ theme: 'dark', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  useEffect(() => {
    saveTheme(theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
