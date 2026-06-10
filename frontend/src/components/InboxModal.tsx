import { useState, useEffect, useRef } from 'react'
import { createInbox } from '../api/inbox'

export default function InboxModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
    await createInbox(text.trim())
    setText('')
    setSaved(true)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[20vh] z-50" onClick={onClose}>
      <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border">
          <span className="text-xs text-text-muted uppercase tracking-wider">Captura rápida</span>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="O que você está pensando?"
            className="w-full bg-transparent text-text-primary text-lg placeholder-text-muted outline-none"
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-text-muted">Enter para salvar · Esc para fechar</span>
            <div className="flex gap-2">
              {saved && <span className="text-xs text-success">Salvo!</span>}
              <button type="submit" className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
