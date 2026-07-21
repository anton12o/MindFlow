import { useEffect, useState } from 'react'

export default function SwUpdateBanner() {
  const [visible, setVisible] = useState(false)
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ServiceWorkerRegistration | null
      setReg(detail)
      setVisible(true)
    }
    window.addEventListener('sw-update', handler)
    return () => window.removeEventListener('sw-update', handler)
  }, [])

  if (!visible || !reg) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-3 bg-bg-primary border border-border rounded-lg shadow-elevation-4 px-4 py-3">
        <span className="text-sm text-text-primary">Nova versão disponível</span>
        <button
          onClick={() => {
            reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
            setVisible(false)
          }}
          className="px-3 py-1 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover transition-colors"
        >
          Atualizar
        </button>
        <button
          onClick={() => setVisible(false)}
          className="text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          Agora não
        </button>
      </div>
    </div>
  )
}