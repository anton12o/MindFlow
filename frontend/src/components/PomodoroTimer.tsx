import { useEffect, useRef, useState, memo, startTransition } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSessao, finalizarSessao } from '../api/pomodoro'
import { createNota } from '../api/notas'
import { usePomodoroContext, type Fase, type PomodoroScreen } from '../store/pomodoro'
import { useNotify, useDnd } from '../store/notification'
import { startAmbient, stopAmbient } from '../utils/ambientSound'
import { useConfig } from '../store/config'
import PomodoroConfigPanel from './PomodoroConfigPanel'
import PomodoroResumoForm from './PomodoroResumoForm'
import ConfirmModal from './ConfirmModal'

interface Props {
  contexto?: { tipo: string; id: number; nome: string }
  onFinalizar?: () => void
}

function canTransition(de: PomodoroScreen, para: PomodoroScreen): boolean {
  const valid: Record<PomodoroScreen, PomodoroScreen[]> = {
    idle: ['running', 'livre'],
    running: ['idle', 'pausado', 'foco_end', 'pausa_end'],
    pausado: ['idle', 'running'],
    livre: ['idle'],
    foco_end: ['idle', 'running'],
    pausa_end: ['idle', 'running'],
  }
  return valid[de].includes(para)
}

const PomodoroTimer = memo(function PomodoroTimer({ contexto, onFinalizar }: Props) {
  const { state, dispatch, config, setConfig, advancePhase, startedAtRef, audioCtxRef, saveHeartbeat, clearHeartbeat } = usePomodoroContext()
  const { minutos, segundos, ativo, sessaoId, resumo, mostrarResumo, fase, cicloAtual, screen, interrupcoes, distracoes } = state

  const notify = useNotify()
  const setDndActive = useDnd()
  const cancelRef = useRef(false)
  const queryClient = useQueryClient()

  const createSessaoMut = useMutation({
    mutationFn: (params: { contexto_tipo: string; contexto_id: number | null; duracao_min: number }) =>
      createSessao(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'sessoes'] })
    },
    onError: (e) => { console.error('[PomodoroTimer] criar sessão', e); notify('Erro ao iniciar sessão') },
  })

  useEffect(() => {
    dispatch({ type: 'SET_CONTEXTO', contexto: contexto || null })
    return () => { dispatch({ type: 'SET_CONTEXTO', contexto: null }) }
  }, [contexto])

  const HB_KEY = 'mindflow_pomodoro_heartbeat'
  const [showRestore, setShowRestore] = useState(false)
  const [heartbeatData, setHeartbeatData] = useState<{ screen: string; remainingMs: number; minutos: number; segundos: number; interrupcoes: string[]; contextoTipo: string | null; contextoId: number | null; fase: Fase; cicloAtual: number } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HB_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (data.screen === 'running' || data.screen === 'pausado' || data.screen === 'livre') {
          if (ativo || sessaoId) {
            return
          }
          if (Date.now() - data.savedAt < 2 * 60 * 60 * 1000) {
            startTransition(() => { setHeartbeatData(data); setShowRestore(true) })
            return
          }
        }
        localStorage.removeItem(HB_KEY)
      }
    } catch (e) { console.error('[PomodoroTimer.restore]', e) }
  }, [ativo, sessaoId])

  function salvarInterrupcoesNoInbox() {
    interrupcoes.forEach(texto => {
      createNota({ titulo: `📥 ${texto}`, conteudo: '' })
        .catch(e => { console.error('[Pomodoro] salvar interrupção no inbox', e); notify('Erro ao salvar interrupção') })
    })
    dispatch({ type: 'SET_INTERRUPCOES', interrupcoes: [] })
  }

  const [showConfig, setShowConfig] = useState(false)
  const remainingRef = useRef(0)
  const appConfig = useConfig()
  useEffect(() => {
    setDndActive(config.dnd && (screen === 'running' || screen === 'livre'))
  }, [config.dnd, screen, setDndActive])

  const [ambientOn, setAmbientOn] = useState(false)
  useEffect(() => {
    if (!appConfig.config.somAmbiente) {
      if (ambientOn) { stopAmbient(); setAmbientOn(false) }
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
  }, [screen, appConfig.config.somAmbiente])

  const [taskInput, setTaskInput] = useState('')
  const [interrupcaoInput, setInterrupcaoInput] = useState('')
  const [showStopConfirm, setShowStopConfirm] = useState(false)

  const finalizarMut = useMutation({
    mutationFn: (params: { id: number; body: { conteudo_resumo?: string; contexto_nome?: string } }) =>
      finalizarSessao(params.id, params.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'sessoes'] })
      queryClient.invalidateQueries({ queryKey: ['pomodoro', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
      queryClient.invalidateQueries({ queryKey: ['notas'] })
    },
    onError: (e) => { console.error('[PomodoroTimer] finalizar', e); notify('Erro ao finalizar sessão') },
  })

  function handleFinalizar(comResumo: boolean) {
    if (sessaoId) {
      finalizarMut.mutate(
        { id: sessaoId, body: { conteudo_resumo: comResumo && resumo ? resumo : undefined, contexto_nome: contexto?.nome } },
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

  function handleFree() {
    if (createSessaoMut.isPending) return
    if (!canTransition('idle', 'livre')) return
    cancelRef.current = false
    createSessaoMut.mutate(
      { contexto_tipo: 'livre', contexto_id: null, duracao_min: 0 },
      {
        onSuccess: (s) => {
          if (cancelRef.current) { finalizarSessao(s.id, {}); return }
          clearHeartbeat()
          dispatch({ type: 'SET_SESSAO_ID', sessaoId: s.id })
          startedAtRef.current = Date.now()
          dispatch({ type: 'SET_TIMER', minutos: 0, segundos: 0 })
          dispatch({ type: 'SET_ATIVO', ativo: true })
          dispatch({ type: 'SET_SCREEN', screen: 'livre' })
          dispatch({ type: 'SET_INTERRUPCOES', interrupcoes: [] })
        },
      },
    )
  }

  function handleStop() {
    if (createSessaoMut.isPending) {
      cancelRef.current = true
      return
    }
    if (screen === 'livre') {
      clearHeartbeat()
      dispatch({ type: 'SET_ATIVO', ativo: false })
      dispatch({ type: 'SET_SCREEN', screen: 'idle' })
      cancelRef.current = true
      if (sessaoId) {
        finalizarMut.mutate(
          { id: sessaoId, body: { contexto_nome: contexto?.nome } },
          { onSuccess: () => onFinalizar?.() },
        )
      }
      return
    }
    if (!canTransition(screen === 'running' ? 'running' : 'pausado', 'idle')) return
    clearHeartbeat()
    dispatch({ type: 'SET_ATIVO', ativo: false })
    dispatch({ type: 'SET_SCREEN', screen: 'idle' })
    cancelRef.current = true
    if (sessaoId) {
      finalizarMut.mutate(
        { id: sessaoId, body: { contexto_nome: contexto?.nome } },
        { onSuccess: () => onFinalizar?.() },
      )
    }
  }

  function handleStopClick() {
    if (interrupcoes.length > 0) {
      setShowStopConfirm(true)
      return
    }
    handleStop()
  }

  function handlePause() {
    if (!canTransition('running', 'pausado')) return
    const phaseMs = (fase === 'foco' ? config.focoMin : fase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000
    const elapsed = Date.now() - startedAtRef.current
    remainingRef.current = Math.max(0, phaseMs - elapsed)
    const totalSec = Math.ceil(remainingRef.current / 1000)
    dispatch({ type: 'SET_TIMER', minutos: Math.floor(totalSec / 60), segundos: totalSec % 60 })
    dispatch({ type: 'SET_ATIVO', ativo: false })
    dispatch({ type: 'SET_SCREEN', screen: 'pausado' })
    setTimeout(() => saveHeartbeat(), 50)
  }

  function handleResume() {
    if (!canTransition('pausado', 'running')) return
    const phaseMs = (fase === 'foco' ? config.focoMin : fase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000
    startedAtRef.current = Date.now() - (phaseMs - remainingRef.current)
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    dispatch({ type: 'SET_ATIVO', ativo: true })
    dispatch({ type: 'SET_SCREEN', screen: 'running' })
  }

  function handleStart() {
    if (createSessaoMut.isPending) return
    if (!canTransition(screen, 'running')) return
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    cancelRef.current = false
    createSessaoMut.mutate(
      {
        contexto_tipo: contexto?.tipo || (taskInput.trim() ? 'tarefa' : 'livre'),
        contexto_id: contexto?.id || null,
        duracao_min: minutos,
      },
      {
        onSuccess: (s) => {
          if (cancelRef.current) { finalizarSessao(s.id, {}); return }
          clearHeartbeat()
          dispatch({ type: 'SET_SESSAO_ID', sessaoId: s.id })
          startedAtRef.current = Date.now()
          dispatch({ type: 'SET_ATIVO', ativo: true })
          dispatch({ type: 'SET_SCREEN', screen: 'running' })
          dispatch({ type: 'SET_INTERRUPCOES', interrupcoes: [] })
        },
      },
    )
  }

  const display = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`

  const phaseLabels: Record<string, string> = {
    foco: '⚡ Foco',
    pausa_curta: '☕ Pausa curta',
    pausa_longa: '☕ Pausa longa',
    livre: '⏱ Livre',
  }

  function handleRestore() {
    if (!heartbeatData) return
    const { fase: hFase, cicloAtual: hCiclo, minutos: hMin, segundos: hSeg,
            interrupcoes: hInt, remainingMs, contextoTipo, contextoId } = heartbeatData
    dispatch({ type: 'SET_FASE', fase: hFase })
    dispatch({ type: 'SET_CICLO', ciclo: hCiclo })
    dispatch({ type: 'SET_TIMER', minutos: hMin, segundos: hSeg })
    dispatch({ type: 'SET_INTERRUPCOES', interrupcoes: hInt || [] })
    cancelRef.current = false
    createSessaoMut.mutate(
      {
        contexto_tipo: contextoTipo || 'tarefa',
        contexto_id: contextoId || null,
        duracao_min: Math.ceil(remainingMs / 60000) || 1,
      },
      {
        onSuccess: (s) => {
          if (cancelRef.current) { finalizarSessao(s.id, {}); return }
          dispatch({ type: 'SET_SESSAO_ID', sessaoId: s.id })
          const phaseMs = (hFase === 'foco' ? config.focoMin : hFase === 'pausa_curta' ? config.pausaCurtaMin : config.pausaLongaMin) * 60 * 1000
          startedAtRef.current = Date.now() - Math.max(0, phaseMs - remainingMs)
          dispatch({ type: 'SET_ATIVO', ativo: true })
          dispatch({ type: 'SET_SCREEN', screen: 'running' })
          clearHeartbeat()
          setShowRestore(false)
          setHeartbeatData(null)
        },
      },
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      {showRestore && heartbeatData && (
        <div className="w-full bg-bg-secondary border border-border rounded-lg p-4 text-center animate-fade-in">
          <p className="text-sm text-text-primary mb-3">Sessão interrompida detectada ({heartbeatData.minutos}:{String(heartbeatData.segundos).padStart(2, '0')} restantes)</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => { clearHeartbeat(); setShowRestore(false); setHeartbeatData(null) }}
              className="px-4 py-2 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors">
              Descartar
            </button>
            <button onClick={handleRestore}
              className="px-4 py-2 bg-accent text-accent-foreground text-sm rounded-lg hover:bg-accent-hover transition-colors">
              Continuar sessão
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4 w-full">
        {contexto && (
          <span className="text-sm text-text-secondary truncate max-w-[150px]">{contexto.nome}</span>
        )}
        <span className={`text-4xl font-mono font-bold tabular-nums ${screen === 'running' || screen === 'livre' ? 'text-accent' : 'text-text-primary'}`}>{display}</span>
        <div className="flex items-center gap-2">
          {screen === 'idle' && (
            <>
              <button onClick={handleStart}
                className="px-4 py-2 bg-accent text-accent-foreground text-sm rounded-lg font-semibold hover:bg-accent-hover transition-colors">
                Iniciar
              </button>
              <button onClick={() => { dispatch({ type: 'SET_TIMER', minutos: config.descansoMin, segundos: 0 }); handleStart() }}
                className="px-3 py-2 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors">
                ☕ {config.descansoMin}min
              </button>
              <button onClick={handleFree}
                className="px-3 py-2 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors">
                Livre
              </button>
            </>
          )}
          {(screen === 'running' || screen === 'livre') && (
            <>
              <button onClick={handlePause}
                className="px-4 py-2 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors">
                Pausar
              </button>
              <button onClick={handleStopClick} className="text-xs text-danger hover:underline ml-1">Parar</button>
            </>
          )}
          {screen === 'pausado' && (
            <>
              <button onClick={handleResume}
                className="px-4 py-2 bg-accent text-accent-foreground text-sm rounded-lg font-semibold hover:bg-accent-hover transition-colors">
                Continuar
              </button>
              <button onClick={handleStopClick} className="text-xs text-danger hover:underline ml-1">Parar</button>
            </>
          )}
          {screen === 'livre' && (
            <button onClick={handleStopClick} className="px-4 py-2 bg-danger text-white text-sm rounded-lg hover:bg-danger/80 transition-colors">
              Parar
            </button>
          )}
        </div>
      </div>

      {!contexto && screen === 'idle' && (
        <div className="w-full">
          <input
            value={taskInput}
            onChange={e => setTaskInput(e.target.value)}
            placeholder="O que você vai fazer neste ciclo? (Opcional)"
            className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      )}

      {(screen === 'running' || screen === 'pausado') && (
        <div className="w-full">
          <div className="flex gap-2">
            <input
              value={interrupcaoInput}
              onChange={e => setInterrupcaoInput(e.target.value)}
              placeholder="Anotar distração..."
              className="flex-1 bg-bg-tertiary rounded px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <button
              onClick={() => {
                if (interrupcaoInput.trim()) {
                  dispatch({ type: 'ADD_INTERRUPCAO', texto: interrupcaoInput.trim() })
                  setInterrupcaoInput('')
                }
              }}
              className="px-3 py-2 bg-accent text-accent-foreground text-sm rounded-lg hover:bg-accent-hover transition-colors"
              title="Adicionar interrupção" aria-label="Adicionar interrupção"
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

      <div className="w-full flex items-center justify-between text-sm">
        <span className="text-text-muted flex items-center gap-2">
          {phaseLabels[fase]}
          {(screen === 'running' || screen === 'livre') && appConfig.config.somAmbiente && ambientOn && (
            <span className="text-xs text-text-muted/60">🔊</span>
          )}
        </span>
        {fase === 'foco' && config.ciclosAtePausaLonga > 1 && (
          <span className="text-text-muted">Ciclo {cicloAtual + 1} de {config.ciclosAtePausaLonga}</span>
        )}
      </div>

      <PomodoroConfigPanel config={config} setConfig={setConfig} ativo={ativo} showConfig={showConfig} setShowConfig={setShowConfig} />

      {mostrarResumo && !ativo && (
        <PomodoroResumoForm resumo={resumo} setResumo={(r) => dispatch({ type: 'SET_RESUMO', resumo: r })}
          distracoes={distracoes} interrupcoes={interrupcoes}
          isPending={finalizarMut.isPending}
          onPular={() => { handleFinalizar(false); dispatch({ type: 'SET_MOSTRAR_RESUMO', mostrar: false }) }}
          onSalvar={() => { handleFinalizar(true); dispatch({ type: 'SET_MOSTRAR_RESUMO', mostrar: false }) }} />
      )}

      {distracoes > 0 && (
        <div className="text-xs text-text-muted mt-1">
          👀 {distracoes} {distracoes === 1 ? 'distração' : 'distrações'} durante a sessão
        </div>
      )}

      {screen === 'foco_end' && (
        <PomodoroResumoForm resumo={resumo} setResumo={(r) => dispatch({ type: 'SET_RESUMO', resumo: r })}
          distracoes={distracoes} interrupcoes={interrupcoes}
          isPending={finalizarMut.isPending}
          labelPular="Pular resumo e iniciar pausa"
          labelSalvar="Salvar resumo e iniciar pausa"
          onPular={() => { handleFinalizar(false); advancePhase(); dispatch({ type: 'RESET_TIMER', durations: { foco: config.focoMin, pausa_curta: config.pausaCurtaMin, pausa_longa: config.pausaLongaMin } }); dispatch({ type: 'SET_SESSAO_ID', sessaoId: null }); dispatch({ type: 'SET_SCREEN', screen: 'idle' }) }}
          onSalvar={() => { handleFinalizar(true); advancePhase(); dispatch({ type: 'RESET_TIMER', durations: { foco: config.focoMin, pausa_curta: config.pausaCurtaMin, pausa_longa: config.pausaLongaMin } }); dispatch({ type: 'SET_SESSAO_ID', sessaoId: null }); dispatch({ type: 'SET_SCREEN', screen: 'idle' }) }} />
      )}

      {screen === 'pausa_end' && !ativo && (
        <div className="w-full max-w-md mt-2 text-center">
          {config.autoStart ? (
            <div className="animate-fade-in">
              <p className="text-sm text-text-secondary mb-3">Iniciando próximo foco...</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary mb-3">Pausa finalizada. Iniciar próximo foco?</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    advancePhase()
                    dispatch({ type: 'RESET_TIMER', durations: { foco: config.focoMin, pausa_curta: config.pausaCurtaMin, pausa_longa: config.pausaLongaMin } })
                    dispatch({ type: 'SET_SCREEN', screen: 'idle' })
                  }}
                  className="px-4 py-2 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors"
                >
                  Não, obrigado
                </button>
                <button
                  onClick={() => {
                    advancePhase()
                    dispatch({ type: 'RESET_TIMER', durations: { foco: config.focoMin, pausa_curta: config.pausaCurtaMin, pausa_longa: config.pausaLongaMin } })
                    dispatch({ type: 'SET_SCREEN', screen: 'idle' })
                    handleStart()
                  }}
                  className="px-4 py-2 bg-accent text-accent-foreground text-sm rounded-lg hover:bg-accent-hover"
                >
                  Sim, iniciar foco
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!ativo && !mostrarResumo && screen === 'idle' && minutos === 0 && segundos === 0 && (
        <button
          onClick={() => { clearHeartbeat(); dispatch({ type: 'SET_TIMER', minutos: config.focoMin, segundos: 0 }); dispatch({ type: 'SET_RESUMO', resumo: '' }); dispatch({ type: 'SET_SESSAO_ID', sessaoId: null }); dispatch({ type: 'SET_FASE', fase: 'foco' }); dispatch({ type: 'SET_CICLO', ciclo: 0 }) }}
          className="text-sm text-accent hover:underline"
        >
          Novo Pomodoro
        </button>
      )}

      {showStopConfirm && (
        <ConfirmModal
          titulo="Interrupções não salvas"
          mensagem={`Você tem ${interrupcoes.length} interrupção(ões) anotada(s) mas não salva(s).`}
          confirmLabel="Salvar e parar"
          cancelLabel="Parar sem salvar"
          onConfirm={() => { salvarInterrupcoesNoInbox(); setShowStopConfirm(false); handleStop() }}
          onCancel={() => { setShowStopConfirm(false); handleStop() }}
        />
      )}
    </div>
  )
})

export default PomodoroTimer
