import { useMemo } from 'react'

function countCheckboxes(text: string): { done: number; total: number } {
  const lines = text.split('\n')
  let done = 0
  let total = 0
  for (const line of lines) {
    if (/^\s*-\s*\[ \]/.test(line)) total++
    else if (/^\s*-\s*\[x\]/i.test(line)) { total++; done++ }
  }
  return { done, total }
}

export default function ChecklistBar({ conteudo }: { conteudo: string }) {
  const stats = useMemo(() => countCheckboxes(conteudo), [conteudo])
  if (stats.total === 0) return null
  const pct = Math.round((stats.done / stats.total) * 100)
  return (
    <div className="mb-3 p-2 bg-bg-tertiary rounded-lg">
      <div className="flex items-center justify-between text-xs text-text-muted mb-1">
        <span>Checklist</span>
        <span>{stats.done}/{stats.total} ({pct}%)</span>
      </div>
      <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
