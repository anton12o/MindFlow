const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export interface ImportResult {
  sucesso: boolean
  importado_em: string
  tabelas: Record<string, { inseridos: number; atualizados: number }>
}

export async function importFile(file: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API}/import`, {
    method: 'POST',
    body: formData,
  })

  const text = await res.text()

  if (!res.ok) {
    throw new Error(`Import ${res.status}: ${text.slice(0, 200)}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Resposta inválida do servidor: ${text.slice(0, 100)}`)
  }
}
