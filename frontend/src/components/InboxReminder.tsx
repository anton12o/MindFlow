import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '../api/stats'
import { hojeLocal } from '../utils/date'

const DISMISS_KEY = 'mindflow_inbox_reminder_dismissed'

export default function InboxReminder() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === hojeLocal() }
    catch { return false }
  })
  const { data: dash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  })
  const inboxCount = dash?.inbox_count ?? 0
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const hora = now.getHours()
  const shouldShow = inboxCount > 0 && hora >= 18 && !dismissed

  if (!shouldShow) return null

  function handleDismiss() {
    try { localStorage.setItem(DISMISS_KEY, hojeLocal()) } catch { /* silent */ }
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-bg-secondary border border-border rounded-xl shadow-elevation-4 p-4 max-w-xs animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="text-lg shrink-0 mt-0.5">📥</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">Inbox não vazio</p>
          <p className="text-xs text-text-muted mt-0.5">
            {inboxCount} {inboxCount === 1 ? 'item pendente' : 'itens pendentes'} para revisar
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => window.dispatchEvent(new Event('open-inbox'))}
              className="text-xs px-3 py-1 bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover transition-colors"
            >
              Revisar agora
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Dispensar hoje
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
