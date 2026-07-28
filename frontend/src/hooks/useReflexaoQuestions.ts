import { useState, useCallback } from 'react'

const STORAGE_KEY = 'mindflow_reflexao_questions'

const DEFAULT_QUESTIONS = [
  'O que funcionou bem esta semana?',
  'O que poderia ter sido melhor?',
  'Qual foi o aprendizado mais importante?',
  'O que você quer focar na próxima semana?',
]

function loadQuestions(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* JSON inválido ou localStorage indisponível */ }
  return [...DEFAULT_QUESTIONS]
}

function saveQuestions(q: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(q)) } catch { /* localStorage cheio ou indisponível */ }
}

export function useReflexaoQuestions() {
  const [questions, setQuestions] = useState<string[]>(loadQuestions)

  const addQuestion = useCallback((text: string) => {
    setQuestions(prev => {
      const next = [...prev, text]
      saveQuestions(next)
      return next
    })
  }, [])

  const removeQuestion = useCallback((index: number) => {
    setQuestions(prev => {
      const next = prev.filter((_, i) => i !== index)
      saveQuestions(next)
      return next
    })
  }, [])

  const updateQuestion = useCallback((index: number, text: string) => {
    setQuestions(prev => {
      const next = [...prev]
      next[index] = text
      saveQuestions(next)
      return next
    })
  }, [])

  const moveQuestion = useCallback((from: number, to: number) => {
    setQuestions(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      saveQuestions(next)
      return next
    })
  }, [])

  const resetQuestions = useCallback(() => {
    setQuestions([...DEFAULT_QUESTIONS])
    saveQuestions(DEFAULT_QUESTIONS)
  }, [])

  return { questions, addQuestion, removeQuestion, updateQuestion, moveQuestion, resetQuestions, defaults: DEFAULT_QUESTIONS }
}
