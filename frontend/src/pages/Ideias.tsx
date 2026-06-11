import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotas, createNota, updateNota, deleteNota, extrairBloco, getPastas } from '../api/notas'
import { getConexoes } from '../api/conexoes'
import { getTipos } from '../api/tipos'
import EditorMarkdown from '../components/EditorMarkdown'
import TemplateModal from '../components/TemplateModal'
import GrafoNotas from '../components/GrafoNotas'
import type { Nota } from '../types'
import { useDebounce } from '../hooks/useDebounce'

export default function Ideias() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [search, setSearch] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showGrafo, setShowGrafo] = useState(false)
  const [showSlash, setShowSlash] = useState(false)
  const [extractText, setExtractText] = useState('')
  const [showExtract, setShowExtract] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const slashRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const [propriedades, setPropriedades] = useState<Record<string, string>>({})
  const [novaPropKey, setNovaPropKey] = useState('')
  const [novaPropVal, setNovaPropVal] = useState('')
  const searchDebounced = useDebounce(search, 300)

  const { data: notas } = useQuery({
    queryKey: ['notas', searchDebounced],
    queryFn: () => getNotas(searchDebounced || undefined),
  })

  const { data: tipos } = useQuery({ queryKey: ['tipos'], queryFn: getTipos })
  const { data: pastas } = useQuery({ queryKey: ['pastas'], queryFn: getPastas })

  const { data: conexoes } = useQuery({
    queryKey: ['conexoes', selectedId],
    queryFn: () => getConexoes(selectedId!),
    enabled: !!selectedId,
  })

  const notaAtual = notas?.find(n => n.id === selectedId) || null

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Nota> }) => updateNota(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] })
      queryClient.invalidateQueries({ queryKey: ['conexoes'] })
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
      setSelectedId(null)
    },
  })

  function selectNota(n: Nota) {
    setSelectedId(n.id)
    setTitulo(n.titulo)
    setConteudo(n.conteudo)
    setEditando(false)
    setPropriedades(n.propriedades ? Object.fromEntries(Object.entries(n.propriedades).map(([k, v]) => [k, String(v)])) : {})
  }

  async function handleSave() {
    if (!selectedId) return
    const props: Record<string, any> = {}
    for (const [k, v] of Object.entries(propriedades)) {
      if (k.trim()) props[k.trim()] = v
    }
    updateMut.mutate({ id: selectedId, data: { titulo, conteudo, propriedades: props } })
    setEditando(false)
  }

  async function handleCreate() {
    createMut.mutate({ titulo: 'Nova nota', conteudo: '' })
  }

  async function handleDelete() {
    if (!selectedId) return
    deleteMut.mutate(selectedId)
  }

  function addPropriedade() {
    if (!novaPropKey.trim()) return
    setPropriedades(p => ({ ...p, [novaPropKey.trim()]: novaPropVal }))
    setNovaPropKey('')
    setNovaPropVal('')
  }

  function removePropriedade(key: string) {
    setPropriedades(p => {
      const next = { ...p }
      delete next[key]
      return next
    })
  }

  const handleContentChange = useCallback((val: string) => {
    setConteudo(val)
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

  const notasRelacionadas = notas?.filter(n =>
    conexoes?.some(c => c.nota_destino_id === n.id || c.nota_origem_id === n.id)
  ).filter(n => n.id !== selectedId) || []

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border p-4 shrink-0 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar notas..."
            className="flex-1 bg-bg-tertiary rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent"
          />
          <button onClick={handleCreate} className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover" title="Nova nota em branco">+</button>
          <button onClick={() => setShowTemplateModal(true)} className="px-3 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover" title="Criar nota a partir de um modelo pré-definido (template)">📋</button>
          <button onClick={() => setShowGrafo(!showGrafo)} className={`px-2 py-1.5 text-sm rounded-lg ${showGrafo ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-primary hover:bg-bg-hover'}`} title="Grafo de conexões entre notas">🔗</button>
        </div>
        {showGrafo ? (
          <GrafoNotas onSelectNota={(id) => {
            const n = notas?.find(x => x.id === id)
            if (n) selectNota(n)
          }} />
        ) : (
          <div className="space-y-1">
            {filtered.map(n => {
              const tipo = tipos?.find(t => t.id === n.tipo_id)
              return (
                <button key={n.id} onClick={() => selectNota(n)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedId === n.id ? 'bg-accent/20 text-accent' : 'hover:bg-bg-hover text-text-primary'}`}>
                  <div className="flex items-center gap-1">
                    {tipo && <span className="text-xs">{tipo.icone}</span>}
                    <span className="font-medium truncate">{n.titulo}</span>
                  </div>
                  <div className="text-xs text-text-muted truncate mt-0.5">{new Date(n.atualizado_em).toLocaleDateString('pt-BR')}</div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {notaAtual ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 flex items-center gap-3">
                {editando ? (
                  <>
                    <select value={String(notaAtual.tipo_id || '')} onChange={e => {
                      const v = e.target.value
                      updateMut.mutate({ id: selectedId!, data: { tipo_id: v ? Number(v) : null } })
                    }}
                      className="bg-bg-tertiary rounded px-2 py-1 text-sm outline-none">
                      <option value="">Sem tipo</option>
                      {(tipos || []).map(t => <option key={t.id} value={t.id}>{t.icone} {t.nome}</option>)}
                    </select>
                    <select value={String(notaAtual.pasta_id || '')} onChange={e => {
                      const v = e.target.value
                      updateMut.mutate({ id: selectedId!, data: { pasta_id: v ? Number(v) : null } })
                    }}
                      className="bg-bg-tertiary rounded px-2 py-1 text-sm outline-none">
                      <option value="">Sem pasta</option>
                      {(pastas || []).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    <input value={titulo} onChange={e => setTitulo(e.target.value)}
                      className="flex-1 text-xl font-bold bg-transparent outline-none border-b border-accent pb-1" />
                  </>
                ) : (
                  <div>
                    <h1 className="text-xl font-bold">
                      {notaAtual.tipo_id && tipos?.find(t => t.id === notaAtual.tipo_id)?.icone}{' '}
                      {notaAtual.titulo}
                    </h1>
                    {notaAtual.pasta_id && pastas?.find(p => p.id === notaAtual.pasta_id) && (
                      <span className="text-xs text-text-muted">
                        📁 {pastas.find(p => p.id === notaAtual.pasta_id)!.nome}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {editando ? (
                  <>
                    <button onClick={() => setShowExtract(true)} className="px-3 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover" title="Extrair trecho como nova nota">✂ Extrair</button>
                    <button onClick={handleSave} className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg">Salvar</button>
                  </>
                ) : (
                  <button onClick={() => setEditando(true)} className="px-4 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded-lg hover:bg-bg-hover">Editar</button>
                )}
                <button onClick={handleDelete} className="px-4 py-1.5 bg-danger/20 text-danger text-sm rounded-lg hover:bg-danger/30">Excluir</button>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-1 min-w-0">
                {editando ? (
                  <div ref={editorRef} className="relative">
                    <EditorMarkdown value={conteudo} onChange={handleContentChange} />
                    {showSlash && editando && slashCommands.length > 0 && (
                      <div ref={slashRef}
                        className="absolute left-0 bottom-full mb-1 bg-bg-secondary border border-border rounded-xl shadow-2xl py-1 min-w-[200px] z-50">
                        {slashCommands.map(cmd => (
                          <button key={cmd.label} onClick={() => {
                            const newContent = conteudo.replace(/\/(\w*)$/, cmd.insert)
                            setConteudo(newContent)
                            updateMut.mutate({ id: selectedId!, data: { conteudo: newContent } })
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
                  <div className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">{notaAtual.conteudo || 'Nenhum conteúdo'}</div>
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

              {(editando || Object.keys(propriedades).length > 0) && (
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
                          <input value={v} onChange={e => setPropriedades(p => ({ ...p, [k]: e.target.value }))}
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

            {conexoes && conexoes.length > 0 && (
              <div className="mt-8 pt-4 border-t border-border">
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                  {conexoes.length} conexão(ões)
                </h2>
                <div className="flex flex-wrap gap-2">
                  {notasRelacionadas.map(n => (
                    <button key={n.id} onClick={() => selectNota(n)}
                      className="px-3 py-1.5 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors text-sm text-accent">
                      → {n.titulo}
                    </button>
                  ))}
                </div>
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
    </div>
  )
}
