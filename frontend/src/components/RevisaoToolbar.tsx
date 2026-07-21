import { FileText } from 'lucide-react'

interface Props {
  periodo: 'diaria' | 'semanal' | 'mensal'
  onChangePeriodo: (p: 'diaria' | 'semanal' | 'mensal') => void
  onCreateNota: () => void
  criando: boolean
}

const PERIODOS = [
  { value: 'diaria' as const, label: 'Diária' },
  { value: 'semanal' as const, label: 'Semanal' },
  { value: 'mensal' as const, label: 'Mensal' },
]

export default function RevisaoToolbar({ periodo, onChangePeriodo, onCreateNota, criando }: Props) {
  return (
    <div className="flex items-center gap-2">
      {PERIODOS.map(p => (
        <button key={p.value} onClick={() => onChangePeriodo(p.value)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${periodo === p.value ? 'bg-accent text-accent-foreground' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}>
          {p.label}
        </button>
      ))}
      <div className="flex-1" />
      <button onClick={onCreateNota} disabled={criando}
        className="px-3 py-1.5 bg-accent text-accent-foreground text-sm rounded-lg hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-disabled inline-flex items-center gap-1.5">
        <FileText size={14} /> {criando ? 'Criando...' : 'Criar nota de revisão'}
      </button>
    </div>
  )
}
