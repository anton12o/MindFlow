import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { logError } from './api/logs'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .catch((e) => console.error('[SW]', e))
}

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
