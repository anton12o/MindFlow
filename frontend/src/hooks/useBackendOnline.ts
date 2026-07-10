import { useEffect, useRef, useState } from 'react'

const API = import.meta.env.VITE_API_URL || '/api'

export function useBackendOnline(intervalMs = 30_000) {
  const [online, setOnline] = useState(true)
  const ref = useRef(true)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(5000) })
        const wasOffline = !ref.current
        ref.current = res.ok
        if (wasOffline && res.ok) setOnline(true)
        else if (!res.ok) setOnline(false)
      } catch {
        ref.current = false
        setOnline(false)
      }
    }
    check()
    const id = setInterval(check, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return online
}