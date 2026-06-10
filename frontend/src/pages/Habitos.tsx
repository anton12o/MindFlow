import { useState, useEffect } from 'react'
import { getHabitos, createHabito, deleteHabito, getRegistros, createRegistro } from '../api/habitos'
import { hojeLocal } from '../utils/date'
import type { Habito, RegistroHabito } from '../types'

export default function Habitos() {
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'binario' as 'binario' | 'quantitativo', categoria: '', meta: '' })
  const [, setRegistros] = useState<Record<number, RegistroHabito[]>>({})

  useEffect(() => {
    getHabitos().then(setHabitos)
  }, [])

  function loadRegistros(id: number) {
    getRegistros(id).then(r => setRegistros(prev => ({ ...prev, [id]: r })))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const h = await createHabito({
      nome: form.nome,
      tipo: form.tipo,
      categoria: form.categoria || null,
      meta: form.meta ? parseFloat(form.meta) : null,
    })
    setHabitos(prev => [h, ...prev])
    setForm({ nome: '', tipo: 'binario', categoria: '', meta: '' })
    setShowForm(false)
  }

  async function handleCheck(habitoId: number, feito: boolean) {
    const hoje = hojeLocal()
    await createRegistro(habitoId, {
      habito_id: habitoId,
      data: hoje,
      valor: feito ? 1 : 0,
    })
    loadRegistros(habitoId)
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Hábitos</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
          + Novo hábito
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-bg-secondary rounded-xl border border-border p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-text-muted mb-1">Nome</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Tipo</label>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'binario' | 'quantitativo' }))}
              className="bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent">
              <option value="binario">Binário</option>
              <option value="quantitativo">Quantitativo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Categoria</label>
            <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="bg-bg-tertiary rounded-lg px-3 py-2 text-sm w-28 outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <button type="submit" className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover">Criar</button>
        </form>
      )}

      <div className="space-y-3">
        {habitos.filter(h => h.ativo).map(h => (
          <div key={h.id} className="bg-bg-secondary rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: h.cor || '#5B8DEF' }} />
                <div>
                  <span className="text-sm font-medium">{h.nome}</span>
                  {h.categoria && <span className="text-xs text-text-muted ml-2">{h.categoria}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {h.tipo === 'binario' && (
                  <button onClick={() => handleCheck(h.id, true)} className="w-6 h-6 rounded border border-border hover:bg-accent/20 hover:border-accent flex items-center justify-center text-xs">✓</button>
                )}
                <button onClick={() => deleteHabito(h.id).then(() => setHabitos(prev => prev.filter(x => x.id !== h.id)))}
                  className="text-xs text-text-muted hover:text-danger">✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
