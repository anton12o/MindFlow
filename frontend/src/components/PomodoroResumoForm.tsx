import { memo } from 'react'

interface Props {
  resumo: string
  setResumo: (v: string) => void
  distracoes: number
  interrupcoes: string[]
  isPending: boolean
  onPular: () => void
  onSalvar: () => void
  labelPular?: string
  labelSalvar?: string
}

const PomodoroResumoForm = memo(function PomodoroResumoForm({ resumo, setResumo, distracoes, interrupcoes, isPending, onPular, onSalvar, labelPular = 'Pular', labelSalvar = 'Salvar resumo' }: Props) {
  return (
    <div className="w-full max-w-md mt-2">
      {distracoes > 0 && (
        <p className="text-xs text-text-muted mb-2">👀 {distracoes} {distracoes === 1 ? 'distra\u00E7\u00E3o' : 'distra\u00E7\u00F5es'}</p>
      )}
      {interrupcoes.length > 0 && (
        <div className="mb-2 text-xs text-text-muted">
          <p className="font-medium mb-0.5">Distra\u00E7\u00F5es registradas:</p>
          <ul className="space-y-0.5">
            {interrupcoes.map((item, i) => (
              <li key={i} className="flex items-start gap-1">• {item}</li>
            ))}
          </ul>
        </div>
      )}
      <textarea value={resumo} onChange={e => setResumo(e.target.value)}
        placeholder="Registrar resumo da sess\u00E3o (opcional)..."
        className="w-full bg-bg-tertiary rounded-lg p-3 text-sm outline-none resize-none h-20 focus-visible:ring-2 focus-visible:ring-accent" />
      <div className="flex gap-2 mt-2">
        <button onClick={onPular} disabled={isPending}
          className="px-4 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-disabled">
          {isPending ? '...' : labelPular}
        </button>
        <button onClick={onSalvar} disabled={isPending}
          className="px-4 py-1.5 bg-accent text-accent-foreground text-sm rounded-lg hover:bg-accent-hover disabled:opacity-disabled">
          {isPending ? '...' : labelSalvar}
        </button>
      </div>
    </div>
  )
})

export default PomodoroResumoForm
