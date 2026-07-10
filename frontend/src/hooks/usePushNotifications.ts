import { useCallback } from 'react'

export function usePushNotifications() {
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    const result = await Notification.requestPermission()
    return result === 'granted'
  }, [])

  const notify = useCallback((body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    try {
      new Notification('MindFlow', { body, icon: '/icon-192.svg' })
    } catch (e) { console.error('[usePushNotifications]', e) }
  }, [])

  return { requestPermission, notify }
}
