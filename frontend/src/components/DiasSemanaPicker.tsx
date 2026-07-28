const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function DiasSemanaPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex gap-1">
      {DIAS.map((d, i) => {
        const active = value.includes(String(i))
        return (
          <button key={i} type="button" aria-pressed={active} onClick={() => onChange(active ? value.filter(x => x !== String(i)) : [...value, String(i)])}
            className={`w-9 h-9 rounded text-[11px] font-medium transition-all active:scale-95 ${active ? 'bg-accent text-accent-foreground' : 'bg-bg-tertiary text-text-muted hover:bg-bg-hover'}`}
          >
            {d}
          </button>
        )
      })}
    </div>
  )
}
