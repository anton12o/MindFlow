import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getInbox, createInbox, deleteInbox } from '../api/inbox'
import ConfirmModal from './ConfirmModal'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { InboxItem } from '../types'

export default function InboxModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [destino, setDestino] = useState('')
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<InboxItem | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, isOpen)

  useEffect(() => {
    const capture = (e: CustomEvent) => { if (e.detail?.text) setText(e.detail.text) }
    window.addEventListener('inbox-capture', capture as EventListener)
    return () => window.removeEventListener('inbox-capture', capture as EventListener)
  }, [])

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ['inbox', false],
    queryFn: () => getInbox(false),
  })

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const createMut = useMutation({
    mutationFn: () => createInbox(text.trim(), destino || null),
    onSuccess: () => {
      setText('')
      setDestino('')
      setSaved(true)
      savedTimer.current = setTimeout(() => setSaved(false), 2000)
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteInbox(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    return () => { if (savedTimer.current) clearTimeout(savedTimer.current) }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    createMut.mutate()
  }

  return (
    <div className={`fixed inset-0 bg-black/60 flex items-start justify-center pt-[10vh] z-50 ${isOpen ? '' : 'hidden'}`} onClick={onClose}>
      <div ref={modalRef} className="bg-bg-secondary rounded-xl border border-border w-full max-w-lg shadow-2xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border">
          <span className="text-xs text-text-muted uppercase tracking-wider">Captura rápida</span>
        </div>
        <form onSubmit={handleSubmit} className="p-4 border-b border-border">
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="O que você está pensando?"
            className="w-full bg-transparent text-text-primary text-lg placeholder-text-muted outline-none"
          />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <select value={destino} onChange={e => setDestino(e.target.value)}
                className="bg-bg-primary rounded px-2 py-1 text-xs outline-none text-text-muted">
                <option value="">Sem destino</option>
                <option value="nota">Nota</option>
                <option value="tarefa">Tarefa</option>
                <option value="habito">Hábito</option>
              </select>
              <span className="text-xs text-text-muted">Enter para salvar · Esc para fechar</span>
            </div>
            <div className="flex gap-2">
              {saved && <span className="text-xs text-success">Salvo!</span>}
              <button type="submit" disabled={createMut.isPending} className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
                {createMut.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
        {isLoading ? (
          <div className="flex-1 p-4">
            <p className="text-sm text-text-muted text-center animate-pulse">Carregando...</p>
          </div>
        ) : isError ? (
          <div className="flex-1 p-4">
            <p className="text-sm text-danger text-center">Erro ao carregar itens</p>
          </div>
        ) : items && items.length > 0 ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-xs text-text-muted uppercase tracking-wider">Pendentes ({items.length})</p>
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2 bg-bg-tertiary rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm block truncate">{item.conteudo}</span>
                  {item.tipo_destino && (
                    <span className="text-[10px] text-accent/70 mt-0.5 block">→ {item.tipo_destino}</span>
                  )}
                </div>
                <button onClick={() => setConfirmDelete(item)}
                  className="text-xs text-text-muted hover:text-danger shrink-0">✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 p-4">
            <p className="text-sm text-text-muted text-center">Nenhum item pendente</p>
          </div>
        )}

        {confirmDelete && (
          <ConfirmModal
            titulo="Remover item"
            mensagem={`Tem certeza que deseja remover "${confirmDelete.conteudo}"?`}
            destructive
            confirmLabel="Remover"
            disabled={deleteMut.isPending}
            onConfirm={() => { deleteMut.mutate(confirmDelete.id); setConfirmDelete(null) }}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </div>
    </div>
  )
}
