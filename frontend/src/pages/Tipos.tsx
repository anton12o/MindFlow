import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTipos, createTipo, updateTipo, deleteTipo } from '../api/tipos'
import ConfirmModal from '../components/ConfirmModal'
import { useNotify } from '../store/notification'
const ICONES = ['📝', '✅', '📋', '👤', '🔗', '🎯', '📖', '💡', '🔖', '📌']
export default function Tipos({ compact }: { compact?: boolean }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState({ nome: '', icone: '📝' })
  const [formError, setFormError] = useState('')
  const [editError, setEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const { data: tipos, isLoading, isError } = useQuery({ queryKey: ['tipos'], queryFn: getTipos, staleTime: 300_000 })
  const createMut = useMutation({
    mutationFn: () => createTipo({ nome: form.nome, icone: form.icone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos'] })
      setForm({ nome: '', icone: '📝' })
      notify('Tipo criado!')
    },
    onError: (e) => { console.error('[Tipos] create', e); notify('Erro ao criar tipo') },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { nome: string; icone: string } }) => updateTipo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos'] })
      setEditing(null)
      notify('Tipo atualizado!')
    },
    onError: (e) => { console.error('[Tipos] update', e); notify('Erro ao atualizar tipo') },
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTipo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tipos'] }),
    onError: (e) => { console.error('[Tipos] delete', e); notify('Erro ao excluir tipo') },
  })
  return (
    <div className={compact ? '' : 'p-6 max-w-4xl mx-auto animate-fade-in'}>
      <h1 className="text-2xl font-bold mb-6">Tipos de Objeto</h1>
      {!editing && (
      <div className="bg-bg-secondary rounded-xl border border-border p-4 mb-6">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Novo tipo</h2>
        <div className="flex items-center gap-2">
          <select value={form.icone} onChange={e => setForm(f => ({ ...f, icone: e.target.value }))}
            className="bg-bg-primary rounded px-2 py-1.5 text-lg outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {ICONES.map(ic => <option key={ic} value={ic}>{ic}</option>)}
          </select>
          <input value={form.nome} onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); if (formError) setFormError('') }}
            placeholder="Nome do tipo" className={`flex-1 bg-bg-primary rounded px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent ${formError ? 'ring-1 ring-danger border-danger' : ''}`} />
          {formError && <p className="text-xs text-danger">{formError}</p>}
          <button onClick={() => { if (!form.nome.trim()) { setFormError('Informe o nome do tipo'); return }; setFormError(''); createMut.mutate() }} disabled={createMut.isPending}
            className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg transition-all active:scale-95 disabled:opacity-50 hover:bg-accent-hover">{createMut.isPending ? 'Criando...' : 'Criar'}</button>
        </div>
      </div>
      )}
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
        {isError && <p className="text-sm text-danger py-4 text-center">Erro ao carregar tipos</p>}
        {!isLoading && !isError && (!tipos || tipos.length === 0) && (
          <p className="text-sm text-text-muted py-4 text-center">Nenhum tipo criado ainda</p>
        )}
        {!isLoading && !isError && (tipos || []).map(t => (
          <div key={t.id} className="bg-bg-secondary rounded-xl border border-border p-4">
            {editing === t.id ? (
              <div className="flex items-center gap-2">
                <select value={form.icone} onChange={e => setForm(f => ({ ...f, icone: e.target.value }))}
                  className="bg-bg-primary rounded px-2 py-1.5 text-lg outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  {ICONES.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <input value={form.nome} onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); if (editError) setEditError('') }}
                  className={`flex-1 bg-bg-primary rounded px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent ${editError ? 'ring-1 ring-danger border-danger' : ''}`} />
                {editError && <p className="text-xs text-danger">{editError}</p>}
                <button onClick={() => { if (!form.nome.trim()) { setEditError('Informe o nome do tipo'); return }; setEditError(''); updateMut.mutate({ id: t.id, data: form }) }}
                  disabled={updateMut.isPending} className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg transition-all active:scale-95 disabled:opacity-50 hover:bg-accent-hover">{updateMut.isPending ? 'Salvando...' : 'Salvar'}</button>
                <button onClick={() => setEditing(null)}
                  className="px-3 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover transition-colors">Cancelar</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{t.icone}</span>
                  <div>
                    <p className="font-medium text-sm truncate max-w-[200px]">{t.nome}</p>
                    <p className="text-xs text-text-muted">{t.contagem ?? 0} notas · {t.schema_campos && Object.keys(t.schema_campos).length} campos</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(t.id); setForm({ nome: t.nome, icone: t.icone }) }}
                    className="text-xs text-accent hover:bg-bg-hover px-2 py-1 rounded transition-colors">Editar</button>
                  <button onClick={() => setConfirmDelete(t.id)}
                    className="text-xs text-danger hover:bg-bg-hover px-2 py-1 rounded transition-colors">Excluir</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {confirmDelete !== null && (
        <ConfirmModal
          titulo="Excluir tipo"
          mensagem="Tem certeza que deseja excluir este tipo? Esta ação não pode ser desfeita."
          destructive
          disabled={deleteMut.isPending}
          onConfirm={() => { deleteMut.mutate(confirmDelete); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
