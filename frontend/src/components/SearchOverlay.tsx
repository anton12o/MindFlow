import { useState, useRef, useEffect, useMemo, startTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchUnified } from '../api/search'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function SearchOverlay({ isOpen, onClose }: Props) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  useFocusTrap(modalRef, isOpen)

  useEffect(() => {
    if (isOpen) {
      startTransition(() => { setQ(''); setSelectedIndex(0) })
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const { data, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchUnified(q),
    enabled: q.trim().length >= 1,
    staleTime: 30_000,
  })

  const flatResults = useMemo(() => {
    const items: { id: string; label: string; snippet?: string; type: string; navigate: () => void }[] = []
    if (data) {
      data.notas.forEach(n => items.push({ id: `n-${n.id}`, label: n.titulo, snippet: n.snippet, type: 'Nota', navigate: () => navigate(`/ideias?nota_id=${n.id}`) }))
      data.tarefas.forEach(t => items.push({ id: `t-${t.id}`, label: t.titulo, type: 'Tarefa', navigate: () => navigate(`/rotina?tarefa_id=${t.id}`) }))
      data.flashcards.forEach(f => items.push({ id: `fc-${f.id}`, label: f.pergunta, type: 'Flashcard', navigate: () => navigate(`/flashcards?flash_id=${f.id}`) }))
      data.habitos.forEach(h => items.push({ id: `hb-${h.id}`, label: h.nome, type: 'Hábito', navigate: () => navigate(`/habitos?habito_id=${h.id}`) }))
    }
    return items
  }, [data, navigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && flatResults[selectedIndex]) {
        const r = flatResults[selectedIndex]
        r.navigate()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, selectedIndex, q, flatResults, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[8vh] z-50" onClick={onClose}>
      <div ref={modalRef} className="bg-bg-secondary rounded-xl border border-border w-full max-w-xl shadow-2xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border">
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setSelectedIndex(0) }}
            placeholder="Buscar em notas, tarefas, flashcards, hábitos..."
            className="w-full bg-transparent text-text-primary text-lg placeholder-text-muted outline-none"
          />
          <p className="text-xs text-text-muted mt-2">Enter para navegar · ↑↓ para navegar · Esc para fechar</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {!q.trim() && <p className="text-sm text-text-muted text-center py-8">Digite para buscar</p>}
          {isFetching && <p className="text-sm text-text-muted text-center py-4 animate-pulse">Buscando...</p>}
          {data && flatResults.length === 0 && <p className="text-sm text-text-muted text-center py-8">Nenhum resultado encontrado</p>}
          {flatResults.map((r, i) => (
            <div key={r.id}
              onClick={() => { r.navigate(); onClose() }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${i === selectedIndex ? 'bg-bg-hover' : 'hover:bg-bg-hover'}`}
            >
              <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent font-medium shrink-0 mt-0.5">{r.type}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{r.label}</p>
                {r.snippet && <p className="text-xs text-text-muted truncate mt-0.5">{r.snippet}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
