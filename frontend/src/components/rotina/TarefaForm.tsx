import { labelPrioridade } from '../../utils/prioridade'

interface TarefaFormProps {
  value: string
  error: string
  recorrente: boolean
  recTipo: string
  recIntervalo: number
  prioridade: string
  onValueChange: (value: string) => void
  onRecorrenteChange: (value: boolean) => void
  onRecTipoChange: (value: string) => void
  onRecIntervaloChange: (value: number) => void
  onPrioridadeChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function TarefaForm({
  value, error, recorrente, recTipo, recIntervalo, prioridade,
  onValueChange, onRecorrenteChange, onRecTipoChange, onRecIntervaloChange, onPrioridadeChange,
  onSubmit,
}: TarefaFormProps) {
  return (
    <div>
      <form onSubmit={onSubmit} className="mb-2">
        <input value={value} onChange={e => onValueChange(e.target.value)}
          placeholder="Adicionar tarefa..."
          className={`w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 ${error ? 'ring-1 ring-danger border-danger' : 'focus:ring-accent'}`} />
        {error && <p className="text-[10px] text-danger mt-0.5">{error}</p>}
      </form>
      <div className="flex items-center gap-2 mb-3 px-1 flex-wrap">
        <label className="flex items-center gap-1 text-[10px] text-text-muted cursor-pointer select-none">
          <input type="checkbox" checked={recorrente}
            onChange={e => onRecorrenteChange(e.target.checked)} className="accent-accent" />
          Recorrente
        </label>
        <select value={prioridade} onChange={e => onPrioridadeChange(e.target.value)}
          className="bg-bg-tertiary rounded px-2 py-0.5 text-[10px] outline-none">
          <option value="baixa">{labelPrioridade('baixa')}</option>
          <option value="normal">{labelPrioridade('normal')}</option>
          <option value="alta">{labelPrioridade('alta')}</option>
          <option value="urgente">{labelPrioridade('urgente')}</option>
        </select>
        {recorrente && (
          <>
            <select value={recTipo} onChange={e => onRecTipoChange(e.target.value)}
              className="bg-bg-tertiary rounded px-2 py-0.5 text-[10px] outline-none">
              <option value="daily">Diária</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="weekday">Dia útil</option>
            </select>
            <span className="text-[10px] text-text-muted">a cada</span>
            <input type="number" min={1} value={recIntervalo}
              onChange={e => onRecIntervaloChange(Math.max(1, Number(e.target.value)))}
              className="w-12 bg-bg-tertiary rounded px-2 py-0.5 text-[10px] outline-none text-center" />
          </>
        )}
      </div>
    </div>
  )
}
