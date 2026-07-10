import { vi } from 'vitest'
import request from '../api/client'

let fetchSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch')
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('faz GET e retorna JSON', async () => {
  fetchSpy.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(JSON.stringify({ id: 1, titulo: 'teste' })),
  } as Response)
  const result = await request<{ id: number }>('/notas/1')
  expect(result).toEqual({ id: 1, titulo: 'teste' })
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:8000/api/notas/1',
    expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
  )
})

it('faz POST com body JSON', async () => {
  fetchSpy.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(JSON.stringify({ id: 1 })),
  } as Response)
  await request('/notas', { method: 'POST', body: JSON.stringify({ titulo: 'nova' }) })
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:8000/api/notas',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ titulo: 'nova' }),
    })
  )
})

it('lança erro se status nao for ok', async () => {
  fetchSpy.mockResolvedValue({
    ok: false,
    status: 404,
    text: () => Promise.resolve('Not found'),
  } as Response)
  await expect(request('/notas/999')).rejects.toThrow('API 404')
})

it('lança erro se resposta não for JSON valido', async () => {
  fetchSpy.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve('nao-json'),
  } as Response)
  await expect(request('/notas')).rejects.toThrow('Resposta inválida (JSON)')
})

it('lança erro de timeout se fetch excede 10s', async () => {
  vi.useFakeTimers()
  const abortPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 10001)
  })
  fetchSpy.mockReturnValue(abortPromise)
  const promise = request('/notas')
  vi.advanceTimersByTime(10001)
  await expect(promise).rejects.toThrow('Timeout')
  vi.useRealTimers()
})

it('retorna undefined para resposta vazia', async () => {
  fetchSpy.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(''),
  } as Response)
  const result = await request('/api/health')
  expect(result).toBeUndefined()
})

it('propaga sinal de abort externo', async () => {
  const controller = new AbortController()
  const promise = request('/slow', { signal: controller.signal })
  controller.abort()
  await expect(promise).rejects.toThrow()
})
