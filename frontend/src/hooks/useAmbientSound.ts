import { useEffect, useState, type MutableRefObject } from 'react'
import { startAmbient, stopAmbient } from '../utils/ambientSound'

export function useAmbientSound(screen: string, somAmbiente: boolean, audioCtxRef: MutableRefObject<AudioContext | null>) {
  const [ambientOn, setAmbientOn] = useState(false)

  useEffect(() => {
    if (!somAmbiente) {
      if (ambientOn) { stopAmbient(); setAmbientOn(false) } // eslint-disable-line react-hooks/set-state-in-effect
      return
    }
    if (screen === 'running' || screen === 'livre') {
      if (!ambientOn) {
        const aCtx = audioCtxRef.current
        if (aCtx && aCtx.state !== 'closed') {
          startAmbient(aCtx)
          setAmbientOn(true)
        }
      }
    } else {
      if (ambientOn) {
        stopAmbient()
        setAmbientOn(false)
      }
    }
    return () => { if (ambientOn) { stopAmbient(); setAmbientOn(false) } }
  }, [screen, somAmbiente, ambientOn, audioCtxRef])

  return { ambientOn }
}
