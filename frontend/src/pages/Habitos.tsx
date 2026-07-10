import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getHabitos, createHabito, updateHabito, deleteHabito, createRegistro, deleteRegistro } from '../api/habitos'
import ConfirmModal from '../components/ConfirmModal'
import HabitoCalendario from '../components/HabitoCalendario'
import { hojeLocal } from '../utils/date'
import { useNotify } from '../store/notification'
import { broadcastInvalidate } from '../hooks/useBroadcastInvalidate'
import type { Habito } from '../types'
const TIPO_LABEL: Record<string, string> = { binario: 'Sim/Não', quantitativo: 'Contagem' }
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function DiasSemanaPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex gap-1">
      {DIAS.map((d, i) => {
        const active = value.includes(String(i))
        return (
          <button key={i} type="button" onClick={() => onChange(active ? value.filter(x => x !== String(i)) : [...value, String(i)])}
            className={`w-7 h-7 rounded text-[11px] font-medium transition-all active:scale-95 ${active ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-muted hover:bg-bg-hover'}`}
          >
            {d}
          </button>
        )
      })}
    </div>
  )
}
export default function Habitos() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const { data: habitos = [], isLoading, isError } = useQuery({
    queryKey: ['habitos'],
    queryFn: () => getHabitos(true),
    staleTime: 60_000,
  })
  const activeHabitos = useMemo(() => habitos.filter(h => h.ativo), [habitos])
  const archivedHabitos = useMemo(() => habitos.filter(h => !h.ativo), [habitos])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'binario' as 'binario' | 'quantitativo', categoria: '', meta: '', dias_semana: '' })
  const [formError, setFormError] = useState('')
  const [editFormError, setEditFormError] = useState('')
  const undoRef = useRef<{ habitoId: number; data: string } | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ nome: '', tipo: '' as string, categoria: '', meta: '', dias_semana: '' })
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ id: number; nome: string } | null>(null)
  const [calendarOpenId, setCalendarOpenId] = useState<number | null>(null)
  const [kebabOpenId, setKebabOpenId] = useState<number | null>(null)
  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof createHabito>[0]) => createHabito(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitos'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      broadcastInvalidate([['habitos']])
      setForm({ nome: '', tipo: 'binario', categoria: '', meta: '', dias_semana: '' })
      setShowForm(false)
    },
    onError: (e) => { console.error('[Habitos]', e); notify('Erro ao criar hábito') },
  })
  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setFormError('Informe o nome do hábito'); return }
    setFormError('')
    createMut.mutate({
      nome: form.nome,
      tipo: form.tipo,
      categoria: form.categoria || null,
      meta: form.meta ? parseFloat(form.meta) : null,
      dias_semana: form.dias_semana || null,
    })
  }
  function handleEdit(h: Habito) {
    setEditId(h.id)
    setEditForm({ nome: h.nome, tipo: h.tipo, categoria: h.categoria || '', meta: h.meta !== null ? String(h.meta) : '', dias_semana: h.dias_semana || '' })
  }
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateHabito>[1] }) => updateHabito(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitos'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      broadcastInvalidate([['habitos']])
      setEditId(null)
    },
    onError: (e) => { console.error('[Habitos]', e); notify('Erro ao atualizar hábito') },
  })
  function handleSaveEdit() {
    if (!editId) return
    if (!editForm.nome.trim()) { setEditFormError('Informe o nome do hábito'); return }
    setEditFormError('')
    updateMut.mutate({
      id: editId,
      data: {
        nome: editForm.nome,
        tipo: editForm.tipo as 'binario' | 'quantitativo',
        categoria: editForm.categoria || null,
        meta: editForm.meta ? parseFloat(editForm.meta) : null,
        dias_semana: editForm.dias_semana || null,
      },
    })
  }
  const checkMut = useMutation({
    mutationFn: ({ habitoId, feito }: { habitoId: number; feito: boolean }) =>
      createRegistro(habitoId, { habito_id: habitoId, data: hojeLocal(), valor: feito ? 1 : 0 }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['registros', variables.habitoId] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      broadcastInvalidate([['registros', variables.habitoId]])
      undoRef.current = { habitoId: variables.habitoId, data: hojeLocal() }
      notify('Check-in feito', 'success', {
        label: 'Desfazer',
        onClick: () => {
          if (!undoRef.current) return
          const { habitoId, data } = undoRef.current
          undoRef.current = null
          deleteRegistro(habitoId, data).then(() => {
            queryClient.invalidateQueries({ queryKey: ['registros', habitoId] })
            queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
            broadcastInvalidate([['registros', habitoId]])
            notify('Check-in desfeito', 'success')
          }).catch(e => { console.error('[Habitos] undo', e); notify('Erro ao desfazer check-in') })
        },
      })
    },
    onError: (e) => { console.error('[Habitos]', e); notify('Erro ao registrar hábito') },
  })
  function handleCheck(habitoId: number, feito: boolean) {
    checkMut.mutate({ habitoId, feito })
  }
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteHabito(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitos'] })
      queryClient.invalidateQueries({ queryKey: ['registros'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      broadcastInvalidate([['habitos'], ['registros']])
    },
    onError: (e) => { console.error('[Habitos]', e); notify('Erro ao excluir hábito') },
  })
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Hábitos</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-all active:scale-95">
          {showForm ? 'Cancelar' : '+ Novo hábito'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="bg-bg-secondary rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-text-muted mb-1">Nome</label>
              <input value={form.nome} onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); if (formError) setFormError('') }}
                className={`w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 ${formError ? 'ring-1 ring-danger border-danger' : 'focus:ring-accent'}`} />
              {formError && <p className="text-xs text-danger mt-0.5">{formError}</p>}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'binario' | 'quantitativo' }))}
                className="bg-bg-tertiary rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <option value="binario">Sim/Não (check-in diário)</option>
                <option value="quantitativo">Contagem (vezes, minutos, páginas)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Categoria</label>
              <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="bg-bg-tertiary rounded-lg px-3 py-2 text-sm w-28 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Dias da semana</label>
              <DiasSemanaPicker value={form.dias_semana ? form.dias_semana.split(',') : []}
                onChange={v => setForm(f => ({ ...f, dias_semana: v.join(',') }))} />
              <p className="text-[10px] text-text-muted mt-0.5">Em branco = todos os dias</p>
            </div>
            <button type="submit" disabled={createMut.isPending} className="px-4 py-2 bg-accent text-white text-sm rounded-lg transition-all active:scale-95 hover:bg-accent-hover disabled:opacity-50">{createMut.isPending ? 'Criando...' : 'Criar'}</button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            <strong>Sim/Não:</strong> marque se fez ou não o hábito hoje · <strong>Contagem:</strong> registre quantas vezes (ex: 3 copos d'água, 30min estudo)
          </p>
        </form>
      )}
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
        {isError && <p className="text-sm text-danger py-4 text-center">Erro ao carregar hábitos</p>}
        {!isLoading && !isError && activeHabitos.length === 0 && (
          <p className="text-sm text-text-muted py-4 text-center">Nenhum hábito criado ainda</p>
        )}
        {!isLoading && !isError && activeHabitos.map(h => {
          const editing = editId === h.id
          return (
          <div key={h.id} className="bg-bg-secondary rounded-xl border border-border p-4">
            <div className="flex flex-col gap-0">
            <div className="flex items-center justify-between">
              {editing ? (
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <input value={editForm.nome} onChange={e => { setEditForm(f => ({ ...f, nome: e.target.value })); if (editFormError) setEditFormError('') }}
                    className={`bg-bg-primary rounded px-2 py-1 text-sm w-32 outline-none ${editFormError ? 'ring-1 ring-danger border-danger' : ''}`} />
                  <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value }))}
                    className="bg-bg-primary rounded px-2 py-1 text-sm outline-none">
                    <option value="binario">Sim/Não</option>
                    <option value="quantitativo">Contagem</option>
                  </select>
                  <input value={editForm.categoria} onChange={e => setEditForm(f => ({ ...f, categoria: e.target.value }))}
                    placeholder="Categoria" className="bg-bg-primary rounded px-2 py-1 text-sm w-24 outline-none" />
                  <input value={editForm.meta} onChange={e => setEditForm(f => ({ ...f, meta: e.target.value }))}
                    placeholder="Meta" className="bg-bg-primary rounded px-2 py-1 text-sm w-16 outline-none" />
                  <DiasSemanaPicker value={editForm.dias_semana ? editForm.dias_semana.split(',') : []}
                    onChange={v => setEditForm(f => ({ ...f, dias_semana: v.join(',') }))} />
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
                {!editing && h.tipo === 'binario' && (
                  <button onClick={() => handleCheck(h.id, true)}
                    disabled={checkMut.isPending}
                    className="w-7 h-7 rounded-lg border border-border hover:bg-accent/20 hover:border-accent flex items-center justify-center text-xs transition-colors disabled:opacity-50"
                    title="Marcar como feito hoje">{checkMut.isPending ? '...' : '✔️'}</button>
                )}
                {!editing && h.tipo === 'quantitativo' && (
                  <button onClick={() => handleCheck(h.id, true)}
                    disabled={checkMut.isPending}
                    className="px-2 py-1 text-xs bg-bg-tertiary rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
                    title="Registrar contagem">{checkMut.isPending ? '...' : '+1'}</button>
                )}
                {editing ? (
                  <>
                    <button onClick={handleSaveEdit} disabled={updateMut.isPending} className="text-xs text-success disabled:opacity-50">{updateMut.isPending ? 'Salvando...' : 'Salvar'}</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-text-muted">Cancelar</button>
                  </>
                ) : (
                  <div className="relative">
                    <button onClick={() => setKebabOpenId(kebabOpenId === h.id ? null : h.id)}
                      className="px-1 text-text-muted hover:text-text-primary transition-colors text-lg leading-none">⋮</button>
                    {kebabOpenId === h.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setKebabOpenId(null)} />
                        <div className="absolute right-0 top-full mt-1 z-50 bg-bg-secondary border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                          <button onClick={() => { setKebabOpenId(null); setCalendarOpenId(calendarOpenId === h.id ? null : h.id) }}
                            className="w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2">📅 Calendário</button>
                          <button onClick={() => { setKebabOpenId(null); navigate(`/pomodoro?contexto_tipo=habito&contexto_id=${h.id}&nome=${encodeURIComponent(h.nome)}`) }}
                            className="w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2">⏱️ Pomodoro</button>
                          <button onClick={() => { setKebabOpenId(null); handleEdit(h) }}
                            className="w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2">✏️ Editar</button>
                          <hr className="border-border my-1" />
                          <button onClick={() => { setKebabOpenId(null); setConfirmDeleteId({ id: h.id, nome: h.nome }) }}
                            className="w-full text-left px-3 py-1.5 text-sm text-danger hover:bg-bg-hover transition-colors flex items-center gap-2">🗑️ Excluir</button>
                        </div>
                      </>
                    )}
                  </div>
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
      {archivedHabitos.length > 0 && (
        <details className="mt-8">
          <summary className="text-sm text-text-muted cursor-pointer hover:text-text-primary transition-colors select-none">
            Hábitos arquivados ({archivedHabitos.length})
          </summary>
          <div className="mt-2 space-y-2">
            {archivedHabitos.map(h => (
              <div key={h.id} className="bg-bg-secondary rounded-lg border border-border px-4 py-2 flex items-center justify-between text-sm opacity-60">
                <span>{h.nome}</span>
                <button onClick={() => updateMut.mutate({ id: h.id, data: { ativo: true } })}
                  className="text-xs text-accent hover:underline">Reativar</button>
              </div>
            ))}
          </div>
        </details>
      )}

      {confirmDeleteId && (
        <ConfirmModal
          titulo="Remover hábito"
          mensagem={`Tem certeza que deseja remover "${confirmDeleteId.nome}"?`}
          destructive
          confirmLabel="Remover"
          disabled={deleteMut.isPending}
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