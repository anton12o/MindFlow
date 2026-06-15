import { useEffect, useRef } from 'react'

export function useBroadcastSync<T>(
  channelName: string,
  state: T,
  onMessage: (data: T) => void,
  enabled = true,
) {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!enabled) return
    const channel = new BroadcastChannel(channelName)
    channelRef.current = channel
    channel.onmessage = (e) => onMessageRef.current(e.data)
    return () => { channel.close(); channelRef.current = null }
  }, [channelName, enabled])

  useEffect(() => {
    if (!enabled || !channelRef.current) return
    channelRef.current.postMessage(state)
  }, [state, enabled])
}
