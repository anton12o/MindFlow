import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './store/theme'
import Sidebar from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import Dashboard from './pages/Dashboard'
import Rotina from './pages/Rotina'
import Habitos from './pages/Habitos'
import PomodoroPage from './pages/Pomodoro'
import Ideias from './pages/Ideias'
import Flashcards from './pages/Flashcards'
import Tipos from './pages/Tipos'
import Consultas from './pages/Consultas'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function AppContent() {
  const [page, setPage] = useState('dashboard')
  const [showPalette, setShowPalette] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)

  const commands = [
    { id: 'dashboard', label: 'Ir para Dashboard', action: () => setPage('dashboard') },
    { id: 'rotina', label: 'Ir para Rotina', action: () => setPage('rotina') },
    { id: 'habitos', label: 'Ir para Hábitos', action: () => setPage('habitos') },
    { id: 'pomodoro', label: 'Ir para Pomodoro', action: () => setPage('pomodoro') },
    { id: 'ideias', label: 'Ir para Ideias', action: () => setPage('ideias') },
    { id: 'flashcards', label: 'Ir para Flashcards', action: () => setPage('flashcards') },
    { id: 'tipos', label: 'Ir para Tipos', action: () => setPage('tipos') },
    { id: 'consultas', label: 'Ir para Consultas', action: () => setPage('consultas') },
    { id: 'inbox', label: 'Captura rápida', action: () => setInboxOpen(p => !p) },
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
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar page={page} onNavigate={setPage} inboxOpen={inboxOpen} onToggleInbox={() => setInboxOpen(p => !p)} />
      <main className="flex-1 overflow-y-auto">
        {page === 'dashboard' && <Dashboard />}
        {page === 'rotina' && <Rotina />}
        {page === 'habitos' && <Habitos />}
        {page === 'pomodoro' && <PomodoroPage />}
        {page === 'ideias' && <Ideias />}
        {page === 'flashcards' && <Flashcards />}
        {page === 'tipos' && <Tipos />}
        {page === 'consultas' && <Consultas />}
      </main>
      {showPalette && <CommandPalette commands={commands} onClose={() => setShowPalette(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
