interface BlocoFormProps {
  titulo: string
  horaInicio: string
  horaFim: string
  errors: Record<string, string>
  isPending: boolean
  onTituloChange: (value: string) => void
  onHoraInicioChange: (value: string) => void
  onHoraFimChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function BlocoForm({
  titulo, horaInicio, horaFim, errors, isPending,
  onTituloChange, onHoraInicioChange, onHoraFimChange, onSubmit,
}: BlocoFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-2 mb-4 p-3 bg-bg-tertiary rounded-lg ml-6">
      <div className="flex-1 min-w-[120px]">
        <input value={titulo} onChange={e => onTituloChange(e.target.value)} placeholder="Título" maxLength={60}
          className={`w-full bg-bg-primary rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ${errors.titulo ? 'ring-1 ring-danger border-danger' : 'focus:ring-accent'}`} />
        {errors.titulo && <p className="text-xs text-danger mt-0.5">{errors.titulo}</p>}
      </div>
      <div>
        <input type="time" value={horaInicio} onChange={e => onHoraInicioChange(e.target.value)}
          className={`bg-bg-primary rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ${errors.hora_inicio ? 'ring-1 ring-danger border-danger' : 'focus:ring-accent'}`} />
        {errors.hora_inicio && <p className="text-xs text-danger mt-0.5">{errors.hora_inicio}</p>}
      </div>
      <div>
        <input type="time" value={horaFim} onChange={e => onHoraFimChange(e.target.value)}
          className={`bg-bg-primary rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ${errors.hora_fim ? 'ring-1 ring-danger border-danger' : 'focus:ring-accent'}`} />
        {errors.hora_fim && <p className="text-xs text-danger mt-0.5">{errors.hora_fim}</p>}
      </div>
      <button type="submit" disabled={isPending} className="px-3 py-1.5 bg-accent text-accent-foreground text-sm rounded-lg transition-all active:scale-95 disabled:opacity-disabled">{isPending ? '...' : 'OK'}</button>
    </form>
  )
}
