import { useState, useEffect, useRef, useCallback } from 'react'
import { getNotas } from '../api/notas'
import type { Nota } from '../types'

interface Command {
  id: string
  label: string
  action: () => void
}

interface Props {
  commands: Command[]
  onClose: () => void
  mode?: 'comando' | 'nota'
  notasRecentes?: Nota[]
  onNavigate?: (notaId: number) => void
}

export default function CommandPalette({ commands, onClose, mode = 'comando', notasRecentes = [], onNavigate }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [searchResults, setSearchResults] = useState<Nota[] | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return }
    try {
      const res = await getNotas(q.trim())
      setSearchResults(res)
    } catch { setSearchResults([]) }
  }, [])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    setSelected(0)
    if (!query.trim()) { setSearchResults(null); return }
    searchTimer.current = setTimeout(() => doSearch(query), 200)
    return () => clearTimeout(searchTimer.current)
  }, [query, doSearch])

  const isNotaMode = mode === 'nota'
  const notas = searchResults !== null ? searchResults : notasRecentes
  const filteredCommands = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
  const items = isNotaMode
    ? notas.map(n => ({ id: `nota-${n.id}`, label: n.titulo, action: () => onNavigate?.(n.id) }))
    : filteredCommands

  const itemsRef = useRef(items)
  itemsRef.current = items
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const f = itemsRef.current
      const s = selectedRef.current
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(i => Math.min(i + 1, f.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && f[s]) { f[s].action(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[15vh] z-50" onClick={onClose}>
      <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(0) }}
          placeholder={isNotaMode ? "Buscar notas..." : "Comandos..."}
          className="w-full bg-transparent text-text-primary text-lg p-4 outline-none border-b border-border"
        />
        <div className="max-h-64 overflow-y-auto" role="listbox" aria-label={isNotaMode ? "Notas disponíveis" : "Comandos disponíveis"} aria-activedescendant={items[selected]?.id}>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-text-muted text-sm">
              {isNotaMode ? (query ? 'Nenhuma nota encontrada. Tente outro termo.' : 'Nenhuma nota acessada recentemente') : 'Nenhum comando encontrado. Tente outro termo.'}
            </div>
          ) : (
            <>
              {isNotaMode && !query && <div className="px-4 pt-2 pb-1 text-xs text-text-muted uppercase tracking-wider">Recentes</div>}
              {items.map((item, i) => (
                <button
                  key={item.id}
                  id={item.id}
                  role="option"
                  aria-selected={i === selected}
                  onClick={() => { item.action(); onClose() }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${i === selected ? 'bg-accent/20 text-accent' : 'text-text-primary hover:bg-bg-hover'}`}
                >
                  {item.label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
