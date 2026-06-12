import { useState, useEffect, useRef } from 'react'

interface Command {
  id: string
  label: string
  action: () => void
}

export default function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
  const filteredRef = useRef(filtered)
  filteredRef.current = filtered

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const f = filteredRef.current
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
          placeholder="Comandos..."
          className="w-full bg-transparent text-text-primary text-lg p-4 outline-none border-b border-border"
        />
        <div className="max-h-64 overflow-y-auto" role="listbox" aria-label="Comandos disponíveis" aria-activedescendant={filtered[selected]?.id}>
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              id={cmd.id}
              role="option"
              aria-selected={i === selected}
              onClick={() => { cmd.action(); onClose() }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${i === selected ? 'bg-accent/20 text-accent' : 'text-text-primary hover:bg-bg-hover'}`}
            >
              {cmd.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-text-muted text-sm">Nenhum comando encontrado</div>
          )}
        </div>
      </div>
    </div>
  )
}
