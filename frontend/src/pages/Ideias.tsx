import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { getNotas, createNota, updateNota, deleteNota, batchDeleteNotas, extrairBloco, getPastas, getTags, createTag, updateTag, getNotaTags, getNota } from '../api/notas'
import request from '../api/client'
import { getConexoes } from '../api/conexoes'
import { getTipos } from '../api/tipos'
import { favoritarNota } from '../api/notas'
import EditorMarkdown from '../components/EditorMarkdown'
import TemplateModal from '../components/TemplateModal'
import GrafoNotas from '../components/GrafoNotas'
import ConfirmModal from '../components/ConfirmModal'
import type { Nota, Tag } from '../types'
import { useDebounce } from '../hooks/useDebounce'
import { useFocusTrap } from '../hooks/useFocusTrap'

function RenderConteudo({ conteudo, notas, onSelect, selectedId }: { conteudo: string; notas: Nota[]; onSelect: (n: Nota) => void; selectedId?: number | null }) {
  const [tooltipContent, setTooltipContent] = useState('')
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const previewCache = useRef<Map<number, string>>(new Map())
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const parts = conteudo.split(/(\[\[[^\]]+\]\])/)

  const showTooltip = useCallback(async (target: Nota, e: React.MouseEvent) => {
    if (previewCache.current.has(target.id)) {
      setTooltipContent(previewCache.current.get(target.id)!)
    } else if (target.id !== selectedId) {
      try {
        const nota = await getNota(target.id)
        const plain = (nota.conteudo || '').replace(/[#*`~>\[\]]/g, '').slice(0, 200)
        previewCache.current.set(target.id, plain)
        setTooltipContent(plain)
      } catch { return }
    } else {
      const plain = (target.conteudo || '').replace(/[#*`~>\[\]]/g, '').slice(0, 200)
      previewCache.current.set(target.id, plain)
      setTooltipContent(plain)
    }
    setTooltipPos({ x: e.clientX, y: e.clientY })
    setTooltipVisible(true)
  }, [selectedId])

  const hideTooltip = useCallback(() => {
    clearTimeout(hoverTimeout.current)
    setTooltipVisible(false)
    setTooltipContent('')
  }, [])

  useEffect(() => () => clearTimeout(hoverTimeout.current), [])

  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[\[([^\]]+?)(?:\|([^\]]+))?\]\]$/)
        if (!m) return <span key={i}>{part}</span>
        const titulo = m[1].trim()
        const alias = m[2]?.trim() || titulo
        const target = notas.find(n => n.titulo.toLowerCase() === titulo.toLowerCase())
        if (!target) return <span key={i} className="text-danger/70">{alias}</span>
        return (
          <button key={i} onClick={() => onSelect(target)}
            onMouseEnter={(e) => { hoverTimeout.current = window.setTimeout(() => showTooltip(target, e), 300) }}
            onMouseLeave={hideTooltip}
            className="text-accent hover:underline cursor-pointer font-semibold">
            {alias}
          </button>
        )
      })}
      {tooltipVisible && (
        <div
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y + 12 }}
          className="fixed z-50 bg-bg-secondary border border-border rounded-lg shadow-lg p-3 text-sm max-w-xs text-text-primary pointer-events-none"
        >
          {tooltipContent || 'Carregando...'}
        </div>
      )}
    </>
  )
}

