import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useBroadcastInvalidate() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const channel = new BroadcastChannel('sync:invalidate')
    channel.onmessage = (e) => {
      const keys = e.data as (string | number)[][]
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    }
    return () => channel.close()
  }, [queryClient])
}

export function broadcastInvalidate(keys: (string | number)[][]) {
  const channel = new BroadcastChannel('sync:invalidate')
  channel.postMessage(keys)
  channel.close()
}
