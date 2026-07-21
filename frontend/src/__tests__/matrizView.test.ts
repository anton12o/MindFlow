import { describe, it, expect } from 'vitest'
import type { Tarefa } from '../types'

function makeTarefa(overrides?: Partial<Tarefa>): Tarefa {
  return {
    id: 1,
    titulo: 'Tarefa teste',
    data: '2026-07-18',
    status: 'pendente',
    prioridade: 'normal',
    quadrante: '',
    propriedades: {},
    ...overrides,
  }
}

describe('sortEisenhower', () => {
  it('ordena por titulo desc (padrao)', async () => {
    const { sortEisenhower } = await import('../components/matriz/EisenhowerView')
    const lista = [makeTarefa({ titulo: 'B' }), makeTarefa({ titulo: 'A' })]
    const result = sortEisenhower(lista)
    expect(result[0].titulo).toBe('B')
    expect(result[1].titulo).toBe('A')
  })

  it('ordena por titulo asc', async () => {
    const { sortEisenhower } = await import('../components/matriz/EisenhowerView')
    const lista = [makeTarefa({ titulo: 'B' }), makeTarefa({ titulo: 'A' })]
    const result = sortEisenhower(lista, 'asc')
    expect(result[0].titulo).toBe('A')
    expect(result[1].titulo).toBe('B')
  })

  it('nao modifica o array original', async () => {
    const { sortEisenhower } = await import('../components/matriz/EisenhowerView')
    const original = [makeTarefa({ titulo: 'B' }), makeTarefa({ titulo: 'A' })]
    const copia = [...original]
    sortEisenhower(original)
    expect(original).toEqual(copia)
  })
})

describe('agruparPorQuadrante', () => {
  it('agrupa tarefas por quadrante', async () => {
    const { agruparPorQuadrante } = await import('../components/matriz/EisenhowerView')
    const lista = [
      makeTarefa({ id: 1, quadrante: 'fazer' }),
      makeTarefa({ id: 2, quadrante: 'agendar' }),
      makeTarefa({ id: 3, quadrante: 'fazer' }),
      makeTarefa({ id: 4, quadrante: 'eliminar' }),
    ]
    const result = agruparPorQuadrante(lista)
    expect(result.fazer).toHaveLength(2)
    expect(result.agendar).toHaveLength(1)
    expect(result.delegar).toHaveLength(0)
    expect(result.eliminar).toHaveLength(1)
  })

  it('tarefas sem quadrante vao para agendar', async () => {
    const { agruparPorQuadrante } = await import('../components/matriz/EisenhowerView')
    const lista = [makeTarefa({ id: 1, quadrante: '' })]
    const result = agruparPorQuadrante(lista)
    expect(result.agendar).toHaveLength(1)
  })

  it('ordena dentro de cada grupo', async () => {
    const { agruparPorQuadrante } = await import('../components/matriz/EisenhowerView')
    const lista = [
      makeTarefa({ id: 1, titulo: 'Z', quadrante: 'fazer' }),
      makeTarefa({ id: 2, titulo: 'A', quadrante: 'fazer' }),
    ]
    const result = agruparPorQuadrante(lista)
    expect(result.fazer[0].titulo).toBe('Z')
    expect(result.fazer[1].titulo).toBe('A')
  })
})

describe('getExternalScore', () => {
  it('retorna undefined para tarefa sem matriz_ei', async () => {
    const { getExternalScore } = await import('../components/matriz/EisenhowerView')
    const t = makeTarefa({ propriedades: {} })
    expect(getExternalScore(t)).toBeUndefined()
  })

  it('retorna quickwin para esforco < 3 e impacto >= 3', async () => {
    const { getExternalScore } = await import('../components/matriz/EisenhowerView')
    const t = makeTarefa({ propriedades: { matriz_ei: { esforco: 1, impacto: 5 } } })
    const result = getExternalScore(t)
    expect(result?.label).toBe('Quick Win')
  })

  it('retorna grande projeto para esforco >= 3 e impacto >= 3', async () => {
    const { getExternalScore } = await import('../components/matriz/EisenhowerView')
    const t = makeTarefa({ propriedades: { matriz_ei: { esforco: 5, impacto: 5 } } })
    const result = getExternalScore(t)
    expect(result?.label).toBe('Grande Projeto')
  })

  it('retorna preenchimento para esforco < 3 e impacto < 3', async () => {
    const { getExternalScore } = await import('../components/matriz/EisenhowerView')
    const t = makeTarefa({ propriedades: { matriz_ei: { esforco: 1, impacto: 1 } } })
    const result = getExternalScore(t)
    expect(result?.label).toBe('Preenchimento')
  })

  it('retorna ingrata para esforco >= 3 e impacto < 3', async () => {
    const { getExternalScore } = await import('../components/matriz/EisenhowerView')
    const t = makeTarefa({ propriedades: { matriz_ei: { esforco: 5, impacto: 1 } } })
    const result = getExternalScore(t)
    expect(result?.label).toBe('Ingrata')
  })
})
