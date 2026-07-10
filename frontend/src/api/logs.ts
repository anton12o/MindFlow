import request from './client'

const FLUSH_INTERVAL = 5000
const MAX_QUEUE = 10
const RATE_LIMIT_WINDOW = 60000
const RATE_LIMIT_MAX = 10

interface LogEntry {
  message: string
  stack?: string
  context?: string
  url?: string
}

const queue: LogEntry[] = []
let lastFlush = Date.now()
let consecutiveFailures = 0
let flushTimer: ReturnType<typeof setTimeout> | null = null

export function logError(error: Error | unknown, context?: string) {
  const now = Date.now()
  if (queue.length > RATE_LIMIT_MAX && now - lastFlush < RATE_LIMIT_WINDOW) {
    return
  }
  const entry: LogEntry = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    url: location.href,
  }
  queue.push(entry)
  scheduleFlush()
}

function scheduleFlush() {
  if (flushTimer) return
  if (queue.length >= MAX_QUEUE || Date.now() - lastFlush >= FLUSH_INTERVAL) {
    flush()
  } else {
    flushTimer = setTimeout(flush, FLUSH_INTERVAL - (Date.now() - lastFlush))
  }
}

async function flush() {
  flushTimer = null
  if (queue.length === 0) return
  const batch = queue.splice(0, MAX_QUEUE)
  lastFlush = Date.now()
  try {
    await request('/logs', {
      method: 'POST',
      body: JSON.stringify(batch.length === 1 ? batch[0] : batch),
    })
    consecutiveFailures = 0
  } catch (e) {
    console.error('[logs.flush]', e)
    consecutiveFailures++
    if (consecutiveFailures < 3) {
      queue.unshift(...batch)
    }
  }
}

export interface LogEntryResponse {
  timestamp: string
  level: string
  module: string
  message: string
}

export interface GetLogsResponse {
  entries: LogEntryResponse[]
  total: number
}

export function getLogs(n = 50, level?: string): Promise<GetLogsResponse> {
  const params = new URLSearchParams({ n: String(n) })
  if (level) params.set('level', level)
  return request(`/logs?${params}`)
}

export function clearLogs(all = false): Promise<{ ok: boolean }> {
  const params = new URLSearchParams()
  if (all) params.set('all', 'true')
  return request(`/logs?${params}`, { method: 'DELETE' })
}
