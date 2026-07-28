import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getHabitos, createHabito, updateHabito, deleteHabito, createRegistro, deleteRegistro } from '../api/habitos'
import ConfirmModal from '../components/ConfirmModal'
import HabitoForm from '../components/HabitoForm'
import HabitoCard from '../components/HabitoCard'
import { hojeLocal } from '../utils/date'
import { useNotify } from '../store/notification'
import { broadcastInvalidate } from '../hooks/useBroadcastInvalidate'
import type { Habito } from '../types'

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
  const undoRef = useRef<{ habitoId: number; data: string } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ id: number; nome: string } | null>(null)
  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof createHabito>[0]) => createHabito(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitos'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      broadcastInvalidate([['habitos']])
      setShowForm(false)
      notify('Hábito criado', 'success')
    },
    onError: (e) => { console.error('[Habitos]', e); notify('Erro ao criar hábito') },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateHabito>[1] }) => updateHabito(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitos'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      broadcastInvalidate([['habitos']])
    },
    onError: (e) => { console.error('[Habitos]', e); notify('Erro ao atualizar hábito') },
  })
  const checkMut = useMutation({
    mutationFn: (habitoId: number) =>
      createRegistro(habitoId, { habito_id: habitoId, data: hojeLocal(), valor: 1 }),
    onSuccess: (_data, habitoId) => {
      queryClient.invalidateQueries({ queryKey: ['registros', habitoId] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas'] })
      broadcastInvalidate([['registros', habitoId]])
      undoRef.current = { habitoId, data: hojeLocal() }
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Hábitos</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 bg-accent text-accent-foreground text-sm rounded-lg hover:bg-accent-hover transition-all active:scale-95">
          {showForm ? 'Cancelar' : '+ Novo hábito'}
        </button>
      </div>
      {showForm && (
        <HabitoForm
          onSubmit={(data) => createMut.mutate(data)}
          onCancel={() => setShowForm(false)}
          isPending={createMut.isPending}
        />
      )}
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
        {isError && <p className="text-sm text-danger py-4 text-center">Erro ao carregar hábitos</p>}
        {!isLoading && !isError && activeHabitos.length === 0 && (
          <p className="text-sm text-text-muted py-4 text-center">Nenhum hábito criado ainda</p>
        )}
        {!isLoading && !isError && activeHabitos.map(h => (
          <HabitoCard
            key={h.id}
            habit={h}
            onCheck={(id) => checkMut.mutate(id)}
            onSave={(id, data) => updateMut.mutate({ id, data })}
            onDelete={(id) => setConfirmDeleteId({ id, nome: h.nome })}
            onPomodoro={(id, nome) => navigate(`/pomodoro?contexto_tipo=habito&contexto_id=${id}&nome=${encodeURIComponent(nome)}`)}
            isCheckPending={checkMut.isPending}
            isSavePending={updateMut.isPending}
          />
        ))}
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