import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './utils'
import CommandPalette from '../components/CommandPalette'
import { searchUnified } from '../api/search'

vi.mock('../api/search')

const mockCommands = [
  { id: 'cmd1', label: 'Nova nota', action: vi.fn() },
  { id: 'cmd2', label: 'Buscar', action: vi.fn() },
  { id: 'cmd3', label: 'Configurações', action: vi.fn() },
]

const mockRecentes = [
  { id: 10, titulo: 'Nota recente 1', conteudo: '' },
  { id: 11, titulo: 'Nota recente 2', conteudo: '' },
]

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(searchUnified).mockResolvedValue({
      notas: [], tarefas: [], flashcards: [], habitos: [],
    })
  })

  it('renderiza input com placeholder "Comandos..." no modo comando', () => {
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText('Comandos...')).toBeInTheDocument()
  })

  it('renderiza input com placeholder "Buscar em notas..." no modo nota', () => {
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={vi.fn()} mode="nota" />)
    expect(screen.getByPlaceholderText('Buscar em notas, tarefas, flashcards...')).toBeInTheDocument()
  })

  it('filtra comandos por texto digitado', async () => {
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText('Comandos...')
    fireEvent.change(input, { target: { value: 'Busca' } })
    await waitFor(() => {
      expect(screen.queryByText('Nova nota')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Buscar')).toBeInTheDocument()
  })

  it('mostra "Nenhum comando encontrado" quando filtro não encontra', async () => {
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText('Comandos...')
    fireEvent.change(input, { target: { value: 'zzzz' } })
    await waitFor(() => {
      expect(screen.getByText('Nenhum comando encontrado.')).toBeInTheDocument()
    })
  })

  it('executa ação ao clicar em item e fecha', async () => {
    const onClose = vi.fn()
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={onClose} />)
    const btn = screen.getByText('Nova nota')
    fireEvent.click(btn)
    expect(mockCommands[0].action).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('mostra notas recentes no modo nota sem query', () => {
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={vi.fn()} mode="nota" notasRecentes={mockRecentes as any} />)
    expect(screen.getByText('Recentes')).toBeInTheDocument()
    expect(screen.getByText('Nota recente 1')).toBeInTheDocument()
  })

  it('mostra "Nenhuma nota acessada recentemente" quando sem recentes e modo nota', () => {
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={vi.fn()} mode="nota" notasRecentes={[]} />)
    expect(screen.getByText('Nenhuma nota acessada recentemente')).toBeInTheDocument()
  })

  it('fecha ao clicar no overlay', () => {
    const onClose = vi.fn()
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={onClose} />)
    fireEvent.click(screen.getByRole('listbox').parentElement!.parentElement!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('navega por teclado e executa com Enter', () => {
    const onClose = vi.fn()
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(mockCommands[2].action).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fecha com Escape', () => {
    const onClose = vi.fn()
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('modo nota com query mostra grupos de resultados', async () => {
    vi.mocked(searchUnified).mockResolvedValue({
      notas: [{ id: 1, titulo: 'Nota encontrada' }],
      tarefas: [{ id: 1, titulo: 'Tarefa encontrada' }],
      flashcards: [{ id: 1, pergunta: 'Flash encontrado' }],
      habitos: [{ id: 1, nome: 'Habito encontrado' }],
    })
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={vi.fn()} mode="nota" />)
    const input = screen.getByPlaceholderText('Buscar em notas, tarefas, flashcards...')
    fireEvent.change(input, { target: { value: 'teste' } })
    await waitFor(() => {
      expect(screen.getByText('Notas')).toBeInTheDocument()
      expect(screen.getByText('Tarefas')).toBeInTheDocument()
      expect(screen.getByText('Flashcards')).toBeInTheDocument()
      expect(screen.getByText('Hábitos')).toBeInTheDocument()
    })
    expect(screen.getByText('Nota encontrada')).toBeInTheDocument()
    expect(screen.getByText('Tarefa encontrada')).toBeInTheDocument()
    expect(screen.getByText('Flash encontrado')).toBeInTheDocument()
    expect(screen.getByText('Habito encontrado')).toBeInTheDocument()
  })

  it('zera selected ao mudar query', async () => {
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={vi.fn()} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.change(screen.getByPlaceholderText('Comandos...'), { target: { value: 'Busca' } })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(mockCommands[1].action).toHaveBeenCalledOnce()
  })

  it('onNavigate chamado ao selecionar nota no modo nota', async () => {
    const onNavigate = vi.fn()
    renderWithProviders(<CommandPalette commands={mockCommands} onClose={vi.fn()} mode="nota" notasRecentes={mockRecentes as any} onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Nota recente 1'))
    expect(onNavigate).toHaveBeenCalledWith(10)
  })
})
