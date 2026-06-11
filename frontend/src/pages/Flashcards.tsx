import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFlashcards, getReviewCards, createFlashcard, updateFlashcard, reviewFlashcard, deleteFlashcard } from '../api/flashcards'
import ConfirmModal from '../components/ConfirmModal'
import { getNotas } from '../api/notas'

const labels = ['', 'Muito difícil', 'Difícil', 'Médio', 'Fácil', 'Muito fácil']

export default function Flashcards() {
  const queryClient = useQueryClient()
  const [virado, setVirado] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ pergunta: '', resposta: '', nota_id: '' })
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ pergunta: '', resposta: '', nota_id: '' })
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; pergunta: string } | null>(null)

  const { data: cards, isLoading: cardsLoad, isError: cardsErr } = useQuery({
    queryKey: ['flashcards', 'review'],
    queryFn: getReviewCards,
  })

  const { data: allCards, isLoading: allLoad, isError: allErr } = useQuery({
    queryKey: ['flashcards', 'all'],
    queryFn: () => getFlashcards(),
  })

  const { data: notas, isLoading: notasLoad } = useQuery({
    queryKey: ['notas'],
    queryFn: () => getNotas(),
  })

  const reviewMut = useMutation({
    mutationFn: ({ id, qualidade }: { id: number; qualidade: number }) =>
      reviewFlashcard(id, qualidade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      setVirado(false)
    },
  })

  const createMut = useMutation({
    mutationFn: (data: { pergunta: string; resposta: string; nota_id?: number }) =>
      createFlashcard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      setForm({ pergunta: '', resposta: '', nota_id: '' })
      setShowForm(false)
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { pergunta?: string; resposta?: string; nota_id?: number | null } }) =>
      updateFlashcard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      setEditId(null)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteFlashcard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards'] }),
  })

  const currentCard = cards?.[0]
  const total = cards?.length || 0

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.pergunta.trim() || !form.resposta.trim()) return
    createMut.mutate({
      pergunta: form.pergunta.trim(),
      resposta: form.resposta.trim(),
      nota_id: form.nota_id ? Number(form.nota_id) : undefined,
    })
  }

  if (cardsLoad) {
    return <div className="p-6 text-text-muted text-sm animate-pulse">Carregando...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Flashcards</h1>
          <p className="text-sm text-text-muted">{total} cards para revisar hoje</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
          {showForm ? 'Cancelar' : '+ Novo flashcard'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-bg-secondary rounded-xl border border-border p-4 mb-6">
          <div className="space-y-3">
            <input value={form.pergunta} onChange={e => setForm(f => ({ ...f, pergunta: e.target.value }))}
              placeholder="Pergunta" className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
            <input value={form.resposta} onChange={e => setForm(f => ({ ...f, resposta: e.target.value }))}
              placeholder="Resposta" className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
            <select value={form.nota_id} onChange={e => setForm(f => ({ ...f, nota_id: e.target.value }))}
              className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">Sem nota associada</option>
              {notasLoad && <option disabled>Carregando...</option>}
              {!notasLoad && (notas || []).map(n => <option key={n.id} value={n.id}>{n.titulo}</option>)}
            </select>
            <button type="submit" disabled={!form.pergunta.trim() || !form.resposta.trim()}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg disabled:opacity-50">Criar flashcard</button>
          </div>
        </form>
      )}

      {cardsLoad && <div className="bg-bg-secondary rounded-xl border border-border p-4 text-center mb-8"><p className="text-text-muted animate-pulse">Carregando...</p></div>}
      {cardsErr && <div className="bg-bg-secondary rounded-xl border border-border p-4 text-center mb-8"><p className="text-danger">Erro ao carregar flashcards</p></div>}
      {!cardsLoad && !cardsErr && currentCard ? (
        <div className="mb-8">
          <div
            onClick={() => setVirado(!virado)}
            className="bg-bg-secondary rounded-xl border border-border p-8 min-h-[200px] cursor-pointer flex items-center justify-center text-center hover:border-accent/50 transition-colors"
          >
            <div>
              <p className="text-xs text-text-muted mb-4">{virado ? 'Resposta' : 'Pergunta'}</p>
              <p className="text-lg whitespace-pre-wrap">{virado ? currentCard.resposta : currentCard.pergunta}</p>
            </div>
          </div>

          {virado && (
            <div className="mt-6">
              <p className="text-xs text-text-muted mb-3 text-center">Como foi sua resposta?</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {[1, 2, 3, 4, 5].map(q => (
                  <button
                    key={q}
                    onClick={() => reviewMut.mutate({ id: currentCard.id, qualidade: q })}
                    className="px-4 py-2 bg-bg-tertiary rounded-lg text-sm hover:bg-accent/20 hover:text-accent transition-colors"
                  >
                    {labels[q]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !cardsLoad && !cardsErr ? (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 text-center mb-8">
          <p className="text-text-muted text-lg mb-2">Nenhum card pendente</p>
          <p className="text-text-muted text-sm">Crie um novo flashcard acima ou eles aparecerão automaticamente conforme você cria notas com flashcards</p>
        </div>
      ) : null}

      <div>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Todos os flashcards</h2>
        {allLoad && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
        {allErr && <p className="text-sm text-danger py-4 text-center">Erro ao carregar flashcards</p>}
        {!allLoad && !allErr && (!allCards || allCards.length === 0) && (
          <p className="text-sm text-text-muted py-4 text-center">Nenhum flashcard criado</p>
        )}
        {!allLoad && !allErr && allCards && allCards.length > 0 && (
          <div className="space-y-2">
            {allCards.map(fc => {
              const editing = editId === fc.id
              return (
              <div key={fc.id} className="bg-bg-secondary rounded-lg border border-border px-4 py-3 flex items-start justify-between gap-4">
                {editing ? (
                  <div className="flex-1 space-y-2">
                    <input value={editForm.pergunta} onChange={e => setEditForm(f => ({ ...f, pergunta: e.target.value }))}
                      className="w-full bg-bg-tertiary rounded px-2 py-1 text-sm outline-none" />
                    <input value={editForm.resposta} onChange={e => setEditForm(f => ({ ...f, resposta: e.target.value }))}
                      className="w-full bg-bg-tertiary rounded px-2 py-1 text-sm outline-none" />
                    <select value={editForm.nota_id} onChange={e => setEditForm(f => ({ ...f, nota_id: e.target.value }))}
                      className="w-full bg-bg-tertiary rounded px-2 py-1 text-sm outline-none">
                      <option value="">Sem nota associada</option>
                      {(notas || []).map(n => <option key={n.id} value={n.id}>{n.titulo}</option>)}
                    </select>
                    <button onClick={() => updateMut.mutate({ id: fc.id, data: { pergunta: editForm.pergunta, resposta: editForm.resposta, nota_id: editForm.nota_id ? Number(editForm.nota_id) : null } })}
                      className="text-xs text-success">Salvar</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-text-muted ml-2">Cancelar</button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fc.pergunta}</p>
                      <p className="text-xs text-text-muted truncate mt-0.5">{fc.resposta}</p>
                      <p className="text-xs text-text-muted mt-1">
                        Próxima revisão: {new Date(fc.proxima_revisao).toLocaleDateString('pt-BR')}
                        {' · '}Facilidade: {fc.facilidade.toFixed(1)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditId(fc.id); setEditForm({ pergunta: fc.pergunta, resposta: fc.resposta, nota_id: fc.nota_id ? String(fc.nota_id) : '' }) }}
                        className="text-xs text-text-muted hover:text-accent">✎</button>
                      <button onClick={() => setConfirmDelete({ id: fc.id, pergunta: fc.pergunta })}
                        className="text-xs text-text-muted hover:text-danger">✕</button>
                    </div>
                  </>
                )}
              </div>
            )})}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          titulo="Remover flashcard"
          mensagem={`Tem certeza que deseja remover "${confirmDelete.pergunta}"?`}
          destructive
          confirmLabel="Remover"
          onConfirm={() => { deleteMut.mutate(confirmDelete.id); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}