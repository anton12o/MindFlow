import { useState, useEffect, useRef, useCallback, startTransition } from 'react'
import { FileText, CheckSquare, Layers, CheckCheck } from 'lucide-react'
import type { Nota } from '../types'
import { searchUnified } from '../api/search'
import type { SearchResults } from '../api/search'
import { useFocusTrap } from '../hooks/useFocusTrap'
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
  onNavigateTarefa?: (tarefaId: number) => void
  onNavigateFlashcard?: (flashcardId: number) => void
  onNavigateHabito?: (habitoId: number) => void
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  Notas: <FileText size={16} className="shrink-0" />,
  Tarefas: <CheckSquare size={16} className="shrink-0" />,
  Flashcards: <Layers size={16} className="shrink-0" />,
  Hábitos: <CheckCheck size={16} className="shrink-0" />,
}

type SearchGroup = { group: string; items: { id: string; label: string; action: () => void }[] }

export default function CommandPalette({ commands, onClose, mode = 'comando', notasRecentes = [], onNavigate, onNavigateTarefa, onNavigateFlashcard, onNavigateHabito }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true)
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return }
    try {
      const res = await searchUnified(q.trim())
      setSearchResults(res)
    } catch { setSearchResults(null) }
  }, [])
  useEffect(() => {
    clearTimeout(searchTimer.current)
    startTransition(() => setSelected(0))
    if (!query.trim()) { startTransition(() => setSearchResults(null)); return }
    searchTimer.current = setTimeout(() => doSearch(query), 200)
    return () => clearTimeout(searchTimer.current)
  }, [query, doSearch])
  const isNotaMode = mode === 'nota'

  const groups: SearchGroup[] = []
  if (isNotaMode) {
    if (!query.trim()) {
      if (notasRecentes.length > 0) {
        groups.push({ group: 'Recentes', items: notasRecentes.map(n => ({ id: `nota-${n.id}`, label: n.titulo, action: () => onNavigate?.(n.id) })) })
      }
    } else if (searchResults) {
      const r = searchResults
      if (r.notas.length > 0) groups.push({ group: 'Notas', items: r.notas.map(n => ({ id: `nota-${n.id}`, label: n.titulo, action: () => onNavigate?.(n.id) })) })
      if (r.tarefas.length > 0) groups.push({ group: 'Tarefas', items: r.tarefas.map(t => ({ id: `tarefa-${t.id}`, label: t.titulo, action: () => onNavigateTarefa?.(t.id) })) })
      if (r.flashcards.length > 0) groups.push({ group: 'Flashcards', items: r.flashcards.map(f => ({ id: `flash-${f.id}`, label: f.pergunta, action: () => onNavigateFlashcard?.(f.id) })) })
      if (r.habitos.length > 0) groups.push({ group: 'Hábitos', items: r.habitos.map(h => ({ id: `habito-${h.id}`, label: h.nome, action: () => onNavigateHabito?.(h.id) })) })
    }
  } else {
    const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    groups.push({ group: '', items: filtered })
  }

  const flatItems = groups.flatMap(g => g.items)
  const itemsRef = useRef(flatItems)
  useEffect(() => { itemsRef.current = flatItems }, [flatItems])
  const selectedRef = useRef(selected)
  useEffect(() => { selectedRef.current = selected }, [selected])
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
      <div ref={ref} className="bg-bg-secondary rounded-xl border border-border w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <input id="cmd-palette-search" name="search"
          autoFocus
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(0) }}
          placeholder={isNotaMode ? "Buscar em notas, tarefas, flashcards..." : "Comandos..."}
          className="w-full bg-transparent text-text-primary text-lg p-4 outline-none border-b border-border"
        />
        <div className="max-h-64 overflow-y-auto" role="listbox" aria-label={isNotaMode ? "Resultados da busca" : "Comandos disponíveis"} aria-activedescendant={flatItems[selected]?.id}>
          {flatItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-text-muted text-sm">
              {isNotaMode ? (query ? 'Nenhum resultado encontrado.' : 'Nenhuma nota acessada recentemente') : 'Nenhum comando encontrado.'}
            </div>
          ) : (
            groups.map(g => (
              <div key={g.group || '_'}>
                {g.group && <div className="px-4 pt-2 pb-1 text-xs text-text-muted uppercase tracking-wide">{g.group}</div>}
                {g.items.map((item) => {
                  const idx = flatItems.indexOf(item)
                  return (
                    <button
                      key={item.id}
                      id={item.id}
                      role="option"
                      aria-selected={idx === selected}
                      onClick={() => { item.action(); onClose() }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${idx === selected ? 'bg-accent/20 text-accent' : 'text-text-primary hover:bg-bg-hover'}`}
                    >
                      <span className="mr-2 inline-flex items-center text-text-muted">
                        {GROUP_ICONS[g.group] || null}
                      </span>
                      {item.label}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
