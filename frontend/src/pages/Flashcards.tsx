import { useState, useRef, memo, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Pencil, X, Search } from 'lucide-react'
import { getFlashcards, getReviewCards, createFlashcard, updateFlashcard, reviewFlashcard, deleteFlashcard } from '../api/flashcards'
import { getFlashcardStats } from '../api/stats'
import { broadcastInvalidate } from '../hooks/useBroadcastInvalidate'
import ConfirmModal from '../components/ConfirmModal'
import { useNotify } from '../store/notification'
import { getNotas } from '../api/notas'
import type { Flashcard } from '../types'

const labels = ['', 'Muito difícil', 'Difícil', 'Médio', 'Fácil', 'Muito fácil']
const CATEGORIAS_PREDEFINIDAS = ['Conceito', 'Definição', 'Fórmula', 'Idioma', 'Código', 'Data', 'Pessoal']

interface FlashcardItemProps {
  fc: Flashcard
  notas: Array<{ id: number; titulo: string }> | undefined
  onSave: (id: number, data: { pergunta: string; resposta: string; nota_id: number | null; categoria: string | null }) => void
  onDelete: (id: number, pergunta: string) => void
  saving?: boolean
}

const FlashcardItem = memo(function FlashcardItem({ fc, notas, onSave, onDelete, saving }: FlashcardItemProps) {
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ pergunta: '', resposta: '', nota_id: '', categoria: '' })
  const [editNotaSearch, setEditNotaSearch] = useState('')
  function handleEdit() {
    setEditForm({
      pergunta: fc.pergunta,
      resposta: fc.resposta,
      nota_id: fc.nota_id ? String(fc.nota_id) : '',
      categoria: fc.categoria || '',
    })
    setEditing(true)
  }
  return (
    <div className="bg-bg-secondary rounded-lg border border-border px-4 py-3 flex items-start justify-between gap-4 cursor-pointer hover:scale-[1.02] transition-transform">
      {editing ? (
        <div className="flex-1 space-y-2">
          <input value={editForm.pergunta} onChange={e => setEditForm(f => ({ ...f, pergunta: e.target.value }))}
            className="w-full bg-bg-tertiary rounded px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
          <input value={editForm.resposta} onChange={e => setEditForm(f => ({ ...f, resposta: e.target.value }))}
            className="w-full bg-bg-tertiary rounded px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
          <input value={editNotaSearch} onChange={e => setEditNotaSearch(e.target.value)}
            placeholder="Buscar nota..." className="w-full bg-bg-tertiary rounded px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
          <select value={editForm.nota_id} onChange={e => setEditForm(f => ({ ...f, nota_id: e.target.value }))}
            className="w-full bg-bg-tertiary rounded px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <option value="">Sem nota associada</option>
            {(notas || []).filter(n => !editNotaSearch || n.titulo.toLowerCase().includes(editNotaSearch.toLowerCase())).map(n => <option key={n.id} value={n.id}>{n.titulo}</option>)}
          </select>
          <select value={editForm.categoria} onChange={e => setEditForm(f => ({ ...f, categoria: e.target.value }))}
            className="w-full bg-bg-tertiary rounded px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <option value="">Sem categoria</option>
            {CATEGORIAS_PREDEFINIDAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => onSave(fc.id, { pergunta: editForm.pergunta, resposta: editForm.resposta, nota_id: editForm.nota_id ? Number(editForm.nota_id) : null, categoria: editForm.categoria || null })}
            disabled={saving} className="text-xs text-success disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
          <button onClick={() => setEditing(false)} className="text-xs text-text-muted ml-2">Cancelar</button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fc.pergunta}</p>
            <p className="text-xs text-text-muted truncate mt-0.5">{fc.resposta}</p>
            <p className="text-xs text-text-muted mt-1">
              {fc.categoria && <><span className="text-accent">{fc.categoria}</span> · </>}
              {fc.ultima_revisao ? <>Última revisão: {new Date(fc.ultima_revisao).toLocaleDateString('pt-BR')} · </> : 'Nunca revisado · '}
              Próxima revisão: {new Date(fc.proxima_revisao + 'T12:00:00').toLocaleDateString('pt-BR')}
              {' · '}Facilidade: {fc.facilidade.toFixed(1)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleEdit} aria-label="Editar flashcard"
              className="p-1 text-text-muted hover:text-accent transition-colors"><Pencil size={14} /></button>
            <button onClick={() => onDelete(fc.id, fc.pergunta)} aria-label="Excluir flashcard"
              className="p-1 text-text-muted hover:text-danger transition-colors"><X size={14} /></button>
          </div>
        </>
      )}
    </div>
  )
})

