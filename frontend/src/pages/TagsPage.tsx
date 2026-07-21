import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTags, createTag, updateTag, deleteTag, mergeTags } from '../api/notas'
import { useNotify } from '../store/notification'
import { broadcastInvalidate } from '../hooks/useBroadcastInvalidate'
import ConfirmModal from '../components/ConfirmModal'
import EmptyState from '../components/EmptyState'
import { Tag, Plus, Trash2, Merge, Check, X } from 'lucide-react'
import type { Tag as TagType } from '../types'

interface TagWithCount extends TagType {
  contagem: number
}

export default function TagsPage({ compact }: { compact?: boolean }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editCor, setEditCor] = useState('')
  const [newNome, setNewNome] = useState('')
  const [newCor, setNewCor] = useState('#6B7280')
  const [mergeOrigem, setMergeOrigem] = useState<number | null>(null)
  const [mergeDestino, setMergeDestino] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const editRef = useRef<HTMLInputElement>(null)

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => getTags(),
    staleTime: 10_000,
  })
  const tagsWithCount: TagWithCount[] = (tags || []) as TagWithCount[]

  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tags'] })
    broadcastInvalidate([['notas'], ['tags']])
  }

  const createMut = useMutation({
    mutationFn: (data: { nome: string; cor: string }) => createTag(data),
    onSuccess: () => { notify('Tag criada', 'success'); setNewNome(''); setNewCor('#6B7280'); invalidate() },
    onError: (e) => { console.error('[Tags] create', e); notify('Erro ao criar tag') },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TagType> }) => updateTag(id, data),
    onSuccess: () => { setEditingId(null); invalidate() },
    onError: (e) => { console.error('[Tags] update', e); notify('Erro ao atualizar tag') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSuccess: () => { notify('Tag excluÃ­da', 'success'); setDeleteConfirm(null); invalidate() },
    onError: (e) => { console.error('[Tags] delete', e); notify('Erro ao excluir tag') },
  })

  const mergeMut = useMutation({
    mutationFn: ({ origem_id, destino_id }: { origem_id: number; destino_id: number }) => mergeTags(origem_id, destino_id),
    onSuccess: () => { notify('Tags mescladas', 'success'); setMergeOrigem(null); setMergeDestino(null); invalidate() },
    onError: (e) => { console.error('[Tags] merge', e); notify('Erro ao mesclar tags') },
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newNome.trim()) return
    createMut.mutate({ nome: newNome.trim(), cor: newCor })
  }

  function startEdit(t: TagWithCount) {
    setEditingId(t.id)
    setEditNome(t.nome)
    setEditCor(t.cor || '#6B7280')
  }

  function saveEdit(id: number) {
    if (!editNome.trim()) return
    const data: Partial<TagType> = { nome: editNome.trim() }
    if (editCor !== '#6B7280') data.cor = editCor
    updateMut.mutate({ id, data })
  }

  return (
    <div className={compact ? 'space-y-6' : 'p-6 max-w-2xl mx-auto animate-fade-in space-y-6'}>
      {!compact && <h1 className="text-xl font-bold">Gerenciar Tags</h1>}

      <form onSubmit={handleCreate} className="flex items-center gap-2 bg-bg-secondary rounded-xl border border-border p-3">
        <Tag size={16} className="text-text-muted shrink-0" />
        <input value={newNome} onChange={e => setNewNome(e.target.value)}
          placeholder="Nova tag..." maxLength={50}
          className="flex-1 bg-bg-primary rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent" />
        <input type="color" value={newCor} onChange={e => setNewCor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-border" />
        <button type="submit" disabled={createMut.isPending || !newNome.trim()}
          className="px-3 py-1.5 bg-accent text-accent-foreground text-sm rounded-lg hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-disabled flex items-center gap-1">
          <Plus size={14} /> Criar
        </button>
      </form>

      <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Tags existentes ({tagsWithCount.length})</h2>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-bg-tertiary rounded-lg animate-pulse" />)}</div>
        ) : tagsWithCount.length === 0 ? (
          <EmptyState icon="ðŸ·ï¸" mensagem="Nenhuma tag criada ainda" />
        ) : (
          <div className="space-y-1">
            {tagsWithCount.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-hover transition-colors group">
                {editingId === t.id ? (
                  <>
                    <input ref={editRef} value={editNome} onChange={e => setEditNome(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(t.id); if (e.key === 'Escape') setEditingId(null) }}
                      className="flex-1 bg-bg-primary rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-accent" />
                    <input type="color" value={editCor} onChange={e => setEditCor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border border-border" />
                    <button onClick={() => saveEdit(t.id)} disabled={updateMut.isPending}
                      className="p-1 text-success hover:bg-success/10 rounded transition-colors"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)}
                      className="p-1 text-text-muted hover:bg-bg-tertiary rounded transition-colors"><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.cor || '#6B7280' }} />
                    <span className="flex-1 text-sm truncate">{t.nome}</span>
                    <span className="text-xs text-text-muted tabular-nums">{(t as TagWithCount).contagem || 0} nota(s)</span>
                    <button onClick={() => startEdit(t)}
                      className="p-1 text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity" title="Renomear">âœï¸</button>
                    <button onClick={() => { setMergeOrigem(t.id) }}
                      className="p-1 text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity" title="Mesclar"><Merge size={14} /></button>
                    <button onClick={() => setDeleteConfirm(t.id)}
                      className="p-1 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {mergeOrigem && tags && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Mesclar tag</h2>
          <p className="text-xs text-text-muted">Mesclar associaÃ§Ãµes de uma tag em outra (a origem serÃ¡ excluÃ­da).</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted shrink-0">Origem:</span>
            <span className="text-sm font-medium text-accent">{tagsWithCount.find(t => t.id === mergeOrigem)?.nome}</span>
            <span className="text-xs text-text-muted">â†’</span>
            <select value={mergeDestino ?? ''} onChange={e => setMergeDestino(Number(e.target.value))}
              className="flex-1 bg-bg-tertiary rounded px-2 py-1.5 text-sm outline-none">
              <option value="">Selecionar destino...</option>
              {tagsWithCount.filter(t => t.id !== mergeOrigem).map(t => (
                <option key={t.id} value={t.id}>{t.nome} ({(t as TagWithCount).contagem || 0})</option>
              ))}
            </select>
            <button onClick={() => { if (mergeDestino) mergeMut.mutate({ origem_id: mergeOrigem, destino_id: mergeDestino }) }}
              disabled={!mergeDestino || mergeMut.isPending}
              className="px-3 py-1.5 bg-accent text-accent-foreground text-sm rounded-lg hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-disabled">
              {mergeMut.isPending ? '...' : 'Mesclar'}
            </button>
            <button onClick={() => { setMergeOrigem(null); setMergeDestino(null) }}
              className="text-xs text-text-muted hover:text-text-primary">Cancelar</button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmModal
          titulo="Excluir tag"
          mensagem={`Tem certeza que deseja excluir esta tag? As associaÃ§Ãµes com notas serÃ£o removidas.`}
          destructive
          confirmLabel="Excluir"
          disabled={deleteMut.isPending}
          onConfirm={() => deleteMut.mutate(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}
