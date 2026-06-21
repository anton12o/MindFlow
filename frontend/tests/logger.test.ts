import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logError, logInfo } from '../src/utils/logger'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('logError', () => {
  it('deve chamar POST /api/logs com mensagem de erro', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response())

    await logError('Erro de teste', { userAgent: 'vitest' })

    expect(fetchSpy).toHaveBeenCalledWith('/api/logs', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('Erro de teste'),
    }))

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.message).toBe('Erro de teste')
    expect(body.user_agent).toBeTruthy()
  })

  it('nao deve lancar excecao se fetch falhar', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Rede falhou'))

    await expect(logError('teste')).resolves.toBeUndefined()
  })
})

describe('logInfo', () => {
  it('deve chamar POST /api/logs com level INFO', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response())

    await logInfo('Info de teste')

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.level).toBe('INFO')
  })
})
