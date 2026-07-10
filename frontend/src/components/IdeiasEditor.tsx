import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Nota, Tag, TipoObjeto, Pasta } from '../types'
import { broadcastInvalidate } from '../hooks/useBroadcastInvalidate'
import { extrairBloco, sugerirTags, getTags, addTagToNota, getNotasRelacionadas } from '../api/notas'
import { useConfig } from '../hooks/useConfig'
import { API_BASE } from '../api/client'
import { useNotify } from '../store/notification'
import { wordCount, readTime } from '../utils/wordCount'
import { Folder, Scissors, Plus, Star, ArrowRight, ArrowLeft, X, CheckSquare, Link2, FileText, Lightbulb, Tag as TagIcon } from 'lucide-react'
import EditorMarkdown from './EditorMarkdown'
import RenderConteudo from './RenderConteudo'
import ChecklistBar from './ChecklistBar'

interface IdeiasEditorProps {
  notaAtual: Nota
  notas: Nota[]
  tipos?: TipoObjeto[]
  pastas?: Pasta[]
  entrada: Nota[]
  saida: Nota[]
  notaTagsData?: Tag[] | undefined
  selectedId: number | null
  savePending: boolean
  deletePending: boolean
  onSave: (id: number, data: Partial<Nota>) => void
  onDelete: (id: number) => void
  onFavoritar: (id: number) => void
  onRemoveTag: (notaId: number, tagId: number) => void
  onSelectNota: (n: Nota) => void
  onShowTagModal: () => void
  isViewMode?: boolean
  onCreateWikilink?: (titulo: string) => void
}

