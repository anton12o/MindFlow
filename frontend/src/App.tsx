import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQueryClient, useQuery } from '@tanstack/react-query'
import { ThemeProvider } from './store/theme'
import { PomodoroProvider, usePomodoroContext } from './store/pomodoro'
import { NotificationProvider, useNotify } from './store/notification'
import { useBackendOnline } from './hooks/useBackendOnline'
import Sidebar from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import ErrorBoundary from './components/ErrorBoundary'
import InboxModal from './components/InboxModal'
import ImportModal from './components/ImportModal'
import LogsModal from './components/LogsModal'
import SwUpdateBanner from './components/SwUpdateBanner'
import { exportAll } from './api/export'
import { getNotasRecentes } from './api/notas'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Rotina = lazy(() => import('./pages/Rotina'))
const Habitos = lazy(() => import('./pages/Habitos'))
const PomodoroPage = lazy(() => import('./pages/Pomodoro'))
const Ideias = lazy(() => import('./pages/Ideias'))
const Flashcards = lazy(() => import('./pages/Flashcards'))
const Tipos = lazy(() => import('./pages/Tipos'))
const Consultas = lazy(() => import('./pages/Consultas'))
const Insights = lazy(() => import('./pages/Insights'))
const RevisaoSemanal = lazy(() => import('./pages/RevisaoSemanal'))

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
  const [importOpen, setImportOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)

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
    { id: 'pomodoro', label: 'Ir para Pomodoro', action: () => navigate('/pomodoro') },
    { id: 'ideias', label: 'Ir para Ideias', action: () => navigate('/ideias') },
    { id: 'flashcards', label: 'Ir para Flashcards', action: () => navigate('/flashcards') },
    { id: 'tipos', label: 'Ir para Tipos', action: () => navigate('/tipos') },
    { id: 'consultas', label: 'Ir para Consultas', action: () => navigate('/consultas') },
    { id: 'analise', label: 'Ir para Análise', action: () => navigate('/analise') },
    { id: 'revisao', label: 'Ir para Revisão Semanal', action: () => navigate('/revisao') },
    { id: 'inbox', label: 'Captura rápida', action: () => setInboxOpen(p => !p) },
    { id: 'import', label: 'Importar dados (JSON)', action: () => setImportOpen(true) },
    { id: 'logs', label: 'Ver logs de erro', action: () => setLogsOpen(true) },
    { id: 'export', label: 'Exportar dados (JSON)', action: async () => {
      try {
        const data = await exportAll()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mindflow-export-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`
        a.click()
        URL.revokeObjectURL(url)
      } catch (e) {
        console.error('[Export]', e)
        notify('Erro ao exportar dados')
      }
    }},
  ]

  useEffect(() => {
    document.title = `MindFlow 🧠 ${page.charAt(0).toUpperCase() + page.slice(1)}`
  }, [page])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !isInput) {
        e.preventDefault()
        setPaletteMode('comando')
        setShowPalette(p => !p)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !isInput) {
        e.preventDefault()
        setPaletteMode('nota')
        setShowPalette(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i' && !isInput) {
        e.preventDefault()
        if (e.shiftKey) {
          const sel = window.getSelection()?.toString().trim()
          if (sel) window.dispatchEvent(new CustomEvent('inbox-capture', { detail: { text: sel } }))
        }
        setInboxOpen(p => !p)
      }
    }
    const openInbox = () => setInboxOpen(p => !p)
    window.addEventListener('keydown', handler)
    window.addEventListener('open-inbox', openInbox)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('open-inbox', openInbox)
    }
  }, [])

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar onToggleInbox={() => setInboxOpen(p => !p)} onOpenImport={() => setImportOpen(true)} />
      <main className="flex-1 overflow-y-auto animate-fade-in">
          {!online && (
            <div className="sticky top-0 z-40 bg-danger/10 border-b border-danger/20 px-4 py-2 text-sm text-danger text-center">
              Servidor offline ⚠️ alguns dados podem não estar disponíveis
            </div>
          )}
          <Suspense fallback={<div className="flex items-center justify-center h-full text-text-muted text-sm animate-pulse">Carregando...</div>}>
            <Routes>
              <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/rotina" element={<ErrorBoundary><Rotina /></ErrorBoundary>} />
              <Route path="/habitos" element={<ErrorBoundary><Habitos /></ErrorBoundary>} />
              <Route path="/pomodoro" element={<ErrorBoundary><PomodoroPage /></ErrorBoundary>} />
              <Route path="/ideias" element={<ErrorBoundary><Ideias /></ErrorBoundary>} />
              <Route path="/flashcards" element={<ErrorBoundary><Flashcards /></ErrorBoundary>} />
              <Route path="/tipos" element={<ErrorBoundary><Tipos /></ErrorBoundary>} />
              <Route path="/consultas" element={<ErrorBoundary><Consultas /></ErrorBoundary>} />
              <Route path="/analise" element={<ErrorBoundary><Insights /></ErrorBoundary>} />
              <Route path="/insights" element={<Navigate to="/analise" replace />} />
              <Route path="/revisao" element={<ErrorBoundary><RevisaoSemanal /></ErrorBoundary>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
      </main>
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onSuccess={handleImportSuccess} />}
      {showPalette && (
        <CommandPalette
          commands={commands}
          mode={paletteMode}
          notasRecentes={notasRecentes}
          onNavigate={(notaId) => navigate(`/ideias?nota_id=${notaId}`)}
          onClose={() => setShowPalette(false)}
        />
      )}
      {logsOpen && <LogsModal onClose={() => setLogsOpen(false)} />}
      <InboxModal isOpen={inboxOpen} onClose={() => setInboxOpen(false)} />
      <SwUpdateBanner />
      <PomodoroBadge />
    </div>
  )
}

function PomodoroBadge() {
  const { screen, minutos, segundos } = usePomodoroContext()
  if (screen !== 'running' && screen !== 'pausado' && screen !== 'livre') return null
  const display = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-1.5 bg-accent/15 text-accent text-sm font-mono font-semibold px-3 py-1.5 rounded-full shadow-lg border border-accent/30 animate-fade-in">
      <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
      {display}
    </div>
  )
}

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
          <BrowserRouter>
            <PomodoroProvider>
              <NotificationProvider>
                <Layout />
              </NotificationProvider>
            </PomodoroProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