export default function Flashcards() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [virado, setVirado] = useState(false)
  const [cardIndex, setCardIndex] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ pergunta: '', resposta: '', nota_id: '', categoria: '' })
  const [formCategoriaCustom, setFormCategoriaCustom] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; pergunta: string } | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [notaSearch, setNotaSearch] = useState('')
  const [catFiltro, setCatFiltro] = useState('')
  const [simuladoAtivo, setSimuladoAtivo] = useState(false)
  const [simuladoCats, setSimuladoCats] = useState<string[]>([])
  const [simuladoCards, setSimuladoCards] = useState<Flashcard[]>([])
  const [simuladoIndex, setSimuladoIndex] = useState(0)
  const [simuladoShowAnswer, setSimuladoShowAnswer] = useState(false)
  const [simuladoResults, setSimuladoResults] = useState<{ acertou: boolean }[]>([])
  const [simuladoDone, setSimuladoDone] = useState(false)
  const [savingFlashcardId, setSavingFlashcardId] = useState<number | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  const reviewRef = useRef<HTMLDivElement>(null)

  const { data: stats } = useQuery({
    queryKey: ['flashcards', 'stats'],
    queryFn: getFlashcardStats,
    staleTime: 30_000,
  })

  const { data: cards, isLoading: cardsLoad, isError: cardsErr } = useQuery({
    queryKey: ['flashcards', 'review'],
    queryFn: getReviewCards,
    staleTime: 60_000,
  })

  const { data: allCards, isLoading: allLoad, isError: allErr, refetch: refetchAll } = useQuery({
    queryKey: ['flashcards', 'all'],
    queryFn: () => getFlashcards(),
    staleTime: 120_000,
  })
  const allCardsList = allCards || []

  const categorias = useMemo(() =>
    allCardsList.reduce<string[]>((acc, fc) => {
      if (fc.categoria && !acc.includes(fc.categoria)) acc.push(fc.categoria)
      return acc
    }, [...CATEGORIAS_PREDEFINIDAS]),
    [allCardsList]
  )

  const filteredCards = useMemo(() =>
    allCardsList.filter(fc => {
      if (searchQ && !fc.pergunta.toLowerCase().includes(searchQ.toLowerCase()) && !fc.resposta.toLowerCase().includes(searchQ.toLowerCase())) return false
      if (catFiltro && fc.categoria !== catFiltro) return false
      return true
    }),
    [allCardsList, searchQ, catFiltro]
  )

  const virtualizer = useVirtualizer({
    count: filteredCards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  })

  const { data: notas, isLoading: notasLoad } = useQuery({
    queryKey: ['notas'],
    queryFn: () => getNotas(),
    staleTime: 60_000,
  })

  const reviewMut = useMutation({
    mutationFn: ({ id, qualidade }: { id: number; qualidade: number }) =>
      reviewFlashcard(id, qualidade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'stats'] })
      broadcastInvalidate([['flashcards']])
      setVirado(false)
    },
    onError: (e) => { console.error('[Flashcards]', e); notify('Erro ao registrar revisão') },
  })

  const createMut = useMutation({
    mutationFn: (data: { pergunta: string; resposta: string; nota_id?: number; categoria?: string }) =>
      createFlashcard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'stats'] })
      broadcastInvalidate([['flashcards']])
      setForm({ pergunta: '', resposta: '', nota_id: '', categoria: '' })
      setFormCategoriaCustom('')
      setShowForm(false)
    },
    onError: (e) => { console.error('[Flashcards]', e); notify('Erro ao criar flashcard') },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { pergunta?: string; resposta?: string; nota_id?: number | null; categoria?: string | null } }) =>
      updateFlashcard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      broadcastInvalidate([['flashcards']])
    },
    onError: (e) => { console.error('[Flashcards]', e); notify('Erro ao atualizar flashcard') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteFlashcard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'stats'] })
      broadcastInvalidate([['flashcards']])
    },
    onError: (e) => { console.error('[Flashcards]', e); notify('Erro ao excluir flashcard') },
  })

  const handleSave = useCallback((id: number, data: { pergunta: string; resposta: string; nota_id: number | null; categoria: string | null }) => {
    setSavingFlashcardId(id)
    updateMut.mutate({ id, data }, { onSettled: () => setSavingFlashcardId(null) })
  }, [])

  const handleDelete = useCallback((id: number, pergunta: string) => {
    setConfirmDelete({ id, pergunta })
  }, [])

  const currentCard = cards?.[cardIndex]
  const total = cards?.length || 0

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.pergunta.trim() || !form.resposta.trim()) return
    const categoria = form.categoria === '__custom__' ? formCategoriaCustom.trim() : form.categoria
    createMut.mutate({
      pergunta: form.pergunta.trim(),
      resposta: form.resposta.trim(),
      nota_id: form.nota_id ? Number(form.nota_id) : undefined,
      categoria: categoria || undefined,
    })
  }

  function handleReview(qualidade: number) {
    if (!currentCard) return
    reviewMut.mutate({ id: currentCard.id, qualidade })
    if (cardIndex < total - 1) {
      setCardIndex(i => i + 1)
    }
  }

  function handlePrevCard() {
    if (cardIndex > 0) { setCardIndex(i => i - 1); setVirado(false) }
  }

  function handleNextCard() {
    if (cardIndex < total - 1) { setCardIndex(i => i + 1); setVirado(false) }
  }

  const handleReviewRef = useRef(handleReview)
  useEffect(() => { handleReviewRef.current = handleReview })
  const handlePrevCardRef = useRef(handlePrevCard)
  useEffect(() => { handlePrevCardRef.current = handlePrevCard })
  const handleNextCardRef = useRef(handleNextCard)
  useEffect(() => { handleNextCardRef.current = handleNextCard })

  useEffect(() => {
    setCardIndex(0)
    setVirado(false)
  }, [cards])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (simuladoAtivo || !currentCard) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setVirado(v => !v)
      } else if (virado && /^[1-5]$/.test(e.key) && !reviewMut.isPending) {
        handleReviewRef.current(Number(e.key))
      } else if (e.key === 'ArrowLeft') {
        handlePrevCardRef.current()
      } else if (e.key === 'ArrowRight') {
        handleNextCardRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [simuladoAtivo, currentCard, virado, reviewMut.isPending])

  if (cardsLoad) {
    return <div className="p-6 max-w-4xl mx-auto text-text-muted text-sm animate-pulse">Carregando...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Flashcards</h1>
          <p className="text-sm text-text-muted">{total} cards para revisar hoje</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-all active:scale-95">
          {showForm ? 'Cancelar' : '+ Novo flashcard'}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-bg-secondary rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold">{stats.total_cards}</p>
            <p className="text-xs text-text-muted uppercase tracking-wide">Total</p>
          </div>
          <div className="bg-bg-secondary rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold">{stats.cards_hoje}</p>
            <p className="text-xs text-text-muted uppercase tracking-wide">Pendentes</p>
          </div>
          <div className="bg-bg-secondary rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold">{stats.cards_revisados_hoje}</p>
            <p className="text-xs text-text-muted uppercase tracking-wide">Revisados</p>
          </div>
          <div className="bg-bg-secondary rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold">{stats.taxa_acerto_7d !== null ? `${Math.round(stats.taxa_acerto_7d * 100)}%` : '—'}</p>
            <p className="text-xs text-text-muted uppercase tracking-wide">Acerto (7d)</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => { setSimuladoAtivo(false); setSimuladoCards([]); setSimuladoDone(false); setSimuladoResults([]); setSimuladoIndex(0); setSimuladoShowAnswer(false) }}
