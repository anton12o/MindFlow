import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Plus, Table } from 'lucide-react'

const escPipe = (s: string) => s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')

interface Props {
  isOpen: boolean
  onClose: () => void
  onInsert: (markdown: string) => void
  initialMarkdown?: string
}

function parseMarkdownTable(md: string) {
  const lines = md.split('\n').filter(l => l.trim())
  if (lines.length < 2) return null
  const headers = lines[0].split('|').filter(s => s.trim()).map(s => s.trim())
  const rows = lines.slice(2).filter(l => /^\|/.test(l)).map(l =>
    l.split('|').filter(s => s.trim()).map(s => s.trim())
  )
  return { headers, rows }
}

const TableEditorModal = React.memo(function TableEditorModal({ isOpen, onClose, onInsert, initialMarkdown }: Props) {
  const [headers, setHeaders] = useState<string[]>(['col1', 'col2'])
  const [rows, setRows] = useState<string[][]>([['', '']])
  const cellRefs = useRef<(HTMLTextAreaElement | null)[]>([])
  const colIdRef = useRef(3)

  useEffect(() => {
    if (!isOpen) return
    if (initialMarkdown) {
      const parsed = parseMarkdownTable(initialMarkdown)
      if (parsed && parsed.headers.length > 0) {
        setHeaders(parsed.headers)
        setRows(parsed.rows.length > 0 ? parsed.rows : [Array(parsed.headers.length).fill('')])
        colIdRef.current = parsed.headers.length + 1
        return
      }
    }
    setHeaders(['col1', 'col2'])
    setRows([['', '']])
    colIdRef.current = 3
  }, [isOpen, initialMarkdown])

  const focusCell = useCallback((rowIdx: number, colIdx: number) => {
    const idx = rowIdx * headers.length + colIdx
    const el = cellRefs.current[idx]
    if (el) { el.focus(); el.select() }
  }, [headers.length])

  const updateCell = useCallback((rowIdx: number, colIdx: number, value: string) => {
    setRows(prev => {
      const next = prev.map(r => [...r])
      next[rowIdx][colIdx] = value
      return next
    })
  }, [])

  const updateHeader = useCallback((colIdx: number, value: string) => {
    setHeaders(prev => {
      const next = [...prev]
      next[colIdx] = value
      return next
    })
  }, [])

  const headersLenRef = useRef(headers.length)
  useEffect(() => { headersLenRef.current = headers.length }, [headers.length])

  const nextColName = useCallback(() => {
    const id = colIdRef.current
    colIdRef.current = id + 1
    return `col${id}`
  }, [])

  const addRow = useCallback(() => {
    setRows(prev => [...prev, Array(headersLenRef.current).fill('')])
  }, [])

  const insertRowAt = useCallback((afterIdx: number) => {
    setRows(prev => {
      const next = [...prev]
      next.splice(afterIdx + 1, 0, Array(headersLenRef.current).fill(''))
      return next
    })
  }, [])

  const addColumn = useCallback(() => {
    const name = nextColName()
    setHeaders(prev => [...prev, name])
    setRows(prev => prev.map(r => [...r, '']))
  }, [nextColName])

  const insertColumnAt = useCallback((afterIdx: number) => {
    setHeaders(prev => {
  const next = [...prev]
      next.splice(afterIdx + 1, 0, '')
      return next
    })
    setRows(prev => prev.map(r => {
      const next = [...r]
      next.splice(afterIdx + 1, 0, '')
      return next
    }))
  }, [nextColName])

  const deleteRow = useCallback((rowIdx: number) => {
    setRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== rowIdx) : prev)
  }, [])

  const deleteColumn = useCallback((colIdx: number) => {
    if (headers.length <= 1) return
    setHeaders(prev => prev.filter((_, i) => i !== colIdx))
    setRows(prev => prev.map(r => r.filter((_, i) => i !== colIdx)))
  }, [headers.length])

  const generateMarkdown = useCallback((): string => {
    const h = `| ${headers.map(escPipe).join(' | ')} |`
    const sep = `| ${headers.map(() => '---').join(' | ')} |`
    const body = rows.map(r => `| ${r.map(escPipe).join(' | ')} |`).join('\n')
    return `${h}\n${sep}\n${body}`
  }, [headers, rows])

  const handleInsert = useCallback(() => {
    onInsert(generateMarkdown())
    onClose()
  }, [generateMarkdown, onInsert, onClose])

  const navigateCell = useCallback((rowIdx: number, colIdx: number, dr: number, dc: number) => {
    const nr = rowIdx + dr
    const nc = colIdx + dc
    if (nr < 0 || nr >= rows.length || nc < 0 || nc >= headers.length) return
    focusCell(nr, nc)
  }, [rows.length, headers.length, focusCell])

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const dc = e.shiftKey ? -1 : 1
      const nc = colIdx + dc
      if (nc < 0 || nc >= headers.length) {
        const nr = rowIdx + dc
        if (nr < 0 || nr >= rows.length) return
        const wrapCol = e.shiftKey ? headers.length - 1 : 0
        focusCell(nr, wrapCol)
      } else {
        focusCell(rowIdx, nc)
      }
      return
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      if (rowIdx === rows.length - 1) {
        addRow()
        setTimeout(() => focusCell(rowIdx + 1, colIdx), 0)
      }
      return
    }
    if (e.key === 'ArrowUp') { e.preventDefault(); navigateCell(rowIdx, colIdx, -1, 0); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateCell(rowIdx, colIdx, 1, 0); return }
    if (e.key === 'ArrowLeft' && (e.target as HTMLTextAreaElement).selectionStart === 0 && (e.target as HTMLTextAreaElement).selectionEnd === 0) {
      e.preventDefault(); navigateCell(rowIdx, colIdx, 0, -1); return
    }
    if (e.key === 'ArrowRight' && (e.target as HTMLTextAreaElement).selectionStart === (e.target as HTMLTextAreaElement).value.length) {
      e.preventDefault(); navigateCell(rowIdx, colIdx, 0, 1); return
    }
  }, [rows.length, headers.length, focusCell, navigateCell, addRow])

  const handlePaste = useCallback((e: React.ClipboardEvent, rowIdx: number, colIdx: number) => {
    const data = e.clipboardData.getData('text/plain')
    if (!data) return
    const lines = data.split(/\r?\n/).filter(l => l.trim() !== '')
    if (lines.length <= 1 && !data.includes('\t')) return
    e.preventDefault()
    const parts = lines.map(l => l.split('\t'))
    const maxCols = Math.max(...parts.map(p => p.length))
    const neededCols = colIdx + maxCols - headers.length
    if (neededCols > 0) {
      const newHeaders = Array.from({ length: neededCols }, (_, i) => `col${headers.length + i + 1}`)
      setHeaders(prev => [...prev, ...newHeaders])
      setRows(prev => prev.map(r => [...r, ...Array(neededCols).fill('')]))
    }
    const neededRows = rowIdx + parts.length - rows.length
    if (neededRows > 0) {
      setRows(prev => [...prev, ...Array.from({ length: neededRows }, () => Array(headers.length + neededCols).fill(''))])
    }
    setRows(prev => {
      const next = prev.map(r => [...r])
      for (let ri = 0; ri < parts.length; ri++) {
        for (let ci = 0; ci < parts[ri].length; ci++) {
          const targetR = rowIdx + ri
          const targetC = colIdx + ci
          if (next[targetR]) next[targetR][targetC] = parts[ri][ci]
        }
      }
      return next
    })
  }, [headers.length, rows.length])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose} role="dialog" aria-modal="true" aria-label="Editor de tabela">
      <div className="bg-bg-secondary border border-border rounded-lg shadow-[--elevation-6] w-full max-w-2xl max-h-[80vh] flex flex-col m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Table size={16} /> Editor de Tabela
          </div>
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-6"></th>
                {headers.map((h, ci) => (
                  <th key={ci} className="border border-border p-1 relative group">
                    <div className="flex items-center gap-1">
                      <span className="flex-1">
                        <textarea
                          value={h}
                          onChange={e => updateHeader(ci, e.target.value)}
                          className="w-full bg-bg-tertiary text-text-primary text-xs font-semibold px-2 py-1 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-accent text-center resize-none overflow-hidden"
                          rows={1}
                          placeholder={`col${ci + 1}`}
                        />
                      </span>
                      <button
                        onClick={() => deleteColumn(ci)}
                        disabled={headers.length <= 1}
                        className="shrink-0 p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-disabled disabled:cursor-not-allowed"
                        title="Remover coluna"
                        aria-label={`Remover coluna ${ci + 1}`}
                      >
                        <X size={10} />
                      </button>
                    </div>
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => insertColumnAt(ci)}
                        className="p-1 rounded-full bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm"
                        title="Inserir coluna à direita"
                        aria-label={`Inserir coluna após ${ci + 1}`}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="w-8 p-1">
                  <button onClick={addColumn} className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" title="Adicionar coluna" aria-label="Adicionar coluna">
                    <Plus size={12} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="group/row">
                  <td className="border border-border p-1 w-6 text-center relative">
                    <span className="text-xs text-text-muted select-none">{ri + 1}</span>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <button
                        onClick={() => insertRowAt(ri)}
                        className="p-1 rounded-full bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm"
                        title="Inserir linha abaixo"
                        aria-label={`Inserir linha após ${ri + 1}`}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </td>
                  {row.map((cell, ci) => {
                    const cellIdx = ri * headers.length + ci
                    return (
                      <td key={ci} className="border border-border p-1">
                        <textarea
                          ref={el => { cellRefs.current[cellIdx] = el }}
                          value={cell}
                          onChange={e => updateCell(ri, ci, e.target.value)}
                          onKeyDown={e => handleCellKeyDown(e, ri, ci)}
                          onPaste={e => handlePaste(e, ri, ci)}
                          className="w-full bg-transparent text-text-primary text-xs px-2 py-1 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-accent resize-none overflow-hidden"
                          rows={1}
                          placeholder="..."
                        />
                      </td>
                    )
                  })}
                  <td className="border border-border p-1 w-8">
                    <button
                      onClick={() => deleteRow(ri)}
                      disabled={rows.length <= 1}
                      className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-disabled disabled:cursor-not-allowed opacity-0 group-hover/row:opacity-100"
                      title="Remover linha"
                      aria-label={`Remover linha ${ri + 1}`}
                    >
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button onClick={addRow} className="flex items-center gap-1 px-2 py-1 text-xs font-normal text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-hover rounded transition-colors">
              <Plus size={12} /> Linha
            </button>
            <button onClick={addColumn} className="flex items-center gap-1 px-2 py-1 text-xs font-normal text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-hover rounded transition-colors">
              <Plus size={12} /> Coluna
            </button>
          </div>

          <div className="mt-4">
            <div className="text-xs font-normal text-text-muted mb-1">Preview</div>
            <div className="bg-bg-primary border border-border rounded p-3 overflow-auto">
              <table className="w-full border-collapse border border-border my-2">
                <thead>
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="border border-border px-2 py-1 text-left text-xs font-semibold text-text-primary">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((c, ci) => (
                        <td key={ci} className="border border-border px-2 py-1 text-xs text-text-primary">{c || ' '}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-text-muted mt-1">
              Dica: cole dados de planilhas (Ctrl+V) — Tab e Setas navegam, Ctrl+Enter nova linha
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-normal text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-hover rounded transition-colors">
            Cancelar
          </button>
          <button onClick={handleInsert} className="px-3 py-1.5 text-xs font-semibold text-accent-foreground bg-accent hover:bg-accent-hover rounded transition-colors">
            Inserir
          </button>
        </div>
      </div>
    </div>
  )
})

export default TableEditorModal
