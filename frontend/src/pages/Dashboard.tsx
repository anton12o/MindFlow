import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTarefas, getBlocos, updateTarefa } from '../api/rotina'
import { getHabitos, getRegistros, createRegistro } from '../api/habitos'
import { getInbox } from '../api/inbox'
import PomodoroTimer from '../components/PomodoroTimer'
import { formatDateLocal, hojeLocal } from '../utils/date'
import type { Habito, Tarefa } from '../types'

function calcStreak(registros: { data: string }[]): number {
  const dias = new Set(registros.map(r => r.data))
  let streak = 0
  const d = new Date()
  while (true) {
    const chave = formatDateLocal(d)
    if (dias.has(chave)) { streak++; d.setDate(d.getDate() - 1) }
    else break
  }
  return streak
}

function Card({ titulo, children, loading, erro, vazio }: {
  titulo: string; children: React.ReactNode; loading?: boolean; erro?: boolean; vazio?: boolean
}) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">{titulo}</h2>
      {loading && <p className="text-sm text-text-muted py-4 text-center animate-pulse">Carregando...</p>}
      {erro && <p className="text-sm text-danger py-4">Erro ao carregar</p>}
      {vazio && <p className="text-sm text-text-muted py-4 text-center">Nenhum item</p>}
      {!loading && !erro && !vazio && children}
    </div>
  )
}

export default function Dashboard() {
  const hoje = hojeLocal()
  const queryClient = useQueryClient()
  const queryKey = ['dashboard', 'tarefas', hoje]

  const { data: blocos, isLoading: blocosLoad, isError: blocosErr } = useQuery({
    queryKey: ['dashboard', 'blocos', hoje],
    queryFn: () => getBlocos(hoje),
  })

  const { data: tarefas, isLoading: tarefasLoad, isError: tarefasErr } = useQuery({
    queryKey,
    queryFn: () => getTarefas(hoje),
  })

  const { data: habitos, isLoading: habLoad, isError: habErr } = useQuery({
    queryKey: ['dashboard', 'habitos'],
    queryFn: () => getHabitos(true),
  })

  const { data: inbox, isLoading: inbLoad, isError: inbErr } = useQuery({
    queryKey: ['dashboard', 'inbox'],
    queryFn: () => getInbox(false),
  })

  const pending = tarefas?.filter(t => t.status !== 'feito') || []
  const pendentes = inbox?.length || 0

  const toggleTarefaMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTarefa(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['rotina', 'tarefas'] })
      queryClient.invalidateQueries({ queryKey: ['tarefas'] })
    },
  })

  const checkHabitoMut = useMutation({
    mutationFn: ({ habitoId, data }: { habitoId: number; data: string }) =>
      createRegistro(habitoId, { habito_id: habitoId, data, valor: 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'habitos'] }),
  })

  function handleToggleTarefa(t: Tarefa) {
    if (toggleTarefaMut.isPending) return
    toggleTarefaMut.mutate({ id: t.id, status: t.status === 'feito' ? 'pendente' : 'feito' })
  }

  function handleCheckHabito(id: number) {
    if (checkHabitoMut.isPending) return
    checkHabitoMut.mutate({ habitoId: id, data: hoje })
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Inbox */}
        <Card titulo="📥 Inbox" loading={inbLoad} erro={inbErr} vazio={pendentes === 0 && !inbLoad && !inbErr}>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">{pendentes} {pendentes === 1 ? 'item pendente' : 'itens pendentes'}</span>
            <button onClick={() => window.dispatchEvent(new Event('open-inbox'))}
              className="px-4 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
              Abrir inbox
            </button>
          </div>
        </Card>

        {/* Blocos do dia */}
        <Card titulo="⏰ Blocos do dia" loading={blocosLoad} erro={blocosErr} vazio={(!blocos || blocos.length === 0) && !blocosLoad && !blocosErr}>
          {blocos?.map(b => (
            <div key={b.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <span className="text-xs font-mono text-text-secondary w-20 shrink-0">{b.hora_inicio}–{b.hora_fim}</span>
              <span className="text-sm truncate" style={{ color: b.cor || undefined }}>{b.titulo}</span>
            </div>
          ))}
        </Card>

        {/* Tarefas de hoje */}
        <Card titulo="✅ Tarefas de hoje" loading={tarefasLoad} erro={tarefasErr} vazio={pending.length === 0 && !tarefasLoad && !tarefasErr}>
          {tarefas?.map(t => (
            <div key={t.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
              <button onClick={() => handleToggleTarefa(t)}
                className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-xs transition-colors
                  ${t.status === 'feito' ? 'bg-accent border-accent text-white' : 'border-border hover:border-accent'}`}>
                {t.status === 'feito' ? '✓' : ''}
              </button>
              <span className={`text-sm flex-1 ${t.status === 'feito' ? 'line-through text-text-muted' : ''}`}>{t.titulo}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.prioridade === 'alta' ? 'bg-danger/20 text-danger' : t.prioridade === 'baixa' ? 'bg-text-muted/20 text-text-muted' : 'bg-warning/20 text-warning'}`}>
                {t.prioridade}
              </span>
            </div>
          ))}
          {tarefas && tarefas.length > 0 && pending.length === 0 && (
            <p className="text-xs text-success mt-2">Todas as tarefas concluídas ✓</p>
          )}
        </Card>

        {/* Hábitos */}
        <Card titulo="🎯 Hábitos" loading={habLoad} erro={habErr} vazio={(!habitos || habitos.filter(h => h.ativo).length === 0) && !habLoad && !habErr}>
          {habitos?.filter(h => h.ativo).slice(0, 6).map(h => <HabitItem key={h.id} h={h} hoje={hoje} onCheck={handleCheckHabito} />)}
        </Card>

        {/* Foco */}
        <div className="bg-bg-secondary rounded-xl border border-border p-4 md:col-span-2">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">🎯 Foco</h2>
          <PomodoroTimer />
        </div>

      </div>
    </div>
  )
}

function HabitItem({ h, hoje, onCheck }: { h: Habito; hoje: string; onCheck: (id: number) => void }) {
  const { data: registros } = useQuery({
    queryKey: ['dashboard', 'registros', h.id],
    queryFn: () => getRegistros(h.id),
  })
  const streak = registros ? calcStreak(registros) : 0
  const feitoHoje = registros?.some(r => r.data === hoje)

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.cor || '#5B8DEF' }} />
        <span className="text-sm truncate">{h.nome}</span>
        {streak > 0 && <span className="text-[10px] text-accent font-medium shrink-0">🔥{streak}</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {feitoHoje ? (
          <span className="text-xs text-success">✓</span>
        ) : (
          <button onClick={() => onCheck(h.id)}
            className="w-6 h-6 rounded border border-border hover:bg-accent/20 hover:border-accent flex items-center justify-center text-xs transition-colors"
            title="Marcar hoje">✓</button>
        )}
      </div>
    </div>
  )
}
