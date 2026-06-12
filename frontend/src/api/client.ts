const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  const externalSignal = options?.signal
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeout)
      throw new DOMException('Aborted', 'AbortError')
    }
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }

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
  }
}

export default request