import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useBackendOnline } from '../hooks/useBackendOnline'

const HEALTH_URL = 'http://localhost:8000/api/health'

beforeEach(() => {
  vi.useFakeTimers()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

it('retorna true se o health check responde ok', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, text: () => Promise.resolve('ok') } as Response)
  const { result } = renderHook(() => useBackendOnline())
  await vi.waitFor(() => expect(result.current).toBe(true))
})

it('retorna false se o health check falha', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, text: () => Promise.resolve('') } as Response)
  const { result } = renderHook(() => useBackendOnline())
  await vi.waitFor(() => expect(result.current).toBe(false))
})

it('retorna false se o fetch lança exceção', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Rede falhou'))
  const { result } = renderHook(() => useBackendOnline())
  await vi.waitFor(() => expect(result.current).toBe(false))
})

it('fica online após ficar offline e o health voltar a responder', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Rede falhou'))
  const { result } = renderHook(() => useBackendOnline(1000))
  await vi.waitFor(() => expect(result.current).toBe(false))
  fetchSpy.mockResolvedValue({ ok: true, text: () => Promise.resolve('ok') } as Response)
  act(() => { vi.advanceTimersByTime(1000) })
  await vi.waitFor(() => expect(result.current).toBe(true))
})

it('usa o intervalo padrão de 30s', () => {
  vi.spyOn(globalThis, 'setInterval')
  renderHook(() => useBackendOnline())
  expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 30000)
})

it('usa o intervalo customizado quando passado', () => {
  vi.spyOn(globalThis, 'setInterval')
  renderHook(() => useBackendOnline(5000))
  expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000)
})

it('usa AbortSignal.timeout(5000) no fetch', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, text: () => Promise.resolve('ok') } as Response)
  renderHook(() => useBackendOnline())
  await vi.waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(HEALTH_URL, expect.objectContaining({
      signal: expect.any(AbortSignal),
    }))
  })
})

it('limpa o intervalo no unmount', () => {
  vi.spyOn(globalThis, 'clearInterval')
  const { unmount } = renderHook(() => useBackendOnline())
  unmount()
  expect(clearInterval).toHaveBeenCalled()
})
