import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Notification {
  id: number
  message: string
  type: 'error' | 'success'
  action?: { label: string; onClick: () => void }
}

interface NotificationContextType {
  notify: (message: string, type?: 'error' | 'success', action?: { label: string; onClick: () => void }) => void
  setDndActive: (active: boolean) => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dndActive, setDndActive] = useState(false)

  const notify = useCallback((message: string, type: 'error' | 'success' = 'error', action?: { label: string; onClick: () => void }) => {
    if (dndActive) return
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type, action }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, action ? 3000 : 4000)
  }, [dndActive])

  return (
    <NotificationContext.Provider value={{ notify, setDndActive }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white animate-slide-up flex items-center gap-3 ${
              n.type === 'error' ? 'bg-danger' : 'bg-success'
            }`}
          >
            <span>{n.message}</span>
            {n.action && (
              <button onClick={() => { n.action!.onClick(); setNotifications(prev => prev.filter(x => x.id !== n.id)) }}
                className="shrink-0 px-2 py-0.5 rounded bg-white/20 text-white text-xs font-medium hover:bg-white/30 transition-colors"
              >
                {n.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotify(): NotificationContextType['notify'] {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotify must be used within NotificationProvider')
  return ctx.notify
}

export function useDnd(): NotificationContextType['setDndActive'] {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useDnd must be used within NotificationProvider')
  return ctx.setDndActive
}