import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVersoes, restaurarVersao } from '../api/notas'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useNotify } from '../store/notification'
import { History, RotateCcw, X, ChevronDown, ChevronUp } from 'lucide-react'


export default function VersionHistoryModal({
  notaId, isOpen, onClose,
}: {
  notaId: number
  isOpen: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: versoes } = useQuery({
    queryKey: ['versoes', notaId],
    queryFn: () => getVersoes(notaId),
    enabled: isOpen && !!notaId,
  })

  const restoreMut = useMutation({
    mutationFn: (versaoId: number) => restaurarVersao(notaId, versaoId),
    onSuccess: () => {
      notify('Versão restaurada')
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      queryClient.invalidateQueries({ queryKey: ['nota', notaId] })
      queryClient.invalidateQueries({ queryKey: ['versoes', notaId] })
      onClose()
    },
    onError: (e) => {
      console.error('[restore]', e)
      notify('Erro ao restaurar versão')
    },
  })

  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, isOpen)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div ref={modalRef} onClick={e => e.stopPropagation()}
        className="bg-bg-secondary rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <History size={18} className="text-accent" />
            <h2 className="text-lg font-semibold">Histórico de versões</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!versoes || versoes.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Nenhuma versão anterior</p>
          ) : (
            versoes.map((v) => (
              <div key={v.id} className="bg-bg-tertiary rounded-xl overflow-hidden">
                <button onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-hover transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <span className="bg-accent/10 text-accent text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center">v{v.versao}</span>
                    <div>
                      <p className="text-sm font-medium">{v.titulo || '(sem título)'}</p>
                      <p className="text-xs text-text-muted">{new Date(v.criado_em).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  {expandedId === v.id ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
                </button>
                {expandedId === v.id && (
                  <div className="px-4 pb-3 space-y-2">
                    {v.conteudo ? (
                      <div className="bg-bg-primary rounded-lg p-2 max-h-32 overflow-y-auto">
                        <pre className="text-xs text-text-muted whitespace-pre-wrap">{v.conteudo.slice(0, 500)}{v.conteudo.length > 500 ? '...' : ''}</pre>
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted italic">Sem conteúdo</p>
                    )}
                    {v.propriedades && Object.keys(v.propriedades).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(v.propriedades).map(([k, val]) => (
                          <span key={k} className="text-xs bg-bg-primary rounded px-2 py-0.5 text-text-muted">{k}: {String(val)}</span>
                        ))}
                      </div>
                    )}
                    <button onClick={() => {
                      if (confirm(`Restaurar versão v${v.versao}? A versão atual será salva.`)) {
                        restoreMut.mutate(v.id)
                      }
                    }} disabled={restoreMut.isPending}
                      className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50">
                      <RotateCcw size={14} /> Restaurar esta versão
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
