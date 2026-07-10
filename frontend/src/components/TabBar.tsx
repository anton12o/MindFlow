import { X } from 'lucide-react'
import type { Nota } from '../types'

interface TabBarProps {
  tabs: number[]
  activeId: number | null
  notas: Nota[]
  onSelect: (id: number) => void
  onClose: (id: number) => void
}

export default function TabBar({ tabs, activeId, notas, onSelect, onClose }: TabBarProps) {
  if (tabs.length === 0) return null
  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-bg-secondary overflow-x-auto max-w-full shrink-0">
      {tabs.map(id => {
        const n = notas.find(x => x.id === id)
        const titulo = n?.titulo || '(sem título)'
        const isActive = id === activeId
        return (
          <div key={id}
            className={`group flex items-center gap-1 px-2 py-1 rounded-md text-xs cursor-pointer shrink-0 max-w-[160px] transition-colors ${
              isActive
                ? 'bg-accent/15 text-accent font-medium'
                : 'text-text-muted hover:bg-bg-hover hover:text-text-primary'
            }`}
            onClick={() => onSelect(id)}
            title={titulo}>
            <span className="truncate flex-1">{titulo}</span>
            <button
              onClick={e => { e.stopPropagation(); onClose(id) }}
              className="opacity-0 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger rounded p-0.5 transition-opacity">
              <X size={10} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
