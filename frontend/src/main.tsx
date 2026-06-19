import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { logError } from './api/logs'

// ??? Service Worker ? update notification ???
if ('serviceWorker' in navigator) {
  let swRegistration: ServiceWorkerRegistration | null = null

  const checkSWUpdate = (reg: ServiceWorkerRegistration) => {
    if (reg.waiting) {
      window.dispatchEvent(new CustomEvent('sw-update', { detail: reg }))
    }
  }

  navigator.serviceWorker.register('/sw.js').then((reg) => {
    swRegistration = reg
    checkSWUpdate(reg)

    reg.addEventListener('updatefound', () => {
      const installing = reg.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update', { detail: swRegistration }))
        }
      })
    })
  }).catch((e) => console.error('[SW]', e))

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // SW has taken over ? reload to ensure fresh assets
    window.location.reload()
  })
}

// ??? Chunk error recovery ???
function isChunkError(msg: string, url?: string): boolean {
  return (
    msg.includes('imported module') ||
    msg.includes('Failed to fetch dynamically') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    (!!url && url.includes('/assets/'))
  )
}

window.addEventListener('error', (e) => {
  const target = e.target as HTMLElement | null
  const isScriptOrLink = target?.tagName === 'SCRIPT' || target?.tagName === 'LINK'
  if (isScriptOrLink || isChunkError(e.message || '')) {
    e.preventDefault()
    window.location.reload()
    return
  }
  logError(e.error || e, 'window.onerror')
})

window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e.reason?.message || e.reason || '')
  if (isChunkError(msg)) {
    e.preventDefault()
    window.location.reload()
    return
  }
  logError(e.reason, 'unhandledrejection')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
