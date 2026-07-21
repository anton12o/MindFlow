import { memo } from 'react'

interface Props {
  config: { focoMin: number; pausaCurtaMin: number; pausaLongaMin: number; ciclosAtePausaLonga: number; dailyFocusMin: number; autoStart: boolean; dnd: boolean; descansoMin: number }
  setConfig: (fn: (prev: Props['config']) => Props['config']) => void
  ativo: boolean
  showConfig: boolean
  setShowConfig: (v: boolean) => void
}

function Campo({ label, value, onChange, min = 1, max = 120, ativo }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; ativo: boolean }) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <input type="number" min={min} max={max} value={value} disabled={ativo}
        onChange={e => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || 1)))}
        className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
    </div>
  )
}

function Toggle({ label, value, onChange, ativo }: { label: string; value: boolean; onChange: () => void; ativo: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-text-muted">{label}</label>
      <button onClick={onChange} disabled={ativo}
        className={`w-10 h-5 rounded-full transition-colors ${value ? 'bg-accent' : 'bg-bg-tertiary'}`}>
        <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

const PomodoroConfigPanel = memo(function PomodoroConfigPanel({ config, setConfig: setCfg, ativo, showConfig, setShowConfig }: Props) {
  return (
    <div className="w-full border border-border rounded-lg overflow-hidden bg-bg-tertiary">
      <button onClick={() => setShowConfig(!showConfig)}
        className="w-full flex items-center justify-between p-3 text-left text-sm text-text-secondary hover:bg-bg-hover transition-colors" disabled={ativo}>
        <span>Configurações</span>
        <span className={`transition-transform ${showConfig ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {showConfig && (
        <div className="p-3 space-y-3 border-t border-border bg-bg-secondary">
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Foco (min)" value={config.focoMin} onChange={v => setCfg(c => ({ ...c, focoMin: v }))} ativo={ativo} />
            <Campo label="Pausa curta (min)" value={config.pausaCurtaMin} onChange={v => setCfg(c => ({ ...c, pausaCurtaMin: v }))} ativo={ativo} />
            <Campo label="Pausa longa (min)" value={config.pausaLongaMin} onChange={v => setCfg(c => ({ ...c, pausaLongaMin: v }))} ativo={ativo} max={120} />
            <Campo label="Ciclos at\u00E9 pausa longa" value={config.ciclosAtePausaLonga} onChange={v => setCfg(c => ({ ...c, ciclosAtePausaLonga: v }))} ativo={ativo} max={20} />
            <Campo label="Meta di\u00E1ria (min)" value={config.dailyFocusMin} onChange={v => setCfg(c => ({ ...c, dailyFocusMin: v }))} ativo={ativo} max={480} />
            <Campo label="Descanso (min)" value={config.descansoMin} onChange={v => setCfg(c => ({ ...c, descansoMin: v }))} ativo={ativo} max={60} />
          </div>
          <Toggle label="Auto-iniciar pr\u00F3ximo ciclo" value={config.autoStart} onChange={() => setCfg(c => ({ ...c, autoStart: !c.autoStart }))} ativo={ativo} />
          <Toggle label="N\u00E3o perturbe (suprime notifica\u00E7\u00F5es)" value={config.dnd} onChange={() => setCfg(c => ({ ...c, dnd: !c.dnd }))} ativo={ativo} />
          <button onClick={() => setCfg(() => ({ focoMin: 25, pausaCurtaMin: 5, pausaLongaMin: 15, ciclosAtePausaLonga: 4, dailyFocusMin: 120, autoStart: false, dnd: false, descansoMin: 5 }))}
            className="text-sm text-accent hover:underline self-start" disabled={ativo}>
            Restaurar padr\u00E3o
          </button>
        </div>
      )}
    </div>
  )
})

export default PomodoroConfigPanel
