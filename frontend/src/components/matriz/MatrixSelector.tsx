import { memo, useEffect, useCallback } from 'react'
import { MATRIZES, type MatrizTipo } from './types'

interface Props {
  onSelect: (tipo: MatrizTipo) => void
  tarefasCount: number
  eiQuickWins: number
}

const IS_WIN = navigator?.platform?.includes('Win') ?? false

function MatrixSelector({ onSelect, tarefasCount, eiQuickWins }: Props) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === '1' || e.key === '2')) {
      e.preventDefault()
      const idx = parseInt(e.key) - 1
      if (MATRIZES[idx]) onSelect(MATRIZES[idx].tipo)
    }
  }, [onSelect])
  useEffect(() => { document.addEventListener('keydown', handleKey); return () => document.removeEventListener('keydown', handleKey) }, [handleKey])
  const subtitulos: Record<MatrizTipo, { metrica: string; tagline: string }> = {
    eisenhower: { metrica: `${tarefasCount} tarefa${tarefasCount !== 1 ? 's' : ''}`, tagline: '' },
    esforco_impacto: { metrica: `${eiQuickWins} Quick Win${eiQuickWins !== 1 ? 's' : ''}`, tagline: '' },
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-6">
      {MATRIZES.map((m, i) => {
        const info = subtitulos[m.tipo]
        return (
          <button
            key={m.tipo}
            onClick={() => onSelect(m.tipo)}
            className="bg-bg-secondary/50 border border-border rounded-xl p-4 text-left
              transition-all duration-200 hover:scale-[1.02] hover:bg-bg-secondary hover:border-accent/40
              hover:shadow-[--elevation-2] active:scale-[0.98] group relative"
          >
            <div className="flex items-start justify-between">
              <div className="text-2xl text-accent transition-transform duration-200 group-hover:scale-110">{m.icone}</div>
              <span className="text-xs bg-bg-tertiary px-2 py-1 rounded text-text-muted font-mono">{IS_WIN ? 'Ctrl' : '\u2318'}+{i + 1}</span>
            </div>
            <h3 className="text-sm font-semibold text-text-primary mt-2 mb-1">{m.titulo}</h3>
            <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{m.descricao}</p>
            <div className="mt-2 flex items-center gap-2 min-h-4">
              {info.metrica && <span className="text-xs font-semibold text-text-primary">{info.metrica}</span>}
              {info.tagline && <span className="text-xs italic text-text-muted">{info.tagline}</span>}
            </div>
            <p className="text-xs text-text-muted italic mt-1">{m.dica}</p>
          </button>
        )
      })}
    </div>
  )
}

export default memo(MatrixSelector)
