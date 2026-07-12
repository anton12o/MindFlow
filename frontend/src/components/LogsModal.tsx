import { useState, useEffect, useRef, startTransition } from 'react'
import { getLogs, clearLogs, type LogEntryResponse } from '../api/logs'
import { useFocusTrap } from '../hooks/useFocusTrap'
import ConfirmModal from './ConfirmModal'

interface Props {
  onClose: () => void
}

export default function LogsModal({ onClose }: Props) {
  const [entries, setEntries] = useState<LogEntryResponse[]>([])
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true)

  function load() {
    setLoading(true)
    getLogs(50, levelFilter || undefined)
      .then(r => setEntries(r.entries))
      .catch(e => { console.error('[LogsModal]', e); setEntries([]) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { startTransition(() => load()) }, [levelFilter])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div ref={ref} className="bg-bg-secondary rounded-xl border border-border w-full max-w-3xl max-h-[80vh] mx-4 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">Logs de Erro</h2>
          <div className="flex items-center gap-2">
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
              className="bg-bg-tertiary rounded px-2 py-1 text-xs outline-none">
              <option value="">Todos os níveis</option>
              <option value="ERROR">ERROR</option>
              <option value="WARNING">WARNING</option>
              <option value="INFO">INFO</option>
            </select>
            <button onClick={load} className="px-3 py-1 bg-bg-tertiary text-text-primary text-xs rounded-lg hover:bg-bg-hover">Recarregar</button>
            <button onClick={() => setConfirmClear(true)} className="px-3 py-1 bg-danger/20 text-danger text-xs rounded-lg hover:bg-danger/30">Limpar</button>
            <button onClick={onClose} className="px-3 py-1 bg-bg-tertiary text-text-primary text-xs rounded-lg hover:bg-bg-hover">Fechar</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loading && <p className="text-sm text-text-muted text-center animate-pulse">Carregando...</p>}
          {!loading && entries.length === 0 && <p className="text-sm text-text-muted text-center">Nenhum log encontrado</p>}
          {!loading && entries.map((e, i) => (
            <div key={`${e.timestamp}-${e.level}-${i}`} className="text-xs font-mono bg-bg-tertiary rounded-lg px-3 py-2 leading-relaxed">
              <span className="text-text-muted">[{e.timestamp}]</span>{' '}
              <span className={e.level === 'ERROR' ? 'text-danger' : e.level === 'WARNING' ? 'text-warning' : 'text-text-muted'}>
                [{e.level}]
              </span>{' '}
              <span className="text-text-secondary">[{e.module}]</span>{' '}
              <span className="text-text-primary">{e.message}</span>
            </div>
          ))}
        </div>
      </div>
      {confirmClear && (
        <ConfirmModal
          titulo="Limpar logs"
          mensagem="Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita."
          destructive
          confirmLabel="Limpar"
          onConfirm={() => { clearLogs().then(load).catch(e => console.error('[LogsModal] clearLogs', e)); setConfirmClear(false) }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  )
}
