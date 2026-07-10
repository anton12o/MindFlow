import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { KeybindingsProvider, useKeybindings, comboLabel, DEFAULT_BINDINGS } from '../store/keybindings'

const STORAGE_KEY = 'mindflow_keybindings'

function TestHarness() {
  const { bindings, rebind, reset, match } = useKeybindings()
  return (
    <div>
      <span data-testid="palette-comando-key">{bindings['palette-comando']?.key}</span>
      <span data-testid="binding-count">{Object.keys(bindings).length}</span>
      <button onClick={() => rebind('palette-comando', { key: 'x', ctrl: true, shift: false, alt: false })}>rebind</button>
      <button onClick={reset}>reset</button>
      <button data-testid="match-btn" onClick={() => {
        const action = match({ key: 'k', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false } as KeyboardEvent)
        document.body.setAttribute('data-matched', action ?? 'null')
      }}>match-k</button>
    </div>
  )
}

function renderKB() {
  return render(<KeybindingsProvider><TestHarness /></KeybindingsProvider>)
}

describe('comboLabel', () => {
  it('formata Ctrl+Shift+K', () => {
    expect(comboLabel({ key: 'k', ctrl: true, shift: true, alt: false })).toBe('Ctrl + Shift + K')
  })

  it('formata Alt+F', () => {
    expect(comboLabel({ key: 'f', ctrl: false, shift: false, alt: true })).toBe('Alt + F')
  })

  it('formata tecla única', () => {
    expect(comboLabel({ key: 'p', ctrl: false, shift: false, alt: false })).toBe('P')
  })

  it('formata Ctrl+Shift+Alt+Z', () => {
    expect(comboLabel({ key: 'z', ctrl: true, shift: true, alt: true })).toBe('Ctrl + Alt + Shift + Z')
  })
})

describe('KeybindingsProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('carrega bindings default', () => {
    renderKB()
    expect(screen.getByTestId('binding-count').textContent).toBe(String(Object.keys(DEFAULT_BINDINGS).length))
  })

  it('rebind altera binding de uma ação', () => {
    renderKB()
    expect(screen.getByTestId('palette-comando-key').textContent).toBe('k')
    act(() => { screen.getByText('rebind').click() })
    expect(screen.getByTestId('palette-comando-key').textContent).toBe('x')
  })

  it('reset restaura bindings default', () => {
    renderKB()
    act(() => { screen.getByText('rebind').click() })
    expect(screen.getByTestId('palette-comando-key').textContent).toBe('x')
    act(() => { screen.getByText('reset').click() })
    expect(screen.getByTestId('palette-comando-key').textContent).toBe('k')
  })

  it('match retorna ação quando tecla coincide', () => {
    renderKB()
    act(() => { screen.getByTestId('match-btn').click() })
    expect(document.body.getAttribute('data-matched')).toBe('palette-comando')
  })

  it('match retorna null quando tecla não coincide', () => {
    function NoMatchHarness() {
      const { match } = useKeybindings()
      return <button data-testid="no-match-btn" onClick={() => {
        const action = match({ key: 'z', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as KeyboardEvent)
        document.body.setAttribute('data-matched', action ?? 'null')
      }}>no-match</button>
    }
    render(<KeybindingsProvider><NoMatchHarness /></KeybindingsProvider>)
    act(() => { screen.getByTestId('no-match-btn').click() })
    expect(document.body.getAttribute('data-matched')).toBe('null')
  })

  it('persiste bindings no localStorage após rebind', () => {
    renderKB()
    act(() => { screen.getByText('rebind').click() })
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved['palette-comando'].key).toBe('x')
  })

  it('carrega bindings salvos do localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'palette-comando': { key: 'z', ctrl: true, shift: false, alt: false } }))
    renderKB()
    expect(screen.getByTestId('palette-comando-key').textContent).toBe('z')
  })

  it('fallback para defaults se localStorage corrompido', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid')
    renderKB()
    expect(screen.getByTestId('palette-comando-key').textContent).toBe('k')
  })

  it('fallback para defaults se localStorage vazio', () => {
    localStorage.setItem(STORAGE_KEY, '')
    renderKB()
    expect(screen.getByTestId('palette-comando-key').textContent).toBe('k')
  })
})

describe('useKeybindings', () => {
  it('lança erro se usado fora do provider', () => {
    function Broken() { useKeybindings(); return null }
    expect(() => render(<Broken />)).toThrow('useKeybindings must be inside KeybindingsProvider')
  })
})
