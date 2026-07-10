import { useState } from 'react'
import { importFile, type ImportResult } from '../api/import_export'

export function useImport() {
  const [isLoading, setIsLoading] = useState(false)
  const [resultado, setResultado] = useState<ImportResult | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const mutate = async (file: File) => {
    setIsLoading(true)
    setErro(null)
    setResultado(null)

    try {
      const res = await importFile(file)
      setResultado(res)
    } catch (e) {
      console.error('[useImport]', e)
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setIsLoading(false)
    setResultado(null)
    setErro(null)
  }

  return { mutate, isLoading, resultado, erro, reset }
}
