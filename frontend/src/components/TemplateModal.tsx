import { useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTemplates, aplicarTemplate } from '../api/templates'

interface Props {
  onClose: () => void
  onSelect: (notaId: number) => void
}

export default function TemplateModal({ onClose, onSelect }: Props) {
  const queryClient = useQueryClient()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data: templates, isLoading, isError } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  })

  const aplicarMut = useMutation({
    mutationFn: (id: number) => aplicarTemplate(id),
    onSuccess: (nota) => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      onSelect(nota.id)
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-text-muted uppercase tracking-wider">Criar a partir de template</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
        <div className="p-4 space-y-2">
          {isLoading && <p className="text-sm text-text-muted text-center py-4 animate-pulse">Carregando...</p>}
          {isError && <p className="text-sm text-danger text-center py-4">Erro ao carregar templates</p>}
          {!isLoading && !isError && templates?.map(t => (
            <button
              key={t.id}
              onClick={() => aplicarMut.mutate(t.id)}
              className="w-full text-left p-3 rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors"
            >
              <div className="text-sm font-medium">{t.nome}</div>
              {t.descricao && <div className="text-xs text-text-muted mt-0.5">{t.descricao}</div>}
            </button>
          ))}
          {!isLoading && !isError && (!templates || templates.length === 0) && (
            <p className="text-sm text-text-muted text-center py-4">Nenhum template disponível</p>
          )}
        </div>
      </div>
    </div>
  )
}
