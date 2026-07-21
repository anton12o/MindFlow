interface BannerResumoProps {
  saudacao: string
  dataFormatada: string
  proximoBlocoTitulo: string | null
  proximoBlocoEhAtual: boolean
  proximoBlocoHorario: string | null
  todosConcluidos: boolean
  tarefaPct: number
  tarefasFeitas: number
  tarefasTotal: number
  focusPct: number
  focusMin: number
  dailyFocusMin: number
  intencao: string
  onIntencaoChange: (value: string) => void
  onIntencaoBlur: () => void
  onIntencaoKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function BannerResumo({
  saudacao, dataFormatada,
  proximoBlocoTitulo, proximoBlocoEhAtual, proximoBlocoHorario,
  todosConcluidos,
  tarefaPct, tarefasFeitas, tarefasTotal,
  focusPct, focusMin, dailyFocusMin,
  intencao, onIntencaoChange, onIntencaoBlur, onIntencaoKeyDown,
}: BannerResumoProps) {
  return (
    <div className="bg-gradient-to-br from-accent/[0.04] to-bg-secondary rounded-xl border border-border/80 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-lg font-semibold text-text-primary">{saudacao}! <span className="text-text-muted font-normal">{dataFormatada}</span></p>
          {proximoBlocoTitulo && (
            <p className="text-sm text-text-muted mt-0.5">
              ⏰ Próximo: <span className="text-text-primary font-medium">{proximoBlocoTitulo}</span>
              {proximoBlocoEhAtual
                ? <span className="text-success ml-1">(agora)</span>
                : <span className="text-text-secondary ml-1">às {proximoBlocoHorario}</span>
              }
            </p>
          )}
        </div>
        {todosConcluidos && (
          <p className="text-sm text-text-muted">📋 Todos os blocos concluídos</p>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted w-14 shrink-0">Tarefas</span>
          <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${tarefaPct >= 100 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${tarefaPct}%` }} />
          </div>
          <span className="text-xs text-text-muted w-20 text-right">{tarefasFeitas}/{tarefasTotal}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted w-14 shrink-0">Foco</span>
          <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${focusPct >= 100 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${focusPct}%` }} />
          </div>
          <span className="text-xs text-text-muted w-20 text-right">{focusMin}/{dailyFocusMin}min</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/50">
        <input value={intencao}
          onChange={e => { const v = e.target.value; if (v.length <= 280) onIntencaoChange(v) }}
          onBlur={onIntencaoBlur}
          onKeyDown={onIntencaoKeyDown}
          placeholder="🎯 Qual seu foco hoje?"
          className="w-full bg-bg-primary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
        {intencao && <p className="text-xs text-text-muted mt-1 flex items-center gap-1"><span className="text-success">✓</span> {intencao.length}/280</p>}
      </div>
    </div>
  )
}
