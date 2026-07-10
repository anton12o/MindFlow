import { describe, it, expect } from 'vitest'
import { formatDateLocal, hojeLocal, agoraLocal } from '../utils/date'

describe('formatDateLocal', () => {
  it('formata data no padrao YYYY-MM-DD', () => {
    const d = new Date(2026, 5, 30)
    expect(formatDateLocal(d)).toBe('2026-06-30')
  })

  it('preenche mes e dia com zero', () => {
    const d = new Date(2026, 0, 5)
    expect(formatDateLocal(d)).toBe('2026-01-05')
  })

  it('lida com 31 de dezembro', () => {
    const d = new Date(2026, 11, 31)
    expect(formatDateLocal(d)).toBe('2026-12-31')
  })
})

describe('hojeLocal', () => {
  it('retorna string no formato YYYY-MM-DD', () => {
    const hoje = hojeLocal()
    expect(hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('retorna data de hoje', () => {
    const hoje = hojeLocal()
    const esperado = formatDateLocal(new Date())
    expect(hoje).toBe(esperado)
  })
})

describe('agoraLocal', () => {
  it('retorna string com data e hora', () => {
    const agora = agoraLocal()
    expect(agora).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
  })
})