className={`px-3 py-1.5 text-sm rounded-lg transition-all active:scale-95 ${!simuladoAtivo ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}>
          Revisão
        </button>
        <button onClick={() => { setSimuladoAtivo(true); setSimuladoCards([]); setSimuladoDone(false); setSimuladoResults([]); setSimuladoIndex(0); setSimuladoShowAnswer(false) }}
className={`px-3 py-1.5 text-sm rounded-lg transition-all active:scale-95 ${simuladoAtivo ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}>
          Simulado
        </button>
      </div>

      {simuladoAtivo && simuladoCards.length === 0 && !simuladoDone && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 mb-6">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Selecionar categorias</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {categorias.map(c => (
              <button key={c} onClick={() => setSimuladoCats(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${simuladoCats.includes(c) ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-bg-tertiary border-border text-text-muted hover:text-text-primary'}`}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => {
            const pool = allCardsList.filter(fc => !simuladoCats.length || simuladoCats.includes(fc.categoria || ''))
            if (pool.length === 0) return
            const shuffled = [...pool].sort(() => Math.random() - 0.5)
            setSimuladoCards(shuffled)
            setSimuladoIndex(0)
            setSimuladoShowAnswer(false)
            setSimuladoResults([])
            setSimuladoDone(false)
          }}
            className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-all active:scale-95" title="Iniciar simulado com cards selecionados">
            Iniciar simulado ({simuladoCats.length ? allCardsList.filter(fc => simuladoCats.includes(fc.categoria || '')).length : allCardsList.length} cards)
          </button>
        </div>
      )}

      {simuladoAtivo && simuladoCards.length > 0 && !simuladoDone && (
        <div ref={reviewRef} className="mb-8" tabIndex={-1}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-text-muted">Simulado — {simuladoIndex + 1} de {simuladoCards.length}</p>
            <button onClick={() => { setSimuladoAtivo(false); setSimuladoCards([]); setSimuladoResults([]); setSimuladoDone(false); setSimuladoIndex(0); setSimuladoShowAnswer(false) }}
              className="text-xs text-danger hover:underline">Sair do simulado</button>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-1.5 mb-4">
            <div className="bg-accent h-1.5 rounded-full transition-all duration-300" style={{ width: `${((simuladoIndex + 1) / simuladoCards.length) * 100}%` }} />
          </div>
          <div
            onClick={() => !simuladoShowAnswer && setSimuladoShowAnswer(true)}
            className={`bg-bg-secondary rounded-xl border min-h-[200px] ${simuladoShowAnswer ? 'border-accent/30 cursor-default' : 'cursor-pointer hover:border-accent/50'} transition-colors`}
          >
            <div className="p-8 flex items-center justify-center text-center">
              {!simuladoShowAnswer ? (
                <div>
                  <p className="text-xs text-text-muted mb-4">{simuladoCards[simuladoIndex].categoria && <><span className="text-accent">{simuladoCards[simuladoIndex].categoria}</span> · </>}Pergunta</p>
                  <p className="text-lg whitespace-pre-wrap">{simuladoCards[simuladoIndex].pergunta}</p>
                  <p className="text-xs text-text-muted mt-4">Clique para ver a resposta</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-text-muted mb-4">Resposta</p>
                  <p className="text-lg whitespace-pre-wrap mb-6">{simuladoCards[simuladoIndex].resposta}</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => {
                      setSimuladoResults(p => [...p, { acertou: true }])
                      if (simuladoIndex < simuladoCards.length - 1) { setSimuladoIndex(i => i + 1); setSimuladoShowAnswer(false) }
                      else setSimuladoDone(true)
                    }} className="px-5 py-2 bg-success/20 text-success rounded-lg text-sm hover:bg-success/30 transition-colors">💡 Lembrei</button>
                    <button onClick={() => {
                      setSimuladoResults(p => [...p, { acertou: false }])
                      if (simuladoIndex < simuladoCards.length - 1) { setSimuladoIndex(i => i + 1); setSimuladoShowAnswer(false) }
                      else setSimuladoDone(true)
                    }} className="px-5 py-2 bg-danger/20 text-danger rounded-lg text-sm hover:bg-danger/30 transition-colors">❌ Não lembrei</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {simuladoShowAnswer && (
            <div className="flex justify-between mt-3">
              <button onClick={() => { if (simuladoIndex > 0) { setSimuladoIndex(i => i - 1); setSimuladoShowAnswer(false) } }}
                disabled={simuladoIndex === 0}
                className="text-xs text-text-muted hover:text-accent disabled:opacity-30">← Anterior</button>
              <button onClick={() => { setSimuladoResults(p => [...p, { acertou: false }]); if (simuladoIndex < simuladoCards.length - 1) { setSimuladoIndex(i => i + 1); setSimuladoShowAnswer(false) } else setSimuladoDone(true) }}
                className="text-xs text-text-muted hover:text-accent">Pular →</button>
            </div>
          )}
        </div>
      )}

      {simuladoAtivo && simuladoDone && simuladoResults.length > 0 && (
        <div className="bg-bg-secondary rounded-xl border border-border p-6 mb-6 text-center">
          <p className="text-2xl font-bold mb-1">{simuladoResults.filter(r => r.acertou).length}/{simuladoResults.length}</p>
          <p className="text-sm text-text-muted mb-4">{Math.round((simuladoResults.filter(r => r.acertou).length / simuladoResults.length) * 100)}% de acerto</p>
          <div className="w-full bg-bg-tertiary rounded-full h-3 mb-4">
            <div className="bg-success h-3 rounded-full transition-all" style={{ width: `${(simuladoResults.filter(r => r.acertou).length / simuladoResults.length) * 100}%` }} />
          </div>
          <div className="flex justify-center gap-4 text-sm mb-4">
            <span className="text-success">✅ {simuladoResults.filter(r => r.acertou).length} certas</span>
            <span className="text-danger">❌ {simuladoResults.filter(r => !r.acertou).length} erradas</span>
          </div>
          <button onClick={() => { setSimuladoCards([]); setSimuladoDone(false); setSimuladoResults([]); setSimuladoIndex(0); setSimuladoShowAnswer(false); setSimuladoCats([]) }}
            className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-all active:scale-95">
            Novo simulado
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-bg-secondary rounded-xl border border-border p-4 mb-6">
          <div className="space-y-3">
            <input value={form.pergunta} onChange={e => setForm(f => ({ ...f, pergunta: e.target.value }))}
              placeholder="Pergunta" className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
            <input value={form.resposta} onChange={e => setForm(f => ({ ...f, resposta: e.target.value }))}
              placeholder="Resposta" className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
            <input value={notaSearch} onChange={e => setNotaSearch(e.target.value)}
              placeholder="Buscar nota..." className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
            <select value={form.nota_id} onChange={e => setForm(f => ({ ...f, nota_id: e.target.value }))}
              className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">Sem nota associada</option>
              {notasLoad && <option disabled>Carregando...</option>}
              {!notasLoad && (notas || []).filter(n => !notaSearch || n.titulo.toLowerCase().includes(notaSearch.toLowerCase())).map(n => <option key={n.id} value={n.id}>{n.titulo}</option>)}
            </select>
            <div className="flex gap-2">
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="flex-1 bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none">
                <option value="">Sem categoria</option>
                {CATEGORIAS_PREDEFINIDAS.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__custom__">Personalizada...</option>
              </select>
              {form.categoria === '__custom__' && (
                <input value={formCategoriaCustom} onChange={e => setFormCategoriaCustom(e.target.value)}
                  placeholder="Nova categoria" className="flex-1 bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" />
              )}
            </div>
            <button type="submit" disabled={!form.pergunta.trim() || !form.resposta.trim() || createMut.isPending}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg transition-all active:scale-95 disabled:opacity-50">{createMut.isPending ? 'Criando...' : 'Criar flashcard'}</button>
          </div>
        </form>
      )}

      {cardsErr && <div className="bg-bg-secondary rounded-xl border border-border p-4 text-center mb-8"><p className="text-danger">Erro ao carregar flashcards</p></div>}

      {!simuladoAtivo && !cardsLoad && !cardsErr && currentCard ? (
        <div ref={reviewRef} className="mb-8" tabIndex={-1}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-text-muted">Card {cardIndex + 1} de {total}</p>
            <div className="flex gap-1">
              <button onClick={handlePrevCard} disabled={cardIndex === 0}
                className="text-xs text-text-muted hover:text-accent disabled:opacity-30 px-2 py-1" title="Anterior (←)">← Anterior</button>
              <button onClick={handleNextCard} disabled={cardIndex >= total - 1}
                className="text-xs text-text-muted hover:text-accent disabled:opacity-30 px-2 py-1" title="Próximo (→)">Próximo →</button>
            </div>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-1.5 mb-4">
            <div className="bg-accent h-1.5 rounded-full transition-all duration-300" style={{ width: `${((cardIndex + 1) / total) * 100}%` }} />
          </div>
          <div
            onClick={() => setVirado(!virado)}
            className="bg-bg-secondary rounded-xl border border-border min-h-[200px] cursor-pointer [perspective:600px] hover:border-accent/50 transition-colors" title="Clique ou Espaço para virar"
          >
            <div className={`relative w-full h-full transition-all duration-500 ${virado ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
              <div className="backface-hidden p-8 flex items-center justify-center text-center">
                <div>
                  <p className="text-xs text-text-muted mb-4">
                    {currentCard.categoria && <><span className="text-accent">{currentCard.categoria}</span> · </>}
                    Pergunta
                  </p>
                  <p className="text-lg whitespace-pre-wrap">{currentCard.pergunta}</p>
                  <p className="text-xs text-text-muted mt-4">Clique ou pressione Espaço para ver a resposta</p>
                </div>
              </div>
              <div className="backface-hidden absolute inset-0 p-8 flex items-center justify-center text-center rotate-y-180">
                <div>
                  <p className="text-xs text-text-muted mb-4">Resposta</p>
                  <p className="text-lg whitespace-pre-wrap">{currentCard.resposta}</p>
                </div>
              </div>
            </div>
          </div>
          {virado && (
            <div className="mt-6">
              <p className="text-xs text-text-muted mb-3 text-center">Como foi sua resposta? (teclas 1–5)</p>
              <div className="flex gap-2 justify-center flex-wrap">
                  {[1, 2, 3, 4, 5].map(q => (
                    <button
                      key={q}
                      onClick={() => handleReview(q)}
                      disabled={reviewMut.isPending}
                      aria-label={`Avaliar como ${labels[q].toLowerCase()}`}
                      className="px-4 py-2 bg-bg-tertiary rounded-lg text-sm hover:bg-accent/20 hover:text-accent transition-colors disabled:opacity-50"
                      title={`Avaliar como ${labels[q].toLowerCase()} (tecla ${q})`}
                    >
                      {reviewMut.isPending ? '...' : labels[q]}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : !simuladoAtivo && !cardsLoad && !cardsErr ? (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 text-center mb-8">
          <p className="text-text-muted text-lg mb-2">Nenhum card pendente</p>
          <p className="text-text-muted text-sm">Crie um novo flashcard acima ou eles aparecerão automaticamente conforme você cria notas com flashcards</p>
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Todos os flashcards</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Buscar..." className="bg-bg-tertiary rounded pl-7 pr-2 py-1 text-xs outline-none w-40" />
            </div>
            <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
              className="bg-bg-tertiary rounded px-2 py-1 text-xs outline-none">
              <option value="">Todas categorias</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {allLoad && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
        {allErr && <p className="text-sm text-danger py-4 text-center">Erro ao carregar flashcards <button onClick={() => refetchAll()} className="text-accent hover:underline ml-2">Tentar novamente</button></p>}
        {!allLoad && !allErr && filteredCards.length === 0 && (
          <p className="text-sm text-text-muted py-4 text-center">
            {searchQ || catFiltro ? 'Nenhum flashcard encontrado com esse filtro' : 'Nenhum flashcard criado'}
          </p>
        )}
        {!allLoad && !allErr && filteredCards.length > 0 && (
          <div ref={parentRef} className="min-h-[300px] max-h-[600px] overflow-y-auto">
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map(virtual => {
                const fc = filteredCards[virtual.index]
                return (
                  <div key={fc.id} style={{ height: virtual.size, transform: `translateY(${virtual.start}px)`, position: 'absolute', width: '100%', left: 0 }}>
                    <FlashcardItem
                      fc={fc}
                      notas={notas}
                      onSave={handleSave}
                      onDelete={handleDelete}
                      saving={savingFlashcardId === fc.id}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          titulo="Remover flashcard"
          mensagem={`Tem certeza que deseja remover "${confirmDelete.pergunta}"?`}
          destructive
          confirmLabel="Remover"
          disabled={deleteMut.isPending}
          onConfirm={() => { deleteMut.mutate(confirmDelete.id); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
