import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSessao, finalizarSessao } from '../api/pomodoro'
import { usePomodoroContext } from '../store/pomodoro'

interface Props {
  contexto?: { tipo: string; id: number; nome: string }
  onFinalizar?: () => void
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
    setTimeout(() => ctx.close(), 1000)
  } catch { /* audio not available */ }
}

export default function PomodoroTimer({ contexto, onFinalizar }: Props) {
  const {
    minutos, setMinutos, segundos, setSegundos,
    ativo, setAtivo,
    sessaoId, setSessaoId,
    resumo, setResumo,
    mostrarResumo, setMostrarResumo,
  } = usePomodoroContext()
  const interval = useRef<ReturnType<typeof setInterval>>(undefined)
  const timeRef = useRef({ minutos, segundos })
  timeRef.current = { minutos, segundos }
  const queryClient = useQueryClient()

  const finalizarMut = useMutation({
    mutationFn: (params: { id: number; body: { conteudo_resumo?: string; contexto_nome?: string } }) =>
      finalizarSessao(params.id, params.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'sessoes'] })
      queryClient.invalidateQueries({ queryKey: ['notas'] })
    },
  })

  function handleFinalizar(comResumo: boolean) {
    if (sessaoId) {
      finalizarMut.mutate(
        {
          id: sessaoId,
          body: {
            conteudo_resumo: comResumo && resumo ? resumo : undefined,
            contexto_nome: contexto?.nome,
          },
        },
        { onSuccess: () => onFinalizar?.() },
      )
    }
  }

  function toggle() {
    if (ativo) {
      clearInterval(interval.current)
      setAtivo(false)
      if (sessaoId) {
        finalizarMut.mutate(
          { id: sessaoId, body: { contexto_nome: contexto?.nome } },
          { onSuccess: () => onFinalizar?.() },
        )
      }
    } else {
      createSessao({
        contexto_tipo: contexto?.tipo || 'livre',
        contexto_id: contexto?.id || null,
        duracao_min: minutos,
      }).then(s => {
        setSessaoId(s.id)
        setAtivo(true)
      }).catch(e => {
        console.error('[Pomodoro] criar sessão', e)
      })
    }
  }

  useEffect(() => {
    if (!ativo) return
    interval.current = setInterval(() => {
      const { minutos: m, segundos: s } = timeRef.current
      if (s > 0) {
        setSegundos(s - 1)
      } else if (m > 0) {
        setSegundos(59)
        setMinutos(m - 1)
      } else {
        clearInterval(interval.current)
        setAtivo(false)
        setMostrarResumo(true)
        playBeep()
      }
    }, 1000)
    return () => clearInterval(interval.current)
  }, [ativo, sessaoId])

  const display = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        {contexto && (
          <span className="text-sm text-text-secondary truncate max-w-[150px]">{contexto.nome}</span>
        )}
        <span className={`text-4xl font-mono font-bold tabular-nums ${ativo ? 'text-accent' : 'text-text-primary'}`}>{display}</span>
        <button
          onClick={toggle}
          className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${ativo ? 'bg-danger text-white' : 'bg-accent text-white hover:bg-accent-hover'}`}
        >
          {ativo ? 'Parar' : 'Iniciar'}
        </button>
      </div>

      {mostrarResumo && !ativo && (
        <div className="w-full max-w-md mt-2">
          <textarea
            value={resumo}
            onChange={e => setResumo(e.target.value)}
            placeholder="Registrar resumo da sessão (opcional)..."
            className="w-full bg-bg-tertiary rounded-lg p-3 text-sm outline-none resize-none h-20 focus:ring-1 focus:ring-accent"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                handleFinalizar(false)
                setMostrarResumo(false)
              }}
              className="px-4 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors"
            >
              Pular
            </button>
            <button
              onClick={() => {
                handleFinalizar(true)
                setMostrarResumo(false)
              }}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover"
            >
              Salvar resumo
            </button>
          </div>
        </div>
      )}

      {!ativo && !mostrarResumo && minutos === 0 && segundos === 0 && (
        <button
          onClick={() => { setMinutos(25); setSegundos(0); setResumo(''); setSessaoId(null) }}
          className="text-sm text-accent hover:underline"
        >
          Novo Pomodoro
        </button>
      )}
    </div>
  )
}
