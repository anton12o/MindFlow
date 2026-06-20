import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme, MODE_ICON } from '../store/theme'
import { exportAll } from '../api/export'
import { usePomodoroContext } from '../store/pomodoro'
import { formatDateLocal } from '../utils/date'
import { useNotify } from '../store/notification'
import ConfirmModal from './ConfirmModal'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { LayoutDashboard, CalendarDays, ListTodo, Timer, Lightbulb, BookOpen, Settings, Table2, BarChart3, RotateCcw, Upload, Download, Power, Inbox, Menu, X as XIcon, ChevronDown, ChevronUp } from 'lucide-react'

const primaryItems = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard', page: '/' },
  { icon: <CalendarDays size={18} />, label: 'Rotina', page: '/rotina' },
  { icon: <ListTodo size={18} />, label: 'Hábitos', page: '/habitos' },
  { icon: <Timer size={18} />, label: 'Pomodoro', page: '/pomodoro' },
  { icon: <Lightbulb size={18} />, label: 'Ideias', page: '/ideias' },
]

const secondaryItems = [
  { icon: <BookOpen size={18} />, label: 'Flashcards', page: '/flashcards' },
  { icon: <Settings size={18} />, label: 'Tipos', page: '/tipos' },
  { icon: <Table2 size={18} />, label: 'Consultas', page: '/consultas' },
  { icon: <BarChart3 size={18} />, label: 'Análise', page: '/analise' },
  { icon: <RotateCcw size={18} />, label: 'Revisão', page: '/revisao' },
]

export default function Sidebar({ onToggleInbox, onOpenImport }: {
  onToggleInbox: () => void; onOpenImport: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, cycleTheme } = useTheme()
  const { ativo: pomodoroAtivo } = usePomodoroContext()
  const notify = useNotify()
  const [exporting, setExporting] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showShutdown, setShowShutdown] = useState(false)
  const [shutdownCountdown, setShutdownCountdown] = useState<number | null>(null)
  const shutdownTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const shutdownAbortRef = useRef<AbortController | undefined>(undefined)
  const [shutdownDone, setShutdownDone] = useState(false)
  const countdownRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef<HTMLDivElement>(null)
  useFocusTrap(countdownRef, shutdownCountdown !== null && shutdownCountdown > 0)
  useFocusTrap(doneRef, shutdownDone)
  const currentPath = location.pathname

  function handleShutdown() {
    setShowShutdown(false)
    setShutdownCountdown(3)

    const controller = new AbortController()
    shutdownAbortRef.current = controller
    const doShutdown = async () => {
      try {
        await fetch('/api/shutdown', { method: 'POST', signal: controller.signal })
      } catch (e) { console.error('[Sidebar]', e) }
    }
    doShutdown()

    const timer = (count: number) => {
      if (count <= 0) {
        setShutdownCountdown(null)
        setShutdownDone(true)
        return
      }
      setShutdownCountdown(count)
      shutdownTimerRef.current = setTimeout(() => timer(count - 1), 1000)
    }
    timer(3)
  }

  function cancelShutdown() {
    clearTimeout(shutdownTimerRef.current)
    setShutdownCountdown(null)
    if (shutdownAbortRef.current) {
      shutdownAbortRef.current.abort()
      shutdownAbortRef.current = undefined
    }
  }

  useEffect(() => {
    return () => clearTimeout(shutdownTimerRef.current)
  }, [])

  return (
    <>
      <button onClick={() => setCollapsed(p => !p)}
        className="fixed top-2 left-1 z-50 w-9 h-9 flex items-center justify-center rounded-lg bg-bg-secondary border border-border text-text-muted hover:text-text-primary transition-colors md:hidden"
        title={collapsed ? 'Abrir menu' : 'Fechar menu'}>
        {collapsed ? <Menu size={16} /> : <XIcon size={16} />}
      </button>
      {collapsed && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setCollapsed(false)} />}
      <aside className={`w-16 bg-bg-secondary border-r border-border flex flex-col items-center py-4 gap-1 shrink-0 transition-transform duration-200
        ${collapsed ? '-translate-x-full' : 'translate-x-0'}
        fixed md:relative z-40 h-full md:h-auto md:translate-x-0`}>
        <div className="text-accent text-lg font-bold mb-4 tracking-tight" title="MindFlow">MF</div>
        {primaryItems.map(item => (
          <button
            key={item.page}
            onClick={() => navigate(item.page)}
            className={`w-11 h-11 flex items-center justify-center rounded-lg transition-colors relative
              ${currentPath === item.page ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'}`}
            title={item.label}
          >
            {item.icon}
            {item.page === '/pomodoro' && pomodoroAtivo && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-danger rounded-full animate-pulse" />
            )}
          </button>
        ))}
        <button
          onClick={() => setShowMore(p => !p)}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          title={showMore ? 'Menos' : 'Mais'}
        >
          {showMore ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {showMore && secondaryItems.map(item => (
          <button
            key={item.page}
            onClick={() => navigate(item.page)}
            className={`w-11 h-11 flex items-center justify-center rounded-lg transition-colors relative
              ${currentPath === item.page ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'}`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onOpenImport}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="Importar dados"
        >
          <Upload size={18} />
        </button>
        <button
          onClick={async () => {
            if (exporting) return
            setExporting(true)
            try {
              const data = await exportAll()
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `mindflow-export-${formatDateLocal(new Date())}.json`
              a.click()
              URL.revokeObjectURL(url)
            } catch (e) {
              console.error('[Export]', e)
              notify('Erro ao exportar dados')
            }
            setExporting(false)
          }}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="Exportar dados"
        >
          {exporting ? <span className="text-xs">⏳</span> : <Download size={18} />}
        </button>
        <button
          onClick={cycleTheme}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          title={`Tema: ${mode === 'dark' ? 'escuro' : mode === 'light' ? 'claro' : 'sistema'}`}
        >
          <span className="text-sm">{MODE_ICON[mode]}</span>
        </button>
        <button
          onClick={() => setShowShutdown(true)}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          title="Encerrar MindFlow"
        >
          <Power size={18} />
        </button>
        <button
          onClick={onToggleInbox}
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
          title="Captura rápida (Ctrl+I)"
        >
          <Inbox size={18} />
        </button>
      </aside>
      {showShutdown && (
        <ConfirmModal
          titulo="Encerrar MindFlow"
          mensagem="Tem certeza que deseja encerrar o servidor? Você precisará reiniciá-lo pelo terminal."
          destructive
          confirmLabel="Encerrar"
          onConfirm={handleShutdown}
          onCancel={() => setShowShutdown(false)}
        />
      )}
      {shutdownCountdown !== null && shutdownCountdown > 0 && (
        <div ref={countdownRef} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-bg-secondary rounded-xl border border-border shadow-2xl p-6 text-center space-y-4 max-w-xs w-full mx-4">
            <div className="text-5xl font-bold text-danger tabular-nums">{shutdownCountdown}</div>
            <p className="text-sm text-text-muted">Encerrando servidor...</p>
            <button
              onClick={cancelShutdown}
              className="px-6 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-bg-hover transition-colors text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {shutdownDone && (
        <div ref={doneRef} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-bg-secondary rounded-xl border border-border shadow-2xl p-6 text-center space-y-4 max-w-xs w-full mx-4">
            <div className="text-4xl">✅</div>
            <p className="text-base font-medium text-text-primary">Servidor encerrado</p>
            <p className="text-sm text-text-muted">Você pode fechar esta aba.</p>
          </div>
        </div>
      )}
    </>
  )
}
