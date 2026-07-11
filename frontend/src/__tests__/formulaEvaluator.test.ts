import { describe, it, expect } from 'vitest'
import { FormulaError, evaluarFormula } from '../utils/formulaEvaluator'

describe('formulaEvaluator', () => {
  it('soma', () => {
    expect(evaluarFormula('2 + 3', {})).toBe(5)
  })

  it('subtracao', () => {
    expect(evaluarFormula('10 - 4', {})).toBe(6)
  })

  it('multiplicacao', () => {
    expect(evaluarFormula('3 * 7', {})).toBe(21)
  })

  it('divisao', () => {
    expect(evaluarFormula('15 / 3', {})).toBe(5)
  })

  it('modulo', () => {
    expect(evaluarFormula('10 % 3', {})).toBe(1)
  })

  it('precedencia', () => {
    expect(evaluarFormula('2 + 3 * 4', {})).toBe(14)
  })

  it('parenteses', () => {
    expect(evaluarFormula('(2 + 3) * 4', {})).toBe(20)
  })

  it('negativo', () => {
    expect(evaluarFormula('-5 + 3', {})).toBe(-2)
  })

  it('decimal', () => {
    expect(evaluarFormula('2.5 * 2', {})).toBe(5)
  })

  it('string literal', () => {
    expect(evaluarFormula('"hello"', {})).toBe('hello')
  })

  it('single quote', () => {
    expect(evaluarFormula("'world'", {})).toBe('world')
  })

  it('referencia campo', () => {
    expect(evaluarFormula('{qtd} * {preco}', { qtd: 3, preco: 10.5 })).toBe(31.5)
  })

  it('campo texto', () => {
    expect(evaluarFormula('{nome}', { nome: 'teste' })).toBe('teste')
  })

  it('campo desconhecido', () => {
    expect(() => evaluarFormula('{inexistente}', {})).toThrow(FormulaError)
  })

  it('divisao por zero', () => {
    expect(() => evaluarFormula('10 / 0', {})).toThrow(FormulaError)
  })

  it('caractere invalido', () => {
    expect(() => evaluarFormula('2 + @', {})).toThrow(FormulaError)
  })

  it('parenteses aninhados', () => {
    expect(evaluarFormula('((1 + 2) * (3 + 4))', {})).toBe(21)
  })

  it('profundidade maxima', () => {
    const deep = '('.repeat(12) + '1' + ')'.repeat(12)
    expect(() => evaluarFormula(deep, {})).toThrow(FormulaError)
  })
})
