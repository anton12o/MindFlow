const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const inflight = new Map<string, AbortController>()

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const key = `${options?.method || 'GET'}:${path}`
  const existing = inflight.get(key)
  if (existing) existing.abort()

  const controller = new AbortController()
  inflight.set(key, controller)
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      signal: controller.signal,
    })
    let text: string
    try {
      text = await res.text()
    } catch {
      throw new Error(`Falha ao ler resposta de ${options?.method || 'GET'} ${path} (status ${res.status})`)
    }
    if (!res.ok) {
      throw new Error(`API ${res.status} em ${options?.method || 'GET'} ${path}: ${text.slice(0, 200)}`)
    }
    if (!text) return undefined as T
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`Resposta inválida (JSON) de ${path}: ${text.slice(0, 100)}`)
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Timeout em ${options?.method || 'GET'} ${path} (10s)`)
    }
    throw err
  } finally {
    clearTimeout(timeout)
    if (inflight.get(key) === controller) inflight.delete(key)
  }
}

export default request