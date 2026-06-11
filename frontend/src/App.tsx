import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { ThemeProvider } from './store/theme'
import Sidebar from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import ErrorBoundary from './components/ErrorBoundary'
import ImportModal from './components/ImportModal'
import Dashboard from './pages/Dashboard'
import Rotina from './pages/Rotina'
import Habitos from './pages/Habitos'
import PomodoroPage from './pages/Pomodoro'
import Ideias from './pages/Ideias'
import Flashcards from './pages/Flashcards'
import Tipos from './pages/Tipos'
import Consultas from './pages/Consultas'
import Insights from './pages/Insights'
import { exportAll } from './api/export'

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
  const [showPalette, setShowPalette] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const page = location.pathname.slice(1) || 'dashboard'

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
    { id: 'insights', label: 'Ir para Insights', action: () => navigate('/insights') },
    { id: 'inbox', label: 'Captura rápida', action: () => setInboxOpen(p => !p) },
    { id: 'import', label: 'Importar dados (JSON)', action: () => setImportOpen(true) },
    { id: 'export', label: 'Exportar dados (JSON)', action: async () => {
      const data = await exportAll()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mindflow-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    }},
  ]

  useEffect(() => {
    document.title = `MindFlow — ${page.charAt(0).toUpperCase() + page.slice(1)}`
  }, [page])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowPalette(p => !p)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault()
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
      <Sidebar inboxOpen={inboxOpen} onToggleInbox={() => setInboxOpen(p => !p)} onOpenImport={() => setImportOpen(true)} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rotina" element={<Rotina />} />
          <Route path="/habitos" element={<Habitos />} />
          <Route path="/pomodoro" element={<PomodoroPage />} />
          <Route path="/ideias" element={<Ideias />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/tipos" element={<Tipos />} />
          <Route path="/consultas" element={<Consultas />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onSuccess={handleImportSuccess} />}
      {showPalette && <CommandPalette commands={commands} onClose={() => setShowPalette(false)} />}
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
            <Layout />
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
