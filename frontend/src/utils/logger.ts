import { agoraLocal } from './date'
import { API_BASE } from '../api/client'

export async function logError(message: string, extra?: Record<string, unknown>) {
  try {
    await fetch(API_BASE + '/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        user_agent: navigator.userAgent,
        timestamp: agoraLocal(),
        ...extra,
      }),
    })
  } catch (e) {
    console.error('[logger] falha ao enviar log', e)
  }
}

export async function logInfo(message: string, extra?: Record<string, unknown>) {
  try {
    await fetch(API_BASE + '/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        level: 'INFO',
        timestamp: agoraLocal(),
        ...extra,
      }),
    })
  } catch (e) {
    console.error('[logger] falha ao enviar log', e)
  }
}
