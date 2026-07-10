import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'

type KeyCombo = {
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
}

type KeybindingMap = Record<string, KeyCombo>

const DEFAULT_BINDINGS: KeybindingMap = {
  'palette-comando': { key: 'k', ctrl: true, shift: false, alt: false },
  'palette-nota': { key: 'p', ctrl: true, shift: false, alt: false },
  'toggle-zen': { key: 'f', ctrl: true, shift: true, alt: false },
  'toggle-inbox': { key: 'i', ctrl: true, shift: false, alt: false },
  'inbox-capture': { key: 'i', ctrl: true, shift: true, alt: false },
}

const STORAGE_KEY = 'mindflow_keybindings'
const LABELS: Record<string, string> = {
  'palette-comando': 'Paleta de comandos',
  'palette-nota': 'Buscar notas',
  'toggle-zen': 'Modo zen',
  'toggle-inbox': 'Alternar captura rápida',
  'inbox-capture': 'Capturar seleção',
}

function loadBindings(): KeybindingMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_BINDINGS }
    return { ...DEFAULT_BINDINGS, ...JSON.parse(raw) }
  } catch (e) {
    console.error('[keybindings] load', e)
    return { ...DEFAULT_BINDINGS }
  }
}

function saveBindings(b: KeybindingMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(b))
}

interface KeybindingsCtx {
  bindings: KeybindingMap
  rebind: (action: string, combo: KeyCombo) => void
  reset: () => void
  match: (e: KeyboardEvent) => string | null
  getLastConflict: () => string | null
}

const Ctx = createContext<KeybindingsCtx | null>(null)

export function KeybindingsProvider({ children }: { children: ReactNode }) {
  const [bindings, setBindings] = useState<KeybindingMap>(loadBindings)
  const conflictRef = useRef<string | null>(null)

  useEffect(() => { saveBindings(bindings) }, [bindings])

  const rebind = useCallback((action: string, combo: KeyCombo) => {
    conflictRef.current = null
    setBindings(prev => {
      for (const [a, c] of Object.entries(prev)) {
        if (a !== action && c.ctrl === combo.ctrl && c.shift === combo.shift && c.alt === combo.alt && c.key.toLowerCase() === combo.key.toLowerCase()) {
          conflictRef.current = a
        }
      }
      return { ...prev, [action]: combo }
    })
  }, [])

  const reset = useCallback(() => {
    setBindings({ ...DEFAULT_BINDINGS })
  }, [])

  const match = useCallback((e: KeyboardEvent): string | null => {
    for (const [action, combo] of Object.entries(bindings)) {
      const ctrl = e.ctrlKey || e.metaKey
      if (combo.ctrl !== ctrl) continue
      if (combo.shift !== e.shiftKey) continue
      if (combo.alt !== e.altKey) continue
      if (e.key.toLowerCase() === combo.key.toLowerCase()) return action
    }
    return null
  }, [bindings])

  const getLastConflict = useCallback(() => conflictRef.current, [])

  return <Ctx.Provider value={{ bindings, rebind, reset, match, getLastConflict }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKeybindings() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useKeybindings must be inside KeybindingsProvider')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function comboLabel(combo: KeyCombo): string {
  const parts: string[] = []
  if (combo.ctrl) parts.push('Ctrl')
  if (combo.alt) parts.push('Alt')
  if (combo.shift) parts.push('Shift')
  parts.push(combo.key.toUpperCase())
  return parts.join(' + ')
}

export { LABELS as KEYBINDING_LABELS, DEFAULT_BINDINGS }
