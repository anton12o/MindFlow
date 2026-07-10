import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './utils'
import InboxModal from '../components/InboxModal'
import { getInbox, createInbox, deleteInbox } from '../api/inbox'

vi.mock('../api/inbox')

const mockItems = [
  { id: 1, conteudo: 'Comprar leite', tipo_destino: null, destino_id: null, arquivado: false, criado_em: '2026-06-30' },
  { id: 2, conteudo: 'Ler livro', tipo_destino: 'nota', destino_id: null, arquivado: false, criado_em: '2026-06-30' },
]

beforeEach(() => {
  vi.mocked(getInbox).mockResolvedValue(mockItems)
  vi.mocked(createInbox).mockResolvedValue(mockItems[0])
  vi.mocked(deleteInbox).mockResolvedValue({ ok: true })
})

function renderInboxModal(isOpen = true) {
  const onClose = vi.fn()
  const result = renderWithProviders(<InboxModal isOpen={isOpen} onClose={onClose} />)
  return { ...result, onClose }
}

describe('InboxModal', () => {
  it('exibe titulo Captura rapida', () => {
    renderInboxModal()
    expect(screen.getByText('Captura rápida')).toBeInTheDocument()
  })

  it('exibe input de texto', () => {
    renderInboxModal()
    expect(screen.getByPlaceholderText(/O que você quer capturar/)).toBeInTheDocument()
  })

  it('exibe select de destino', () => {
    renderInboxModal()
    expect(screen.getByText('Sem destino')).toBeInTheDocument()
    expect(screen.getByText('Nota')).toBeInTheDocument()
    expect(screen.getByText('Tarefa')).toBeInTheDocument()
    expect(screen.getByText('Hábito')).toBeInTheDocument()
  })

  it('mostra itens pendentes', async () => {
    renderInboxModal()
    expect(await screen.findByText('Comprar leite')).toBeInTheDocument()
    expect(await screen.findByText('Ler livro')).toBeInTheDocument()
  })

  it('mostra badge de tipo_destino quando presente', async () => {
    renderInboxModal()
    expect(await screen.findByText('📥 nota')).toBeInTheDocument()
  })

  it('mostra estado de carregamento', () => {
    vi.mocked(getInbox).mockImplementationOnce(() => new Promise(() => {}))
    renderInboxModal()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('mostra estado de erro', async () => {
    vi.mocked(getInbox).mockRejectedValueOnce(new Error('fail'))
    renderInboxModal()
    expect(await screen.findByText('Erro ao carregar itens')).toBeInTheDocument()
  })

  it('mostra mensagem de lista vazia', async () => {
    vi.mocked(getInbox).mockResolvedValueOnce([])
    renderInboxModal()
    expect(await screen.findByText('Nenhum item pendente')).toBeInTheDocument()
  })

  it('chama createInbox ao submeter formulario', async () => {
    vi.mocked(createInbox).mockResolvedValue(mockItems[0])
    renderInboxModal()
    await screen.findByText('Comprar leite')
    const input = screen.getByPlaceholderText(/O que você quer capturar/)
    fireEvent.change(input, { target: { value: 'Nova tarefa' } })
    fireEvent.click(screen.getByText('Capturar'))
    await waitFor(() => {
      expect(vi.mocked(createInbox)).toHaveBeenCalledWith('Nova tarefa', null)
    })
  })

  it('mostra ConfirmModal ao clicar em remover item', async () => {
    renderInboxModal()
    await screen.findByText('Comprar leite')
    const removeButtons = screen.getAllByLabelText('Remover item')
    fireEvent.click(removeButtons[0])
    expect(screen.getByText('Remover item')).toBeInTheDocument()
  })

  it('chama onClose ao clicar no overlay', () => {
    const { onClose } = renderInboxModal()
    const overlay = document.querySelector('.fixed.inset-0')
    if (overlay) fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('esconde quando isOpen=false', () => {
    renderInboxModal(false)
    const overlay = document.querySelector('.fixed.inset-0')
    expect(overlay?.className).toContain('hidden')
  })
})
