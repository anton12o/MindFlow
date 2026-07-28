import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { ZenModeProvider, useZenMode } from '../contexts/ZenModeContext'
import { ConfigProvider } from '../store/config'

const STORAGE_KEY = 'mindflow_zen_mode'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ConfigProvider><ZenModeProvider>{children}</ZenModeProvider></ConfigProvider>
}

describe('ZenModeContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  function renderZen() {
    return renderHook(() => useZenMode(), { wrapper: Wrapper })
  }

  it('default é false quando localStorage vazio', () => {
    const { result } = renderZen()
    expect(result.current.zenMode).toBe(false)
  })

  it('carrega true do localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    const { result } = renderZen()
    expect(result.current.zenMode).toBe(true)
  })

  it('toggleZen alterna estado', () => {
    const { result } = renderZen()
    expect(result.current.zenMode).toBe(false)

    act(() => result.current.toggleZen())
    expect(result.current.zenMode).toBe(true)

    act(() => result.current.toggleZen())
    expect(result.current.zenMode).toBe(false)
  })

  it('persiste no localStorage ao alternar', () => {
    const { result } = renderZen()
    act(() => result.current.toggleZen())
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')

    act(() => result.current.toggleZen())
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')
  })

  it('responde a CustomEvent toggle-zen', () => {
    const { result } = renderZen()
    expect(result.current.zenMode).toBe(false)

    act(() => { window.dispatchEvent(new CustomEvent('toggle-zen')) })
    expect(result.current.zenMode).toBe(true)

    act(() => { window.dispatchEvent(new CustomEvent('toggle-zen')) })
    expect(result.current.zenMode).toBe(false)
  })

  it('lança erro se usado fora do provider', () => {
    expect(() => renderHook(() => useZenMode())).toThrow('useZenMode must be used within ZenModeProvider')
  })

  it('toggleZen é no-op se zenModeDesativado=true', () => {
    localStorage.setItem('mindflow_config', JSON.stringify({ zenModeDesativado: true }))
    const { result } = renderZen()
    expect(result.current.zenMode).toBe(false)

    act(() => result.current.toggleZen())
    expect(result.current.zenMode).toBe(false)

    act(() => { window.dispatchEvent(new CustomEvent('toggle-zen')) })
    expect(result.current.zenMode).toBe(false)
  })

  it('CustomEvent toggle-zen ignorado quando desativado', () => {
    localStorage.setItem('mindflow_config', JSON.stringify({ zenModeDesativado: true }))
    const { result } = renderZen()
    act(() => { window.dispatchEvent(new CustomEvent('toggle-zen')) })
    expect(result.current.zenMode).toBe(false)
  })
})
