import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBlocos, createBloco, deleteBloco, getTarefas, createTarefa, updateTarefaStatus, deleteTarefa } from '../api/rotina'
import CalendarioSemanal from '../components/CalendarioSemanal'
import { hojeLocal } from '../utils/date'
import type { BlocoRotina, Tarefa } from '../types'

export default function Rotina() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'lista' | 'semana'>('lista')
  const [novaTarefa, setNovaTarefa] = useState('')
  const [showBlocoForm, setShowBlocoForm] = useState(false)
  const [blocoForm, setBlocoForm] = useState({ titulo: '', hora_inicio: '', hora_fim: '' })
  const hoje = hojeLocal()

  const { data: blocos } = useQuery({
    queryKey: ['rotina', 'blocos', hoje],
    queryFn: () => getBlocos(hoje),
  })

  const { data: tarefas } = useQuery({
    queryKey: ['rotina', 'tarefas', hoje],
    queryFn: () => getTarefas(hoje),
  })

  const createTarefaMut = useMutation({
    mutationFn: (titulo: string) => createTarefa({ titulo, data: hoje }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] }),
  })

  const toggleTarefaMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTarefaStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] }),
  })

  const createBlocoMut = useMutation({
    mutationFn: (data: Partial<BlocoRotina>) => createBloco({ ...data, data_especifica: hoje }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotina', 'blocos'] })
      setShowBlocoForm(false)
      setBlocoForm({ titulo: '', hora_inicio: '', hora_fim: '' })
    },
  })

  const deleteBlocoMut = useMutation({
    mutationFn: (id: number) => deleteBloco(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rotina', 'blocos'] }),
  })

  const deleteTarefaMut = useMutation({
    mutationFn: (id: number) => deleteTarefa(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] }),
  })

  function handleAddTarefa(e: React.FormEvent) {
    e.preventDefault()
    if (!novaTarefa.trim()) return
    createTarefaMut.mutate(novaTarefa.trim())
    setNovaTarefa('')
  }

  function handleToggleTarefa(t: Tarefa) {
    toggleTarefaMut.mutate({ id: t.id, status: t.status === 'feito' ? 'pendente' : 'feito' })
  }

  function handleCreateBloco(e: React.FormEvent) {
    e.preventDefault()
    createBlocoMut.mutate(blocoForm)
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Rotina Diária</h1>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView('lista')}
            className={`px-3 py-1 text-sm ${view === 'lista' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-muted hover:text-text-primary'}`}>
            Lista
          </button>
          <button onClick={() => setView('semana')}
            className={`px-3 py-1 text-sm ${view === 'semana' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-muted hover:text-text-primary'}`}>
            Semana
          </button>
        </div>
      </div>

      {view === 'semana' ? (
        <CalendarioSemanal />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Blocos de tempo</h2>
              <button onClick={() => setShowBlocoForm(!showBlocoForm)} className="text-xs text-accent hover:underline">+ bloco</button>
            </div>

            {showBlocoForm && (
              <form onSubmit={handleCreateBloco} className="flex flex-wrap gap-2 mb-4 p-3 bg-bg-tertiary rounded-lg">
                <input value={blocoForm.titulo} onChange={e => setBlocoForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título" className="flex-1 min-w-[120px] bg-bg-primary rounded px-2 py-1.5 text-sm outline-none" />
                <input type="time" value={blocoForm.hora_inicio} onChange={e => setBlocoForm(f => ({ ...f, hora_inicio: e.target.value }))} className="bg-bg-primary rounded px-2 py-1.5 text-sm outline-none" />
                <input type="time" value={blocoForm.hora_fim} onChange={e => setBlocoForm(f => ({ ...f, hora_fim: e.target.value }))} className="bg-bg-primary rounded px-2 py-1.5 text-sm outline-none" />
                <button type="submit" className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg">OK</button>
              </form>
            )}

            <div className="space-y-1">
              {(blocos || []).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)).map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-secondary w-24">{b.hora_inicio}–{b.hora_fim}</span>
                    <span className="text-sm" style={{ color: b.cor || undefined }}>{b.titulo}</span>
                  </div>
                  <button onClick={() => deleteBlocoMut.mutate(b.id)}
                    className="text-xs text-text-muted hover:text-danger opacity-0 hover:opacity-100">✕</button>
                </div>
              ))}
              {(!blocos || blocos.length === 0) && <p className="text-sm text-text-muted py-4 text-center">Nenhum bloco definido</p>}
            </div>
          </div>

          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Tarefas do dia</h2>

            <form onSubmit={handleAddTarefa} className="mb-4">
              <input
                value={novaTarefa}
                onChange={e => setNovaTarefa(e.target.value)}
                placeholder="Adicionar tarefa..."
                className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
              />
            </form>

            <div className="space-y-1">
              {(tarefas || []).map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors group">
                  <button onClick={() => handleToggleTarefa(t)}
                    className={`w-4 h-4 rounded border flex items-center justify-center text-xs transition-colors
                      ${t.status === 'feito' ? 'bg-accent border-accent text-white' : 'border-border hover:border-accent'}`}>
                    {t.status === 'feito' && '✓'}
                  </button>
                  <span className={`text-sm flex-1 ${t.status === 'feito' ? 'line-through text-text-muted' : ''}`}>{t.titulo}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${t.prioridade === 'alta' ? 'bg-danger/20 text-danger' : t.prioridade === 'baixa' ? 'bg-text-muted/20 text-text-muted' : 'bg-warning/20 text-warning'}`}>
                    {t.prioridade}
                  </span>
                  <button onClick={() => deleteTarefaMut.mutate(t.id)}
                    className="text-xs text-text-muted hover:text-danger opacity-0 group-hover:opacity-100">✕</button>
                </div>
              ))}
              {(!tarefas || tarefas.length === 0) && <p className="text-sm text-text-muted py-4 text-center">Nenhuma tarefa hoje</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
