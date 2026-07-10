import { describe, it, expect } from 'vitest'
import { labelPrioridade, badgePrioridade } from '../utils/prioridade'

describe('labelPrioridade', () => {
  it('retorna label amigável', () => {
    expect(labelPrioridade('baixa')).toBe('simples')
    expect(labelPrioridade('normal')).toBe('fácil')
    expect(labelPrioridade('alta')).toBe('normal')
    expect(labelPrioridade('urgente')).toBe('difícil')
  })
  it('fallback para o próprio valor se desconhecido', () => {
    expect(labelPrioridade('desconhecido')).toBe('desconhecido')
  })
})

describe('badgePrioridade', () => {
  it('retorna classe de cor', () => {
    expect(badgePrioridade('baixa')).toBe('bg-success/20 text-success')
    expect(badgePrioridade('normal')).toBe('bg-accent/20 text-accent')
    expect(badgePrioridade('alta')).toBe('bg-warning/20 text-warning')
    expect(badgePrioridade('urgente')).toBe('bg-danger/20 text-danger')
  })
  it('fallback para cinza se desconhecido', () => {
    expect(badgePrioridade('desconhecido')).toBe('bg-text-muted/20 text-text-muted')
  })
})
