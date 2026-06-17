import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSessao, finalizarSessao } from '../api/pomodoro'
import { createNota } from '../api/notas'
import { usePomodoroContext } from '../store/pomodoro'

interface Props {
  contexto?: { tipo: string; id: number; nome: string }
  onFinalizar?: () => void
}

type PomodoroScreen = 'idle' | 'running' | 'pausado' | 'foco_end' | 'pausa_end'

function canTransition(de: PomodoroScreen, para: PomodoroScreen): boolean {
  const valid: Record<PomodoroScreen, PomodoroScreen[]> = {
    idle: ['running'],
    running: ['idle', 'pausado', 'foco_end', 'pausa_end'],
    pausado: ['idle', 'running'],
    foco_end: ['idle', 'running'],
    pausa_end: ['idle', 'running'],
  }
  return valid[de].includes(para)
}

function playAlarm(ctx: AudioContext) {
  try {
    const freqs = [660, 880, 1040]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'square'
      const t = ctx.currentTime + i * 0.15
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2)
      osc.start(t)
      osc.stop(t + 0.2)
    })
  } catch { /* audio not available */ }
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

  // Heartbeat
  const HB_KEY = 'mindflow_pomodoro_heartbeat'
  const saveHeartbeat = () => {
    if (screen !== 'running' && screen !== 'pausado') return
    const phaseMs = (fase === 'foco' ? config.focoMin : fase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000
    const elapsed = Date.now() - startedAtRef.current
    const remainingMs = Math.max(0, phaseMs - elapsed)
    try {
      localStorage.setItem(HB_KEY, JSON.stringify({
        savedAt: Date.now(), screen, fase, cicloAtual, sessaoId,
        interrupcoes, remainingMs, minutos, segundos,
        contextoTipo: contexto?.tipo || null,
        contextoId: contexto?.id || null,
        contextoNome: contexto?.nome || null,
      }))
    } catch {}
  }
  const clearHeartbeat = () => { try { localStorage.removeItem(HB_KEY) } catch {} }

  const [showRestore, setShowRestore] = useState(false)
  const [heartbeatData, setHeartbeatData] = useState<any>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HB_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (data.screen === 'running' || data.screen === 'pausado') {
          if (Date.now() - data.savedAt < 2 * 60 * 60 * 1000) {
            setHeartbeatData(data)
            setShowRestore(true)
            return
          }
        }
        localStorage.removeItem(HB_KEY)
      }
    } catch {}
  }, [])

  function salvarInterrupcoesNoInbox() {
    interrupcoes.forEach(texto => {
      createNota({ titulo: `🧠 ${texto}`, conteudo: '' })
        .catch(e => console.error('[Pomodoro] salvar interrupção no inbox', e))
    })
    setInterrupcoes([])
  }
  const [showConfig, setShowConfig] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const remainingRef = useRef(0)
  const [screen, setScreen] = useState<PomodoroScreen>(ativo ? 'running' : 'idle')
  const [taskInput, setTaskInput] = useState('')
  const [interrupcoes, setInterrupcoes] = useState<string[]>([])
  const [interrupcaoInput, setInterrupcaoInput] = useState('')

  useEffect(() => {
    return () => { audioCtxRef.current?.close() }
  }, [])

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
        {
          onSuccess: () => {
            onFinalizar?.()
            clearHeartbeat()
          },
        },
      )
      if (interrupcoes.length > 0) salvarInterrupcoesNoInbox()
    }
  }

  function handleStop() {
    if (!canTransition(screen === 'running' ? 'running' : 'pausado', 'idle')) return
    cancelAnimationFrame(rafRef.current)
    clearHeartbeat()
    setAtivo(false)
    setScreen('idle')
    cancelledRef.current = true
    if (sessaoId) {
      finalizarMut.mutate(
        { id: sessaoId, body: { contexto_nome: contexto?.nome } },
        { onSuccess: () => onFinalizar?.() },
      )
    }
  }

  function toggle() {
    if (screen === 'running') {
      if (!canTransition('running', 'pausado')) return
      cancelAnimationFrame(rafRef.current)
      const phaseMs = (fase === 'foco' ? config.focoMin : fase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000
      const elapsed = Date.now() - startedAtRef.current
      remainingRef.current = Math.max(0, phaseMs - elapsed)
      const totalSec = Math.ceil(remainingRef.current / 1000)
      setMinutos(Math.floor(totalSec / 60))
      setSegundos(totalSec % 60)
      setAtivo(false)
      setScreen('pausado')
      saveHeartbeat()
      return
    }

    if (screen === 'pausado') {
      if (!canTransition('pausado', 'running')) return
      const phaseMs = (fase === 'foco' ? config.focoMin : fase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000
      startedAtRef.current = Date.now() - (phaseMs - remainingRef.current)
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      } else if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
      setAtivo(true)
      setScreen('running')
      return
    }

    if (isCreating.current) return
    if (!canTransition(screen, 'running')) return
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    if (!contexto && !taskInput.trim()) return
    isCreating.current = true
    cancelledRef.current = false
    createSessao({
      contexto_tipo: contexto?.tipo || 'tarefa',
      contexto_id: contexto?.id || null,
      duracao_min: minutos,
    }).then(s => {
      isCreating.current = false
      if (cancelledRef.current) {
        finalizarSessao(s.id, {})
        return
      }
      clearHeartbeat()
      setSessaoId(s.id)
      startedAtRef.current = Date.now()
      setAtivo(true)
      setScreen('running')
      setInterrupcoes([])
    }).catch(e => {
      isCreating.current = false
      console.error('[Pomodoro] criar sessão', e)
    })
  }

  useEffect(() => {
    if (screen !== 'running') return

    const phaseMs = (fase === 'foco' ? config.focoMin : fase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000

    // Immediate first-frame correction from wall-clock timestamp
    const initialElapsed = Date.now() - startedAtRef.current
    const initialRemainingMs = Math.max(0, phaseMs - initialElapsed)
    const initialTotalSec = Math.ceil(initialRemainingMs / 1000)
    setMinutos(Math.floor(initialTotalSec / 60))
    setSegundos(initialTotalSec % 60)
    lastDisplaySecRef.current = initialTotalSec

    if (initialElapsed >= phaseMs) {
      cancelledRef.current = false
      clearHeartbeat()
      setAtivo(false)
      setScreen(fase === 'foco' ? 'foco_end' : 'pausa_end')
      if (audioCtxRef.current) playAlarm(audioCtxRef.current)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('MindFlow', {
          body: fase === 'foco' ? 'Foco finalizado!' : 'Pausa finalizada!',
          icon: '/icon-192.svg',
        })
      } else if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
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
        saveHeartbeat()
      }

      if (elapsed >= phaseMs) {
        cancelledRef.current = false
        clearHeartbeat()
        setAtivo(false)
        setScreen(fase === 'foco' ? 'foco_end' : 'pausa_end')
        if (audioCtxRef.current) playAlarm(audioCtxRef.current)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('MindFlow', {
            body: fase === 'foco' ? 'Foco finalizado!' : 'Pausa finalizada!',
            icon: '/icon-192.svg',
          })
        } else if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission()
        }
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [screen, fase, config])

  const display = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`

  const phaseLabels: Record<'foco' | 'pausa_curta' | 'pausa_longa', string> = {
    foco: '🎯 Foco',
    pausa_curta: '☕ Pausa curta',
    pausa_longa: '🌿 Pausa longa',
  }

  function handleRestore() {
    if (!heartbeatData) return
    const { fase: hFase, cicloAtual: hCiclo, minutos: hMin, segundos: hSeg,
            interrupcoes: hInt, remainingMs, contextoTipo, contextoId } = heartbeatData
    setFase(hFase)
    setCicloAtual(hCiclo)
    setMinutos(hMin)
    setSegundos(hSeg)
    setInterrupcoes(hInt || [])
    isCreating.current = true
    createSessao({
      contexto_tipo: contextoTipo || 'tarefa',
      contexto_id: contextoId || null,
      duracao_min: Math.ceil(remainingMs / 60000) || 1,
    }).then(s => {
      isCreating.current = false
      if (cancelledRef.current) { finalizarSessao(s.id, {}); return }
      setSessaoId(s.id)
      const phaseMs = (hFase === 'foco' ? config.focoMin : hFase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000
      startedAtRef.current = Date.now() - Math.max(0, phaseMs - remainingMs)
      setAtivo(true)
      setScreen('running')
      clearHeartbeat()
      setShowRestore(false)
      setHeartbeatData(null)
    }).catch(e => {
      isCreating.current = false
      console.error('[Pomodoro] restaurar sessão', e)
    })
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      {showRestore && heartbeatData && (
        <div className="w-full bg-bg-secondary border border-border rounded-lg p-4 text-center animate-fade-in">
          <p className="text-sm text-text-primary mb-3">Sessão interrompida detectada ({heartbeatData.minutos}:{String(heartbeatData.segundos).padStart(2, '0')} restantes)</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => { clearHeartbeat(); setShowRestore(false); setHeartbeatData(null) }}
              className="px-4 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors">
              Descartar
            </button>
            <button onClick={handleRestore}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
              Continuar sessão
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4 w-full">
        {contexto && (
          <span className="text-sm text-text-secondary truncate max-w-[150px]">{contexto.nome}</span>
        )}
        <span className={`text-4xl font-mono font-bold tabular-nums ${screen === 'running' ? 'text-accent' : 'text-text-primary'}`}>{display}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            disabled={!contexto && !taskInput.trim() && screen !== 'running' && screen !== 'pausado'}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 ${
              screen === 'running' ? 'bg-bg-tertiary text-text-primary hover:bg-bg-hover' :
              'bg-accent text-white font-semibold hover:bg-accent-hover'
            }`}
          >
            {screen === 'running' ? 'Pausar' : screen === 'pausado' ? 'Continuar' : 'Iniciar'}
          </button>
          {(screen === 'running' || screen === 'pausado') && (
            <button onClick={handleStop} className="text-xs text-danger hover:underline ml-1">
              Parar
            </button>
          )}
        </div>
      </div>

      {/* Bloqueio de contexto */}
      {!contexto && screen === 'idle' && (
        <div className="w-full">
          <input
            value={taskInput}
            onChange={e => setTaskInput(e.target.value)}
            placeholder="O que você vai fazer neste ciclo?"
            className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      )}

      {/* Lista de interrupções (durante o foco) */}
      {screen === 'running' && (
        <div className="w-full">
          <div className="flex gap-2">
            <input
              value={interrupcaoInput}
              onChange={e => setInterrupcaoInput(e.target.value)}
              placeholder="Anotar distração..."
              className="flex-1 bg-bg-tertiary rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={() => {
                if (interrupcaoInput.trim()) {
                  setInterrupcoes(p => [...p, interrupcaoInput.trim()])
                  setInterrupcaoInput('')
                }
              }}
              className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors"
            >
              +
            </button>
          </div>
          {interrupcoes.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {interrupcoes.map((item, i) => (
                <li key={i} className="text-xs text-text-muted flex items-start gap-1">
                  <span className="mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
          {interrupcoes.length > 0 && (
            <div className="mb-2 text-xs text-text-muted">
              <p className="font-medium mb-0.5">Distrações registradas:</p>
              <ul className="space-y-0.5">
                {interrupcoes.map((item, i) => (
                  <li key={i} className="flex items-start gap-1">• {item}</li>
                ))}
              </ul>
            </div>
          )}
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
      {screen === 'foco_end' && (
        <div className="w-full max-w-md mt-2">
          {interrupcoes.length > 0 && (
            <div className="mb-2 text-xs text-text-muted">
              <p className="font-medium mb-0.5">Distrações registradas:</p>
              <ul className="space-y-0.5">
                {interrupcoes.map((item, i) => (
                  <li key={i} className="flex items-start gap-1">• {item}</li>
                ))}
              </ul>
            </div>
          )}
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
                setScreen('idle')
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
                setScreen('idle')
              }}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover"
            >
              Salvar resumo e iniciar pausa
            </button>
          </div>
        </div>
      )}

      {/* Phase transition: Pausa ended -> "Iniciar próximo foco?" */}
      {screen === 'pausa_end' && (
        <div className="w-full max-w-md mt-2 text-center">
          <p className="text-sm text-text-secondary mb-3">Pausa finalizada. Iniciar próximo foco?</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                advancePhase()
                resetTimer()
                setScreen('idle')
              }}
              className="px-4 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors"
            >
              Não, obrigado
            </button>
            <button
              onClick={() => {
                advancePhase()
                resetTimer()
                setScreen('idle')
                toggle()
              }}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover"
            >
              Sim, iniciar foco
            </button>
          </div>
        </div>
      )}

      {!ativo && !mostrarResumo && screen === 'idle' && minutos === 0 && segundos === 0 && (
        <button
          onClick={() => { clearHeartbeat(); setMinutos(config.focoMin); setSegundos(0); setResumo(''); setSessaoId(null); setFase('foco'); setCicloAtual(0) }}
          className="text-sm text-accent hover:underline"
        >
          Novo Pomodoro
        </button>
      )}
    </div>
  )
}
