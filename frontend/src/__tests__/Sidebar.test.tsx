import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './utils'
import Sidebar from '../components/Sidebar'

const mockCycleTheme = vi.fn()
let mockPomodoroAtivo = false

vi.mock('../store/theme', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useTheme: () => ({ mode: 'dark', cycleTheme: mockCycleTheme }), MODE_ICON: { dark: '🌙', light: '☀️', system: '💻' } }
})

vi.mock('../store/pomodoro', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, usePomodoroContext: () => ({ ativo: mockPomodoroAtivo }) }
})

vi.mock('../hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}))

beforeEach(() => {
  mockPomodoroAtivo = false
  mockCycleTheme.mockClear()
})

function renderSidebar(route = '/') {
  const onToggleInbox = vi.fn()
  const result = renderWithProviders(<Sidebar onToggleInbox={onToggleInbox} />, { initialRoute: route })
  return { ...result, onToggleInbox }
}

describe('Sidebar', () => {
  it('renderiza itens de navegacao primarios', () => {
    renderSidebar()
    expect(screen.getByTitle('Dashboard')).toBeInTheDocument()
    expect(screen.getByTitle('Rotina')).toBeInTheDocument()
    expect(screen.getByTitle('Foco')).toBeInTheDocument()
    expect(screen.getByTitle('Notas')).toBeInTheDocument()
    expect(screen.getByTitle('Flashcards')).toBeInTheDocument()
    expect(screen.getByTitle('Hábitos')).toBeInTheDocument()
    expect(screen.getByTitle('Insights')).toBeInTheDocument()
    expect(screen.getByTitle('Consultas')).toBeInTheDocument()
    expect(screen.getByTitle('Config')).toBeInTheDocument()
  })

  it('destaca item ativo baseado na rota atual', () => {
    renderSidebar('/rotina')
    const btn = screen.getByTitle('Rotina')
    expect(btn.className).toContain('bg-accent/20')
  })

  it('nao destaca item nao ativo', () => {
    renderSidebar('/')
    const btn = screen.getByTitle('Rotina')
    expect(btn.className).not.toContain('bg-accent/20')
  })

  it('renderiza Consultas e Config em secoes separadas', () => {
    renderSidebar()
    expect(screen.getByTitle('Consultas')).toBeInTheDocument()
    expect(screen.getByTitle('Config')).toBeInTheDocument()
  })

  it('exibe indicador de pomodoro ativo no icone Foco', () => {
    mockPomodoroAtivo = true
    renderSidebar()
    const btn = screen.getByTitle('Foco')
    expect(btn.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('nao exibe indicador quando pomodoro inativo', () => {
    mockPomodoroAtivo = false
    renderSidebar()
    const btn = screen.getByTitle('Foco')
    expect(btn.querySelector('.animate-pulse')).not.toBeInTheDocument()
  })

  it('chama cycleTheme ao clicar no botao de tema', () => {
    renderSidebar()
    fireEvent.click(screen.getByTitle(/Tema:/))
    expect(mockCycleTheme).toHaveBeenCalledTimes(1)
  })

  it('chama onToggleInbox ao clicar no botao de captura', () => {
    const { onToggleInbox } = renderSidebar()
    fireEvent.click(screen.getByTitle('Captura rápida (Ctrl+I)'))
    expect(onToggleInbox).toHaveBeenCalledTimes(1)
  })

  it('abre ConfirmModal ao clicar em Encerrar', () => {
    renderSidebar()
    fireEvent.click(screen.getByTitle('Encerrar MindFlow'))
    expect(screen.getByText('Encerrar MindFlow')).toBeInTheDocument()
    expect(screen.getByText(/Tem certeza que deseja encerrar o servidor/)).toBeInTheDocument()
  })

  it('cancela shutdown ao clicar no botao Cancelar', () => {
    renderSidebar()
    fireEvent.click(screen.getByTitle('Encerrar MindFlow'))
    fireEvent.click(screen.getByText('Cancelar'))
    expect(screen.queryByText('Encerrando servidor...')).not.toBeInTheDocument()
  })

  it('alterna colapso do menu ao clicar no toggle', () => {
    renderSidebar()
    const aside = document.querySelector('aside')
    expect(aside?.className).not.toContain('-translate-x-full')
  })
})
