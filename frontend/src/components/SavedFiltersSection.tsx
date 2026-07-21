import { useState, useEffect } from 'react'
import { Plus, X, Search } from 'lucide-react'

interface SavedFilter {
  nome: string
  search: string
  pastaFilter: number | null
  tagFilter: number[]
  sortBy: string
}

const STORAGE_KEY = 'mindflow_filtros_salvos'

function loadSaved(): SavedFilter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { /* silent */; return [] }
}

function saveSaved(filters: SavedFilter[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(filters)) } catch { /* silent */ }
}

export default function SavedFiltersSection({
  search, pastaFilter, tagFilter, sortBy, onApply
}: {
  search: string; pastaFilter: number | null; tagFilter: number[]; sortBy: string
  onApply: (f: { search: string; pastaFilter: number | null; tagFilter: number[]; sortBy: string }) => void
}) {
  const [saved, setSaved] = useState<SavedFilter[]>(loadSaved)
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState('')

  useEffect(() => { saveSaved(saved) }, [saved])

  const hasFilter = search || pastaFilter !== null || tagFilter.length > 0 || sortBy

  const isDuplicate = saved.some(s => s.search === search && s.pastaFilter === pastaFilter && JSON.stringify(s.tagFilter) === JSON.stringify(tagFilter) && s.sortBy === sortBy)

  const save = () => {
    if (!nome.trim() || isDuplicate) return
    setSaved(prev => [{ nome: nome.trim(), search, pastaFilter, tagFilter, sortBy }, ...prev])
    setSaving(false); setNome('')
  }

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-text-muted">Filtros Salvos</span>
        {hasFilter && !saving && (
          <button onClick={() => setSaving(true)}
            className="text-xs text-text-muted hover:text-accent"><Plus size={12} className="inline mr-0.5" />Salvar</button>
        )}
      </div>
      {saving && (
        <div className="flex items-center gap-1 mb-1">
          <input autoFocus value={nome} onChange={e => setNome(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setSaving(false) }}
            placeholder="Nome do filtro"
            className="flex-1 bg-bg-tertiary rounded px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <button onClick={save} disabled={!nome.trim() || isDuplicate}
            className="text-xs text-accent hover:text-accent/80 disabled:opacity-disabled-heavy">OK</button>
        </div>
      )}
      {saved.length > 0 && (
        <div className="space-y-0.5">
          {saved.map((f, i) => (
            <div key={i} className="group flex items-center gap-1">
              <button onClick={() => onApply(f)}
                className="flex-1 text-left px-2 py-1 rounded text-xs hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors truncate flex items-center gap-1">
                <Search size={10} className="shrink-0" />
                <span className="truncate">{f.nome}</span>
              </button>
              <button onClick={() => setSaved(prev => prev.filter((_, j) => j !== i))}
                className="opacity-0 group-hover:opacity-100 text-danger hover:text-danger/80 text-xs p-0.5 rounded transition-opacity">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
