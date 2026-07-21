import { useState } from 'react'
import { createNota } from '../../api/notas'
import { useNotify } from '../../store/notification'
interface SchemaField {
  type: 'text' | 'number' | 'date' | 'url' | 'select'
  options?: string[]
}
interface FormularioViewProps {
  query: { tipo_objeto_id: number }
  tipo: { icone?: string; nome?: string; schema_campos?: Record<string, unknown> } | undefined
  onClose: () => void
  onCreate: () => void
}
export default function FormularioView({ query, tipo, onClose, onCreate }: FormularioViewProps) {
  const notify = useNotify()
  const schema = (tipo?.schema_campos || {}) as Record<string, SchemaField>
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [titulo, setTitulo] = useState('')
  const [saving, setSaving] = useState(false)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    setSaving(true)
    const payload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(formData)) {
      if (!value.trim()) continue
      const field = schema[key]
      if (field?.type === 'number') {
        payload[key] = Number(value)
      } else {
        payload[key] = value
      }
    }
    createNota({ titulo, tipo_id: query.tipo_objeto_id, propriedades: payload })
      .then(() => {
        onCreate()
        setTitulo('')
        setFormData({})
      })
      .catch(err => { console.error('[Formulario] create failed:', err); notify('Erro ao criar nota') })
      .finally(() => setSaving(false))
  }
  if (!Object.keys(schema).length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <p className="text-center">Este tipo não tem schema_campos definido.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded-lg transition-all active:scale-95 hover:bg-accent-hover">Fechar</button>
      </div>
    )
  }
  return (
    <div className="max-w-xl mx-auto p-6 bg-bg-secondary rounded-xl border border-border">
      <h3 className="text-lg font-semibold mb-4">Nova nota {tipo?.icone} {tipo?.nome}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Título *</label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)}
            className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" required />
        </div>
        {Object.entries(schema).map(([key, field]) => (
          <div key={key}>
            <label className="block text-xs text-text-muted mb-1">{key}</label>
            {field.type === 'select' && field.options ? (
              <select
                value={formData[key] || ''}
                onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">Selecione...</option>
                {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : field.type === 'date' ? (
              <input type="date"
                value={formData[key] || ''}
                onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
            ) : field.type === 'number' ? (
              <input type="number"
                value={formData[key] || ''}
                onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
            ) : field.type === 'url' ? (
              <input type="url"
                value={formData[key] || ''}
                onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" placeholder="https://..." />
            ) : (
              <input type="text"
                value={formData[key] || ''}
                onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-bg-hover">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !titulo.trim()}
            className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg transition-all active:scale-95 hover:bg-accent-hover disabled:opacity-disabled">
            {saving ? 'Criando...' : `Criar ${tipo?.nome || 'nota'}`}
          </button>
        </div>
      </form>
    </div>
  )
}
