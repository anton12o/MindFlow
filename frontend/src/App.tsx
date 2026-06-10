import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
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

function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showPalette, setShowPalette] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)

  const page = location.pathname.slice(1) || 'dashboard'

  const commands = [
    { id: 'dashboard', label: 'Ir para Dashboard', action: () => navigate('/') },
    { id: 'rotina', label: 'Ir para Rotina', action: () => navigate('/rotina') },
    { id: 'habitos', label: 'Ir para Hábitos', action: () => navigate('/habitos') },
    { id: 'pomodoro', label: 'Ir para Pomodoro', action: () => navigate('/pomodoro') },
    { id: 'ideias', label: 'Ir para Ideias', action: () => navigate('/ideias') },
    { id: 'flashcards', label: 'Ir para Flashcards', action: () => navigate('/flashcards') },
    { id: 'tipos', label: 'Ir para Tipos', action: () => navigate('/tipos') },
    { id: 'consultas', label: 'Ir para Consultas', action: () => navigate('/consultas') },
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
      <Sidebar inboxOpen={inboxOpen} onToggleInbox={() => setInboxOpen(p => !p)} />
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
        </Routes>
      </main>
      {showPalette && <CommandPalette commands={commands} onClose={() => setShowPalette(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
