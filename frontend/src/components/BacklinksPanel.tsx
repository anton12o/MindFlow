import { useQuery } from '@tanstack/react-query'
import { getBacklinks } from '../api/notas'
import { ArrowLeft } from 'lucide-react'
import type { Nota } from '../types'

interface BacklinksPanelProps {
  notaId: number
  onSelectNota: (n: Nota) => void
}

export default function BacklinksPanel({ notaId, onSelectNota }: BacklinksPanelProps) {
  const { data: backlinks, isLoading } = useQuery({
    queryKey: ['backlinks', notaId],
    queryFn: () => getBacklinks(notaId),
    staleTime: 30_000,
  })

  if (isLoading) return null
  if (!backlinks || backlinks.length === 0) return null

  return (
    <div className="mt-8 pt-4 border-t border-border">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
        Mencionado em ({backlinks.length})
      </h2>
      <div className="space-y-2">
        {backlinks.map(b => (
          <button key={b.id} onClick={() => onSelectNota({ id: b.id, titulo: b.titulo } as Nota)}
            className="w-full text-left px-3 py-2 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors text-sm">
            <span className="text-accent inline-flex items-center gap-1 mb-1">
              <ArrowLeft size={14} /> {b.titulo}
            </span>
            <p className="text-xs text-text-muted line-clamp-2">{b.trecho}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
