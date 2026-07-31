import { useEffect, type MutableRefObject } from 'react'
import { startAmbient, stopAmbient } from '../utils/ambientSound'

export function useAmbientSound(screen: string, somAmbiente: boolean, audioCtxRef: MutableRefObject<AudioContext | null>) {
  const ambientOn = (screen === 'running' || screen === 'livre') && somAmbiente

  useEffect(() => {
    if (!ambientOn) { stopAmbient(); return }
    const aCtx = audioCtxRef.current
    if (aCtx && aCtx.state !== 'closed') {
      startAmbient(aCtx)
    }
    return () => stopAmbient()
  }, [ambientOn, audioCtxRef])

  return { ambientOn }
}
