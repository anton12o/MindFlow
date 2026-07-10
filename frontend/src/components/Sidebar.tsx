import { useState, useRef, useEffect, memo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme, MODE_ICON } from '../store/theme'
import { usePomodoroContext } from '../store/pomodoro'
import { useConfig } from '../store/config'
import ConfirmModal from './ConfirmModal'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { API_BASE } from '../api/client'
import { LayoutDashboard, CalendarDays, CheckCheck, Timer, Lightbulb, Layers, Table2, BarChart3, Settings, Power, Inbox, Menu, X as XIcon, PanelLeftClose, PanelLeft } from 'lucide-react'
const SIDEBAR_WIDTH_KEY = 'mindflow_sidebar_width'

const primaryItems = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard', page: '/' },
  { icon: <CalendarDays size={18} />, label: 'Rotina', page: '/rotina' },
  { icon: <Timer size={18} />, label: 'Foco', page: '/pomodoro' },
  { icon: <Lightbulb size={18} />, label: 'Notas', page: '/ideias' },
  { icon: <Layers size={18} />, label: 'Flashcards', page: '/flashcards' },
  { icon: <CheckCheck size={18} />, label: 'Hábitos', page: '/habitos' },
  { icon: <BarChart3 size={18} />, label: 'Insights', page: '/insights' },
  { icon: <Table2 size={18} />, label: 'Consultas', page: '/consultas' },
]

const bottomItems = [
  { icon: <Settings size={18} />, label: 'Config', page: '/config' },
]

const Sidebar = memo(function Sidebar({ onToggleInbox }: {
  onToggleInbox: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, cycleTheme } = useTheme()
  const { ativo: pomodoroAtivo } = usePomodoroContext()
  const { config } = useConfig()
  const hiddenSet = new Set(config.hiddenSections)
  const [collapsed, setCollapsed] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try { return localStorage.getItem('mindflow_sidebar_collapsed') === 'true' } catch { return false }
  })
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

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY) || '', 10) || 64 } catch { return 64 }
  })
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWRef = useRef(0)
  const lastWidthRef = useRef(sidebarWidth)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true
    startXRef.current = e.clientX
    startWRef.current = sidebarWidth
    lastWidthRef.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const newW = Math.max(64, Math.min(224, startWRef.current + (e.clientX - startXRef.current)))
      lastWidthRef.current = newW
      setSidebarWidth(newW)
    }
    const handleUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(lastWidthRef.current)) } catch {}
    }
    const handleLeave = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(lastWidthRef.current)) } catch {}
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('mouseleave', handleLeave)
    window.addEventListener('blur', handleUp)
    return () => { 
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('mouseleave', handleLeave)
      window.removeEventListener('blur', handleUp)
    }
  }, [])
  function handleShutdown() {
    setShowShutdown(false)
    setShutdownCountdown(3)

    const controller = new AbortController()
    shutdownAbortRef.current = controller
    const doShutdown = async () => {
      try {
        await fetch(API_BASE + '/shutdown', { method: 'POST', signal: controller.signal })
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
        className="fixed top-2 left-1 z-50 w-9 h-9 flex items-center justify-center rounded-lg bg-bg-secondary border border-border text-text-muted hover:text-text-primary transition-all active:scale-95 md:hidden"
        title={collapsed ? 'Abrir menu' : 'Fechar menu'}>
        {collapsed ? <Menu size={16} /> : <XIcon size={16} />}
      </button>
      {collapsed && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setCollapsed(false)} />}
      <aside role="navigation" aria-label="Navegação principal" style={{ width: collapsed ? undefined : (desktopCollapsed ? 48 : sidebarWidth) }} className={`bg-bg-secondary border-r border-border flex flex-col py-4 gap-1 shrink-0 transition-transform duration-200 overflow-hidden
        ${collapsed ? '-translate-x-full' : 'translate-x-0'}
        fixed md:relative z-40 h-full md:h-full md:translate-x-0`}>
        <div onMouseDown={handleMouseDown} className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/30 transition-colors z-10 ${desktopCollapsed ? 'hidden' : ''}`} />
        <div className="flex flex-col w-full">
          <div className={`flex items-center w-full ${desktopCollapsed ? 'justify-center px-0.5 flex-col gap-1' : 'px-2 justify-between'}`}>
            {desktopCollapsed ? (
              <>
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent/20 text-accent text-base" title="MindFlow">
                  🧠
                </div>
                <button onClick={() => { setDesktopCollapsed(false); try { localStorage.setItem('mindflow_sidebar_collapsed', 'false') } catch {} }}
                  className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all active:scale-95"
                  title="Expandir sidebar">
                  <PanelLeft size={14} />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent/20 text-accent text-base">🧠</div>
                  <span className="text-sm font-semibold text-accent tracking-tight">MindFlow</span>
                </div>
                <button onClick={() => { setDesktopCollapsed(p => { const v = !p; try { localStorage.setItem('mindflow_sidebar_collapsed', String(v)) } catch {}; return v }) }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all active:scale-95"
                  title="Recolher sidebar">
                  <PanelLeftClose size={16} />
                </button>
              </>
            )}
          </div>
          <div className="border-b border-border mx-2 mb-2" />
        </div>
        <div className={`flex flex-col items-center w-full ${desktopCollapsed ? 'px-1' : ''}`}>
        {primaryItems.filter(item => !hiddenSet.has(item.page)).map(item => (
          <button
            key={item.page}
            onClick={() => navigate(item.page)}
            className={`w-full px-2 py-2 flex items-center gap-2 rounded-lg transition-all active:scale-95 relative
              ${currentPath === item.page ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'}`}
            title={item.label}
          >
            <span className="shrink-0">{item.icon}</span>
            {sidebarWidth > 90 && <span className="text-sm truncate">{item.label}</span>}
            {item.page === '/pomodoro' && pomodoroAtivo && (
              <span className={`absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse ${sidebarWidth > 90 ? 'right-2' : 'right-1'}`} />
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={cycleTheme}
          className="w-full px-2 py-2 flex items-center gap-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all active:scale-95"
          title={`Tema: ${mode === 'dark' ? 'escuro' : mode === 'light' ? 'claro' : 'sistema'}`}
        >
          <span className="text-sm shrink-0">{MODE_ICON[mode]}</span>
          {sidebarWidth > 90 && <span className="text-sm truncate">Tema</span>}
        </button>
        {bottomItems.filter(item => !hiddenSet.has(item.page)).map(item => (
          <button
            key={item.page}
            onClick={() => navigate(item.page)}
            className={`w-full px-2 py-2 flex items-center gap-2 rounded-lg transition-all active:scale-95 relative
              ${currentPath === item.page ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'}`}
            title={item.label}
          >
            <span className="shrink-0">{item.icon}</span>
            {sidebarWidth > 90 && <span className="text-sm truncate">{item.label}</span>}
          </button>
        ))}
        <button
          onClick={() => setShowShutdown(true)}
          className="w-full px-2 py-2 flex items-center gap-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all active:scale-95"
          title="Encerrar MindFlow"
        >
          <Power size={18} className="shrink-0" />
          {sidebarWidth > 90 && <span className="text-sm truncate">Encerrar</span>}
        </button>
        <button
          onClick={onToggleInbox}
          className="w-full px-2 py-2 flex items-center gap-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-all active:scale-95"
          title="Captura rápida (Ctrl+I)"
        >
          <Inbox size={18} className="shrink-0" />
          {sidebarWidth > 90 && <span className="text-sm truncate">Captura rápida</span>}
        </button>
        </div>
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
              className="px-6 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-bg-hover transition-all active:scale-95 text-sm"
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
})

export default Sidebar
