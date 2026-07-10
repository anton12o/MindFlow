import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotaTemplates } from '../hooks/useNotaTemplates'

beforeEach(() => {
  localStorage.clear()
})

describe('useNotaTemplates', () => {
  it('retorna lista vazia inicialmente', () => {
    const { result } = renderHook(() => useNotaTemplates())
    expect(result.current.templates).toEqual([])
  })

  it('addTemplate adiciona item com id unico', () => {
    const { result } = renderHook(() => useNotaTemplates())
    act(() => {
      const t = result.current.addTemplate('Meu modelo', 'conteudo')
      expect(t.id).toBeTruthy()
      expect(t.titulo).toBe('Meu modelo')
      expect(t.conteudo).toBe('conteudo')
    })
    expect(result.current.templates).toHaveLength(1)
    expect(result.current.templates[0].titulo).toBe('Meu modelo')
  })

  it('addTemplate adiciona multiplos templates', () => {
    const { result } = renderHook(() => useNotaTemplates())
    act(() => { result.current.addTemplate('A', '') })
    act(() => { result.current.addTemplate('B', '') })
    expect(result.current.templates).toHaveLength(2)
  })

  it('removeTemplate remove pelo id', () => {
    const { result } = renderHook(() => useNotaTemplates())
    let id = ''
    act(() => {
      id = result.current.addTemplate('Remover', 'abc').id
    })
    expect(result.current.templates).toHaveLength(1)
    act(() => { result.current.removeTemplate(id) })
    expect(result.current.templates).toHaveLength(0)
  })

  it('removeTemplate nao afeta outros ids', () => {
    const { result } = renderHook(() => useNotaTemplates())
    let idA = '', idB = ''
    act(() => { idA = result.current.addTemplate('A', '').id })
    act(() => { idB = result.current.addTemplate('B', '').id })
    act(() => { result.current.removeTemplate(idA) })
    expect(result.current.templates).toHaveLength(1)
    expect(result.current.templates[0].id).toBe(idB)
  })

  it('persiste templates no localStorage', () => {
    const { result, unmount } = renderHook(() => useNotaTemplates())
    act(() => { result.current.addTemplate('Persistido', 'ok') })
    unmount()
    const saved = JSON.parse(localStorage.getItem('nota_templates') || '[]')
    expect(saved).toHaveLength(1)
    expect(saved[0].titulo).toBe('Persistido')
  })

  it('carrega templates do localStorage ao montar', () => {
    const data = [{ id: '1', titulo: 'Existente', conteudo: 'dado' }]
    localStorage.setItem('nota_templates', JSON.stringify(data))
    const { result } = renderHook(() => useNotaTemplates())
    expect(result.current.templates).toHaveLength(1)
    expect(result.current.templates[0].titulo).toBe('Existente')
  })

  it('retorna lista vazia se localStorage corrompido', () => {
    localStorage.setItem('nota_templates', 'nao-json-valido')
    const { result } = renderHook(() => useNotaTemplates())
    expect(result.current.templates).toEqual([])
  })

  it('removeTemplate com id inexistente nao causa erro', () => {
    const { result } = renderHook(() => useNotaTemplates())
    act(() => { result.current.addTemplate('A', '') })
    act(() => { result.current.removeTemplate('id-inexistente') })
    expect(result.current.templates).toHaveLength(1)
  })
})
