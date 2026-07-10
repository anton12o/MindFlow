const LABELS: Record<string, string> = { baixa: 'simples', normal: 'fácil', alta: 'normal', urgente: 'difícil' }
const CORES: Record<string, string> = {
  baixa: 'bg-success/20 text-success',
  normal: 'bg-accent/20 text-accent',
  alta: 'bg-warning/20 text-warning',
  urgente: 'bg-danger/20 text-danger',
}

export function labelPrioridade(p: string): string {
  return LABELS[p] || p
}

export function badgePrioridade(p: string): string {
  return CORES[p] || 'bg-text-muted/20 text-text-muted'
}
