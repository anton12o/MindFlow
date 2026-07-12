import { useState, useEffect, useRef, lazy, Suspense, memo, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQueryClient, useQuery } from '@tanstack/react-query'
import { ThemeProvider } from './store/theme'
import { ConfigProvider } from './store/config'
import { PomodoroProvider, usePomodoroContext } from './store/pomodoro'
import { NotificationProvider, useNotify } from './store/notification'
import { KeybindingsProvider, useKeybindings, comboLabel, KEYBINDING_LABELS } from './store/keybindings'
import { useBackendOnline } from './hooks/useBackendOnline'
import Sidebar from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import ErrorBoundary from './components/ErrorBoundary'
import InboxModal from './components/InboxModal'
import ImportModal from './components/ImportModal'
import LogsModal from './components/LogsModal'
import SwUpdateBanner from './components/SwUpdateBanner'
import InboxReminder from './components/InboxReminder'
import { exportAll } from './api/export'
import { getInbox } from './api/inbox'
import { getNotasRecentes } from './api/notas'
import { useBroadcastInvalidate } from './hooks/useBroadcastInvalidate'
import { useFocusTrap } from './hooks/useFocusTrap'
import { useConfig } from './hooks/useConfig'
import { hojeLocal } from './utils/date'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Rotina = lazy(() => import('./pages/Rotina'))
const Habitos = lazy(() => import('./pages/Habitos'))
const PomodoroPage = lazy(() => import('./pages/Pomodoro'))
const Ideias = lazy(() => import('./pages/Ideias'))
const Flashcards = lazy(() => import('./pages/Flashcards'))
const Config = lazy(() => import('./pages/Config'))
const Consultas = lazy(() => import('./pages/Consultas'))
const Insights = lazy(() => import('./pages/Insights'))
const Revisao = lazy(() => import('./pages/Revisao'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: { onError: (err) => console.error('[Mutation Error]', err) },
  },
})

