import request from './client'
import type { Flashcard } from '../types'

export const getFlashcards = (notaId?: number) =>
  request<Flashcard[]>(`/flashcards${notaId ? `?nota_id=${notaId}` : ''}`)

export const getReviewCards = () =>
  request<Flashcard[]>('/flashcards/review')

export const createFlashcard = (data: { nota_id: number; pergunta: string; resposta: string }) =>
  request<Flashcard>('/flashcards', { method: 'POST', body: JSON.stringify(data) })

export const reviewFlashcard = (id: number, qualidade: number) =>
  request<Flashcard>(`/flashcards/${id}/review?qualidade=${qualidade}`, { method: 'POST' })

export const deleteFlashcard = (id: number) =>
  request<{ ok: boolean }>(`/flashcards/${id}`, { method: 'DELETE' })
