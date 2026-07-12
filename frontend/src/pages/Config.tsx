import { startTransition, useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTheme, MODE_ICON, PRESET_COLORS, darkenColor } from '../store/theme'
import { useConfig } from '../hooks/useConfig'
import { useNotify } from '../store/notification'
import { useKeybindings, comboLabel, KEYBINDING_LABELS } from '../store/keybindings'
import { usePomodoroContext } from '../store/pomodoro'
import { exportAll, exportCSV, exportTarefasFeitas, vacuumDB, backupDB, listBackups, downloadBackup } from '../api/export'
import { importFile } from '../api/import_export'
import { formatDateLocal } from '../utils/date'
import ToggleSwitch from '../components/ToggleSwitch'
import Tipos from './Tipos'

const PIN_KEY = 'mindflow_pin'
const PIN_ENABLED_KEY = 'mindflow_pin_enabled'
const CONT_KEY = 'mindflow_continuous_timer'

export default function Config() {
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [aba, setAba] = useState<'tipos' | 'exportar' | 'config'>(tabFromUrl === 'exportar' ? 'exportar' : tabFromUrl === 'config' ? 'config' : 'tipos')
  const { mode, cycleTheme, customTheme, setCustomTheme, resetCustomTheme } = useTheme()
  const { config, setConfig } = useConfig()
  const hiddenSet = new Set(config.hiddenSections)
  const notify = useNotify()
  const fileRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  const [pin, setPin] = useState(() => localStorage.getItem(PIN_KEY) || '')
  const [pinEnabled, setPinEnabled] = useState(() => localStorage.getItem(PIN_ENABLED_KEY) === '1')
  const [pinInput, setPinInput] = useState('')
  const [pinDirty, setPinDirty] = useState(false)

  const [contTimer, setContTimer] = useState(() => localStorage.getItem(CONT_KEY) === '1')
  const { bindings, rebind, reset: resetBindings, getLastConflict } = useKeybindings()
  const [rebindingAction, setRebindingAction] = useState<string | null>(null)

  const { config: pomConfig, setConfig: setPomConfig } = usePomodoroContext()

  useEffect(() => {
    if (!rebindingAction) return
    const action: string = rebindingAction
    function handler(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { setRebindingAction(null); return }
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl && !e.shiftKey && !e.altKey) return
      rebind(action, { key: e.key.toLowerCase(), ctrl, shift: e.shiftKey, alt: e.altKey })
      const conflito = getLastConflict()
      if (conflito) notify(`Atalho substituído: "${KEYBINDING_LABELS[conflito] || conflito}" agora usa esta combinação`, 'error')
      setRebindingAction(null)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [rebindingAction, rebind])

  function handleExportJSON() {
    if (exporting) return
    setExporting(true)
    exportAll()
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mindflow-export-${formatDateLocal(new Date())}.json`
        a.click()
        URL.revokeObjectURL(url)
        notify('Exportado com sucesso!', 'success')
      })
      .catch(e => { console.error('[Config] export', e); notify('Erro ao exportar') })
      .finally(() => setExporting(false))
  }

  function handleExportCSV() {
    exportCSV().then(() => notify('CSV exportado!', 'success'))
      .catch(e => { console.error('[Config] csv', e); notify('Erro ao exportar CSV') })
  }

  function handleImport() {
    fileRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    importFile(file)
      .then(r => {
        const total = Object.values(r.tabelas).reduce((s, t) => s + t.inseridos + t.atualizados, 0)
        notify(`${total} registros importados!`, 'success')
      })
      .catch(e => { console.error('[Config] import', e); notify('Erro ao importar') })
      .finally(() => { setImporting(false); e.target.value = '' })
  }

  async function hashPin(pin: string): Promise<string> {
    const enc = new TextEncoder().encode(pin)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    return hex
  }

  async function handleSavePin() {
    if (pinInput && pinInput.length !== 4) { notify('O PIN deve ter 4 dígitos'); return }
    if (pinInput) {
      const hashed = await hashPin(pinInput)
      localStorage.setItem(PIN_KEY, hashed)
      setPin(hashed)
      notify('PIN salvo!', 'success')
    } else {
      localStorage.removeItem(PIN_KEY)
      setPin('')
      notify('PIN removido', 'success')
    }
    setPinInput('')
    setPinDirty(false)
  }

  function togglePinEnabled() {
    const next = !pinEnabled
    setPinEnabled(next)
    localStorage.setItem(PIN_ENABLED_KEY, next ? '1' : '')
    if (next && !pin) notify('Defina um PIN de 4 dígitos abaixo')
  }

  function handleVacuum() {
    vacuumDB().then(r => notify(r.mensagem, 'success')).catch(e => { console.error('[Config] vacuum', e); notify('Erro ao compactar') })
  }

  function toggleContTimer() {
    const next = !contTimer
    setContTimer(next)
    localStorage.setItem(CONT_KEY, next ? '1' : '')
    notify(next ? 'Timer contínuo ativado' : 'Timer contínuo desativado', 'success')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in space-y-8">
      <h1 className="text-2xl font-bold">Config</h1>

      <div className="flex gap-1 border-b border-border">
        <button onClick={() => setAba('tipos')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${aba === 'tipos' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
          Tipos
        </button>
        <button onClick={() => setAba('exportar')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${aba === 'exportar' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
          Exportar
        </button>
        <button onClick={() => setAba('config')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${aba === 'config' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
          Config
        </button>
      </div>

      {aba === 'tipos' && <Tipos compact />}

      {aba === 'exportar' && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Exportar dados</h2>
          <div className="flex gap-2">
            <button onClick={handleExportJSON} disabled={exporting}
              className="px-4 py-2 bg-accent text-white text-sm rounded-lg transition-all active:scale-95 disabled:opacity-50 hover:bg-accent-hover">
              {exporting ? 'Exportando...' : 'Exportar JSON'}
            </button>
            <button onClick={handleExportCSV}
              className="px-4 py-2 bg-bg-hover text-text-primary text-sm rounded-lg hover:bg-bg-secondary transition-all active:scale-95">
              Exportar CSV
            </button>
            <button onClick={() => exportTarefasFeitas().catch(e => { console.error('[Config] export tarefas', e); notify('Erro ao exportar tarefas') })}
              className="px-4 py-2 bg-bg-hover text-text-primary text-sm rounded-lg hover:bg-bg-secondary transition-all active:scale-95">
              Tarefas concluídas
            </button>
          </div>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider pt-2">Importar dados</h2>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          <button onClick={handleImport} disabled={importing}
            className="px-4 py-2 bg-bg-hover text-text-primary text-sm rounded-lg transition-all active:scale-95 disabled:opacity-50 hover:bg-bg-secondary">
            {importing ? 'Importando...' : 'Importar JSON'}
          </button>
        </div>
      )}

      {aba === 'config' && (
        <div className="space-y-6">
          <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Aparência</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-primary">Tema</span>
              <button onClick={cycleTheme}
                className="px-3 py-1.5 bg-bg-hover rounded-lg text-sm hover:bg-bg-secondary transition-all active:scale-95">
                <span className="mr-1">{MODE_ICON[mode]}</span>
                {mode === 'dark' ? 'Escuro' : mode === 'light' ? 'Claro' : 'Sistema'}
              </button>
            </div>
            <div>
              <span className="text-sm text-text-primary">Cor de destaque</span>
              <div className="flex gap-2 mt-2 flex-wrap">
                {PRESET_COLORS.map(p => {
                  const isActive = p.colors['--color-accent']
                    ? customTheme['--color-accent'] === p.colors['--color-accent']
                    : !Object.keys(customTheme).length
                  return (
                    <button key={p.name} onClick={() => p.colors['--color-accent'] ? setCustomTheme(p.colors) : resetCustomTheme()}
                      className={`min-w-[44px] min-h-[44px] rounded-full border-2 transition-all ${isActive ? 'border-accent scale-110 shadow-lg' : 'border-border hover:border-text-muted'}`}
                      style={{ backgroundColor: p.colors['--color-accent'] || 'var(--color-accent)' }}
                      title={p.name} />
                  )
                })}
                <input type="color" value={customTheme['--color-accent'] || '#8B5CF6'}
                  onChange={e => {
                    const hex = e.target.value
                    const hover = darkenColor(hex, 15)
                    setCustomTheme({ '--color-accent': hex, '--color-accent-hover': hover })
                  }}
                  className="min-w-[44px] min-h-[44px] rounded-full border-2 border-border cursor-pointer overflow-hidden"
                  title="Cor personalizada" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-primary">Fonte</span>
              <select value={config.fonteFamilia} onChange={e => setConfig({ fonteFamilia: e.target.value })}
                className="bg-bg-tertiary rounded px-2 py-1 text-sm outline-none">
                <option value="Inter">Inter</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="system-ui">system-ui</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-primary">Tamanho da fonte</span>
              <div className="flex items-center gap-2">
                <input type="range" min={12} max={24} value={config.fonteTamanho}
                  onChange={e => setConfig({ fonteTamanho: Number(e.target.value) })}
                  className="w-36 accent-accent" />
                <span className="text-xs text-text-muted tabular-nums w-8">{config.fonteTamanho}px</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-primary">Zoom</span>
              <div className="flex items-center gap-2">
                <input type="range" min={80} max={120} value={config.zoom}
                  onChange={e => setConfig({ zoom: Number(e.target.value) })}
                  className="w-36 accent-accent" />
                <span className="text-xs text-text-muted tabular-nums w-10">{config.zoom}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-text-primary">Auto-save</span>
                <p className="text-xs text-text-muted">Intervalo automático de salvamento</p>
              </div>
              <select value={config.autoSaveInterval} onChange={e => setConfig({ autoSaveInterval: Number(e.target.value) })}
                className="bg-bg-tertiary rounded px-2 py-1 text-sm outline-none">
                <option value={2}>2s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            </div>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Temporizador</h2>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-text-primary">Timer contínuo</span>
                <p className="text-xs text-text-muted">Modo Fluxo — não para após o alarme</p>
              </div>
              <ToggleSwitch checked={contTimer} onChange={toggleContTimer} />
            </div>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Pomodoro</h2>
            <div className="grid grid-cols-2 gap-4">
              {([
                { label: 'Foco (min)', key: 'focoMin' as const, min: 1, max: 120 },
                { label: 'Pausa curta (min)', key: 'pausaCurtaMin' as const, min: 1, max: 30 },
                { label: 'Pausa longa (min)', key: 'pausaLongaMin' as const, min: 1, max: 60 },
                { label: 'Ciclos até pausa longa', key: 'ciclosAtePausaLonga' as const, min: 1, max: 10 },
                { label: 'Meta diária (min)', key: 'dailyFocusMin' as const, min: 1, max: 480 },
                { label: 'Descanso (min)', key: 'descansoMin' as const, min: 0, max: 30 },
              ]).map(({ label, key, min, max }) => (
                <div key={key}>
                  <label className="block text-xs text-text-muted mb-1">{label}</label>
                  <input type="number" min={min} max={max} value={pomConfig[key]}
                    onChange={e => setPomConfig(prev => ({ ...prev, [key]: Math.max(min, Math.min(max, Number(e.target.value) || 0)) }))}
                    className="w-full bg-bg-primary rounded px-3 py-1.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-accent" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-primary">Auto-start</span>
              <ToggleSwitch checked={pomConfig.autoStart} onChange={() => setPomConfig(prev => ({ ...prev, autoStart: !prev.autoStart }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-text-primary">Não perturbe</span>
                <p className="text-xs text-text-muted">Silencia notificações durante o foco</p>
              </div>
              <ToggleSwitch checked={pomConfig.dnd} onChange={() => setPomConfig(prev => ({ ...prev, dnd: !prev.dnd }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-text-primary">Som de fundo</span>
                <p className="text-xs text-text-muted">Ruído ambiente durante o foco</p>
              </div>
              <ToggleSwitch checked={config.somAmbiente} onChange={() => setConfig({ somAmbiente: !config.somAmbiente })} />
            </div>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Bloqueio</h2>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-text-primary">PIN de acesso</span>
                <p className="text-xs text-text-muted">Exige PIN ao abrir o MindFlow</p>
              </div>
              <ToggleSwitch checked={pinEnabled} onChange={togglePinEnabled} />
            </div>
            {pinEnabled && (
              <div className="flex items-center gap-2">
                <input id="pin-input" name="pin" type="password" inputMode="numeric" maxLength={4} value={pinDirty ? pinInput : ''}
                  onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setPinInput(v); setPinDirty(true) }}
                  placeholder="****" className="w-24 bg-bg-primary rounded px-3 py-1.5 text-sm text-center tracking-widest outline-none focus:ring-1 focus:ring-accent" />
                <button onClick={handleSavePin}
                  className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg transition-all active:scale-95 hover:bg-accent-hover">
                  {pinInput ? (pin ? 'Alterar' : 'Definir') : 'Remover'}
                </button>
                {pin && <span className="text-xs text-text-muted">PIN atual: ****</span>}
              </div>
            )}
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Atalhos</h2>
            {Object.entries(bindings).map(([action, combo]) => (
              <div key={action} className="flex items-center justify-between">
                <span className="text-sm text-text-primary">{KEYBINDING_LABELS[action] || action}</span>
                <div className="flex items-center gap-2">
                  <kbd className="text-xs bg-bg-primary px-2 py-0.5 rounded font-mono text-text-muted">
                    {rebindingAction === action ? 'Pressione...' : comboLabel(combo)}
                  </kbd>
                  <button onClick={() => setRebindingAction(action)}
                    className="text-xs text-accent hover:underline disabled:opacity-30" disabled={!!rebindingAction}>
                    {rebindingAction === action ? '...' : 'Alterar'}
                  </button>
                  <button onClick={() => rebind(action, { key: '', ctrl: false, shift: false, alt: false })}
                    className="text-xs text-danger/70 hover:text-danger min-w-[44px] min-h-[44px]">×</button>
                </div>
              </div>
            ))}
            <button onClick={() => { resetBindings(); notify('Atalhos restaurados para o padrão', 'success') }}
              className="text-xs text-text-muted hover:text-text-primary underline">Restaurar padrão</button>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Backup</h2>
            <p className="text-xs text-text-muted">Backups são salvos automaticamente ao encerrar (máx. 6).</p>
            <div className="flex gap-2">
              <button onClick={async () => { await backupDB(); notify('Backup iniciado', 'success') }}
                className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-all active:scale-95">
                Fazer backup agora
              </button>
            </div>
            <BackupListComponent />
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Tutoriais</h2>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-text-primary">Reexibir tutoriais</span>
                <p className="text-xs text-text-muted">Resetar onboarding, dicas e hints já vistos</p>
              </div>
              <button onClick={() => {
                localStorage.removeItem('mindflow_onboarding_done')
                localStorage.removeItem('mindflow_show_onboarding')
                localStorage.removeItem('mindflow_inbox_reminder_dismissed')
                notify('Tutoriais resetados. Reabra o Dashboard para ver o tour.', 'success')
              }}
                className="px-3 py-1.5 bg-bg-hover rounded-lg text-sm hover:bg-bg-secondary transition-all active:scale-95">
                Resetar
              </button>
            </div>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Sidebar</h2>
            <div className="space-y-2">
              {[
                { id: 'hide-dashboard', page: '/', label: 'Dashboard', desc: 'Página inicial' },
                { id: 'hide-rotina', page: '/rotina', label: 'Rotina', desc: 'Planejamento diário e semanal' },
                { id: 'hide-foco', page: '/pomodoro', label: 'Foco', desc: 'Técnica Pomodoro' },
                { id: 'hide-notas', page: '/ideias', label: 'Notas', desc: 'Gerenciamento de notas e ideias' },
                { id: 'hide-flashcards', page: '/flashcards', label: 'Flashcards', desc: 'Cartões de estudo' },
                { id: 'hide-habitos', page: '/habitos', label: 'Hábitos', desc: 'Rastreamento de hábitos' },
                { id: 'hide-insights', page: '/insights', label: 'Insights', desc: 'Estatísticas e gráficos' },
                { id: 'hide-consultas', page: '/consultas', label: 'Consultas', desc: 'Visualização de dados personalizada' },
              ].map(({ id, page, label, desc }) => (
                <div key={id} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input id={id} type="checkbox" checked={hiddenSet.has(page)}
                      onChange={(e) => {
                        const next = new Set(hiddenSet)
                        if (e.target.checked) { next.add(page) } else { next.delete(page) }
                        setConfig({ hiddenSections: Array.from(next) })
                      }}
                      className="h-4 w-4 text-accent rounded border-border focus:ring-accent" />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={id} className="font-medium text-text-primary">{label}</label>
                    <p className="text-xs text-text-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Banco de dados</h2>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-text-primary">Compactar banco</span>
                <p className="text-xs text-text-muted">Libera espaço em disco (VACUUM)</p>
              </div>
              <button onClick={handleVacuum}
                className="px-3 py-1.5 bg-bg-hover rounded-lg text-sm hover:bg-bg-secondary transition-all active:scale-95">
                Compactar agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BackupListComponent() {
  const [backups, setBackups] = useState<{ nome: string; tamanho: number }[]>([])
  const [loading, setLoading] = useState(false)
  const notify = useNotify()
  useEffect(() => {
    startTransition(() => setLoading(true))
    listBackups().then(setBackups).catch((e) => { console.error('[Config] listBackups', e); notify('Erro ao listar backups') }).finally(() => setLoading(false))
  }, [])
  if (loading) return <p className="text-xs text-text-muted">Carregando...</p>
  if (backups.length === 0) return null
  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {backups.slice(0, 6).map(b => (
        <div key={b.nome} className="flex items-center justify-between text-xs">
          <span className="text-text-muted truncate">{b.nome}</span>
          <button onClick={() => downloadBackup(b.nome).catch((e) => { console.error('[Config] downloadBackup', e); notify('Erro ao baixar backup') })}
            className="text-accent hover:underline shrink-0 ml-2">
            Baixar ({(b.tamanho / 1024).toFixed(0)}KB)
          </button>
        </div>
      ))}
    </div>
  )
}
