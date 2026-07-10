import { useState, useCallback } from 'react'

export interface NotaTemplate {
  id: string
  titulo: string
  conteudo: string
}

function loadTemplates(): NotaTemplate[] {
  try { return JSON.parse(localStorage.getItem('nota_templates') || '[]') } catch { return [] }
}

function saveTemplates(t: NotaTemplate[]) {
  try { localStorage.setItem('nota_templates', JSON.stringify(t)) } catch { /* silent */ }
}

export function useNotaTemplates() {
  const [templates, setTemplates] = useState<NotaTemplate[]>(loadTemplates)

  const addTemplate = useCallback((titulo: string, conteudo: string) => {
    const novo: NotaTemplate = { id: crypto.randomUUID(), titulo, conteudo }
    setTemplates(prev => {
      const next = [...prev, novo]
      saveTemplates(next)
      return next
    })
    return novo
  }, [])

  const removeTemplate = useCallback((id: string) => {
    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id)
      saveTemplates(next)
      return next
    })
  }, [])

  return { templates, addTemplate, removeTemplate }
}
