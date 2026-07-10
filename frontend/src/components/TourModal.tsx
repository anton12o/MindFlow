import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const TOUR_STEPS = [
  { icon: '📝', titulo: 'Ideias', descricao: 'O caderno de notas do MindFlow. Escreve com Markdown, usa [[links]] pra conectar ideias. Tudo vira um grafo — você vê como os pensamentos se ligam.', atalhos: 'Ctrl+K busca · Ctrl+P navega · Ctrl+I captura', rota: '/ideias' },
  { icon: '📋', titulo: 'Rotina + Hábitos', descricao: 'Blocos de horário organizam seu dia. Tarefas com prioridade alta/média/baixa. Hábitos: um clique por dia pra marcar — streak mostra quantos dias seguidos.', atalhos: '', rota: '/rotina' },
  { icon: '🍅', titulo: 'Pomodoro', descricao: 'Timer de foco com ciclos automáticos. Pause, resume, modo livre. Alarme sonoro. Ideal pra manter a concentração sem pensar no relógio.', atalhos: '', rota: '/pomodoro' },
  { icon: '🎴', titulo: 'Flashcards', descricao: 'Revisão espaçada (SM-2) pra aprender de verdade. Categorias, busca, navegação por teclado (1 a 5). A análise semanal mostra seu progresso.', atalhos: '', rota: '/flashcards' },
  { icon: '📊', titulo: 'Dashboard', descricao: 'Visão geral do dia: saudação personalizada, barras de progresso de tarefas e foco, streak de hábitos, próximo bloco da rotina. Tudo num só lugar.', atalhos: '', rota: '/' },
  { icon: '📈', titulo: 'Insights', descricao: 'Gráficos de desempenho semanal, distribuição de notas por categoria, evolução dos flashcards (SM-2), taxas de conclusão de tarefas.', atalhos: '', rota: '/insights' },
  { icon: '🔍', titulo: 'Consultas', descricao: 'Visualização avançada de dados personalizada. Busca textual em todas as entidades, filtra por tipo e data, exporta resultados em CSV ou JSON.', atalhos: '', rota: '/consultas' },
  { icon: '⚙️', titulo: 'Config', descricao: 'Personalize tudo: tema claro/escuro, cor de destaque, fonte e zoom, som ambiente, atalhos de teclado, PIN de bloqueio, backup e restauração.', atalhos: '', rota: '/config' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function TourModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [tourStep, setTourStep] = useState(0)
  const [showOnStartup, setShowOnStartup] = useState(() => localStorage.getItem('mindflow_show_onboarding') === '1')
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, open)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowRight' && tourStep < TOUR_STEPS.length - 1) { e.preventDefault(); setTourStep(s => s + 1) }
      if (e.key === 'ArrowLeft' && tourStep > 0) { e.preventDefault(); setTourStep(s => s - 1) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, tourStep, onClose])

  function handleClose() {
    onClose()
    if (!showOnStartup) localStorage.setItem('mindflow_onboarding_done', '1')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={handleClose}>
      <div ref={ref} className="bg-bg-secondary rounded-xl border border-border shadow-2xl w-full max-w-lg mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Bem-vindo ao MindFlow</h2>
          <span className="text-xs text-text-muted font-mono">{tourStep + 1} de {TOUR_STEPS.length}</span>
        </div>

        <div key={tourStep} className="bg-bg-tertiary rounded-xl p-6 mb-6 animate-fade-in">
          <div className="text-center">
            <span className="text-4xl block mb-3">{TOUR_STEPS[tourStep].icon}</span>
            <h3 className="text-lg font-semibold mb-2">{TOUR_STEPS[tourStep].titulo}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{TOUR_STEPS[tourStep].descricao}</p>
            {TOUR_STEPS[tourStep].atalhos && (
              <p className="text-xs text-text-secondary mt-3 font-mono">{TOUR_STEPS[tourStep].atalhos}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setTourStep(s => Math.max(0, s - 1))}
            disabled={tourStep === 0}
            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-sm text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Anterior"><ChevronLeft size={16} /></button>
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button key={i} onClick={() => setTourStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === tourStep ? 'bg-accent w-4' : 'bg-text-muted/30 hover:bg-text-muted/50'}`}
                aria-label={`Passo ${i + 1}`} />
            ))}
          </div>
          <button onClick={() => setTourStep(s => Math.min(TOUR_STEPS.length - 1, s + 1))}
            disabled={tourStep === TOUR_STEPS.length - 1}
            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-sm text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Próximo"><ChevronRight size={16} /></button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="text-xs text-text-muted hover:text-text-secondary transition-colors">Pular tour</button>
            <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
              <input type="checkbox" checked={showOnStartup}
                onChange={e => {
                  setShowOnStartup(e.target.checked)
                  localStorage.setItem('mindflow_show_onboarding', e.target.checked ? '1' : '')
                }} className="w-3 h-3" />
              Mostrar sempre
            </label>
          </div>
          {tourStep < TOUR_STEPS.length - 1 ? (
            <button onClick={() => { navigate(TOUR_STEPS[tourStep].rota); handleClose() }}
              className="px-4 py-2 bg-accent text-white rounded-lg transition-all active:scale-95 hover:bg-accent-hover text-sm">
              Ir para {TOUR_STEPS[tourStep].titulo} →
            </button>
          ) : (
            <button onClick={handleClose}
              className="px-6 py-2 bg-accent text-white rounded-lg transition-all active:scale-95 hover:bg-accent-hover text-sm">
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
