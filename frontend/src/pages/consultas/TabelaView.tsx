import { useState, useMemo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

type SortDir = 'asc' | 'desc' | null

interface Props {
  result: { dados: Record<string, unknown>[]; truncated?: boolean } | undefined
  resLoad: boolean
  resErr: boolean
  errorMsg?: string
}

export default function TabelaView({ result, resLoad, resErr, errorMsg }: Props) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  function handleHeader(col: string) {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') { setSortCol(null); setSortDir(null) }
      else { setSortCol(col); setSortDir('asc') }
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const cols = useMemo(() => {
    if (!result?.dados?.length) return []
    return Array.from(new Set(result.dados.flatMap(Object.keys)))
  }, [result])

  const sorted = useMemo(() => {
    if (!result?.dados) return []
    const items = [...result.dados]
    if (sortCol && sortDir) {
      items.sort((a, b) => {
        const va = a[sortCol]
        const vb = b[sortCol]
        if (va == null && vb == null) return 0
        if (va == null) return 1
        if (vb == null) return -1
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va
        }
        const sa = String(va)
        const sb = String(vb)
        return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa)
      })
    }
    return items
  }, [result, sortCol, sortDir])

  if (resLoad) return <p className="text-text-muted text-sm text-center py-4 animate-pulse">Carregando...</p>
  if (resErr) return <p className="text-danger text-sm text-center py-4">{errorMsg || 'Erro ao carregar'}</p>
  if (!sorted.length) return <p className="text-text-muted text-sm text-center py-4">Nenhum resultado</p>

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ArrowUpDown size={12} className="opacity-40" />
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            {cols.map(col => (
              <th key={col} onClick={() => handleHeader(col)}
                className="text-left px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-accent transition-colors select-none">
                <div className="flex items-center gap-1">
                  <span>{col}</span>
                  <SortIcon col={col} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => (
            <tr key={item.id as number ?? i} className="border-b border-border last:border-0 hover:bg-bg-hover transition-colors">
              {cols.map(col => (
                <td key={col} className="px-3 py-2 text-text-primary truncate max-w-[200px]">
                  {formatCell(item[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatCell(val: unknown): string {
  if (val == null) return '—'
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não'
  return String(val)
}
