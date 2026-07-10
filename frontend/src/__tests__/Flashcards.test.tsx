import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from './utils'
import Flashcards from '../pages/Flashcards'
import { getFlashcards, getReviewCards } from '../api/flashcards'
import { getFlashcardStats } from '../api/stats'
import { getNotas } from '../api/notas'
import type { Flashcard, Nota } from '../types'

vi.mock('../api/flashcards')
vi.mock('../api/stats')
vi.mock('../api/notas')
vi.mock('../utils/date', () => ({
  hojeLocal: () => '2026-06-23',
}))

const mockStats = { total_cards: 20, cards_hoje: 5, cards_revisados_hoje: 3, taxa_acerto_7d: 80 }
const mockReviewCards: Flashcard[] = [
  { id: 1, nota_id: null, pergunta: 'O que é SOLID?', resposta: '5 princípios', categoria: 'Programação', intervalo: 3, facilidade: 2.5, revisoes: 0, ultima_revisao: null, proxima_revisao: '2026-06-23', criado_em: '2026-06-20T00:00:00' },
]
const mockAllCards: Flashcard[] = [
  ...mockReviewCards,
  { id: 2, nota_id: 1, pergunta: 'O que é DRY?', resposta: 'Don\'t Repeat Yourself', categoria: 'Programação', intervalo: 7, facilidade: 2.5, revisoes: 2, ultima_revisao: '2026-06-20T00:00:00', proxima_revisao: '2026-06-27', criado_em: '2026-06-15T00:00:00' },
]
const mockNotas: Nota[] = [
  { id: 1, titulo: 'Estudos', conteudo: '', pasta_id: null, tipo_id: null, ordem: null, criado_em: '2026-06-01T00:00:00', atualizado_em: '2026-06-20T00:00:00' },
]

describe('Flashcards', () => {
  beforeEach(() => {
    vi.mocked(getFlashcardStats).mockResolvedValue(mockStats)
    vi.mocked(getReviewCards).mockResolvedValue(mockReviewCards)
    vi.mocked(getFlashcards).mockResolvedValue(mockAllCards)
    vi.mocked(getNotas).mockResolvedValue(mockNotas)
    localStorage.clear()
  })

  it('renderiza titulo', async () => {
    renderWithProviders(<Flashcards />)
    await waitFor(() => {
      expect(screen.getByText('Flashcards')).toBeInTheDocument()
    })
  })

  it('exibe stats de flashcards', async () => {
    renderWithProviders(<Flashcards />)
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('Pendentes')).toBeInTheDocument()
      expect(screen.getByText('Revisados')).toBeInTheDocument()
      expect(screen.getByText('Acerto (7d)')).toBeInTheDocument()
    })
  })

  it('exibe abas de Revisao e Simulado', async () => {
    renderWithProviders(<Flashcards />)
    await waitFor(() => {
      expect(screen.getByText('Revisão')).toBeInTheDocument()
      expect(screen.getByText('Simulado')).toBeInTheDocument()
    })
  })

  it('exibe card de revisao pendente', async () => {
    renderWithProviders(<Flashcards />)
    await waitFor(() => {
      expect(screen.getByText('O que é SOLID?')).toBeInTheDocument()
    })
  })

  it('exibe seção de todos os flashcards', async () => {
    renderWithProviders(<Flashcards />)
    await waitFor(() => {
      expect(screen.getByText('Todos os flashcards')).toBeInTheDocument()
    })
  })

  it('mostra estado de carregamento', async () => {
    vi.mocked(getReviewCards).mockResolvedValue(new Promise(() => {}))
    vi.mocked(getFlashcardStats).mockResolvedValue(new Promise(() => {}))
    renderWithProviders(<Flashcards />)
    const carregando = screen.getAllByText('Carregando...')
    expect(carregando.length).toBeGreaterThanOrEqual(1)
  })

  it('mostra erro ao carregar', async () => {
    vi.mocked(getFlashcards).mockRejectedValue(new Error('fail'))
    renderWithProviders(<Flashcards />)
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar flashcards')).toBeInTheDocument()
    })
  })

  it('mostra mensagem de nenhum card pendente', async () => {
    vi.mocked(getReviewCards).mockResolvedValue([])
    renderWithProviders(<Flashcards />)
    await waitFor(() => {
      expect(screen.getByText('Nenhum card pendente')).toBeInTheDocument()
    })
  })

  it('mostra botao de novo flashcard', async () => {
    renderWithProviders(<Flashcards />)
    await waitFor(() => {
      expect(screen.getByText('+ Novo flashcard')).toBeInTheDocument()
    })
  })
})
