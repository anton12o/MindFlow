import { useState, useEffect, useRef } from 'react'
import { getInbox, createInbox, deleteInbox } from '../api/inbox'
import ConfirmModal from './ConfirmModal'
import type { InboxItem } from '../types'

export default function InboxModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [destino, setDestino] = useState('')
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [items, setItems] = useState<InboxItem[]>([])
  const [confirmDelete, setConfirmDelete] = useState<InboxItem | null>(null)

  const loadItems = () => {
    getInbox(false).then(setItems).catch(e => console.error('[Inbox] carregar', e))
  }

  useEffect(() => { loadItems() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    return () => { if (savedTimer.current) clearTimeout(savedTimer.current) }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    try {
      await createInbox(text.trim(), destino || null)
      setText('')
      setDestino('')
      setSaved(true)
      savedTimer.current = setTimeout(() => setSaved(false), 2000)
      loadItems()
    } catch (e) {
      console.error('[Inbox] salvar', e)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteInbox(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (e) {
      console.error('[Inbox] deletar', e)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[10vh] z-50" onClick={onClose}>
      <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-lg shadow-2xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border">
          <span className="text-xs text-text-muted uppercase tracking-wider">Captura rápida</span>
        </div>
        <form onSubmit={handleSubmit} className="p-4 border-b border-border">
          <input
            autoFocus
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
              <button type="submit" className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
                Salvar
              </button>
            </div>
          </div>
        </form>
        {items.length > 0 && (
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
        )}

        {confirmDelete && (
          <ConfirmModal
            titulo="Remover item"
            mensagem={`Tem certeza que deseja remover "${confirmDelete.conteudo}"?`}
            destructive
            confirmLabel="Remover"
            onConfirm={() => { handleDelete(confirmDelete.id); setConfirmDelete(null) }}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </div>
    </div>
  )
}
