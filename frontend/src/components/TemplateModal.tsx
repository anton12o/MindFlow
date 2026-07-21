import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTemplates, aplicarTemplate } from '../api/templates'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useNotify } from '../store/notification'
import { X, Search } from 'lucide-react'

interface Props {
  onClose: () => void
  onSelect: (notaId: number) => void
}

export default function TemplateModal({ onClose, onSelect }: Props) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  const modalRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [aplicandoId, setAplicandoId] = useState<number | null>(null)
  useFocusTrap(modalRef, true)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data: templates, isLoading, isError } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
    staleTime: 300_000,
  })

  const aplicarMut = useMutation({
    mutationFn: (id: number) => aplicarTemplate(id),
    onSuccess: (nota) => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      onSelect(nota.id)
      onClose()
    },
    onError: (e) => { console.error('[TemplateModal]', e); notify('Erro ao aplicar template') },
  })

  const filtered = (templates || []).filter(t =>
    !search || t.nome.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose} role="dialog" aria-modal="true" aria-label="Galeria de templates">
      <div ref={modalRef} className="bg-bg-secondary rounded-xl border border-border w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-sm font-semibold text-text-muted uppercase tracking-wide">Galeria de templates</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors" aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="p-4 pb-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar template..."
              className="w-full bg-bg-tertiary rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
          </div>
        </div>
        <div className="p-4 pt-2 overflow-y-auto flex-1">
          {isLoading && (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-bg-tertiary rounded-lg animate-pulse" />)}
            </div>
          )}
          {isError && <p className="text-sm text-danger text-center py-8">Erro ao carregar templates</p>}
          {!isLoading && !isError && filtered.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">{search ? 'Nenhum template encontrado' : 'Nenhum template disponível'}</p>
          )}
          {!isLoading && !isError && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setAplicandoId(t.id); aplicarMut.mutate(t.id, { onSettled: () => setAplicandoId(null) }) }}
                  disabled={aplicandoId !== null}
                  className="text-left p-4 rounded-xl bg-bg-tertiary hover:bg-bg-hover border border-border/50 hover:border-accent/30 transition-all disabled:opacity-50"
                >
                  <div className="text-sm font-medium text-text-primary">{aplicandoId === t.id ? 'Criando...' : t.nome}</div>
                  {t.descricao && <div className="text-xs text-text-muted mt-1 line-clamp-2">{t.descricao}</div>}
                  <div className="text-xs text-text-muted/60 mt-1.5 line-clamp-2 font-mono">{t.conteudo.slice(0, 120).replace(/\n/g, ' ')}{t.conteudo.length > 120 ? '...' : ''}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
