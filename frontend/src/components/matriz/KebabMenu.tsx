import { useState, useRef, useEffect, type ReactNode } from 'react'

interface MenuItem {
  label: ReactNode
  onClick: () => void
  danger?: boolean
}

interface Props {
  concluida?: boolean
  onConcluir?: () => void
  onExcluir?: () => void
  onLimparQuadrante?: () => void
  items?: MenuItem[]
}

const activeSet = new Set<{ ref: React.RefObject<HTMLDivElement | null>; close: () => void }>()

function onDocumentMouseDown(e: MouseEvent) {
  const target = e.target as Node
  for (const entry of activeSet) {
    if (entry.ref.current && !entry.ref.current.contains(target)) {
      entry.close()
    }
  }
}

function onDocumentKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  for (const entry of activeSet) {
    entry.close()
  }
}

export default function KebabMenu({ concluida, onConcluir, onExcluir, onLimparQuadrante, items }: Props) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const entryRef = useRef<{ ref: typeof ref; close: () => void }>(undefined)

  useEffect(() => {
    document.addEventListener('mousedown', onDocumentMouseDown)
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown)
      document.removeEventListener('keydown', onDocumentKeyDown)
    }
  }, [])

  useEffect(() => {
    const entry = { ref, close: () => { setOpen(false); setConfirmDelete(false) } }
    entryRef.current = entry
    if (open) activeSet.add(entry)
    return () => { activeSet.delete(entry) }
  }, [open])

  const hasItems = items && items.length > 0
  const hasLegacy = onConcluir && onExcluir

  const renderLegacyActions = () => (
    <>
      <button onClick={(e) => { e.stopPropagation(); setOpen(false); onConcluir!() }}
        className="w-full text-left text-xs px-3 py-2 text-text-primary hover:bg-bg-primary transition-colors">
        {concluida ? '\u21A9 Reabrir' : '\u2713 Concluir'}
      </button>
      {onLimparQuadrante && (
        <button onClick={(e) => { e.stopPropagation(); setOpen(false); onLimparQuadrante() }}
          className="w-full text-left text-xs px-3 py-2 text-text-primary hover:bg-bg-primary transition-colors">
            {'\u21A9 Remover quadrante'}
        </button>
      )}
    </>
  )

  const renderExtraItems = () => {
    if (!hasItems) return null
    return items.map((item, i) => (
      <button key={i} onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick() }}
        className={`w-full text-left text-xs px-3 py-2 transition-colors ${item.danger ? 'text-danger hover:bg-danger/10' : 'text-text-primary hover:bg-bg-primary'}`}>
        {item.label}
      </button>
    ))
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(v => !v); setConfirmDelete(false) }}
        className="w-5 h-5 rounded flex items-center justify-center text-xs text-text-muted hover:text-text-primary hover:bg-bg-primary transition-colors"
        title="Abrir menu" aria-label="Abrir menu de ações">
        {'\u22EE'}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 bg-bg-secondary border border-border rounded-lg shadow-elevation-4 py-1 animate-fade-in">
          {confirmDelete ? (
            <>
              <div className="px-3 py-2 text-xs text-text-muted">Excluir tarefa?</div>
              <button onClick={(e) => { e.stopPropagation(); setOpen(false); setConfirmDelete(false); onExcluir!() }}
                className="w-full text-left text-xs px-3 py-2 text-danger hover:bg-bg-primary transition-colors">
                Sim, excluir
              </button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                className="w-full text-left text-xs px-3 py-2 text-text-muted hover:bg-bg-primary transition-colors">
                Cancelar
              </button>
            </>
          ) : (
            <>
              {hasLegacy && renderLegacyActions()}
              {hasLegacy && hasItems && <div className="border-t border-border my-1" />}
              {renderExtraItems()}
              {hasLegacy && (
                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
                  className="w-full text-left text-xs px-3 py-2 text-danger hover:bg-bg-primary transition-colors">
                  {'\u2715 Excluir'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
