import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useDebounce } from '../hooks/useDebounce'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('retorna o valor inicial imediatamente', () => {
  const { result } = renderHook(() => useDebounce('foo', 300))
  expect(result.current).toBe('foo')
})

it('atualiza o valor após o delay', () => {
  const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
    initialProps: { v: 'foo' },
  })
  rerender({ v: 'bar' })
  expect(result.current).toBe('foo')
  act(() => { vi.advanceTimersByTime(300) })
  expect(result.current).toBe('bar')
})

it('reinicia o timer se o valor muda antes do delay', () => {
  const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
    initialProps: { v: 'foo' },
  })
  rerender({ v: 'bar' })
  act(() => { vi.advanceTimersByTime(200) })
  rerender({ v: 'baz' })
  act(() => { vi.advanceTimersByTime(100) })
  expect(result.current).toBe('foo')
  act(() => { vi.advanceTimersByTime(200) })
  expect(result.current).toBe('baz')
})

it('funciona com delay 0', () => {
  const { result, rerender } = renderHook(({ v }) => useDebounce(v, 0), {
    initialProps: { v: 'a' },
  })
  rerender({ v: 'b' })
  act(() => { vi.advanceTimersByTime(0) })
  expect(result.current).toBe('b')
})

it('limpa o timer no unmount', () => {
  const { result, rerender, unmount } = renderHook(({ v }) => useDebounce(v, 300), {
    initialProps: { v: 'foo' },
  })
  rerender({ v: 'bar' })
  unmount()
  act(() => { vi.advanceTimersByTime(300) })
  expect(result.current).toBe('foo')
})
