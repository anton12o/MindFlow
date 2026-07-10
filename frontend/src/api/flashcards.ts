import request from './client'
import type { Flashcard } from '../types'

export const getFlashcards = (notaId?: number, q?: string) => {
  const params = new URLSearchParams()
  if (notaId !== undefined) params.set('nota_id', String(notaId))
  if (q) params.set('q', q)
  const qs = params.toString()
  return request<Flashcard[]>(`/flashcards${qs ? `?${qs}` : ''}`)
}

export const getReviewCards = () =>
  request<Flashcard[]>('/flashcards/review')

export const createFlashcard = (data: { nota_id?: number; pergunta: string; resposta: string; categoria?: string }) =>
  request<Flashcard>('/flashcards', { method: 'POST', body: JSON.stringify(data) })

export const reviewFlashcard = (id: number, qualidade: number) =>
  request<Flashcard>(`/flashcards/${id}/review`, { method: 'POST', body: JSON.stringify({ qualidade }) })

export const updateFlashcard = (id: number, data: { pergunta?: string; resposta?: string; nota_id?: number | null; categoria?: string | null }) =>
  request<Flashcard>(`/flashcards/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteFlashcard = (id: number) =>
  request<{ ok: boolean }>(`/flashcards/${id}`, { method: 'DELETE' })