export default function IdeiasEditor({
  notaAtual, notas, tipos, pastas, entrada, saida, notaTagsData,
  selectedId, savePending, deletePending,
  onSave, onDelete, onFavoritar, onRemoveTag, onSelectNota, onShowTagModal,
  isViewMode, onCreateWikilink,
  saveBeforeSwitchRef,
}: IdeiasEditorProps & { saveBeforeSwitchRef?: React.MutableRefObject<(() => void) | null> }) {
  const saveBeforeRef = useRef<() => void>(() => {})
  if (saveBeforeSwitchRef) {
    saveBeforeSwitchRef.current = saveBeforeRef.current
  }
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [editando, setEditando] = useState(false)
  useEffect(() => {
    if (isViewMode) setEditando(false)
  }, [isViewMode])
  const [titulo, setTitulo] = useState(notaAtual.titulo)
  const [conteudo, setConteudo] = useState(notaAtual.conteudo)
  const [propriedades, setPropriedades] = useState<Record<string, string>>(
    notaAtual.propriedades ? Object.fromEntries(Object.entries(notaAtual.propriedades).map(([k, v]) => [k, String(v)])) : {}
  )
  const [showExtract, setShowExtract] = useState(false)
  const [extractText, setExtractText] = useState('')
  const [novaPropKey, setNovaPropKey] = useState('')
  const [novaPropVal, setNovaPropVal] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [dirty, setDirty] = useState(false)
  const [showSlash, setShowSlash] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [sugestoes, setSugestoes] = useState<{ tag_id: number; score: number }[]>([])
  const [tagsMap, setTagsMap] = useState<Record<number, Tag>>({})
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const handleAttachmentUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(API_BASE + '/attachments/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        notify(err.detail || 'Erro ao anexar arquivo')
        return
      }
      const data = await res.json()
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)
      const markdown = isImage ? `![${file.name}](${data.url})` : `[${file.name}](${data.url})`
      setConteudo(p => p + '\n' + markdown)
      setDirty(true)
      notify('Arquivo anexado')
    } catch (e) {
      console.error('[upload]', e)
      notify('Erro ao anexar arquivo')
    }
    e.target.value = ''
  }, [notify])
  useEffect(() => {
    if (!editando || !notaAtual.conteudo?.trim()) { setSugestoes([]); return }
    const timer = setTimeout(async () => {
      try {
        const result = await sugerirTags(notaAtual.id)
        setSugestoes(result.filter(s => !notaTagsData?.some(t => t.id === s.tag_id)))
      } catch {}
    }, 500)
    return () => clearTimeout(timer)
  }, [editando, notaAtual.id, notaAtual.conteudo, notaTagsData])
  useEffect(() => {
    getTags().then(all => setTagsMap(Object.fromEntries(all.map(t => [t.id, t])))).catch((e) => { console.error('[IdeiasEditor] getTags', e); notify('Erro ao carregar tags') })
  }, [])

  const { data: relacionadas } = useQuery({
    queryKey: ['notas-relacionadas', notaAtual.id],
    queryFn: () => getNotasRelacionadas(notaAtual.id),
    enabled: !!notaAtual.id && editando,
    staleTime: 30_000,
  })

  const rightPanelRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const slashRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tituloRef = useRef(titulo)
  const conteudoRef = useRef(conteudo)
  const propriedadesRef = useRef(propriedades)

  useEffect(() => { tituloRef.current = titulo }, [titulo])
  useEffect(() => { conteudoRef.current = conteudo }, [conteudo])
  useEffect(() => { propriedadesRef.current = propriedades }, [propriedades])

  // Sync from notaAtual when user selects different note
  useEffect(() => {
    setTitulo(notaAtual.titulo)
    setConteudo(notaAtual.conteudo)
    setPropriedades(notaAtual.propriedades ? Object.fromEntries(Object.entries(notaAtual.propriedades).map(([k, v]) => [k, String(v)])) : {})
    setEditando(notaAtual.titulo === '(sem título)')
    setDirty(false)
    setSaveStatus('idle')
    setShowExtract(false)
    setExtractText('')
    setShowSlash(false)
  }, [notaAtual.id])

  // Scroll header collapse
  useEffect(() => {
    const el = rightPanelRef.current
    if (!el) return
    const onScroll = () => setHeaderCollapsed(el.scrollTop > 50)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [selectedId])

  // Zen mode toggle via event
  useEffect(() => {
    const handler = () => setZenMode(p => !p)
    window.addEventListener('toggle-zen', handler)
    return () => window.removeEventListener('toggle-zen', handler)
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  // Auto-save debounce
  const { config: editorConfig } = useConfig()
  useEffect(() => {
    if (!editando || !selectedId || !dirty) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveNote()
    }, editorConfig.autoSaveInterval * 1000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [titulo, conteudo, propriedades, editando, selectedId, dirty, editorConfig.autoSaveInterval])

  // beforeunload when dirty
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Ctrl+Enter save
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Enter' && e.ctrlKey && editando && selectedId) {
        e.preventDefault()
        saveNote()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editando, selectedId])

  function saveNote() {
    if (!selectedId) return
    const props: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(propriedadesRef.current)) {
      if (k.trim()) props[k.trim()] = v
    }
    setSaveStatus('saving')
    onSave(selectedId, { titulo: tituloRef.current, conteudo: conteudoRef.current, propriedades: props })
  }
  const saveNoteRef = useRef(saveNote)
  saveNoteRef.current = saveNote
  useEffect(() => {
    if (saveBeforeSwitchRef) {
      saveBeforeSwitchRef.current = () => {
        if (dirty && editando && selectedId) {
          saveNoteRef.current()
        }
      }
    }
  })

  // Override save status from parent mutation
  const prevSavePending = useRef(savePending)
  useEffect(() => {
    if (prevSavePending.current && !savePending) {
      setDirty(false)
      setSaveStatus('success')
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    }
    prevSavePending.current = savePending
  }, [savePending])

  function handleSave() {
    saveNote()
    setEditando(false)
  }

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
    { icon: <FileText size={14} />, label: 'Inserir template /resumo', insert: '/resumo' },
    { icon: <span className="text-xs">📅</span>, label: 'Inserir data', insert: `**Data:** ${new Date().toLocaleDateString('pt-BR')}` },
    { icon: <Link2 size={14} />, label: 'Link rápido [[', insert: '[[' },
    { icon: <CheckSquare size={14} />, label: 'Checklist - [ ] ', insert: '- [ ] ' },
    { icon: <Lightbulb size={14} />, label: 'Dica > ', insert: '> ' },
    { icon: <TagIcon size={14} />, label: 'Propriedade ::', insert: '\n::' },
  ].filter(c => c.label.toLowerCase().includes(slashQuery.toLowerCase()))

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

  function handleExtrair() {
    if (!extractText.trim() || !selectedId) return
    extrairBloco(selectedId, extractText.trim(), notaAtual?.tipo_id, null).then((nova) => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      queryClient.invalidateQueries({ queryKey: ['stats', 'leitura'] })
      queryClient.invalidateQueries({ queryKey: ['stats-weekly'] })
      queryClient.invalidateQueries({ queryKey: ['grafo'] })
      queryClient.invalidateQueries({ queryKey: ['notas-recentes'] })
      broadcastInvalidate([['notas']])
      onSelectNota(nova)
      setShowExtract(false)
      setExtractText('')
    }).catch(e => { console.error('[Ideias] extrair', e); notify('Erro ao extrair bloco') })
  }

  return (
    <div ref={rightPanelRef} className="flex-1 p-6 overflow-y-auto">
      <div>
        <div className={`transition-all duration-200 overflow-hidden ${
          headerCollapsed || zenMode ? 'max-h-0 opacity-0 mb-0' : 'max-h-40 opacity-100 mb-3'
        }`}>
          {editando ? (
            <>
              <label className="text-text-muted">Categoria:</label>
              <select value={String(notaAtual.tipo_id || '')} onChange={e => {
                if (!selectedId) return
                const v = e.target.value
                onSave(selectedId, { tipo_id: v ? Number(v) : null })
              }}
                className="bg-bg-tertiary rounded px-2 py-0.5 text-xs outline-none">
                <option value="">Sem tipo</option>
                {(tipos || []).map(t => <option key={t.id} value={t.id}>{t.icone} {t.nome}</option>)}
              </select>
              <label className="text-text-muted">Grupo:</label>
              <select value={String(notaAtual.pasta_id || '')} onChange={e => {
                if (!selectedId) return
                const v = e.target.value
                onSave(selectedId, { pasta_id: v ? Number(v) : null })
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
                <span><Folder size={14} className="inline mr-0.5" />{pastas.find(p => p.id === notaAtual.pasta_id)!.nome}</span>
              )}
            </>
          )}
          <span className="flex flex-wrap gap-x-4">
            <span>Criado: {new Date(notaAtual.criado_em).toLocaleDateString('pt-BR')}</span>
            <span>Modificado: {new Date(notaAtual.atualizado_em).toLocaleDateString('pt-BR')}</span>
            <span className="text-text-muted">
              {wordCount(notaAtual.conteudo)} palavras · {readTime(notaAtual.conteudo)} min de leitura
            </span>
          </span>
          {(notaTagsData && notaTagsData.length > 0) && (
            <span className="flex gap-1 flex-wrap">
              {notaTagsData.map(tag => {
                const bg = tag.cor || '#6B7280'
                return (
                  <span key={tag.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm text-text-primary"
                    style={{ backgroundColor: `${bg}15`, border: `1px solid ${bg}44` }}>
                    {tag.nome}
                    {editando && (
                      <button onClick={() => { if (selectedId) onRemoveTag(selectedId, tag.id) }}
                        className="ml-0.5 hover:opacity-70"><X size={10} /></button>
                    )}
                  </span>
                )
              })}
              {editando && (
                <button onClick={onShowTagModal}
                  className="px-1.5 py-0.5 text-xs text-text-muted hover:text-accent rounded-full border border-dashed border-border hover:border-accent/50 inline-flex items-center gap-0.5"><Plus size={10} /> Tag</button>
              )}
            </span>
          )}
          {editando && (!notaTagsData || notaTagsData.length === 0) && (
            <button onClick={onShowTagModal}
              className="px-1.5 py-0.5 text-xs text-text-muted hover:text-accent rounded-full border border-dashed border-border hover:border-accent/50 inline-flex items-center gap-0.5"><Plus size={10} /> Tag</button>
          )}
          {editando && sugestoes.length > 0 && (
            <span className="flex gap-1 flex-wrap mt-1">
              <span className="text-xs text-text-muted self-center">Sugestões:</span>
              {sugestoes.map(s => {
                const tag = tagsMap[s.tag_id]
                if (!tag) return null
                const bg = tag.cor || '#6B7280'
                return (
                  <button key={s.tag_id} onClick={async () => {
                    setSugestoes(prev => prev.filter(x => x.tag_id !== s.tag_id))
                    try {
                      await addTagToNota(notaAtual.id, s.tag_id)
                      queryClient.invalidateQueries({ queryKey: ['notaTags', notaAtual.id] })
                      queryClient.invalidateQueries({ queryKey: ['notas'] })
                    } catch (e) { console.error('[IdeiasEditor] addTag', e); notify('Erro ao adicionar tag') }
                  }} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs text-text-muted cursor-pointer hover:text-text-primary transition-colors"
                    style={{ backgroundColor: `${bg}10`, border: `1px dashed ${bg}44` }}
                    title={`Relevância: ${s.score}`}>
                    + {tag.nome}
                  </button>
                )
              })}
            </span>
          )}
          {editando && relacionadas && relacionadas.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border">
              <span className="text-xs text-text-muted">Relacionadas:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {relacionadas.map(n => (
                  <button key={n.id} onClick={() => { const r = notas.find(x => x.id === n.id); if (r) onSelectNota(r) }}
                    className="px-1.5 py-0.5 text-xs bg-bg-tertiary rounded-full text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                    title={`${n.tags_compartilhadas} tag(s) compartilhada(s) · similaridade ${n.similaridade}`}>
                    {n.titulo}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 flex items-center gap-3">
            {editando ? (
              <>
                <input value={titulo} onChange={e => { setTitulo(e.target.value); setDirty(true) }}
                  className="flex-1 text-2xl font-bold bg-transparent outline-none border-b border-accent pb-1" />
                <button onClick={() => {
                  const agora = new Date(); const zid = `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, '0')}${String(agora.getDate()).padStart(2, '0')}${String(agora.getHours()).padStart(2, '0')}${String(agora.getMinutes()).padStart(2, '0')}`
                  const prefix = `${zid} - `
                  if (!titulo.startsWith(prefix)) {
                    setTitulo(titulo === '(sem título)' ? prefix : `${prefix}${titulo}`)
                    setDirty(true)
                  }
                }}
                  className="px-2 py-1 text-xs bg-bg-tertiary text-text-muted rounded-lg hover:text-text-primary hover:bg-bg-hover shrink-0 transition-colors"
                  title="Gerar ID Zettelkasten (timestamp)">{/* 🆔 */}ID</button>
              </>
            ) : (
              <h1 className="text-2xl font-bold cursor-default" onDoubleClick={() => setEditando(true)}>{notaAtual.titulo}</h1>
            )}
          </div>
          <div className="flex gap-1 items-center shrink-0">
            {editando ? (
              <>
                <button onClick={() => setShowExtract(true)} className="px-3 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover inline-flex items-center gap-1.5" title="Extrair trecho como nova nota"><Scissors size={14} /> Extrair</button>
                <div className="flex items-center gap-2">
                  {saveStatus === 'saving' && <span className="text-xs text-text-muted animate-pulse">Salvando...</span>}
                  {saveStatus === 'success' && <span className="text-xs text-success animate-fade-in">Salvo!</span>}
                  {saveStatus === 'error' && <span className="text-xs text-danger animate-fade-in">Erro</span>}
                  <button onClick={handleSave} disabled={saveStatus === 'saving'}
                    className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg transition-all active:scale-95 disabled:opacity-50" title="Salvar (Ctrl+Enter)">
                    {saveStatus === 'saving' ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => setEditando(true)} className="px-4 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover">Editar</button>
            )}
            <div className="flex gap-1 ml-1 items-center">
              <input type="file" accept="image/*,application/pdf" ref={attachmentInputRef}
                onChange={handleAttachmentUpload} className="hidden" />
              <button onClick={() => attachmentInputRef.current?.click()}
                className="px-2 py-1.5 bg-bg-tertiary text-text-muted text-xs rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors" title="Anexar arquivo">
                📎
              </button>
              <button onClick={() => {
                if (!selectedId) return
                window.open(API_BASE + `/notas/${selectedId}/export/md`)
              }}
                className="px-2 py-1.5 bg-bg-tertiary text-text-muted text-xs rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors" title="Exportar como Markdown">
                ↓.md
              </button>
              <button onClick={() => { if (selectedId) window.open(API_BASE + `/notas/${selectedId}/export/json`) }}
                className="px-2 py-1.5 bg-bg-tertiary text-text-muted text-xs rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors" title="Exportar como JSON">
                ↓.json
              </button>
              <button onClick={() => { if (selectedId) onFavoritar(selectedId) }}
                className={`px-2 py-1.5 text-xs rounded-lg transition-colors ${notaAtual.favoritado ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20' : 'text-text-muted bg-bg-tertiary hover:bg-bg-hover hover:text-text-primary'}`}
                title={notaAtual.favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
                <Star size={14} fill={notaAtual.favoritado ? 'currentColor' : 'none'} />
              </button>
            </div>
            <button onClick={() => { if (selectedId) onDelete(selectedId) }} disabled={deletePending}
              className="ml-2 px-4 py-1.5 bg-danger hover:bg-danger/80 text-white text-sm rounded-lg disabled:opacity-50">
              {deletePending ? 'Excluindo...' : 'Excluir'}
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
                        if (!selectedId) return
                        const newContent = conteudo.replace(/\/(\w*)$/, cmd.insert)
                        setConteudo(newContent)
                        onSave(selectedId, { conteudo: newContent })
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
              <div>
                <ChecklistBar conteudo={notaAtual.conteudo || ''} />
                <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {notaAtual.conteudo ? <RenderConteudo conteudo={notaAtual.conteudo} notas={notas || []} onSelect={onSelectNota} selectedId={selectedId} onClickBrokenWikilink={onCreateWikilink} /> : 'Nenhum conteúdo'}
                </div>
              </div>
            )}
          </div>
          {showExtract && editando && (
            <div className="mb-4 p-3 bg-bg-tertiary rounded-lg">
              <p className="text-xs text-text-muted mb-2">Extrair trecho como nova nota:</p>
              <textarea value={extractText} onChange={e => setExtractText(e.target.value)}
                className="w-full bg-bg-primary rounded px-3 py-2 text-sm outline-none mb-2 min-h-[60px]" placeholder="Cole o trecho aqui..." />
              <div className="flex gap-2">
                <button onClick={handleExtrair} disabled={!extractText.trim()}
                  className="px-3 py-1 bg-accent text-white text-xs rounded-lg transition-all active:scale-95 disabled:opacity-50">Extrair</button>
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
                        <button onClick={() => removePropriedade(k)} className="text-xs text-danger"><X size={12} /></button>
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
                    <button key={n.id} onClick={() => onSelectNota(n)}
                      className="px-3 py-1.5 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors text-sm text-accent inline-flex items-center gap-1">
                      <ArrowRight size={14} /> {n.titulo}
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
                    <button key={n.id} onClick={() => onSelectNota(n)}
                      className="px-3 py-1.5 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors text-sm text-accent inline-flex items-center gap-1">
                      <ArrowLeft size={14} /> {n.titulo}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
