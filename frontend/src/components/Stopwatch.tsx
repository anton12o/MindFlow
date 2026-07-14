import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSessao, finalizarSessao } from '../api/pomodoro'

function agora() { return agora() }

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
  const lapStartRef = useRef(0)

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function iniciar() {
    if (ativo) return
    const agora = agora()
    inicioRef.current = agora
    if (lapStartRef.current === 0) lapStartRef.current = agora
    setAtivo(true)
    createMut.mutate()
    intervalRef.current = setInterval(() => {
      setElapsed(elapsedPreRef.current + (agora() - inicioRef.current))
    }, 50)
  }

  function pausar() {
    if (!ativo) return
    clearInterval(intervalRef.current!)
    intervalRef.current = null
    elapsedPreRef.current += agora() - inicioRef.current
    setAtivo(false)
  }

  function resetar() {
    clearInterval(intervalRef.current!)
    intervalRef.current = null
    setAtivo(false)
    setElapsed(0)
    setLaps([])
    elapsedPreRef.current = 0
    lapStartRef.current = 0
    if (sessaoId) {
      finalizarMut.mutate(sessaoId)
      setSessaoId(null)
    }
  }

  function registrarVolta() {
    if (!ativo) return
    const now = agora()
    const totalElapsed = elapsedPreRef.current + (now - inicioRef.current)
    const split = lapStartRef.current === 0 ? totalElapsed : totalElapsed - (elapsedPreRef.current + (lapStartRef.current - inicioRef.current))
    setLaps(p => [...p, { index: p.length + 1, elapsed: totalElapsed, split: Math.max(0, split) }])
    lapStartRef.current = now
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
      <div className="text-5xl font-mono font-bold tabular-nums mb-4 text-accent">
        {formatMs(elapsed)}
      </div>
      <div className="flex gap-3 justify-center mb-4">
        {!ativo ? (
          sessaoId === null ? (
            <button onClick={iniciar}
              className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-all active:scale-95">Iniciar</button>
          ) : (
            <>
              <button onClick={iniciar}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-all active:scale-95">Retomar</button>
              <button onClick={resetar}
                className="px-6 py-2 bg-danger text-white rounded-lg hover:bg-danger/80 transition-all active:scale-95">Resetar</button>
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
