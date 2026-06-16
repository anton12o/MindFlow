import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSessao, finalizarSessao } from '../api/pomodoro'
import { usePomodoroContext } from '../store/pomodoro'

interface Props {
  contexto?: { tipo: string; id: number; nome: string }
  onFinalizar?: () => void
}

function playBeep(fase: string) {
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
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('MindFlow', {
      body: fase === 'foco' ? 'Foco finalizado!' : 'Pausa finalizada!',
      icon: '/icon-192.svg',
    })
  } else if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export default function PomodoroTimer({ contexto, onFinalizar }: Props) {
  const {
    minutos, setMinutos, segundos, setSegundos,
    ativo, setAtivo,
    sessaoId, setSessaoId,
    resumo, setResumo,
    mostrarResumo, setMostrarResumo,
    config, setConfig,
    fase, setFase, cicloAtual, setCicloAtual,
    advancePhase, resetTimer, startedAtRef,
  } = usePomodoroContext()
  const rafRef = useRef(0)
  const lastDisplaySecRef = useRef(-1)
  const isCreating = useRef(false)
  const cancelledRef = useRef(false)
  const queryClient = useQueryClient()
  const [showConfig, setShowConfig] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Debounced config save
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      try {
        localStorage.setItem('mindflow_pomodoro_config', JSON.stringify(config))
      } catch {}
    }, 500)
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current) }
  }, [config])

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
      cancelAnimationFrame(rafRef.current)
      setAtivo(false)
      cancelledRef.current = true
      if (sessaoId) {
        finalizarMut.mutate(
          { id: sessaoId, body: { contexto_nome: contexto?.nome } },
          { onSuccess: () => onFinalizar?.() },
        )
      }
    } else {
      if (isCreating.current) return
      isCreating.current = true
      cancelledRef.current = false
      createSessao({
        contexto_tipo: contexto?.tipo || 'livre',
        contexto_id: contexto?.id || null,
        duracao_min: minutos,
      }).then(s => {
        isCreating.current = false
        if (cancelledRef.current) {
          finalizarSessao(s.id, {})
          return
        }
        setSessaoId(s.id)
        startedAtRef.current = Date.now()
        setAtivo(true)
      }).catch(e => {
        isCreating.current = false
        console.error('[Pomodoro] criar sessão', e)
      })
    }
  }

  const [showPhaseTransition, setShowPhaseTransition] = useState<{ type: 'foco_end' | 'pausa_end' } | null>(null)

  useEffect(() => {
    if (!ativo) return

    const phaseMs = (fase === 'foco' ? config.focoMin : fase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000

    // Immediate first-frame correction from wall-clock timestamp
    const initialElapsed = Date.now() - startedAtRef.current
    const initialRemainingMs = Math.max(0, phaseMs - initialElapsed)
    const initialTotalSec = Math.ceil(initialRemainingMs / 1000)
    setMinutos(Math.floor(initialTotalSec / 60))
    setSegundos(initialTotalSec % 60)
    lastDisplaySecRef.current = initialTotalSec

    if (initialElapsed >= phaseMs) {
      setAtivo(false)
      cancelledRef.current = false
      playBeep(fase)
      if (fase === 'foco') setShowPhaseTransition({ type: 'foco_end' })
      else setShowPhaseTransition({ type: 'pausa_end' })
      return
    }

    function tick() {
      const elapsed = Date.now() - startedAtRef.current
      const remainingMs = Math.max(0, phaseMs - elapsed)
      const totalSec = Math.ceil(remainingMs / 1000)

      if (totalSec !== lastDisplaySecRef.current) {
        lastDisplaySecRef.current = totalSec
        setMinutos(Math.floor(totalSec / 60))
        setSegundos(totalSec % 60)
      }

      if (elapsed >= phaseMs) {
        cancelledRef.current = false
        setAtivo(false)
        playBeep(fase)
        if (fase === 'foco') setShowPhaseTransition({ type: 'foco_end' })
        else setShowPhaseTransition({ type: 'pausa_end' })
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [ativo, fase, config])

  const display = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`

  const phaseLabels: Record<'foco' | 'pausa_curta' | 'pausa_longa', string> = {
    foco: '🎯 Foco',
    pausa_curta: '☕ Pausa curta',
    pausa_longa: '🌿 Pausa longa',
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <div className="flex items-center gap-4 w-full">
        {contexto && (
          <span className="text-sm text-text-secondary truncate max-w-[150px]">{contexto.nome}</span>
        )}
        <span className={`text-4xl font-mono font-bold tabular-nums ${ativo ? 'text-accent' : 'text-text-primary'}`}>{display}</span>
        <button
          onClick={toggle}
          className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${ativo ? 'bg-danger text-white' : 'bg-accent text-white font-semibold hover:bg-accent-hover'}`}
        >
          {ativo ? 'Parar' : 'Iniciar'}
        </button>
      </div>

      {/* Phase indicator */}
      <div className="w-full flex items-center justify-between text-sm">
        <span className="text-text-muted">{phaseLabels[fase]}</span>
        {fase === 'foco' && config.ciclosAtePausaLonga > 1 && (
          <span className="text-text-muted">Ciclo {cicloAtual + 1} de {config.ciclosAtePausaLonga}</span>
        )}
      </div>

      {/* Config section */}
      <div className="w-full border border-border rounded-lg overflow-hidden bg-bg-tertiary">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between p-3 text-left text-sm text-text-secondary hover:bg-bg-hover transition-colors"
          disabled={ativo}
        >
          <span>⚙ Configurações</span>
          <span className={`transition-transform ${showConfig ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {showConfig && (
          <div className="p-3 space-y-3 border-t border-border bg-bg-secondary">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Foco (min)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={config.focoMin}
                  onChange={e => setConfig(c => ({ ...c, focoMin: Math.min(120, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                  disabled={ativo}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Pausa curta (min)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={config.pausaCurtaMin}
                  onChange={e => setConfig(c => ({ ...c, pausaCurtaMin: Math.min(120, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                  disabled={ativo}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Pausa longa (min)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={config.pausaLongaMin}
                  onChange={e => setConfig(c => ({ ...c, pausaLongaMin: Math.min(120, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                  disabled={ativo}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Ciclos até pausa longa</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.ciclosAtePausaLonga}
                  onChange={e => setConfig(c => ({ ...c, ciclosAtePausaLonga: Math.min(20, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                  disabled={ativo}
                />
              </div>
            </div>
            <button
              onClick={() => setConfig({ focoMin: 25, pausaCurtaMin: 5, pausaLongaMin: 15, ciclosAtePausaLonga: 4 })}
              className="text-sm text-accent hover:underline self-start"
              disabled={ativo}
            >
              Restaurar padrão (25 / 5 / 15 / 4)
            </button>
          </div>
        )}
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
              disabled={finalizarMut.isPending}
              className="px-4 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50"
            >
              {finalizarMut.isPending ? '...' : 'Pular'}
            </button>
            <button
              onClick={() => {
                handleFinalizar(true)
                setMostrarResumo(false)
              }}
              disabled={finalizarMut.isPending}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50"
            >
              {finalizarMut.isPending ? '...' : 'Salvar resumo'}
            </button>
          </div>
        </div>
      )}

      {/* Phase transition: Foco ended -> show Resumo + "Iniciar pausa?" */}
      {showPhaseTransition?.type === 'foco_end' && (
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
                advancePhase()
                resetTimer()
                setSessaoId(null)
                setShowPhaseTransition(null)
              }}
              className="px-4 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors"
            >
              Pular resumo e iniciar pausa
            </button>
            <button
              onClick={() => {
                handleFinalizar(true)
                advancePhase()
                resetTimer()
                setSessaoId(null)
                setShowPhaseTransition(null)
              }}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover"
            >
              Salvar resumo e iniciar pausa
            </button>
          </div>
        </div>
      )}

      {/* Phase transition: Pausa ended -> "Iniciar próximo foco?" */}
      {showPhaseTransition?.type === 'pausa_end' && (
        <div className="w-full max-w-md mt-2 text-center">
          <p className="text-sm text-text-secondary mb-3">Pausa finalizada. Iniciar próximo foco?</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                advancePhase()
                resetTimer()
                setShowPhaseTransition(null)
              }}
              className="px-4 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors"
            >
              Não, obrigado
            </button>
            <button
              onClick={() => {
                advancePhase()
                resetTimer()
                setShowPhaseTransition(null)
                toggle()
              }}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover"
            >
              Sim, iniciar foco
            </button>
          </div>
        </div>
      )}

      {!ativo && !mostrarResumo && !showPhaseTransition && minutos === 0 && segundos === 0 && (
        <button
          onClick={() => { setMinutos(config.focoMin); setSegundos(0); setResumo(''); setSessaoId(null); setFase('foco'); setCicloAtual(0) }}
          className="text-sm text-accent hover:underline"
        >
          Novo Pomodoro
        </button>
      )}
    </div>
  )
}
