import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { logError } from './api/logs'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .catch((e) => console.error('[SW]', e))
}

window.onerror = (_msg, _source, _lineno, _colno, error) => {
  if (error) logError(error, 'window.onerror')
}

window.onunhandledrejection = (event) => {
  logError(event.reason, 'unhandledrejection')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
