import { useState, useRef, useEffect } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useNotaTemplates, type NotaTemplate } from '../hooks/useNotaTemplates'
import { FileText, Plus, X, Search, Trash2 } from 'lucide-react'

interface Props {
  onClose: () => void
  onSelect: (titulo: string, conteudo: string) => void
}

export default function NotaTemplatePicker({ onClose, onSelect }: Props) {
  const { templates, addTemplate, removeTemplate } = useNotaTemplates()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, true)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const filtered = templates.filter(t =>
    !search || t.titulo.toLowerCase().includes(search.toLowerCase()) || t.conteudo.toLowerCase().includes(search.toLowerCase())
  )

  function handleAdd() {
    if (!newTitle.trim()) return
    addTemplate(newTitle.trim(), newContent)
    setNewTitle('')
    setNewContent('')
    setShowForm(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div ref={modalRef} className="bg-bg-secondary rounded-xl border border-border w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-sm font-semibold text-text-muted uppercase tracking-wider">Modelos de nota</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors" aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="p-4 pb-2 shrink-0 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar modelo..."
              className="w-full bg-bg-tertiary rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors">
              <Plus size={14} /> Novo modelo
            </button>
          )}
          {showForm && (
            <div className="bg-bg-tertiary rounded-lg p-3 space-y-2 border border-border/50">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título do modelo"
                className="w-full bg-bg-primary rounded px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent border border-border/50" />
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Conteúdo do modelo..."
                rows={3} className="w-full bg-bg-primary rounded px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent border border-border/50 resize-none" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowForm(false); setNewTitle(''); setNewContent('') }}
                  className="px-3 py-1 text-xs rounded-lg bg-bg-hover text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
                <button onClick={handleAdd}
                  className="px-3 py-1 text-xs rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors">Salvar</button>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 pt-2 overflow-y-auto flex-1 space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">
              {search ? 'Nenhum modelo encontrado' : 'Nenhum modelo salvo. Crie um clicando em "+ Novo modelo".'}
            </p>
          )}
          {filtered.map(t => (
            <TemplateCard key={t.id} template={t} onSelect={() => { onSelect(t.titulo, t.conteudo); onClose() }} onRemove={() => removeTemplate(t.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TemplateCard({ template, onSelect, onRemove }: { template: NotaTemplate; onSelect: () => void; onRemove: () => void }) {
  return (
    <div className="group flex items-start gap-2 p-3 rounded-xl bg-bg-tertiary hover:bg-bg-hover border border-border/50 hover:border-accent/30 transition-all">
      <div className="shrink-0 mt-0.5 text-text-muted"><FileText size={14} /></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">{template.titulo}</div>
        {template.conteudo && <div className="text-xs text-text-muted/70 mt-0.5 line-clamp-2 whitespace-pre-wrap">{template.conteudo}</div>}
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onSelect}
          className="px-2.5 py-1 text-xs rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors">Usar</button>
        <button onClick={onRemove}
          className="p-1 text-text-muted hover:text-danger transition-colors" title="Excluir modelo"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}
