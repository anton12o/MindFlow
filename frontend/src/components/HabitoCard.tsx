import { useState } from 'react'
import DiasSemanaPicker from './DiasSemanaPicker'
import HabitoCalendario from './HabitoCalendario'
import type { Habito } from '../types'

const TIPO_LABEL: Record<string, string> = { binario: 'Sim/Não', quantitativo: 'Contagem' }

interface EditFormState {
  nome: string
  tipo: string
  categoria: string
  meta: string
  dias_semana: string
}

interface Props {
  habit: Habito
  onCheck: (habitoId: number) => void
  onSave: (id: number, data: Partial<Habito>) => void
  onDelete: (id: number) => void
  onPomodoro: (habitoId: number, nome: string) => void
  isCheckPending: boolean
  isSavePending: boolean
}

export default function HabitoCard({ habit, onCheck, onSave, onDelete, onPomodoro, isCheckPending, isSavePending }: Props) {
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditFormState>({ nome: '', tipo: '', categoria: '', meta: '', dias_semana: '' })
  const [editError, setEditError] = useState('')
  const [kebabOpen, setKebabOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  function startEdit() {
    setEditForm({
      nome: habit.nome,
      tipo: habit.tipo,
      categoria: habit.categoria || '',
      meta: habit.meta !== null ? String(habit.meta) : '',
      dias_semana: habit.dias_semana || '',
    })
    setEditing(true)
    setKebabOpen(false)
  }

  function handleSave() {
    if (!editForm.nome.trim()) { setEditError('Informe o nome do hábito'); return }
    if (editForm.meta && isNaN(parseFloat(editForm.meta))) { setEditError('Meta deve ser um número'); return }
    setEditError('')
    onSave(habit.id, {
      nome: editForm.nome,
      tipo: editForm.tipo as 'binario' | 'quantitativo',
      categoria: editForm.categoria || null,
      meta: editForm.meta ? parseFloat(editForm.meta) : null,
      dias_semana: editForm.dias_semana || null,
    })
    setEditing(false)
  }

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4">
      <div className="flex flex-col gap-0">
        <div className="flex items-center justify-between">
          {editing ? (
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input value={editForm.nome} onChange={e => { setEditForm(f => ({ ...f, nome: e.target.value })); if (editError) setEditError('') }}
                className={`bg-bg-primary rounded px-2 py-1 text-sm w-32 outline-none ${editError ? 'ring-1 ring-danger border-danger' : ''}`} />
              <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value }))}
                className="bg-bg-primary rounded px-2 py-1 text-sm outline-none">
                <option value="binario">Sim/Não</option>
                <option value="quantitativo">Contagem</option>
              </select>
              <input value={editForm.categoria} onChange={e => setEditForm(f => ({ ...f, categoria: e.target.value }))}
                placeholder="Categoria" className="bg-bg-primary rounded px-2 py-1 text-sm w-24 outline-none" />
              <input value={editForm.meta} onChange={e => setEditForm(f => ({ ...f, meta: e.target.value }))}
                placeholder="Meta" className="bg-bg-primary rounded px-2 py-1 text-sm w-20 outline-none" />
              <DiasSemanaPicker value={editForm.dias_semana ? editForm.dias_semana.split(',') : []}
                onChange={v => setEditForm(f => ({ ...f, dias_semana: v.join(',') }))} />
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: habit.cor || '#5B8DEF' }} aria-label={`Cor: ${habit.cor || '#5B8DEF'}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{habit.nome}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-bg-tertiary text-text-muted font-bold">
                    {TIPO_LABEL[habit.tipo] || habit.tipo}
                  </span>
                </div>
                {habit.categoria && <span className="text-xs text-text-muted">{habit.categoria}</span>}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {!editing && habit.tipo === 'binario' && (
              <button onClick={() => onCheck(habit.id)}
                disabled={isCheckPending}
                className="w-9 h-9 rounded-lg border border-border hover:bg-accent/20 hover:border-accent flex items-center justify-center text-xs transition-colors disabled:opacity-disabled"
                title="Marcar como feito hoje">{isCheckPending ? '...' : '✔️'}</button>
            )}
            {!editing && habit.tipo === 'quantitativo' && (
              <button onClick={() => onCheck(habit.id)}
                disabled={isCheckPending}
                className="px-2 py-1 text-xs bg-bg-tertiary rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-disabled"
                title="Registrar contagem">{isCheckPending ? '...' : '+1'}</button>
            )}
            {editing ? (
              <>
                <button onClick={handleSave} disabled={isSavePending} className="text-xs text-success disabled:opacity-disabled">{isSavePending ? 'Salvando...' : 'Salvar'}</button>
                <button onClick={() => setEditing(false)} className="text-xs text-text-muted">Cancelar</button>
              </>
            ) : (
              <div className="relative">
                <button onClick={() => setKebabOpen(!kebabOpen)}
                  className="px-2 min-w-11 min-h-11 text-text-muted hover:text-text-primary transition-colors text-lg leading-none">⋮</button>
                {kebabOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setKebabOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-bg-secondary border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                      <button onClick={() => { setKebabOpen(false); setCalendarOpen(!calendarOpen) }}
                        className="w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2">📅 Calendário</button>
                      <button onClick={() => { setKebabOpen(false); onPomodoro(habit.id, habit.nome) }}
                        className="w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2">⏱️ Pomodoro</button>
                      <button onClick={startEdit}
                        className="w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2">✏️ Editar</button>
                      <hr className="border-border my-1" />
                      <button onClick={() => { setKebabOpen(false); onDelete(habit.id) }}
                        className="w-full text-left px-3 py-1.5 text-sm text-danger hover:bg-bg-hover transition-colors flex items-center gap-2">🗑️ Excluir</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {calendarOpen && (
          <HabitoCalendario habitoId={habit.id} cor={habit.cor || '#5B8DEF'} />
        )}
      </div>
    </div>
  )
}
