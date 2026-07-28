import { useState } from 'react'
import DiasSemanaPicker from './DiasSemanaPicker'

interface HabitoFormData {
  nome: string
  tipo: 'binario' | 'quantitativo'
  categoria: string | null
  meta: number | null
  dias_semana: string | null
}

interface Props {
  onSubmit: (data: HabitoFormData) => void
  onCancel: () => void
  isPending: boolean
}

export default function HabitoForm({ onSubmit, onCancel, isPending }: Props) {
  const [form, setForm] = useState({ nome: '', tipo: 'binario' as 'binario' | 'quantitativo', categoria: '', meta: '', dias_semana: '' })
  const [formError, setFormError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setFormError('Informe o nome do hábito'); return }
    setFormError('')
    onSubmit({
      nome: form.nome,
      tipo: form.tipo,
      categoria: form.categoria || null,
      meta: form.meta ? parseFloat(form.meta) : null,
      dias_semana: form.dias_semana || null,
    })
    setForm({ nome: '', tipo: 'binario', categoria: '', meta: '', dias_semana: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-secondary rounded-xl border border-border p-4 mb-6">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-text-muted mb-1">Nome</label>
          <input value={form.nome} onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); if (formError) setFormError('') }}
            className={`w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-1 ${formError ? 'ring-1 ring-danger border-danger' : 'focus-visible:ring-accent'}`} />
          {formError && <p className="text-xs text-danger mt-0.5">{formError}</p>}
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Tipo</label>
          <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'binario' | 'quantitativo' }))}
            className="bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <option value="binario">Sim/Não (check-in diário)</option>
            <option value="quantitativo">Contagem (vezes, minutos, páginas)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Categoria</label>
          <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            className="bg-bg-tertiary rounded-lg px-3 py-2 text-sm w-28 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Dias da semana</label>
          <DiasSemanaPicker value={form.dias_semana ? form.dias_semana.split(',') : []}
            onChange={v => setForm(f => ({ ...f, dias_semana: v.join(',') }))} />
          <p className="text-xs text-text-muted mt-0.5">Em branco = todos os dias</p>
        </div>
        <button type="submit" disabled={isPending} className="px-4 py-2 bg-accent text-accent-foreground text-sm rounded-lg transition-all active:scale-95 hover:bg-accent-hover disabled:opacity-disabled">{isPending ? 'Criando...' : 'Criar'}</button>
      </div>
      <p className="text-xs text-text-muted mt-2">
        <strong>Sim/Não:</strong> marque se fez ou não o hábito hoje · <strong>Contagem:</strong> registre quantas vezes (ex: 3 copos d'água, 30min estudo)
      </p>
      <div className="flex justify-end mt-2">
        <button type="button" onClick={onCancel} className="text-xs text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
      </div>
    </form>
  )
}
