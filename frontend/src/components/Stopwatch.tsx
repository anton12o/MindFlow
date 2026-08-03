import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSessao, finalizarSessao } from '../api/pomodoro'
import { ensureAudioCtx, playBeep } from '../utils/audio'

function agora() { return Date.now() }

interface Lap {
  index: number
  elapsed: number
  split: number
}

export default function Stopwatch() {
  const queryClient = useQueryClient()
  const [ativo, setAtivo] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [laps, setLaps] = useState<Lap[]>([])
  const [sessaoId, setSessaoId] = useState<number | null>(null)
  const inicioRef = useRef(0)
  const elapsedPreRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lapElapsedRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function totalElapsed(): number {
    return elapsedPreRef.current + (inicioRef.current > 0 ? agora() - inicioRef.current : 0)
  }

  function iniciar() {
    if (ativo) return
    ensureAudioCtx(audioCtxRef)
    const ts = agora()
    inicioRef.current = ts
    setAtivo(true)
    if (sessaoId === null) createMut.mutate()
    intervalRef.current = setInterval(() => {
      setElapsed(totalElapsed())
    }, 50)
  }

  function pausar() {
    if (!ativo) return
    clearInterval(intervalRef.current!)
    intervalRef.current = null
    elapsedPreRef.current = totalElapsed()
    inicioRef.current = 0
    setAtivo(false)
  }

  function resetar() {
    clearInterval(intervalRef.current!)
    intervalRef.current = null
    setAtivo(false)
    setElapsed(0)
    setLaps([])
    elapsedPreRef.current = 0
    inicioRef.current = 0
    lapElapsedRef.current = 0
    if (sessaoId) {
      finalizarMut.mutate(sessaoId)
      setSessaoId(null)
    }
  }

  function registrarVolta() {
    if (!ativo) return
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      playBeep(audioCtxRef.current)
    }
    const now = totalElapsed()
    const split = now - lapElapsedRef.current
    setLaps(p => [...p, { index: p.length + 1, elapsed: now, split: Math.max(0, split) }])
    lapElapsedRef.current = now
  }

  const createMut = useMutation({
    mutationFn: () => createSessao({ contexto_tipo: 'cronometro', duracao_min: 1 }),
    onSuccess: (data) => { setSessaoId(data.id) },
    onError: (e) => { console.error('[Stopwatch] create', e) },
  })

  const finalizarMut = useMutation({
    mutationFn: (id: number) => finalizarSessao(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'sessoes'] })
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'stats'] })
    },
    onError: (e) => { console.error('[Stopwatch] finalizar', e) },
  })

  function formatMs(ms: number): string {
    const totalSec = Math.floor(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    const cent = Math.floor((ms % 1000) / 10)
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cent).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cent).padStart(2, '0')}`
  }

  return (
    <div className="text-center">
      <div role="timer" aria-live="polite" className="text-5xl font-mono font-bold tabular-nums mb-4 text-accent">
        {formatMs(elapsed)}
      </div>
      <div className="flex gap-3 justify-center mb-4">
        {!ativo ? (
          sessaoId === null ? (
            <button onClick={iniciar}
              className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover transition-all active:scale-95">Iniciar</button>
          ) : (
            <>
              <button onClick={iniciar}
                className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover transition-all active:scale-95">Retomar</button>
              <button onClick={resetar}
                className="px-6 py-2 bg-danger text-white rounded-lg hover:bg-danger-hover transition-all active:scale-95">Resetar</button>
            </>
          )
        ) : (
          <>
            <button onClick={pausar}
              className="px-6 py-2 bg-warning text-white rounded-lg hover:bg-warning/80 transition-all active:scale-95">Pausar</button>
            <button onClick={registrarVolta}
              className="px-6 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-all active:scale-95">Volta</button>
          </>
        )}
      </div>
      {laps.length > 0 && (
        <div className="max-h-40 overflow-y-auto space-y-1">
          {laps.map(l => (
            <div key={l.index} className="flex justify-between text-sm text-text-muted px-4 py-1">
              <span>Volta {l.index}</span>
              <span>{formatMs(l.elapsed)}</span>
              <span className="text-accent">+{formatMs(l.split)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
