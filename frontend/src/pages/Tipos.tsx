import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTipos, createTipo, updateTipo, deleteTipo } from '../api/tipos'

const ICONES = ['📄', '✅', '📋', '👤', '🔗', '📝', '🎯', '📌', '💡', '📊']

export default function Tipos() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState({ nome: '', icone: '📄' })

  const { data: tipos, isLoading, isError } = useQuery({ queryKey: ['tipos'], queryFn: getTipos })

  const createMut = useMutation({
    mutationFn: () => createTipo({ nome: form.nome, icone: form.icone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos'] })
      setForm({ nome: '', icone: '📄' })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { nome: string; icone: string } }) => updateTipo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos'] })
      setEditing(null)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTipo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tipos'] }),
  })

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Tipos de Objeto</h1>

      <div className="bg-bg-secondary rounded-xl border border-border p-4 mb-6">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Novo tipo</h2>
        <div className="flex items-center gap-2">
          <select value={form.icone} onChange={e => setForm(f => ({ ...f, icone: e.target.value }))}
            className="bg-bg-primary rounded px-2 py-1.5 text-lg">
            {ICONES.map(ic => <option key={ic} value={ic}>{ic}</option>)}
          </select>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="Nome do tipo" className="flex-1 bg-bg-primary rounded px-3 py-1.5 text-sm outline-none" />
          <button onClick={() => createMut.mutate()} disabled={!form.nome.trim()}
            className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg disabled:opacity-50">Criar</button>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-text-muted py-8 text-center animate-pulse">Carregando...</p>}
        {isError && <p className="text-sm text-danger py-8 text-center">Erro ao carregar tipos</p>}
        {!isLoading && !isError && (!tipos || tipos.length === 0) && (
          <p className="text-sm text-text-muted py-8 text-center">Nenhum tipo criado ainda</p>
        )}
        {!isLoading && !isError && (tipos || []).map(t => (
          <div key={t.id} className="bg-bg-secondary rounded-xl border border-border p-4">
            {editing === t.id ? (
              <div className="flex items-center gap-2">
                <select value={form.icone} onChange={e => setForm(f => ({ ...f, icone: e.target.value }))}
                  className="bg-bg-primary rounded px-2 py-1.5 text-lg">
                  {ICONES.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="flex-1 bg-bg-primary rounded px-3 py-1.5 text-sm outline-none" />
                <button onClick={() => updateMut.mutate({ id: t.id, data: form })}
                  className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg">Salvar</button>
                <button onClick={() => setEditing(null)}
                  className="px-3 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg">Cancelar</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{t.icone}</span>
                  <div>
                    <p className="font-medium text-sm">{t.nome}</p>
                    <p className="text-xs text-text-muted">{t.schema_campos && Object.keys(t.schema_campos).length} campos</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(t.id); setForm({ nome: t.nome, icone: t.icone }) }}
                    className="text-xs text-accent hover:underline">Editar</button>
                  <button onClick={() => deleteMut.mutate(t.id)}
                    className="text-xs text-danger hover:underline">Excluir</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
