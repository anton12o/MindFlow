import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Notification {
  id: number
  message: string
  type: 'error' | 'success'
}

interface NotificationContextType {
  notify: (message: string, type?: 'error' | 'success') => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const notify = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }, [])

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white animate-slide-up ${
              n.type === 'error' ? 'bg-danger' : 'bg-success'
            }`}
          >
            {n.message}
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