function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [showPalette, setShowPalette] = useState(false)
  const [paletteMode, setPaletteMode] = useState<'comando' | 'nota'>('comando')
  const [inboxOpen, setInboxOpen] = useState(false)
  const [zenMode, setZenMode] = useState(() => {
    try { return localStorage.getItem('mindflow_zen_mode') === 'true' } catch { return false }
  })
  const [importOpen, setImportOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [keybindingsOpen, setKeybindingsOpen] = useState(false)
  const { match } = useKeybindings()

  useEffect(() => {
    const handler = () => setZenMode(p => {
      const next = !p
      try { localStorage.setItem('mindflow_zen_mode', String(next)) } catch { /* silent */ }
      return next
    })
    window.addEventListener('toggle-zen', handler)
    return () => window.removeEventListener('toggle-zen', handler)
  }, [])

  useEffect(() => {
    try { localStorage.setItem('mindflow_zen_mode', String(zenMode)) } catch { /* silent */ }
  }, [zenMode])

  useBroadcastInvalidate()

  const { config: appConfig } = useConfig()

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--font-sans', `"${appConfig.fonteFamilia}", system-ui, -apple-system, sans-serif`)
    const baseZoom = Math.round(appConfig.fonteTamanho * appConfig.zoom / 100)
    root.style.fontSize = `${baseZoom}px`
  }, [appConfig.fonteTamanho, appConfig.fonteFamilia, appConfig.zoom])

  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: ['inbox', false], queryFn: () => getInbox(false), staleTime: 120_000 })
  }, [queryClient])

  const { data: notasRecentes = [] } = useQuery({
    queryKey: ['notas-recentes'],
    queryFn: () => getNotasRecentes(),
    enabled: showPalette && paletteMode === 'nota',
    staleTime: 15_000,
  })

  const page = location.pathname.slice(1) || 'dashboard'

  const online = useBackendOnline()

  function handleImportSuccess() {
    queryClient.invalidateQueries()
    navigate('/')
  }

  const commands = [
    { id: 'dashboard', label: 'Ir para Dashboard', action: () => navigate('/') },
    { id: 'rotina', label: 'Ir para Rotina', action: () => navigate('/rotina') },
    { id: 'habitos', label: 'Ir para Hábitos', action: () => navigate('/habitos') },
    { id: 'pomodoro', label: 'Ir para Foco', action: () => navigate('/pomodoro') },
    { id: 'ideias', label: 'Ir para Notas', action: () => navigate('/ideias') },
    { id: 'flashcards', label: 'Ir para Flashcards', action: () => navigate('/flashcards') },
    { id: 'config', label: 'Ir para Config', action: () => navigate('/config') },
    { id: 'consultas', label: 'Ir para Consultas', action: () => navigate('/consultas') },
    { id: 'insights', label: 'Ir para Insights', action: () => navigate('/insights') },
    { id: 'inbox', label: 'Captura rápida', action: () => setInboxOpen(p => !p) },
    { id: 'import', label: 'Importar dados (JSON)', action: () => setImportOpen(true) },
    { id: 'logs', label: 'Ver logs de erro', action: () => setLogsOpen(true) },
    { id: 'keybindings', label: 'Configurar atalhos de teclado', action: () => setKeybindingsOpen(true) },
    { id: 'export', label: 'Exportar dados (JSON)', action: async () => {
      try {
        const data = await exportAll()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mindflow-export-${hojeLocal()}.json`
        a.click()
        URL.revokeObjectURL(url)
      } catch (e) {
        console.error('[Export]', e)
        notify('Erro ao exportar dados')
      }
    }},
  ]

  const pageTitles: Record<string, string> = {
    '': 'Dashboard', 'dashboard': 'Dashboard', 'rotina': 'Rotina', 'habitos': 'Hábitos',
    'pomodoro': 'Foco', 'ideias': 'Notas', 'flashcards': 'Flashcards', 'config': 'Config', 'tipos': 'Config',
    'consultas': 'Consultas', 'analise': 'Insights', 'insights': 'Insights', 'revisao': 'Revisão Semanal',
  }
  useEffect(() => {
    document.title = `MindFlow 🧠 ${pageTitles[page] || page.charAt(0).toUpperCase() + page.slice(1)}`
  }, [page])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable
      const action = match(e)
      if (!action || isInput) return
      switch (action) {
        case 'palette-comando':
          e.preventDefault()
          setPaletteMode('comando')
          setShowPalette(p => !p)
          break
        case 'palette-nota':
          e.preventDefault()
          setPaletteMode('nota')
          setShowPalette(true)
          break
        case 'toggle-zen':
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('toggle-zen'))
          break
        case 'toggle-inbox':
          e.preventDefault()
          setInboxOpen(p => !p)
          break
        case 'inbox-capture':
          if (e.shiftKey) {
            const sel = window.getSelection()?.toString().trim()
            if (sel) window.dispatchEvent(new CustomEvent('inbox-capture', { detail: { text: sel } }))
          }
          setInboxOpen(p => !p)
          break
      }
    }
    const openInbox = () => setInboxOpen(p => !p)
    window.addEventListener('keydown', handler)
    window.addEventListener('open-inbox', openInbox)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('open-inbox', openInbox)
    }
  }, [match])

  const shortcutParamsRef = useRef({ search: location.search, pathname: location.pathname })
  useEffect(() => { shortcutParamsRef.current = { search: location.search, pathname: location.pathname } })
  useEffect(() => {
    const params = new URLSearchParams(shortcutParamsRef.current.search)
    if (params.get('shortcut') === 'inbox') {
      setInboxOpen(true)
      navigate(shortcutParamsRef.current.pathname, { replace: true })
    }
  }, [])

  const toggleInbox = useCallback(() => setInboxOpen(p => !p), [])
  return (
    <div className={`h-screen flex overflow-hidden ${zenMode ? 'focus-mode' : ''}`}>
      <div className={`transition-all duration-300 shrink-0 ${zenMode ? '-translate-x-full opacity-0 pointer-events-none w-0 overflow-hidden' : ''}`}>
        <Sidebar onToggleInbox={toggleInbox} />
      </div>
      <main className="flex-1 overflow-y-auto animate-fade-in relative">
          <button onClick={() => window.dispatchEvent(new CustomEvent('toggle-zen'))}
                className={`fixed top-3 right-3 z-50 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-xs transition-colors ${zenMode ? 'bg-accent/20 text-accent hover:bg-accent/30' : 'bg-bg-tertiary text-text-muted hover:bg-bg-hover hover:text-text-primary'}`}
            title={zenMode ? 'Sair do Modo Foco (Ctrl+Shift+F)' : 'Modo Foco (Ctrl+Shift+F)'} aria-label="Alternar Modo Foco">
            {zenMode ? '✕' : '⛶'}
          </button>
          {!online && (
            <div className="sticky top-0 z-45 bg-danger/10 border-b border-danger/20 px-4 py-2 text-sm text-danger text-center">
              Servidor offline ⚠️ alguns dados podem não estar disponíveis
            </div>
          )}
          <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center h-full text-text-muted text-sm animate-pulse">Carregando...</div>}>
            <Routes>
              <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/rotina" element={<ErrorBoundary><Rotina /></ErrorBoundary>} />
              <Route path="/habitos" element={<ErrorBoundary><Habitos /></ErrorBoundary>} />
              <Route path="/pomodoro" element={<ErrorBoundary><PomodoroPage /></ErrorBoundary>} />
              <Route path="/ideias" element={<ErrorBoundary><Ideias /></ErrorBoundary>} />
              <Route path="/flashcards" element={<ErrorBoundary><Flashcards /></ErrorBoundary>} />
              <Route path="/config" element={<ErrorBoundary><Config /></ErrorBoundary>} />
              <Route path="/tipos" element={<Navigate to="/config" replace />} />
              <Route path="/consultas" element={<ErrorBoundary><Consultas /></ErrorBoundary>} />
              <Route path="/insights" element={<ErrorBoundary><Insights /></ErrorBoundary>} />
              <Route path="/analise" element={<Navigate to="/insights" replace />} />
              <Route path="/revisao" element={<ErrorBoundary><Revisao /></ErrorBoundary>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
      </main>
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onSuccess={handleImportSuccess} />}
      {showPalette && (
        <CommandPalette
          commands={commands}
          mode={paletteMode}
          notasRecentes={notasRecentes}
          onNavigate={(notaId) => navigate(`/ideias?nota_id=${notaId}`)}
          onNavigateTarefa={(tarefaId) => navigate(`/rotina?tarefa_id=${tarefaId}`)}
          onNavigateFlashcard={(flashcardId) => navigate(`/flashcards?flash_id=${flashcardId}`)}
          onNavigateHabito={(habitoId) => navigate(`/habitos?habito_id=${habitoId}`)}
          onClose={() => setShowPalette(false)}
        />
      )}
      {logsOpen && <LogsModal onClose={() => setLogsOpen(false)} />}
      {keybindingsOpen && <KeybindingsEditor onClose={() => setKeybindingsOpen(false)} />}
      <InboxModal isOpen={inboxOpen} onClose={() => setInboxOpen(false)} />
      <SwUpdateBanner />
      <InboxReminder />
      <PomodoroBadge />
    </div>
  )
}

function KeybindingsEditor({ onClose }: { onClose: () => void }) {
  const { bindings, rebind, reset } = useKeybindings()
  const [listening, setListening] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true)
  useEffect(() => {
    if (!listening) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { setListening(null); return }
      const combo = { key: e.key, ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey }
      rebind(listening, combo)
      setListening(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [listening, rebind])
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div ref={ref} className="bg-bg-secondary rounded-xl border border-border w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold">Atalhos de teclado</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1" aria-label="Fechar">&times;</button>
        </div>
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {Object.entries(bindings).map(([action, combo]) => (
            <div key={action} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-text-primary">{KEYBINDING_LABELS[action] || action}</span>
              <button onClick={() => setListening(listening === action ? null : action)}
                className={`text-xs font-mono px-2.5 py-1 rounded border transition-colors ${listening === action ? 'bg-accent/10 border-accent text-accent animate-pulse' : 'bg-bg-tertiary border-border text-text-muted hover:text-text-primary'}`}>
                {listening === action ? 'Pressione uma tecla...' : comboLabel(combo)}
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-between p-4 border-t border-border">
          <button onClick={() => { reset(); setListening(null) }} className="text-xs text-text-muted hover:text-danger transition-colors">Restaurar padrões</button>
          <button onClick={onClose} className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}

const PomodoroBadge = memo(function PomodoroBadge() {
  const { screen, minutos, segundos } = usePomodoroContext()
  if (screen !== 'running' && screen !== 'pausado' && screen !== 'livre') return null
  const display = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-1.5 bg-accent/15 text-accent text-sm font-mono font-semibold px-3 py-1.5 rounded-full shadow-lg border border-accent/30 animate-fade-in">
      <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
      {display}
    </div>
  )
})

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text-muted mb-2">404</h1>
        <p className="text-text-muted mb-4">Página não encontrada</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-accent text-white rounded-lg text-sm">
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <KeybindingsProvider>
          <BrowserRouter>
            <PomodoroProvider>
              <NotificationProvider>
                <ConfigProvider>
                  <Layout />
                </ConfigProvider>
              </NotificationProvider>
            </PomodoroProvider>
          </BrowserRouter>
          </KeybindingsProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
