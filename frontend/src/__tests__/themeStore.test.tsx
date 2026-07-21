import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { ThemeProvider, useTheme, PRESET_COLORS } from '../store/theme'

vi.mock('../hooks/useBroadcastSync', () => ({
  useBroadcastSync: () => {},
}))

const THEME_KEY = 'mindflow-theme'
const CUSTOM_KEY = 'mindflow_custom_theme'

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.cssText = ''
  })

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.cssText = ''
  })

  function renderTheme() {
    return renderHook(() => useTheme(), { wrapper: ThemeProvider })
  }

  it('default mode é dark quando localStorage vazio', () => {
    const { result } = renderTheme()
    expect(result.current.mode).toBe('dark')
    expect(result.current.theme).toBe('dark')
  })

  it('carrega tema salvo no localStorage', () => {
    localStorage.setItem(THEME_KEY, 'light')
    const { result } = renderTheme()
    expect(result.current.mode).toBe('light')
    expect(result.current.theme).toBe('light')
  })

  it('carrega system do localStorage e resolve para light (matchMedia mock)', () => {
    localStorage.setItem(THEME_KEY, 'system')
    const { result } = renderTheme()
    expect(result.current.mode).toBe('system')
    expect(result.current.theme).toBe('light')
  })

  it('cycleTheme: dark → light → system → dark', () => {
    const { result } = renderTheme()
    expect(result.current.mode).toBe('dark')

    act(() => result.current.cycleTheme())
    expect(result.current.mode).toBe('light')
    expect(result.current.theme).toBe('light')

    act(() => result.current.cycleTheme())
    expect(result.current.mode).toBe('system')
    expect(result.current.theme).toBe('light')

    act(() => result.current.cycleTheme())
    expect(result.current.mode).toBe('dark')
    expect(result.current.theme).toBe('dark')
  })

  it('persiste modo no localStorage ao ciclar', () => {
    const { result } = renderTheme()
    act(() => result.current.cycleTheme())
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
  })

  it('aplica data-theme no documentElement', () => {
    renderTheme()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('atualiza data-theme ao ciclar', () => {
    const { result } = renderTheme()
    act(() => result.current.cycleTheme())
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('customTheme inicia vazio', () => {
    const { result } = renderTheme()
    expect(result.current.customTheme).toEqual({})
  })

  it('setCustomTheme faz merge no customTheme', () => {
    const { result } = renderTheme()
    act(() => result.current.setCustomTheme({ '--color-accent': '#ff0000' }))
    expect(result.current.customTheme).toEqual({
      '--color-accent': '#ff0000',
      '--color-accent-foreground': '#FFFFFF',
      '--color-accent-hover': '#ff4d4d',
    })

    act(() => result.current.setCustomTheme({ '--bg': '#000' }))
    expect(result.current.customTheme).toEqual({
      '--color-accent': '#ff0000',
      '--color-accent-foreground': '#FFFFFF',
      '--color-accent-hover': '#ff4d4d',
      '--bg': '#000',
    })
  })

  it('resetCustomTheme limpa customTheme', () => {
    const { result } = renderTheme()
    act(() => result.current.setCustomTheme({ '--color-accent': '#ff0000' }))
    act(() => result.current.resetCustomTheme())
    expect(result.current.customTheme).toEqual({})
  })

  it('aplica CSS variables no documentElement', () => {
    const { result } = renderTheme()
    act(() => result.current.setCustomTheme({ '--color-accent': '#ff0000' }))
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('#ff0000')
  })

  it('remove CSS variables ao resetar', () => {
    const { result } = renderTheme()
    act(() => result.current.setCustomTheme({ '--color-accent': '#ff0000' }))
    act(() => result.current.resetCustomTheme())
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('')
  })

  it('persiste customTheme no localStorage', () => {
    const { result } = renderTheme()
    act(() => result.current.setCustomTheme({ '--color-accent': '#ff0000' }))
    const saved = JSON.parse(localStorage.getItem(CUSTOM_KEY)!)
    expect(saved).toEqual({
      '--color-accent': '#ff0000',
      '--color-accent-foreground': '#FFFFFF',
      '--color-accent-hover': '#ff4d4d',
    })
  })

  it('carrega customTheme do localStorage no mount e migra foreground', () => {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify({ '--color-accent': '#00ff00' }))
    const { result } = renderTheme()
    expect(result.current.customTheme).toEqual({
      '--color-accent': '#00ff00',
      '--color-accent-foreground': '#000000',
    })
  })

  it('useTheme retorna valores corretos', () => {
    const { result } = renderTheme()
    expect(result.current).toHaveProperty('mode')
    expect(result.current).toHaveProperty('theme')
    expect(result.current).toHaveProperty('cycleTheme')
    expect(result.current).toHaveProperty('customTheme')
    expect(result.current).toHaveProperty('setCustomTheme')
    expect(result.current).toHaveProperty('resetCustomTheme')
  })

  it('PRESET_COLORS tem 9 entradas com name e colors', () => {
    expect(PRESET_COLORS).toHaveLength(15)
    for (const p of PRESET_COLORS) {
      expect(p).toHaveProperty('name')
      expect(p).toHaveProperty('colors')
    }
  })

  it('PRESET_COLORS Default tem colors vazio', () => {
    const def = PRESET_COLORS.find(p => p.name === 'Default')
    expect(def?.colors).toEqual({})
  })
})
