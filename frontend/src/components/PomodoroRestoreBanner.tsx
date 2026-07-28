import { memo } from 'react'

interface Props {
  minutos: number
  segundos: number
  onDiscard: () => void
  onRestore: () => void
}

const PomodoroRestoreBanner = memo(function PomodoroRestoreBanner({ minutos, segundos, onDiscard, onRestore }: Props) {
  return (
    <div className="w-full bg-bg-secondary border border-border rounded-lg p-4 text-center animate-fade-in">
      <p className="text-sm text-text-primary mb-3">Sessão interrompida detectada ({minutos}:{String(segundos).padStart(2, '0')} restantes)</p>
      <div className="flex gap-2 justify-center">
        <button onClick={onDiscard}
          className="px-4 py-2 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors">
          Descartar
        </button>
        <button onClick={onRestore}
          className="px-4 py-2 bg-accent text-accent-foreground text-sm rounded-lg hover:bg-accent-hover transition-colors">
          Continuar sessão
        </button>
      </div>
    </div>
  )
})

export default PomodoroRestoreBanner
