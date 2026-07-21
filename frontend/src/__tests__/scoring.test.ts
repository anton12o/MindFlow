import { describe, it, expect } from 'vitest'
import { QUADRANTES, QUADRANTES_EISENHOWER, getEI, classificar } from '../utils/scoring'
import type { Tarefa } from '../types'

describe('classificar', () => {
  it('quickwin: esforco < 3 e impacto >= 3', () => {
    expect(classificar(1, 5)).toBe('quickwin')
    expect(classificar(2, 3)).toBe('quickwin')
  })

  it('grandeprojeto: esforco >= 3 e impacto >= 3', () => {
    expect(classificar(3, 3)).toBe('grandeprojeto')
    expect(classificar(5, 5)).toBe('grandeprojeto')
  })

  it('preenchimento: esforco < 3 e impacto < 3', () => {
    expect(classificar(1, 1)).toBe('preenchimento')
    expect(classificar(2, 2)).toBe('preenchimento')
  })

  it('ingrata: esforco >= 3 e impacto < 3', () => {
    expect(classificar(3, 1)).toBe('ingrata')
    expect(classificar(5, 2)).toBe('ingrata')
  })
})

describe('getEI', () => {
  const base = { id: 1, titulo: 'test', data: '2026-07-18', status: 'pendente', prioridade: 'normal', quadrante: '' }

  it('retorna score quando matriz_ei existe e valido', () => {
    const t = { ...base, propriedades: { matriz_ei: { esforco: 4, impacto: 2 } } }
    expect(getEI(t)).toEqual({ esforco: 4, impacto: 2 })
  })

  it('retorna null quando matriz_ei nao existe', () => {
    expect(getEI(base as unknown as Tarefa)).toBeNull()
  })

  it('retorna null quando matriz_ei nao e objeto', () => {
    const t = { ...base, propriedades: { matriz_ei: 'invalido' } }
    expect(getEI(t as unknown as Tarefa)).toBeNull()
  })

  it('retorna null quando esforco nao e number', () => {
    const t = { ...base, propriedades: { matriz_ei: { esforco: 'alto', impacto: 2 } } }
    expect(getEI(t as unknown as Tarefa)).toBeNull()
  })

  it('retorna null quando impacto nao e number', () => {
    const t = { ...base, propriedades: { matriz_ei: { esforco: 4, impacto: 'baixo' } } }
    expect(getEI(t as unknown as Tarefa)).toBeNull()
  })

  it('retorna null quando faltam campos', () => {
    const t = { ...base, propriedades: { matriz_ei: { esforco: 4 } } }
    expect(getEI(t as unknown as Tarefa)).toBeNull()
  })
})

describe('QUADRANTES (E×I)', () => {
  it('tem 4 quadrantes', () => {
    expect(QUADRANTES).toHaveLength(4)
  })

  it('cada quadrante tem campos obrigatorios', () => {
    for (const q of QUADRANTES) {
      expect(q.key).toBeTruthy()
      expect(q.titulo).toBeTruthy()
      expect(q.desc).toBeTruthy()
      expect(q.cor).toBeTruthy()
      expect(q.bg).toBeTruthy()
      expect(q.badge).toBeTruthy()
      expect(q.badgeText).toBeTruthy()
      expect(q.labelCor).toBeTruthy()
      expect(q.acao).toBeTruthy()
      expect(q.acao.label).toBeTruthy()
      expect(q.acao.icone).toBeTruthy()
      expect(q.acao.cor).toBeTruthy()
    }
  })

  it('keys sao unicas', () => {
    const keys = QUADRANTES.map(q => q.key)
    expect(new Set(keys).size).toBe(4)
  })
})

describe('QUADRANTES_EISENHOWER', () => {
  it('tem 4 quadrantes', () => {
    expect(QUADRANTES_EISENHOWER).toHaveLength(4)
  })

  it('cada quadrante tem campos obrigatorios', () => {
    for (const q of QUADRANTES_EISENHOWER) {
      expect(q.key).toBeTruthy()
      expect(q.titulo).toBeTruthy()
      expect(q.desc).toBeTruthy()
      expect(q.cor).toBeTruthy()
      expect(q.bg).toBeTruthy()
      expect(q.badge).toBeTruthy()
      expect(q.badgeText).toBeTruthy()
      expect(q.vies).toBeTruthy()
    }
  })

  it('keys sao unicas', () => {
    const keys = QUADRANTES_EISENHOWER.map(q => q.key)
    expect(new Set(keys).size).toBe(4)
  })
})

describe('formatDataRange', () => {
  it('formata range normal', async () => {
    const { formatDataRange } = await import('../components/matriz/types')
    expect(formatDataRange('2026-07-13', '2026-07-19')).toMatch(/13.*a.*19/)
  })

  it('retorna vazio para strings vazias', async () => {
    const { formatDataRange } = await import('../components/matriz/types')
    expect(formatDataRange('', '')).toBe('')
    expect(formatDataRange('2026-07-13', '')).toBe('')
  })

  it('retorna vazio para datas invalidas', async () => {
    const { formatDataRange } = await import('../components/matriz/types')
    expect(formatDataRange('invalida', '2026-07-19')).toBe('')
  })
})

describe('sliderGradient', () => {
  it('monta gradiente com cor e porcentagem', async () => {
    const { sliderGradient } = await import('../components/matriz/types')
    const result = sliderGradient('red', 50)
    expect(result).toContain('red')
    expect(result).toContain('50%')
    expect(result).toContain('var(--color-bg-tertiary)')
  })
})