export default function Ideias() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [search, setSearch] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showGrafo, setShowGrafo] = useState(false)
  const [pastaFilter, setPastaFilter] = useState<number | null>(null)
  const [showSlash, setShowSlash] = useState(false)
  const [extractText, setExtractText] = useState('')
  const [showExtract, setShowExtract] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [tags, setTags] = useState<Tag[]>([])
  const [tagFilter, setTagFilter] = useState<number[]>([])
  const [sortBy, setSortBy] = useState('')
  const [showTagModal, setShowTagModal] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [newTagNome, setNewTagNome] = useState('')
  const [newTagCor, setNewTagCor] = useState('#6B7280')
  const slashRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const tagModalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(tagModalRef, showTagModal)
  const [propriedades, setPropriedades] = useState<Record<string, string>>({})
  const [novaPropKey, setNovaPropKey] = useState('')
  const [novaPropVal, setNovaPropVal] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const selectedIdRef = useRef(selectedId)
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

  // --- save state (Bugs 25/26/27) ---
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [dirty, setDirty] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tituloRef = useRef(titulo)
  const conteudoRef = useRef(conteudo)
  const propriedadesRef = useRef(propriedades)
  useEffect(() => { tituloRef.current = titulo }, [titulo])
  useEffect(() => { conteudoRef.current = conteudo }, [conteudo])
  useEffect(() => { propriedadesRef.current = propriedades }, [propriedades])
  const saveNoteRef = useRef<() => void>(() => {})
  function saveNote() {
    const id = selectedIdRef.current
    if (!id) return
    const props: Record<string, any> = {}
    for (const [k, v] of Object.entries(propriedadesRef.current)) {
      if (k.trim()) props[k.trim()] = v
    }
    setSaveStatus('saving')
    updateMut.mutate({ id, data: { titulo: tituloRef.current, conteudo: conteudoRef.current, propriedades: props } })
  }
  saveNoteRef.current = saveNote
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const [searchParams] = useSearchParams()
  const searchDebounced = useDebounce(search, 300)

  const { data: notas, isLoading: notasLoad, isError: notasErr } = useQuery({
    queryKey: ['notas', searchDebounced, tagFilter, sortBy],
    queryFn: () => getNotas(searchDebounced || undefined, undefined, tagFilter.length > 0 ? tagFilter : undefined, sortBy || undefined),
    staleTime: 60_000,
  })

  const { data: tipos } = useQuery({ queryKey: ['tipos'], queryFn: getTipos, staleTime: 300_000 })
  const { data: pastas } = useQuery({ queryKey: ['pastas'], queryFn: getPastas, staleTime: 300_000 })
  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: getTags, staleTime: 300_000 })

  useEffect(() => {
    if (tagsData) setTags(tagsData)
  }, [tagsData])

  useEffect(() => {
    const notaId = searchParams.get('nota_id')
    if (notaId && !selectedId && notas) {
      const target = notas.find(n => n.id === Number(notaId))
      if (target) selectNota(target)
    }
  }, [searchParams, notas, selectedId])

  const { data: conexoes } = useQuery({
    queryKey: ['conexoes', selectedId],
    queryFn: ({ queryKey }) => getConexoes(queryKey[1] as number),
    enabled: !!selectedId,
    staleTime: 120_000,
  })

  const { data: notaTagsData } = useQuery({
    queryKey: ['notaTags', selectedId],
    queryFn: ({ queryKey }) => getNotaTags(queryKey[1] as number),
    enabled: !!selectedId,
  })

  const notaAtual = notas?.find(n => n.id === selectedId) || null

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Nota> }) => updateNota(id, data),
    onSuccess: () => {
      setDirty(false)
      setSaveStatus('success')
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      queryClient.invalidateQueries({ queryKey: ['conexoes'] })
    },
    onError: () => {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    },
  })

  const createMut = useMutation({
    mutationFn: (data: Partial<Nota>) => createNota(data),
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      selectNota(n)
      setEditando(true)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteNota(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      queryClient.invalidateQueries({ queryKey: ['conexoes'] })
      setSelectedId(null)
    },
  })

  const batchDeleteMut = useMutation({
    mutationFn: (ids: number[]) => batchDeleteNotas(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      queryClient.invalidateQueries({ queryKey: ['conexoes'] })
      setSelectedIds(new Set())
      setSelectMode(false)
      setSelectedId(null)
    },
  })

  const favoritarMut = useMutation({
    mutationFn: (id: number) => favoritarNota(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
    },
  })

  const createTagMut = useMutation({
    mutationFn: (data: Partial<Tag>) => createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setNewTagNome('')
      setNewTagCor('#6B7280')
      setShowTagModal(false)
    },
  })

  const updateTagMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Tag> }) => updateTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      setEditingTag(null)
    },
  })

  const removeTagFromNotaMut = useMutation({
    mutationFn: ({ notaId, tagId }: { notaId: number; tagId: number }) =>
      request<{ ok: boolean }>(`/notas/${notaId}/tags/${tagId}`, { method: 'DELETE' }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notaTags', variables.notaId] })
    },
  })

  function selectNota(n: Nota) {
    if (dirty && editando && selectedId) {
      saveNote()
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSelectedId(n.id)
    setTitulo(n.titulo)
    setConteudo(n.conteudo)
    setEditando(false)
    setPropriedades(n.propriedades ? Object.fromEntries(Object.entries(n.propriedades).map(([k, v]) => [k, String(v)])) : {})
    setDirty(false)
    setSaveStatus('idle')
  }

  async function handleSave() {
    saveNote()
    setEditando(false)
  }

  async function handleCreate() {
    createMut.mutate({ titulo: 'Nova nota', conteudo: '' })
  }

  // Auto-save debounce (Bug 26)
  useEffect(() => {
    if (!editando || !selectedId || !dirty) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveNoteRef.current()
    }, 2000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [titulo, conteudo, propriedades, editando, selectedId, dirty])

  // beforeunload when dirty (Bug 27)
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  function handleConfirmDelete() {
    if (!confirmDelete) return
    deleteMut.mutate(confirmDelete)
    setConfirmDelete(null)
  }

  function handleDelete() {
    if (!selectedId) return
    setConfirmDelete(selectedId)
  }

  function handleBatchDelete() {
    setBatchDeleteConfirm(true)
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addPropriedade() {
    if (!novaPropKey.trim()) return
    setPropriedades(p => ({ ...p, [novaPropKey.trim()]: novaPropVal }))
    setDirty(true)
    setNovaPropKey('')
    setNovaPropVal('')
  }

  function removePropriedade(key: string) {
    setPropriedades(p => {
      const next = { ...p }
      delete next[key]
      return next
    })
    setDirty(true)
  }

  // --- Tag helpers ---
  function toggleTagFilter(tagId: number) {
    setTagFilter(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId])
  }

  function clearTagFilter() {
    setTagFilter([])
  }

  const PRESET_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#8B5CF6',
  ]

  const handleContentChange = useCallback((val: string) => {
    setConteudo(val)
    setDirty(true)
    const slashMatch = val.match(/\/(\w*)$/)
    if (slashMatch && editando) {
      setSlashQuery(slashMatch[1])
      setShowSlash(true)
    } else {
      setShowSlash(false)
    }
  }, [editando])

  const slashCommands = [
    { icon: '📄', label: 'Inserir template /resumo', insert: '/resumo' },
    { icon: '📅', label: 'Inserir data', insert: `**Data:** ${new Date().toLocaleDateString('pt-BR')}` },
    { icon: '🔗', label: 'Link rápido [[', insert: '[[' },
    { icon: '📝', label: 'Checklist - [ ] ', insert: '- [ ] ' },
    { icon: '💡', label: 'Dica > ', insert: '> ' },
    { icon: '🏷️', label: 'Propriedade ::', insert: '\n::' },
  ].filter(c => c.label.toLowerCase().includes(slashQuery.toLowerCase()))

  const filtered = notas || []

  const parentRef = useRef<HTMLDivElement>(null)
  const visibleItems = useMemo(
    () => filtered.filter(n => !pastaFilter || n.pasta_id === pastaFilter),
    [filtered, pastaFilter]
  )
  const virtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
  })

  const saida = notas?.filter(n =>
    conexoes?.some(c => c.nota_origem_id === selectedId && c.nota_destino_id === n.id)
  ) || []
  const entrada = notas?.filter(n =>
    conexoes?.some(c => c.nota_destino_id === selectedId && c.nota_origem_id === n.id)
  ) || []

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border p-4 shrink-0 flex flex-col h-full overflow-x-hidden">
        <div className="flex items-center gap-1 w-full mb-2 shrink-0">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar notas..."
            className="flex-1 min-w-0 bg-bg-tertiary rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent"
          />
          <button onClick={handleCreate} disabled={createMut.isPending} className="px-2 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover shrink-0 disabled:opacity-50" title="Nova nota em branco">{createMut.isPending ? '...' : '+'}</button>
          <button onClick={() => setShowTemplateModal(true)} className="px-2 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover shrink-0" title="Criar nota a partir de um modelo pré-definido (template)">📋</button>
          <button onClick={() => setShowGrafo(!showGrafo)} className={`px-2 py-1.5 text-sm rounded-lg shrink-0 ${showGrafo ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-primary hover:bg-bg-hover'}`} title="Grafo de conexões entre notas">🔗</button>
          <button onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()) }}
            className={`px-2 py-1.5 text-sm rounded-lg shrink-0 ${selectMode ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-primary hover:bg-bg-hover'}`}
            title="Selecionar múltiplas notas">☐</button>
        </div>
        <div className="flex items-center gap-1 mb-3 shrink-0">
          <button onClick={() => setSortBy(sortBy === 'acessos' ? '' : 'acessos')}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${sortBy === 'acessos' ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
            title="Ordenar por mais acessadas">🔥 Mais acessadas</button>
          <button onClick={() => setSortBy(sortBy === 'titulo' ? '' : 'titulo')}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${sortBy === 'titulo' ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
            title="Ordenar por título">A-Z</button>
          {sortBy && <button onClick={() => setSortBy('')} className="text-xs text-danger hover:underline">Limpar</button>}
        </div>
        {selectMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-2 shrink-0 bg-danger/10 rounded-lg px-3 py-2">
            <span className="text-xs text-danger font-medium">{selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}</span>
            <button onClick={handleBatchDelete} disabled={batchDeleteMut.isPending}
              className="ml-auto px-3 py-1 bg-danger text-white text-xs rounded-lg disabled:opacity-50">
              {batchDeleteMut.isPending ? 'Excluindo...' : 'Excluir'}
            </button>
            <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }}
              className="px-2 py-1 text-xs text-text-muted hover:text-text-primary">Cancelar</button>
          </div>
        )}
        {showGrafo ? (
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
            <GrafoNotas onSelectNota={(id) => {
              const n = notas?.find(x => x.id === id)
              if (n) selectNota(n)
            }} />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
            {notas && notas.filter(n => n.favoritado).length > 0 && (
              <div className="mb-3">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">⭐ Favoritos</span>
                <div className="flex flex-col gap-0.5 mt-1">
                  {notas.filter(n => n.favoritado).map(n => {
                    const tipo = tipos?.find(t => t.id === n.tipo_id)
                    return (
                      <div key={n.id} className="group relative">
                        <button onClick={() => selectMode ? toggleSelect(n.id) : selectNota(n)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${selectedId === n.id ? 'bg-accent/20 text-accent' : 'hover:bg-bg-hover text-text-primary'}`}>
                          {selectMode && (
                            <input type="checkbox" checked={selectedIds.has(n.id)} readOnly
                              className="accent-accent w-3.5 h-3.5 shrink-0" />
                          )}
                          {tipo && <span className="text-xs">{tipo.icone}</span>}
                          <span className="truncate flex-1">{n.titulo}</span>
                          <button onClick={e => { e.stopPropagation(); favoritarMut.mutate(n.id) }}
                            className="text-xs text-yellow-500 hover:scale-110 transition-transform">★</button>
                        </button>
                        {!selectMode && (
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(n.id) }}
                          className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 text-danger hover:text-danger/80 text-xs p-0.5 rounded transition-opacity"
                          title="Excluir nota">✕</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {pastas && pastas.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                <button onClick={() => setPastaFilter(null)}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${pastaFilter === null ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}>
                  Todas
                </button>
                {pastas.map(p => (
                  <button key={p.id} onClick={() => setPastaFilter(p.id)}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${pastaFilter === p.id ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}>
                    📁 {p.nome}
                  </button>
                ))}
              </div>
            )}

            {tags.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Tags</span>
                  <button onClick={() => { setShowTagModal(true); setEditingTag(null); setNewTagNome(''); setNewTagCor('#6B7280') }}
                    className="text-xs text-accent hover:underline">+ Nova</button>
                </div>
                {tagFilter.length > 0 && (
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-text-muted">Filtro: {tagFilter.length} tag{tagFilter.length > 1 ? 's' : ''}</span>
                    <button onClick={clearTagFilter} className="text-xs text-danger hover:underline">Limpar</button>
                  </div>
                )}
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto w-full">
                  {tags.map(tag => {
                    const isActive = tagFilter.includes(tag.id)
                    const cor = tag.cor || '#6B7280'
                    return (
                      <button key={tag.id} onClick={() => toggleTagFilter(tag.id)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all max-w-full overflow-hidden text-ellipsis whitespace-nowrap inline-flex ${isActive ? 'ring-2 ring-accent' : ''}`}
                          style={{ backgroundColor: `${cor}33`, color: cor, border: `1px solid ${cor}66` }}>
                        {tag.nome}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {notasLoad && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
            {notasErr && <p className="text-sm text-danger py-4 text-center">Erro ao carregar notas</p>}
            {!notasLoad && !notasErr && visibleItems.length === 0 && (
              <p className="text-sm text-text-muted py-4 text-center">
                {searchDebounced ? 'Nenhuma nota encontrada' : 'Nenhuma nota criada ainda'}
              </p>
            )}
            {!notasLoad && !notasErr && visibleItems.length > 0 && (
              <div ref={parentRef} className="flex-1 min-h-0 overflow-y-auto">
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map(virtual => {
                    const n = visibleItems[virtual.index]
                    const tipo = tipos?.find(t => t.id === n.tipo_id)
                    return (
                      <div key={n.id}
                        style={{ height: virtual.size, transform: `translateY(${virtual.start}px)`, position: 'absolute', width: '100%', left: 0 }}
                        className="group relative">
                        <button onClick={() => selectMode ? toggleSelect(n.id) : selectNota(n)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedId === n.id ? 'bg-accent/20 text-accent' : 'hover:bg-bg-hover text-text-primary'}`}>
                          <div className="flex items-center gap-1 w-full">
                            {selectMode && (
                              <input type="checkbox" checked={selectedIds.has(n.id)} readOnly
                                className="accent-accent w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className={`text-xs ${n.favoritado ? 'text-yellow-500' : 'text-text-muted'}`}>{n.favoritado ? '★' : '☆'}</span>
                            {tipo && <span className="text-xs">{tipo.icone}</span>}
                            <span className="font-medium truncate">{n.titulo}</span>
                          </div>
                          <div className="text-xs text-text-muted truncate mt-0.5">{new Date(n.atualizado_em).toLocaleDateString('pt-BR')}</div>
                        </button>
                        {!selectMode && (
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(n.id) }}
                          className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 text-danger hover:text-danger/80 text-xs p-1 rounded transition-opacity"
                          title="Excluir nota">✕</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {notaAtual ? (
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-text-muted">
              {editando ? (
                <>
                  <label className="text-text-muted">Tipo:</label>
                  <select value={String(notaAtual.tipo_id || '')} onChange={e => {
                    const id = selectedIdRef.current
                    if (!id) return
                    const v = e.target.value
                    updateMut.mutate({ id, data: { tipo_id: v ? Number(v) : null } })
                  }}
                    className="bg-bg-tertiary rounded px-2 py-0.5 text-xs outline-none">
                    <option value="">Sem tipo</option>
                    {(tipos || []).map(t => <option key={t.id} value={t.id}>{t.icone} {t.nome}</option>)}
                  </select>
                  <label className="text-text-muted">Pasta:</label>
                  <select value={String(notaAtual.pasta_id || '')} onChange={e => {
                    const id = selectedIdRef.current
                    if (!id) return
                    const v = e.target.value
                    updateMut.mutate({ id, data: { pasta_id: v ? Number(v) : null } })
                  }}
                    className="bg-bg-tertiary rounded px-2 py-0.5 text-xs outline-none">
                    <option value="">Sem pasta</option>
                    {(pastas || []).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </>
              ) : (
                <>
                  {notaAtual.tipo_id && tipos?.find(t => t.id === notaAtual.tipo_id) && (
                    <span>{tipos.find(t => t.id === notaAtual.tipo_id)!.icone} {tipos.find(t => t.id === notaAtual.tipo_id)!.nome}</span>
                  )}
                  {notaAtual.pasta_id && pastas?.find(p => p.id === notaAtual.pasta_id) && (
                    <span>📁 {pastas.find(p => p.id === notaAtual.pasta_id)!.nome}</span>
                  )}
                </>
              )}
              <span>Criado: {new Date(notaAtual.criado_em).toLocaleDateString('pt-BR')}</span>
              <span>Modificado: {new Date(notaAtual.atualizado_em).toLocaleDateString('pt-BR')}</span>
              {(notaTagsData && notaTagsData.length > 0) && (
                <span className="flex gap-1">
                  {notaTagsData.map(tag => {
                    const bg = tag.cor || '#6B7280'
                    return (
                      <span key={tag.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${bg}33`, color: bg, border: `1px solid ${bg}66` }}>
                        {tag.nome}
                        {editando && (
                          <button onClick={() => removeTagFromNotaMut.mutate({ notaId: selectedId!, tagId: tag.id })}
                            className="ml-0.5 hover:opacity-70">✕</button>
                        )}
                      </span>
                    )
                  })}
                  {editando && (
                    <button onClick={() => { setShowTagModal(true); setEditingTag(null); setNewTagNome(''); setNewTagCor('#6B7280') }}
                      className="px-1.5 py-0.5 text-xs text-accent hover:underline rounded-full border border-dashed border-accent/50">+ Tag</button>
                  )}
                </span>
              )}
              {editando && (!notaTagsData || notaTagsData.length === 0) && (
                <button onClick={() => { setShowTagModal(true); setEditingTag(null); setNewTagNome(''); setNewTagCor('#6B7280') }}
                  className="px-1.5 py-0.5 text-xs text-accent hover:underline rounded-full border border-dashed border-accent/50">+ Tag</button>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 flex items-center gap-3">
                {editando ? (
                  <input value={titulo} onChange={e => { setTitulo(e.target.value); setDirty(true) }}
                    className="flex-1 text-xl font-bold bg-transparent outline-none border-b border-accent pb-1" />
                ) : (
                  <h1 className="text-xl font-bold">{notaAtual.titulo}</h1>
                )}
              </div>
              <div className="flex gap-1 items-center shrink-0">
                {editando ? (
                  <>
                    <button onClick={() => setShowExtract(true)} className="px-3 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover" title="Extrair trecho como nova nota">✂ Extrair</button>
                    <div className="flex items-center gap-2">
                      {saveStatus === 'saving' && <span className="text-xs text-text-muted animate-pulse">Salvando...</span>}
                      {saveStatus === 'success' && <span className="text-xs text-success animate-fade-in">Salvo!</span>}
                      {saveStatus === 'error' && <span className="text-xs text-danger animate-fade-in">Erro</span>}
                      <button onClick={handleSave} disabled={saveStatus === 'saving'}
                        className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg disabled:opacity-50">
                        {saveStatus === 'saving' ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => setEditando(true)} className="px-4 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover">Editar</button>
                )}
                <div className="flex gap-1 ml-1 items-center">
                  <button onClick={() => {
                    if (!selectedId) return
                    window.open(`/api/notas/${selectedId}/export/md`)
                  }}
                    className="px-2 py-1.5 bg-bg-tertiary text-text-muted text-xs rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors" title="Exportar como Markdown">
                    ↓.md
                  </button>
                  <button onClick={() => { if (selectedId) favoritarMut.mutate(selectedId) }}
                    className={`px-2 py-1.5 text-xs rounded-lg transition-colors ${notaAtual.favoritado ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20' : 'text-text-muted bg-bg-tertiary hover:bg-bg-hover hover:text-text-primary'}`}
                    title={notaAtual.favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
                    {notaAtual.favoritado ? '★' : '☆'}
                  </button>
                </div>
                <button onClick={handleDelete} disabled={deleteMut.isPending}
                  className="ml-2 px-4 py-1.5 bg-danger hover:bg-danger/80 text-white text-sm rounded-lg disabled:opacity-50">
                  {deleteMut.isPending ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-1 min-w-0">
                {editando ? (
                  <div ref={editorRef} className="relative">
                    <EditorMarkdown value={conteudo} onChange={handleContentChange} notas={notas || []} />
                    {showSlash && editando && slashCommands.length > 0 && (
                      <div ref={slashRef}
                        className="absolute left-0 bottom-full mb-1 bg-bg-secondary border border-border rounded-xl shadow-2xl py-1 min-w-[200px] z-50">
                        {slashCommands.map(cmd => (
                          <button key={cmd.label} onClick={() => {
                            const id = selectedIdRef.current
                            if (!id) return
                            const newContent = conteudo.replace(/\/(\w*)$/, cmd.insert)
                            setConteudo(newContent)
                            updateMut.mutate({ id, data: { conteudo: newContent } })
                            setShowSlash(false)
                          }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-bg-hover transition-colors flex items-center gap-2">
                            <span>{cmd.icon}</span> {cmd.label}
                            <span className="text-xs text-text-muted ml-auto">{cmd.insert}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                    {notaAtual.conteudo ? <RenderConteudo conteudo={notaAtual.conteudo} notas={notas || []} onSelect={selectNota} selectedId={selectedId} /> : 'Nenhum conteúdo'}
                  </div>
                )}
              </div>

              {showExtract && editando && (
                <div className="mb-4 p-3 bg-bg-tertiary rounded-lg">
                  <p className="text-xs text-text-muted mb-2">Extrair trecho como nova nota:</p>
                  <textarea value={extractText} onChange={e => setExtractText(e.target.value)}
                    className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none mb-2 min-h-[60px]" placeholder="Cole o trecho aqui..." />
                  <div className="flex gap-2">
                    <button onClick={() => {
                      if (!extractText.trim() || !selectedId) return
                      extrairBloco(selectedId, extractText.trim(), notaAtual?.tipo_id).then((nova) => {
                        queryClient.invalidateQueries({ queryKey: ['notas'] })
                        selectNota(nova)
                        setShowExtract(false)
                        setExtractText('')
                      }).catch(e => console.error('[Ideias] extrair', e))
                    }} disabled={!extractText.trim()}
                      className="px-3 py-1 bg-accent text-white text-xs rounded-lg disabled:opacity-50">Extrair</button>
                    <button onClick={() => { setShowExtract(false); setExtractText('') }}
                      className="px-3 py-1 bg-bg-secondary text-text-primary text-xs rounded-lg">Cancelar</button>
                  </div>
                </div>
              )}

              {(Object.keys(propriedades).length > 0 || editando) && (
                <div className="w-56 shrink-0">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Propriedades</h3>
                  <div className="space-y-2">
                    {Object.entries(propriedades).map(([k, v]) => (
                      <div key={k} className="bg-bg-tertiary rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-muted font-medium">{k}</span>
                          {editando && (
                            <button onClick={() => removePropriedade(k)} className="text-xs text-danger">✕</button>
                          )}
                        </div>
                        {editando ? (
                          <input value={v} onChange={e => { setPropriedades(p => ({ ...p, [k]: e.target.value })); setDirty(true) }}
                            className="w-full bg-transparent text-sm outline-none mt-0.5" />
                        ) : (
                          <p className="text-sm mt-0.5">{v}</p>
                        )}
                      </div>
                    ))}
                    {editando && (
                      <div className="flex flex-col gap-1 mt-2">
                        <input value={novaPropKey} onChange={e => setNovaPropKey(e.target.value)}
                          placeholder="Chave" className="bg-bg-primary rounded px-2 py-1 text-xs outline-none" />
                        <input value={novaPropVal} onChange={e => setNovaPropVal(e.target.value)}
                          placeholder="Valor" className="bg-bg-primary rounded px-2 py-1 text-xs outline-none" />
                        <button onClick={addPropriedade} className="text-xs text-accent hover:underline self-start">+ Adicionar</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {(entrada.length > 0 || saida.length > 0) && (
              <div className="mt-8 pt-4 border-t border-border">
                {saida.length > 0 && (
                  <div className="mb-3">
                    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">Aponta para</h2>
                    <div className="flex flex-wrap gap-2">
                      {saida.map(n => (
                        <button key={n.id} onClick={() => selectNota(n)}
                          className="px-3 py-1.5 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors text-sm text-accent">
                          → {n.titulo}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {entrada.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">Apontam para esta</h2>
                    <div className="flex flex-wrap gap-2">
                      {entrada.map(n => (
                        <button key={n.id} onClick={() => selectNota(n)}
                          className="px-3 py-1.5 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors text-sm text-accent">
                          ← {n.titulo}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            Selecione ou crie uma nota
          </div>
        )}
      </div>

      {showTemplateModal && (
        <TemplateModal
          onClose={() => setShowTemplateModal(false)}
          onSelect={(id) => {
            setSelectedId(id)
            const n = notas?.find(x => x.id === id)
            if (n) selectNota(n)
          }}
        />
      )}

      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTagModal(false)}>
          <div ref={tagModalRef} className="bg-bg-secondary rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editingTag ? 'Editar Tag' : 'Nova Tag'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">Nome</label>
                <input value={newTagNome} onChange={e => setNewTagNome(e.target.value)}
                  className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" placeholder="Nome da tag" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Cor</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={newTagCor} onChange={e => setNewTagCor(e.target.value)}
                    className="w-10 h-10 rounded border-0 cursor-pointer" />
                  <span className="text-sm text-text-muted">ou escolha:</span>
                </div>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setNewTagCor(c)}
                      className={`w-8 h-8 rounded transition-transform ${newTagCor === c ? 'ring-2 ring-accent scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => { setShowTagModal(false); setEditingTag(null); setNewTagNome(''); setNewTagCor('#6B7280') }}
                className="px-4 py-2 text-sm rounded-lg bg-bg-tertiary text-text-primary hover:bg-bg-hover">Cancelar</button>
              <button onClick={() => {
                if (!newTagNome.trim()) return
                if (editingTag) {
                  updateTagMut.mutate({ id: editingTag.id, data: { nome: newTagNome, cor: newTagCor } })
                } else {
                  createTagMut.mutate({ nome: newTagNome, cor: newTagCor })
                }
              }} className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover">
                {editingTag ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDelete !== null && (
        <ConfirmModal
          titulo="Excluir nota"
          mensagem="Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita."
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
          destructive
        />
      )}
      {batchDeleteConfirm && (
        <ConfirmModal
          titulo={`Excluir ${selectedIds.size} nota${selectedIds.size > 1 ? 's' : ''}`}
          mensagem={`Tem certeza que deseja excluir ${selectedIds.size} nota${selectedIds.size > 1 ? 's' : ''}? Esta ação não pode ser desfeita.`}
          onConfirm={() => { batchDeleteMut.mutate([...selectedIds]); setBatchDeleteConfirm(false) }}
          onCancel={() => setBatchDeleteConfirm(false)}
          destructive
          disabled={batchDeleteMut.isPending}
        />
      )}
    </div>
  )
}
