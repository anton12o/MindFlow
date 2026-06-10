import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSessao, finalizarSessao } from '../api/pomodoro'

interface Props {
  contexto?: { tipo: string; id: number; nome: string }
  onFinalizar?: () => void
}

export default function PomodoroTimer({ contexto, onFinalizar }: Props) {
  const [minutos, setMinutos] = useState(25)
  const [segundos, setSegundos] = useState(0)
  const [ativo, setAtivo] = useState(false)
  const [sessaoId, setSessaoId] = useState<number | null>(null)
  const [resumo, setResumo] = useState('')
  const [mostrarResumo, setMostrarResumo] = useState(false)
  const interval = useRef<ReturnType<typeof setInterval>>(undefined)
  const queryClient = useQueryClient()

  const finalizarMut = useMutation({
    mutationFn: (params: { id: number; resumo?: string }) =>
      finalizarSessao(params.id, params.resumo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'sessoes'] })
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      onFinalizar?.()
    },
  })

  function toggle() {
    if (ativo) {
      clearInterval(interval.current)
      setAtivo(false)
      if (sessaoId) {
        finalizarMut.mutate({ id: sessaoId, resumo: resumo || undefined })
      }
    } else {
      createSessao({
        contexto_tipo: contexto?.tipo || 'livre',
        contexto_id: contexto?.id || null,
        duracao_min: minutos,
      }).then(s => {
        setSessaoId(s.id)
        setAtivo(true)
      })
    }
  }

  useEffect(() => {
    if (ativo) {
      interval.current = setInterval(() => {
        setSegundos(s => {
          if (s === 0) {
            setMinutos(m => {
              if (m === 0) {
                clearInterval(interval.current)
                setAtivo(false)
                setMostrarResumo(true)
                if (sessaoId) {
                  finalizarMut.mutate({ id: sessaoId, resumo: resumo || undefined })
                }
                return 0
              }
              return m - 1
            })
            return 59
          }
          return s - 1
        })
      }, 1000)
    }
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
            placeholder="Registrar resumo da sessão..."
            className="w-full bg-bg-tertiary rounded-lg p-3 text-sm outline-none resize-none h-20 focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={() => {
              if (sessaoId) {
                finalizarMut.mutate({ id: sessaoId, resumo: resumo || undefined })
              }
              setMostrarResumo(false)
            }}
            className="mt-2 px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover"
          >
            Salvar resumo
          </button>
        </div>
      )}

      {!ativo && !mostrarResumo && minutos === 0 && segundos === 0 && (
        <button
          onClick={() => { setMinutos(25); setSegundos(0); setResumo('') }}
          className="text-sm text-accent hover:underline"
        >
          Novo Pomodoro
        </button>
      )}
    </div>
  )
}
