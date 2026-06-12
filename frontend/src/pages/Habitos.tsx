import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getHabitos, createHabito, updateHabito, deleteHabito, createRegistro } from '../api/habitos'
import ConfirmModal from '../components/ConfirmModal'
import HabitoCalendario from '../components/HabitoCalendario'
import { hojeLocal } from '../utils/date'
import type { Habito } from '../types'

const TIPO_LABEL: Record<string, string> = { binario: 'Sim/Não', quantitativo: 'Contagem' }

export default function Habitos() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: habitos = [], isLoading, isError } = useQuery({
    queryKey: ['habitos'],
    queryFn: () => getHabitos(true),
  })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'binario' as 'binario' | 'quantitativo', categoria: '', meta: '' })
  const [feedback, setFeedback] = useState<{ id: number; texto: string } | null>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current) }
  }, [])

  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ nome: '', tipo: '' as string, categoria: '', meta: '' })
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ id: number; nome: string } | null>(null)
  const [calendarOpenId, setCalendarOpenId] = useState<number | null>(null)

  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof createHabito>[0]) => createHabito(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitos'] })
      setForm({ nome: '', tipo: 'binario', categoria: '', meta: '' })
      setShowForm(false)
    },
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    createMut.mutate({
      nome: form.nome,
      tipo: form.tipo,
      categoria: form.categoria || null,
      meta: form.meta ? parseFloat(form.meta) : null,
    })
  }

  function handleEdit(h: Habito) {
    setEditId(h.id)
    setEditForm({ nome: h.nome, tipo: h.tipo, categoria: h.categoria || '', meta: h.meta !== null ? String(h.meta) : '' })
  }

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateHabito>[1] }) => updateHabito(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitos'] })
      setEditId(null)
    },
  })

  function handleSaveEdit() {
    if (!editId) return
    if (!editForm.nome.trim()) return
    updateMut.mutate({
      id: editId,
      data: {
        nome: editForm.nome,
        tipo: editForm.tipo as 'binario' | 'quantitativo',
        categoria: editForm.categoria || null,
        meta: editForm.meta ? parseFloat(editForm.meta) : null,
      },
    })
  }

  const checkMut = useMutation({
    mutationFn: ({ habitoId, feito }: { habitoId: number; feito: boolean }) =>
      createRegistro(habitoId, { habito_id: habitoId, data: hojeLocal(), valor: feito ? 1 : 0 }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['registros', variables.habitoId] })
      setFeedback({ id: variables.habitoId, texto: 'Feito ✓' })
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
      feedbackTimer.current = setTimeout(() => setFeedback(null), 1500)
    },
  })

  function handleCheck(habitoId: number, feito: boolean) {
    checkMut.mutate({ habitoId, feito })
  }

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteHabito(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitos'] })
      queryClient.invalidateQueries({ queryKey: ['registros'] })
    },
  })

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Hábitos</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
          {showForm ? 'Cancelar' : '+ Novo hábito'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-bg-secondary rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-text-muted mb-1">Nome</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'binario' | 'quantitativo' }))}
                className="bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent">
                <option value="binario">Sim/Não (check-in diário)</option>
                <option value="quantitativo">Contagem (vezes, minutos, páginas)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Categoria</label>
              <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="bg-bg-tertiary rounded-lg px-3 py-2 text-sm w-28 outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <button type="submit" className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover">Criar</button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            <strong>Sim/Não:</strong> marque se fez ou não o hábito hoje · <strong>Contagem:</strong> registre quantas vezes (ex: 3 copos d'água, 30min estudo)
          </p>
        </form>
      )}

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-text-muted py-8 text-center animate-pulse">Carregando...</p>}
        {isError && <p className="text-sm text-danger py-8 text-center">Erro ao carregar hábitos</p>}
        {!isLoading && !isError && habitos.filter(h => h.ativo).length === 0 && (
          <p className="text-sm text-text-muted py-8 text-center">Nenhum hábito criado ainda</p>
        )}
        {!isLoading && !isError && habitos.filter(h => h.ativo).map(h => {
          const editing = editId === h.id
          return (
          <div key={h.id} className="bg-bg-secondary rounded-xl border border-border p-4">
            <div className="flex flex-col gap-0">
            <div className="flex items-center justify-between">
              {editing ? (
                <div className="flex items-center gap-2 flex-1">
                  <input value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                    className="bg-bg-primary rounded px-2 py-1 text-sm w-32 outline-none" />
                  <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value }))}
                    className="bg-bg-primary rounded px-2 py-1 text-sm outline-none">
                    <option value="binario">Sim/Não</option>
                    <option value="quantitativo">Contagem</option>
                  </select>
                  <input value={editForm.categoria} onChange={e => setEditForm(f => ({ ...f, categoria: e.target.value }))}
                    placeholder="Categoria" className="bg-bg-primary rounded px-2 py-1 text-sm w-24 outline-none" />
                  <input value={editForm.meta} onChange={e => setEditForm(f => ({ ...f, meta: e.target.value }))}
                    placeholder="Meta" className="bg-bg-primary rounded px-2 py-1 text-sm w-16 outline-none" />
                </div>
              ) : (
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: h.cor || '#5B8DEF' }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{h.nome}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted font-medium">
                        {TIPO_LABEL[h.tipo] || h.tipo}
                      </span>
                    </div>
                    {h.categoria && <span className="text-xs text-text-muted">{h.categoria}</span>}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 shrink-0">
                {feedback?.id === h.id && (
                  <span className="text-xs text-success font-medium animate-pulse">{feedback.texto}</span>
                )}
                {!editing && h.tipo === 'binario' && (
                  <button onClick={() => handleCheck(h.id, true)}
                    className="w-7 h-7 rounded-lg border border-border hover:bg-accent/20 hover:border-accent flex items-center justify-center text-xs transition-colors"
                    title="Marcar como feito hoje">✓</button>
                )}
                {!editing && h.tipo === 'quantitativo' && (
                  <button onClick={() => handleCheck(h.id, true)}
                    className="px-2 py-1 text-xs bg-bg-tertiary rounded-lg hover:bg-accent/20 transition-colors"
                    title="Registrar contagem">+1</button>
                )}
                {editing ? (
                  <>
                    <button onClick={handleSaveEdit} className="text-xs text-success">Salvar</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-text-muted">Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setCalendarOpenId(calendarOpenId === h.id ? null : h.id)}
                      className="text-xs text-text-muted hover:text-accent" title="Ver calendário">📅</button>
                    <button onClick={() => navigate(`/pomodoro?contexto_tipo=habito&contexto_id=${h.id}&nome=${encodeURIComponent(h.nome)}`)}
                      className="text-xs text-text-muted hover:text-accent" title="Iniciar Pomodoro">▶</button>
                    <button onClick={() => handleEdit(h)} className="text-xs text-text-muted hover:text-accent">✎</button>
                    <button onClick={() => setConfirmDeleteId({ id: h.id, nome: h.nome })}
                      className="text-xs text-text-muted hover:text-danger ml-1">✕</button>
                  </>
                )}
              </div>
            </div>
              {calendarOpenId === h.id && (
                <HabitoCalendario habitoId={h.id} cor={h.cor || '#5B8DEF'} />
              )}
            </div>
          </div>
        )})}
      </div>

      {confirmDeleteId && (
        <ConfirmModal
          titulo="Remover hábito"
          mensagem={`Tem certeza que deseja remover "${confirmDeleteId.nome}"?`}
          destructive
          confirmLabel="Remover"
          onConfirm={() => {
            deleteMut.mutate(confirmDeleteId.id)
            setConfirmDeleteId(null)
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}