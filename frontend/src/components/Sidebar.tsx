import { useTheme } from '../store/theme'
import InboxModal from './InboxModal'

const navItems = [
  { icon: '◉', label: 'Dashboard', page: 'dashboard' },
  { icon: '○', label: 'Rotina', page: 'rotina' },
  { icon: '☰', label: 'Hábitos', page: 'habitos' },
  { icon: '◷', label: 'Pomodoro', page: 'pomodoro' },
  { icon: '◇', label: 'Ideias', page: 'ideias' },
  { icon: '⚡', label: 'Flashcards', page: 'flashcards' },
  { icon: '⚙', label: 'Tipos', page: 'tipos' },
  { icon: '⊞', label: 'Consultas', page: 'consultas' },
]

export default function Sidebar({ page, onNavigate, inboxOpen, onToggleInbox }: {
  page: string; onNavigate: (p: string) => void; inboxOpen: boolean; onToggleInbox: () => void
}) {
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      <aside className="w-16 bg-bg-secondary border-r border-border flex flex-col items-center py-4 gap-1 shrink-0">
        <div className="text-accent text-xl font-bold mb-4" title="MindFlow">~</div>
        {navItems.map(item => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-colors
              ${page === item.page ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'}`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={toggleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors text-sm"
          title={`Tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button
          onClick={onToggleInbox}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent text-white text-lg hover:bg-accent-hover transition-colors"
          title="Captura rápida (Ctrl+I)"
        >
          +
        </button>
      </aside>
      {inboxOpen && <InboxModal onClose={onToggleInbox} />}
    </>
  )
}
