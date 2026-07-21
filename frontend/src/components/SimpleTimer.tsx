import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSessao, finalizarSessao } from '../api/pomodoro'
import { useNotify } from '../store/notification'

function agora() { return Date.now() }

export default function SimpleTimer() {
  const notify = useNotify()
  const queryClient = useQueryClient()
  const [minutos, setMinutos] = useState(5)
  const [inputMin, setInputMin] = useState('5')
  const [tempo, setTempo] = useState(5 * 60)
  const [ativo, setAtivo] = useState(false)
  const [sessaoId, setSessaoId] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fimRef = useRef<number>(0)
  const ativoRef = useRef(false)

  useEffect(() => {
    ativoRef.current = ativo
  }, [ativo])

  function limparTimer() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  useEffect(() => {
    return () => limparTimer()
  }, [])

  function iniciar() {
    if (ativo) return
    const total = minutos * 60
    setTempo(total)
    const ts = agora()
    fimRef.current = ts + total * 1000
    setAtivo(true)
    createMut.mutate(total)
    intervalRef.current = setInterval(() => {
      const restante = Math.max(0, Math.round((fimRef.current - agora()) / 1000))
      setTempo(restante)
      if (restante <= 0) {
        limparTimer()
        setAtivo(false)
        notify('Timer finalizado!')
      }
    }, 100)
  }

  function pausar() {
    if (!ativo) return
    limparTimer()
    setAtivo(false)
    fimRef.current = agora() + tempo * 1000
  }

  function resetar() {
    limparTimer()
    setAtivo(false)
    setTempo(minutos * 60)
    if (sessaoId) {
      finalizarMut.mutate(sessaoId)
      setSessaoId(null)
    }
  }

  const createMut = useMutation({
    mutationFn: (duracaoSeg: number) => createSessao({ contexto_tipo: 'timer', duracao_min: Math.round(duracaoSeg / 60) }),
    onSuccess: (data) => { setSessaoId(data.id) },
    onError: (e) => { console.error('[SimpleTimer] create', e) },
  })

  const finalizarMut = useMutation({
    mutationFn: (id: number) => finalizarSessao(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'sessoes'] })
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'stats'] })
    },
    onError: (e) => { console.error('[SimpleTimer] finalizar', e) },
  })

  function handleIniciar() {
    const m = parseInt(inputMin, 10)
    if (isNaN(m) || m < 1) { notify('Mínimo 1 minuto'); return }
    if (m > 99) { notify('Máximo 99 minutos'); return }
    setMinutos(m)
    setTempo(m * 60)
    iniciar()
  }

  const mm = String(Math.floor(tempo / 60)).padStart(2, '0')
  const ss = String(tempo % 60).padStart(2, '0')

  return (
    <div className="text-center">
      {!ativo && sessaoId === null ? (
        <div className="flex items-center justify-center gap-2 mb-4">
          <input type="number" min={1} max={99} value={inputMin}
            onChange={e => setInputMin(e.target.value)}
            className="w-20 bg-bg-tertiary rounded-lg px-3 py-2 text-center text-lg outline-none focus-visible:ring-2 focus-visible:ring-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            onKeyDown={e => e.key === 'Enter' && handleIniciar()} />
          <span className="text-lg">min</span>
        </div>
      ) : (
        <div className="text-5xl font-mono font-bold tabular-nums mb-4 text-accent">
          {mm}:{ss}
        </div>
      )}
      <div className="flex gap-3 justify-center">
        {!ativo && sessaoId === null ? (
          <button onClick={handleIniciar}
            className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover transition-all active:scale-95">Iniciar</button>
        ) : ativo ? (
          <button onClick={pausar}
            className="px-6 py-2 bg-warning text-white rounded-lg hover:bg-warning/80 transition-all active:scale-95">Pausar</button>
        ) : (
          <>
            <button onClick={iniciar}
              className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover transition-all active:scale-95">Retomar</button>
            <button onClick={resetar}
              className="px-6 py-2 bg-danger text-white rounded-lg hover:bg-danger/80 transition-all active:scale-95">Resetar</button>
          </>
        )}
      </div>
    </div>
  )
}
