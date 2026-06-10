import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTipos } from '../api/tipos'
import { getQueries, createQuery, deleteQuery, executarQuery, batchEdit } from '../api/queries'

export default function Consultas() {
  const queryClient = useQueryClient()
  const [selectedQuery, setSelectedQuery] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [newName, setNewName] = useState('')
  const [newTipoId, setNewTipoId] = useState(1)
  const [batchField, setBatchField] = useState('')
  const [batchValue, setBatchValue] = useState('')

  const { data: queries } = useQuery({ queryKey: ['queries'], queryFn: getQueries })
  const { data: tipos } = useQuery({ queryKey: ['tipos'], queryFn: getTipos })

  const { data: result, refetch: refetchResult } = useQuery({
    queryKey: ['query-result', selectedQuery],
    queryFn: () => executarQuery(selectedQuery!),
    enabled: !!selectedQuery,
  })

  const createMut = useMutation({
    mutationFn: () => createQuery({ nome: newName, tipo_objeto_id: newTipoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queries'] })
      setNewName('')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteQuery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queries'] })
      if (selectedQuery === null) return
      setSelectedQuery(null)
    },
  })

  const batchMut = useMutation({
    mutationFn: () => batchEdit(selectedQuery!, [...selectedIds], { [batchField]: batchValue }),
    onSuccess: () => {
      refetchResult()
      setSelectedIds(new Set())
    },
  })

  const queryAtual = queries?.find(q => q.id === selectedQuery)

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border p-4 shrink-0 overflow-y-auto">
        <h1 className="text-lg font-bold mb-4">Consultas</h1>

        <form onSubmit={e => { e.preventDefault(); createMut.mutate() }} className="mb-4 flex flex-col gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da consulta"
            className="w-full bg-bg-tertiary rounded px-3 py-1.5 text-sm outline-none" />
          <select value={newTipoId} onChange={e => setNewTipoId(Number(e.target.value))}
            className="w-full bg-bg-tertiary rounded px-3 py-1.5 text-sm outline-none">
            {(tipos || []).map(t => <option key={t.id} value={t.id}>{t.icone} {t.nome}</option>)}
          </select>
          <button type="submit" disabled={!newName.trim()}
            className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg disabled:opacity-50">Criar</button>
        </form>

        <div className="space-y-1">
          {(queries || []).map(q => (
            <div key={q.id} className="flex items-center gap-1">
              <button onClick={() => setSelectedQuery(q.id)}
                className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedQuery === q.id ? 'bg-accent/20 text-accent' : 'hover:bg-bg-hover text-text-primary'}`}>
                {q.nome}
                <div className="text-xs text-text-muted">{q.visualizacao}</div>
              </button>
              <button onClick={() => deleteMut.mutate(q.id)}
                className="text-xs text-text-muted hover:text-danger">✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {queryAtual ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{queryAtual.nome}</h2>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <select value={batchField} onChange={e => setBatchField(e.target.value)}
                    className="bg-bg-tertiary rounded px-2 py-1 text-xs outline-none">
                    <option value="">Campo</option>
                    <option value="status">Status</option>
                    <option value="prioridade">Prioridade</option>
                    <option value="tipo_id">Tipo</option>
                  </select>
                  <input value={batchValue} onChange={e => setBatchValue(e.target.value)}
                    placeholder="Valor" className="bg-bg-tertiary rounded px-2 py-1 text-xs outline-none w-24" />
                  <button onClick={() => batchMut.mutate()}
                    className="px-3 py-1 bg-accent text-white text-xs rounded-lg">
                    Aplicar ({selectedIds.size})
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(result?.dados || []).map((item: any) => (
                <div key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`bg-bg-secondary rounded-xl border p-3 cursor-pointer transition-colors ${selectedIds.has(item.id) ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-accent/50'}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)} className="accent-accent" />
                    <span className="text-sm font-medium truncate">{item.titulo}</span>
                  </div>
                  {item.status && (
                    <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${item.status === 'feito' ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted'}`}>
                      {item.status}
                    </span>
                  )}
                  {item.prioridade && (
                    <span className="text-xs text-text-muted ml-1">{item.prioridade}</span>
                  )}
                </div>
              ))}
              {(!result?.dados || result.dados.length === 0) && (
                <p className="text-text-muted text-sm col-span-full text-center py-8">Nenhum resultado</p>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            Selecione ou crie uma consulta
          </div>
        )}
      </div>
    </div>
  )
}
