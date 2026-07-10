import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { broadcastInvalidate } from '../hooks/useBroadcastInvalidate'
import { useSearchParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { getNotas, createNota, updateNota, deleteNota, batchDeleteNotas, getPastas, createPasta, deletePasta, getTags, createTag, updateTag, getNotaTags, createFromWikilink } from '../api/notas'
import request, { API_BASE } from '../api/client'
import { getConexoes } from '../api/conexoes'
import { getTipos } from '../api/tipos'
import { favoritarNota } from '../api/notas'
import TemplateModal from '../components/TemplateModal'
import NotaTemplatePicker from '../components/NotaTemplatePicker'
import GrafoNotas from '../components/GrafoNotas'
import ConfirmModal from '../components/ConfirmModal'
import IdeasToolbar from '../components/IdeasToolbar'
import IdeiasEditor from '../components/IdeiasEditor'
import TabBar from '../components/TabBar'
import SavedFiltersSection from '../components/SavedFiltersSection'
import { wordCount, readTime } from '../utils/wordCount'
import type { Nota, Tag, Pasta } from '../types'
import { useDebounce } from '../hooks/useDebounce'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useTabState } from '../hooks/useTabState'
import { useNotify } from '../store/notification'
import { Plus, Star, Folder, X, ChevronDown, ChevronUp } from 'lucide-react'
export default function Ideias() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const tabState = useTabState()
  const selectedId = tabState.activeId
  const [viewMode, setViewMode] = useState(false)
  const [search, setSearch] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showLocalPicker, setShowLocalPicker] = useState(false)
  const [showGrafo, setShowGrafo] = useState(false)
  const [showFavoritas, setShowFavoritas] = useState(false)
  const [pastaFilter, setPastaFilter] = useState<number | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [tagFilter, setTagFilter] = useState<number[]>([])
  const [sortBy, setSortBy] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ideias_filtros') || '{}').sortBy || '' } catch { return '' }
  })
  const [filterData, setFilterData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ideias_filtros') || '{}').filterData || '' } catch { return '' }
  })
  const [showTagModal, setShowTagModal] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [pastasExpanded, setPastasExpanded] = useState(false)
  const [confirmDeletePasta, setConfirmDeletePasta] = useState<number | null>(null)
  const [newTagNome, setNewTagNome] = useState('')
  const [newTagCor, setNewTagCor] = useState('#6B7280')
  const tagModalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(tagModalRef, showTagModal)
  useEffect(() => {
    if (!showTagModal) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowTagModal(false)
        setEditingTag(null)
        setNewTagNome('')
        setNewTagCor('#6B7280')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showTagModal])
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set())
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingSubIn, setCreatingSubIn] = useState<number | null>(null)
  const [subFolderName, setSubFolderName] = useState('')
  const [showSavedFilters, setShowSavedFilters] = useState(false)
  const saveBeforeSwitchRef = useRef<(() => void) | null>(null)
  const [searchParams] = useSearchParams()
  useEffect(() => {
    try { localStorage.setItem('ideias_filtros', JSON.stringify({ filterData, sortBy })) } catch {}
  }, [filterData, sortBy])
  const searchDebounced = useDebounce(search, 300)
  const { data: notas, isLoading: notasLoad, isError: notasErr } = useQuery({
    queryKey: ['notas', searchDebounced, tagFilter, sortBy, filterData],
    queryFn: () => getNotas(searchDebounced || undefined, filterData || undefined, tagFilter.length > 0 ? tagFilter : undefined, sortBy || undefined),
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
    if (notaId && !tabState.activeId && notas) {
      const target = notas.find(n => n.id === Number(notaId))
      if (target) selectNota(target)
    }
  }, [searchParams, notas, tabState.activeId])
  const { data: conexoes } = useQuery({
    queryKey: ['conexoes', tabState.activeId],
    queryFn: ({ queryKey }) => getConexoes(queryKey[1] as number),
    enabled: !!tabState.activeId,
    staleTime: 120_000,
  })
  const { data: notaTagsData } = useQuery({
    queryKey: ['notaTags', tabState.activeId],
    queryFn: ({ queryKey }) => getNotaTags(queryKey[1] as number),
    enabled: !!tabState.activeId,
  })
  const notaAtual = notas?.find(n => n.id === selectedId) || null
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Nota> }) => updateNota(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      queryClient.invalidateQueries({ queryKey: ['conexoes'] })
      broadcastInvalidate([['notas'], ['conexoes']])
    },
    onError: (e) => {
      console.error('[Ideias]', e)
      notify('Erro ao salvar nota')
    },
  })
  const createMut = useMutation({
    mutationFn: (data: Partial<Nota>) => createNota(data),
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      broadcastInvalidate([['notas']])
      selectNota(n)
    },
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteNota(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      queryClient.invalidateQueries({ queryKey: ['conexoes'] })
      broadcastInvalidate([['notas'], ['conexoes']])
      tabState.closeTab(id)
    },
  })
  useEffect(() => {
    if (deleteMut.isSuccess) setConfirmDelete(null)
  }, [deleteMut.isSuccess])
  const batchDeleteMut = useMutation({
    mutationFn: (ids: number[]) => batchDeleteNotas(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      queryClient.invalidateQueries({ queryKey: ['conexoes'] })
      broadcastInvalidate([['notas'], ['conexoes']])
      setSelectedIds(new Set())
      setSelectMode(false)
    },
  })
  const deletePastaMut = useMutation({
    mutationFn: (id: number) => deletePasta(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastas'] })
      broadcastInvalidate([['pastas']])
      setConfirmDeletePasta(null)
    },
  })
  const favoritarMut = useMutation({
    mutationFn: (id: number) => favoritarNota(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      broadcastInvalidate([['notas']])
    },
  })
  const createTagMut = useMutation({
    mutationFn: (data: Partial<Tag>) => createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      broadcastInvalidate([['tags']])
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
      broadcastInvalidate([['tags'], ['notas']])
      setEditingTag(null)
    },
  })
  const createPastaMut = useMutation({
    mutationFn: (data: Partial<Pasta>) => createPasta(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastas'] })
      broadcastInvalidate([['pastas']])
    },
  })
  const removeTagFromNotaMut = useMutation({
    mutationFn: ({ notaId, tagId }: { notaId: number; tagId: number }) =>
      request<{ ok: boolean }>(`/notas/${notaId}/tags/${tagId}`, { method: 'DELETE' }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notaTags', variables.notaId] })
      queryClient.invalidateQueries({ queryKey: ['notas'] })
    },
  })
  function selectNota(n: Nota) {
    try { sessionStorage.setItem('mf_ideias_scroll', String(parentRef.current?.scrollTop ?? 0)) } catch {}
    saveBeforeSwitchRef.current?.()
    tabState.openTab(n.id)
    setViewMode(false)
  }
  async function handleCreate() {
    createMut.mutate({ titulo: '(sem título)', conteudo: '', pasta_id: pastaFilter ?? null })
  }
  function handleTemplateSelect(titulo: string, conteudo: string) {
    createMut.mutate({ titulo, conteudo, pasta_id: pastaFilter ?? null })
  }
  const handleDailyNote = useCallback(async () => {
    const { hojeLocal } = await import('../utils/date')
    const titulo = hojeLocal()
    const { getTemplates } = await import('../api/templates')
    const templates = await getTemplates()
    const diario = templates.find((t: { nome: string }) => t.nome.toLowerCase() === 'diário' || t.nome.toLowerCase() === 'diario')
    if (diario) {
      const res = await fetch(API_BASE + `/notas/templates/${diario.id}/aplicar`, { method: 'POST' })
      if (res.ok) {
        const nota = await res.json()
        queryClient.invalidateQueries({ queryKey: ['notas'] })
        broadcastInvalidate([['notas']])
        selectNota(nota)
        return
      }
    }
    createMut.mutate({ titulo, conteudo: '', pasta_id: pastaFilter ?? null })
  }, [queryClient, pastaFilter, createMut])
  const handleExport = useCallback(() => {
    if (selectedId) window.open(API_BASE + `/notas/${selectedId}/export/md`, '_blank')
  }, [selectedId])
  const handleImport = useCallback(async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(API_BASE + '/import', { method: 'POST', body: form })
      if (!res.ok) throw new Error(res.statusText)
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      notify('Importado com sucesso')
    } catch (e) {
      console.error('[import]', e)
      notify('Erro ao importar')
    }
  }, [queryClient, notify])
  const handleSavedFilters = useCallback(() => {
    setShowSavedFilters(true)
  }, [])
  const handleRevealInExplorer = useCallback(async () => {
    if (!selectedId) return
    try {
      const res = await request<{ tempFilePath: string; instructions: string }>(`/notas/${selectedId}/explore`)
      alert(`Nota exportada para:\n${res.tempFilePath}\n\nInstruções:\n${res.instructions}`)
    } catch (e) {
      console.error('[explore]', e)
      notify('Erro ao exportar nota para explorador')
    }
  }, [selectedId, notify])
  const handleCreateWikilink = useCallback(async (titulo: string) => {
    try {
      const nota = await createFromWikilink(titulo)
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      broadcastInvalidate([['notas']])
      selectNota(nota)
      notify(`Nota "${titulo}" criada`)
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 409) notify('Nota com este título já existe')
      else notify('Erro ao criar nota a partir de link')
    }
  }, [queryClient, selectNota, notify])
  const handleToggleView = useCallback(() => {
    setViewMode(v => !v)
  }, [])
  function handleCloseTab(id: number) {
    tabState.closeTab(id)
  }
  function handleConfirmDelete() {
    if (!confirmDelete) return
    deleteMut.mutate(confirmDelete)
    setConfirmDelete(null)
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
  const filtered = notas || []
  const parentRef = useRef<HTMLDivElement>(null)
  const visibleItems = useMemo(
    () => filtered.filter(n => (!pastaFilter || n.pasta_id === pastaFilter) && (!showFavoritas || n.favoritado)),
    [filtered, pastaFilter, showFavoritas]
  )
  const virtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
  })
  const scrollRestoredRef = useRef(false)
  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const handler = () => { try { sessionStorage.setItem('mf_ideias_scroll', String(el.scrollTop)) } catch {} }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [notas])
  useEffect(() => {
    if (selectedId !== null || !notas || notasLoad || scrollRestoredRef.current) return
    scrollRestoredRef.current = true
    const saved = (() => { try { return Number(sessionStorage.getItem('mf_ideias_scroll')) } catch { return 0 } })()
    if (saved > 0) requestAnimationFrame(() => parentRef.current?.scrollTo(0, saved))
  }, [selectedId, notas, notasLoad])
  useEffect(() => {
    try { sessionStorage.removeItem('mf_ideias_scroll') } catch {}
    scrollRestoredRef.current = false
  }, [searchDebounced, tagFilter, sortBy, filterData])
  const saida = useMemo(() =>
    notas?.filter(n =>
      conexoes?.some(c => c.nota_origem_id === selectedId && c.nota_destino_id === n.id)
    ) || [],
    [notas, conexoes, selectedId]
  )
  const entrada = useMemo(() =>
    notas?.filter(n =>
      conexoes?.some(c => c.nota_destino_id === selectedId && c.nota_origem_id === n.id)
    ) || [],
    [notas, conexoes, selectedId]
  )
  const flatTree = useMemo(() => {
    const result: { pasta: Pasta; depth: number }[] = []
    function walk(parentId: number | null, depth: number) {
      const children = pastas?.filter(p => p.pai_id === parentId).sort((a, b) => a.nome.localeCompare(b.nome)) || []
      for (const p of children) {
        result.push({ pasta: p, depth })
        if (expandedFolders.has(p.id)) walk(p.id, depth + 1)
      }
    }
    walk(null, 0)
    return result
  }, [pastas, expandedFolders])
  function toggleExpanded(id: number) {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border p-4 shrink-0 flex flex-col h-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <h1 className="text-2xl font-bold text-text-primary">Notas</h1>
        </div>
        <div className="flex items-center gap-1 w-full mb-1 shrink-0">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="flex-1 min-w-0 bg-bg-tertiary rounded-lg px-3 py-1.5 text-sm outline-none border border-border/50 focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
        <div className="flex items-center gap-1 w-full mb-3 shrink-0">
          <input type="date" value={filterData} onChange={e => setFilterData(e.target.value)}
            className="flex-1 min-w-0 bg-bg-tertiary rounded-lg px-3 py-1.5 text-sm outline-none border border-border/50 focus-visible:ring-2 focus-visible:ring-accent [color-scheme:var(--color-scheme)]" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="bg-bg-tertiary rounded-lg px-2 py-1.5 text-sm outline-none border border-border/50 focus-visible:ring-2 focus-visible:ring-accent text-text-primary">
            <option value="">Data recente</option>
            <option value="acessos">Mais acessados</option>
            <option value="titulo">Título A-Z</option>
          </select>
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
            {notas && (
              <div className="text-xs text-text-muted mb-2 tabular-nums">{notas.length} nota{notas.length !== 1 ? 's' : ''}{filterData && ` · ${new Date(filterData + 'T12:00:00').toLocaleDateString('pt-BR')}`}</div>
            )}
            {pastas && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <button onClick={() => setPastasExpanded(!pastasExpanded)} className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors">
                    {pastasExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    <Folder size={12} /> Pastas
                    {!pastasExpanded && <span className="font-normal">{pastas.length}</span>}
                  </button>
                  <button onClick={() => { setCreatingFolder(true) }} className="text-xs text-text-muted hover:text-accent ml-auto"><Plus size={12} className="inline mr-0.5" />Nova</button>
                </div>
                {pastasExpanded && (<>
                {creatingFolder && (
                  <div className="flex items-center gap-1 mb-1 pl-2">
                    <Folder size={14} className="text-text-muted shrink-0" />
                    <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          createPastaMut.mutate({ nome: newFolderName.trim(), pai_id: null })
                          setNewFolderName(''); setCreatingFolder(false)
                        }
                        if (e.key === 'Escape') { setNewFolderName(''); setCreatingFolder(false) }
                      }}
                      placeholder="Nome da pasta (ex: Projetos)"
                      className="flex-1 bg-bg-tertiary rounded px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                  </div>
                )}
                <div className="space-y-0.5">
                  {flatTree.length === 0 ? (
                    <p className="text-xs text-text-muted italic px-2">Nenhuma pasta</p>
                  ) : flatTree.map(({ pasta: p, depth }) => {
                    const hasChildren = pastas?.some(c => c.pai_id === p.id)
                    const count = notas?.filter(n => n.pasta_id === p.id).length || 0
                    return (
                      <div key={p.id}>
                        <div className="group relative flex items-center" style={{ paddingLeft: `${depth * 16}px` }}>
                          <button onClick={() => hasChildren && toggleExpanded(p.id)} className="w-4 shrink-0 text-[10px] text-text-muted">
                            {hasChildren ? (expandedFolders.has(p.id) ? '▼' : '▶') : ''}
                          </button>
                          <button onClick={() => setPastaFilter(pastaFilter === p.id ? null : p.id)}
                            className={`flex-1 text-left px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 min-w-0 ${pastaFilter === p.id ? 'bg-accent/20 text-accent' : 'hover:bg-bg-hover text-text-muted hover:text-text-primary'}`}>
                            <Folder size={14} className="shrink-0 text-text-muted" />
                            <span className="truncate flex-1">{p.nome}</span>
                            {count > 0 && <span className="text-[10px] text-text-muted tabular-nums shrink-0">{count}</span>}
                          </button>
                          <button onClick={() => { setCreatingSubIn(p.id); setSubFolderName('') }}
                            className="opacity-0 group-hover:opacity-100 text-xs text-text-muted hover:text-accent shrink-0 px-1 transition-opacity"
                            title="Nova subpasta"><Plus size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDeletePasta(p.id) }}
                            className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 text-danger hover:text-danger/80 text-xs p-0.5 rounded transition-opacity"
                            title="Excluir pasta"><X size={12} /></button>
                        </div>
                        {creatingSubIn === p.id && (
                          <div className="flex items-center gap-1 mt-0.5 mb-0.5" style={{ paddingLeft: `${(depth + 1) * 16 + 16}px` }}>
                            <Folder size={14} className="text-text-muted shrink-0" />
                            <input autoFocus value={subFolderName} onChange={e => setSubFolderName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && subFolderName.trim()) {
                                  createPastaMut.mutate({ nome: subFolderName.trim(), pai_id: p.id })
                                  setSubFolderName(''); setCreatingSubIn(null)
                                  if (!expandedFolders.has(p.id)) toggleExpanded(p.id)
                                }
                                if (e.key === 'Escape') { setSubFolderName(''); setCreatingSubIn(null) }
                              }}
                              placeholder="Nome da subpasta..."
                              className="flex-1 bg-bg-tertiary rounded px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>)}
              </div>
            )}
            {notasLoad && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
            {notasErr && <p className="text-sm text-danger py-4 text-center">Erro ao carregar notas</p>}
            {!notasLoad && !notasErr && visibleItems.length === 0 && (
              <p className="text-sm text-text-muted py-4 text-center">
                {searchDebounced ? 'Nenhuma nota encontrada. Tente outro termo.' : 'Nenhuma nota criada ainda. Clique em + para criar a primeira.'}
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
                          <div className="flex items-center gap-1 w-full min-w-0">
                            {selectMode && (
                              <input type="checkbox" checked={selectedIds.has(n.id)} readOnly
                                className="accent-accent w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className={`shrink-0 flex items-center ${n.favoritado ? 'text-yellow-500' : 'text-text-muted'}`}>
                              <Star size={12} fill={n.favoritado ? 'currentColor' : 'none'} />
                            </span>
                            {tipo && <span className="text-xs shrink-0">{tipo.icone}</span>}
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-medium truncate">{n.titulo || <span className="text-text-muted italic">(sem título)</span>}</span>
                              <span className="text-xs text-text-muted/60 tabular-nums">Criado {new Date(n.criado_em).toLocaleDateString('pt-BR')} · {wordCount(n.conteudo)} palavras · {readTime(n.conteudo)} min</span>
                            </div>
                          </div>
                        </button>
                        {!selectMode && (
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(n.id) }}
                          className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 text-danger hover:text-danger/80 p-0.5 rounded transition-opacity"
                          title="Excluir nota"><X size={12} /></button>
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
      <div className="flex-1 h-full flex flex-col min-h-0">
        <IdeasToolbar
          onNewNota={handleCreate}
          onSearch={() => document.querySelector<HTMLInputElement>('input[placeholder="Buscar..."]')?.focus()}
          onLocalTemplate={() => setShowLocalPicker(true)}
          onServerTemplate={() => setShowTemplateModal(true)}
          onGraph={() => setShowGrafo(!showGrafo)}
          selectedCount={selectMode ? selectedIds.size : 0}
          onArchiveSelected={() => {}}
          onDeleteSelected={handleBatchDelete}
          onSelectMode={setSelectMode}
          showFavoritas={showFavoritas}
          onToggleFavoritas={() => setShowFavoritas(prev => !prev)}
          tags={tags}
          tagFilter={tagFilter}
          onToggleTag={toggleTagFilter}
          onClearTags={clearTagFilter}
          pastaFilter={pastaFilter}
          pastas={pastas ?? []}
          onSelectPasta={(id) => setPastaFilter(pastaFilter === id ? null : id)}
          isOnline={navigator.onLine}
          onExport={handleExport}
          onImport={handleImport}
          onSort={(field) => setSortBy(field === 'titulo' ? (sortBy === 'titulo' ? '' : 'titulo') : '')}
          onSavedFilters={handleSavedFilters}
          onDailyNote={handleDailyNote}
          onRevealInExplorer={handleRevealInExplorer}
          onToggleView={handleToggleView}
          isViewMode={viewMode}
        />
        <TabBar
          tabs={tabState.tabs}
          activeId={tabState.activeId}
          notas={notas ?? []}
          onSelect={(id) => {
            const n = notas?.find(x => x.id === id)
            if (n) selectNota(n)
          }}
          onClose={handleCloseTab}
        />
        {notaAtual ? (
          <IdeiasEditor
            notaAtual={notaAtual}
            notas={notas ?? []}
            tipos={tipos}
            pastas={pastas}
            entrada={entrada}
            saida={saida}
            notaTagsData={notaTagsData}
            selectedId={selectedId}
            savePending={updateMut.isPending}
            deletePending={deleteMut.isPending}
            onSave={(id, data) => updateMut.mutate({ id, data })}
            onDelete={(id) => setConfirmDelete(id)}
            onFavoritar={(id) => favoritarMut.mutate(id)}
            onRemoveTag={(notaId, tagId) => removeTagFromNotaMut.mutate({ notaId, tagId })}
            onSelectNota={selectNota}
            onShowTagModal={() => setShowTagModal(true)}
            onCreateWikilink={handleCreateWikilink}
            saveBeforeSwitchRef={saveBeforeSwitchRef}
            isViewMode={viewMode}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
            Selecione ou crie uma nota
          </div>
        )}
      </div>
      {showTemplateModal && (
        <TemplateModal
          onClose={() => setShowTemplateModal(false)}
          onSelect={(id) => {
            const n = notas?.find(x => x.id === id)
            if (n) selectNota(n)
          }}
        />
      )}
      {showLocalPicker && (
        <NotaTemplatePicker
          onClose={() => setShowLocalPicker(false)}
          onSelect={handleTemplateSelect}
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
                  className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" placeholder="Nome da tag (ex: #urgente)" />
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
      {confirmDeletePasta !== null && (
        <ConfirmModal
          titulo="Excluir pasta"
          mensagem={`Tem certeza que deseja excluir a pasta "${pastas?.find(p => p.id === confirmDeletePasta)?.nome || ''}"? As notas serão removidas da pasta, mas não excluídas.`}
          onConfirm={() => { deletePastaMut.mutate(confirmDeletePasta) }}
          onCancel={() => setConfirmDeletePasta(null)}
          destructive
          disabled={deletePastaMut.isPending}
        />
      )}
      {showSavedFilters && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowSavedFilters(false)}>
          <div className="bg-bg-secondary rounded-lg p-4 w-96 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text-primary">Filtros salvos</h3>
              <button onClick={() => setShowSavedFilters(false)} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
            </div>
            <SavedFiltersSection
              search={search}
              pastaFilter={pastaFilter}
              tagFilter={tagFilter}
              sortBy={sortBy}
              onApply={f => {
                setSearch(f.search)
                setPastaFilter(f.pastaFilter)
                setTagFilter(f.tagFilter)
                setSortBy(f.sortBy)
                setShowSavedFilters(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
