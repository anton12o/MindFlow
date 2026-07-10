import request from './client'

export interface SearchResultNota {
  id: number; titulo: string
}

export interface SearchResultTarefa {
  id: number; titulo: string
}

export interface SearchResultFlashcard {
  id: number; pergunta: string; resposta: string
}

export interface SearchResultHabito {
  id: number; nome: string
}

export interface SearchResults {
  notas: SearchResultNota[]
  tarefas: SearchResultTarefa[]
  flashcards: SearchResultFlashcard[]
  habitos: SearchResultHabito[]
}

export const searchUnified = (q: string) =>
  request<SearchResults>(`/search?q=${encodeURIComponent(q)}`)
