import React, { useRef, useCallback, useEffect, useState } from 'react'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { EditorState, Transaction } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { foldGutter } from '@codemirror/language'
import { defaultKeymap, indentWithTab, undo, redo, history } from '@codemirror/commands'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import { Bold, Italic, Strikethrough, Code, Sigma, List, ListOrdered, CheckSquare, TextQuote, Link2, Table, Minus, RemoveFormatting, Undo2, Redo2 } from 'lucide-react'
import { useTheme } from '../store/theme'
import { htmlToMarkdown } from '../utils/pasteHandler'

interface Props {
  value: string
  onChange: (value: string) => void
  notas?: { id: number; titulo: string }[]
}

const EditorMarkdown = React.memo(function EditorMarkdown({ value, onChange, notas }: Props) {
  const { theme } = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value })
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const notasRef = useRef(notas)
  notasRef.current = notas
  useEffect(() => {
    if (!ref.current || viewRef.current) return

    const startState = EditorState.create({
      doc: valueRef.current,
      extensions: [
        history(),
        foldGutter(),
        placeholder("Escreva sua nota aqui\u2026 Use [[wikilink]] para conectar ideias"),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ spellcheck: 'true' }),
        markdown({ base: markdownLanguage }),
        python(),
        javascript(),
        sql(),
        theme === 'dark' ? oneDark : [],
        keymap.of([...defaultKeymap,
          { key: 'Mod-b', run: (target) => {
            const { from, to } = target.state.selection.main
            const selected = target.state.sliceDoc(from, to)
            if (selected.startsWith('**') && selected.endsWith('**')) {
              target.dispatch({ changes: { from, to, insert: selected.slice(2, -2) } })
            } else {
              target.dispatch({ changes: { from, to, insert: `**${selected}**` } })
            }
            return true
          }},
          { key: 'Mod-i', run: (target) => {
            const { from, to } = target.state.selection.main
            const selected = target.state.sliceDoc(from, to)
            if (selected.startsWith('*') && selected.endsWith('*') && !selected.startsWith('**')) {
              target.dispatch({ changes: { from, to, insert: selected.slice(1, -1) } })
            } else {
              target.dispatch({ changes: { from, to, insert: `*${selected}*` } })
            }
            return true
          }},
          { key: 'Mod-Shift-x', run: (target) => {
            const { from, to } = target.state.selection.main
            const selected = target.state.sliceDoc(from, to)
            if (selected.startsWith('~~') && selected.endsWith('~~')) {
              target.dispatch({ changes: { from, to, insert: selected.slice(2, -2) } })
            } else {
              target.dispatch({ changes: { from, to, insert: `~~${selected}~~` } })
            }
            return true
          }},
          { key: 'Mod-Shift-k', run: (target) => {
            target.dispatch({
              changes: { from: target.state.selection.main.from, insert: '- [ ] ' },
            })
            return true
          }},
          { key: 'Mod-=', run: (target) => {
            const { from, to } = target.state.selection.main
            const expr = target.state.sliceDoc(from, to).trim()
            if (!expr) return true
            try {
              if (!/^[\d\s+\-*/().%]+$/.test(expr)) return true
              const result = eval(expr)
              if (typeof result === 'number' && isFinite(result)) {
                target.dispatch({ changes: { from, to, insert: String(result) } })
              }
            } catch { /* expression invalida */ }
            return true
          }},
          { key: 'Mod-Shift-t', run: (target) => {
            const now = new Date()
            const pad = (n: number) => String(n).padStart(2, '0')
            const ts = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`
            target.dispatch({ changes: { from: target.state.selection.main.from, insert: ts } })
            return true
          }},
          indentWithTab,
        ]),
        EditorView.updateListener.of(update => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString())
        }),
        EditorView.theme({
          '&': { backgroundColor: 'transparent' },
          '.cm-scroller': { fontFamily: 'var(--font-sans)', fontSize: 'inherit', lineHeight: '1.7', overflow: 'auto' },
          '.cm-content': { caretColor: 'var(--color-accent)', padding: '12px 0' },
          '.cm-cursor': { borderLeftColor: 'var(--color-accent)' },
          '.cm-gutters': { minWidth: '16px', borderRight: 'none', backgroundColor: 'transparent' },
          '.cm-foldGutter .cm-gutterElement': { cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '11px' },
        }),
        autocompletion({
          override: [
            (context: CompletionContext) => {
              const before = context.matchBefore(/\[\[([^\]]*)$/)
              if (!before || (before.from === before.to && !context.explicit)) return null
              const prefix = before.text.slice(2)
              const allNotes = notasRef.current
              if (!allNotes || allNotes.length === 0) return null
              const options = allNotes
                .filter(n => n.titulo.toLowerCase().includes(prefix.toLowerCase()))
                .slice(0, 20)
                .map(n => ({ label: n.titulo, detail: `Nota #${n.id}`, apply: `${n.titulo}]]` }))
              return { from: before.from, options, filter: false }
            }
          ],
          closeOnBlur: true,
        }),
      ],
    })
    const mountEl = ref.current
    viewRef.current = new EditorView({ state: startState, parent: mountEl })

    const pasteHandler = (e: ClipboardEvent) => {
      const html = e.clipboardData?.getData('text/html')
      if (!html) return
      e.preventDefault()
      try {
        const md = htmlToMarkdown(html)
        const view = viewRef.current
        if (view) view.dispatch({
          changes: { from: view.state.selection.main.from, insert: md },
        })
      } catch (err) {
        console.error('[EditorMarkdown] paste', err)
        const view = viewRef.current
        if (view && e.clipboardData) view.dispatch({
          changes: { from: view.state.selection.main.from, insert: e.clipboardData.getData('text/plain') || '' },
        })
      }
    }
    mountEl.addEventListener('paste', pasteHandler)

    return () => {
      mountEl.removeEventListener('paste', pasteHandler)
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [theme])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        annotations: Transaction.addToHistory.of(false),
      })
    }
  }, [value])

  const handleUndo = useCallback(() => {
    const view = viewRef.current; if (view) undo(view)
  }, [])

  const handleRedo = useCallback(() => {
    const view = viewRef.current; if (view) redo(view)
  }, [])

  const wrapMark = useCallback((view: EditorView, mark: string) => {
    const { from, to } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)
    const len = mark.length
    if (selected.startsWith(mark) && selected.endsWith(mark)) {
      view.dispatch({ changes: { from, to, insert: selected.slice(len, -len) } })
    } else {
      view.dispatch({ changes: { from, to, insert: `${mark}${selected}${mark}` } })
    }
  }, [])

  const handleBold = useCallback(() => { const v = viewRef.current; if (v) wrapMark(v, '**') }, [wrapMark])
  const handleItalic = useCallback(() => { const v = viewRef.current; if (v) wrapMark(v, '*') }, [wrapMark])
  const handleStrikethrough = useCallback(() => { const v = viewRef.current; if (v) wrapMark(v, '~~') }, [wrapMark])
  const handleCode = useCallback(() => { const v = viewRef.current; if (v) wrapMark(v, '`') }, [wrapMark])
  const handleMath = useCallback(() => { const v = viewRef.current; if (v) wrapMark(v, '$') }, [wrapMark])

  const insertLinePrefix = useCallback((prefix: string) => {
    const view = viewRef.current
    if (!view) return
    const pos = view.state.selection.main.from
    const line = view.state.doc.lineAt(pos)
    const lineText = line.text
    if (lineText.startsWith(prefix)) {
      view.dispatch({ changes: { from: line.from, to: line.from + prefix.length, insert: '' } })
    } else {
      view.dispatch({ changes: { from: line.from, insert: prefix } })
    }
  }, [])

  const handleHeading = useCallback((level: number) => {
    const view = viewRef.current
    if (!view) return
    const pos = view.state.selection.main.from
    const line = view.state.doc.lineAt(pos)
    const prefix = level > 0 ? '#'.repeat(level) + ' ' : ''
    const lineText = line.text
    const existing = lineText.match(/^(#{1,6} )/)
    if (existing) {
      if (lineText.startsWith(prefix)) {
        view.dispatch({ changes: { from: line.from, to: line.from + prefix.length, insert: '' } })
      } else {
        view.dispatch({ changes: { from: line.from, to: line.from + existing[0].length, insert: prefix } })
      }
    } else if (prefix) {
      view.dispatch({ changes: { from: line.from, insert: prefix } })
    }
  }, [])

  const handleLink = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)
    if (selected) {
      view.dispatch({ changes: { from, to, insert: `[${selected}](url)` } })
      const newPos = from + selected.length + 3
      view.dispatch({ selection: { anchor: newPos, head: newPos + 3 } })
    } else {
      view.dispatch({ changes: { from, insert: '[texto](url)' } })
      view.dispatch({ selection: { anchor: from + 7, head: from + 10 } })
    }
  }, [])

  const handleTable = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    const pos = view.state.selection.main.from
    const tbl = '| col1 | col2 |\n|------|------|\n|      |      |'
    view.dispatch({ changes: { from: pos, insert: tbl } })
  }, [])

  const handleClearFormatting = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    let text = view.state.sliceDoc(from, to)
    if (!text) return
    text = text.replace(/(\*{1,2}|~~|`|\$)(.*?)\1/g, '$2')
    text = text.replace(/^#{1,6} /gm, '')
    text = text.replace(/^[-*] /gm, '')
    text = text.replace(/^\d+\. /gm, '')
    text = text.replace(/^> /gm, '')
    view.dispatch({ changes: { from, to, insert: text } })
  }, [])

  const [showHeading, setShowHeading] = useState(false)
  const headingRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) setShowHeading(false)
    }
    if (showHeading) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showHeading])

  const btn = 'p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors'
  const sep = <div className="w-px h-4 bg-border mx-0.5" />

  return (
    <div>
      <div className="flex items-center gap-0.5 px-1 py-1 border-b border-border/50 mb-1 overflow-x-auto">
        <button onClick={handleUndo} className={btn} title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><Undo2 size={14} /></button>
        <button onClick={handleRedo} className={btn} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer"><Redo2 size={14} /></button>
        {sep}
        <button onClick={handleBold} className={btn} title="Negrito (Ctrl+B)" aria-label="Negrito"><Bold size={14} /></button>
        <button onClick={handleItalic} className={btn} title="Itálico (Ctrl+I)" aria-label="Itálico"><Italic size={14} /></button>
        <button onClick={handleStrikethrough} className={btn} title="Riscado (Ctrl+Shift+X)" aria-label="Riscado"><Strikethrough size={14} /></button>
        <button onClick={handleCode} className={btn} title="Código inline" aria-label="Código"><Code size={14} /></button>
        <button onClick={handleMath} className={btn} title="Equação inline" aria-label="Equação"><Sigma size={14} /></button>
        {sep}
        <div className="relative" ref={headingRef}>
          <button onClick={() => setShowHeading(p => !p)} className={`${btn} text-xs font-semibold w-6`} title="Cabeçalho" aria-label="Cabeçalho">H</button>
          {showHeading && (
            <div className="absolute left-0 top-full mt-1 bg-bg-secondary border border-border rounded-lg shadow-elevation-4 z-50 p-1 w-24 animate-fade-in">
              {[['Texto', 0], ['H1', 1], ['H2', 2], ['H3', 3], ['H4', 4], ['H5', 5], ['H6', 6]].map(([label, level]) => (
                <button key={String(level)} onClick={() => { handleHeading(level as number); setShowHeading(false) }}
                  className="w-full text-left px-2 py-1 text-sm rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors">
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {sep}
        <button onClick={() => insertLinePrefix('- ')} className={btn} title="Lista de marcadores" aria-label="Lista de marcadores"><List size={14} /></button>
        <button onClick={() => insertLinePrefix('1. ')} className={btn} title="Lista numerada" aria-label="Lista numerada"><ListOrdered size={14} /></button>
        <button onClick={() => insertLinePrefix('- [ ] ')} className={btn} title="Lista de tarefas (Ctrl+Shift+K)" aria-label="Lista de tarefas"><CheckSquare size={14} /></button>
        <button onClick={() => insertLinePrefix('> ')} className={btn} title="Citação" aria-label="Citação"><TextQuote size={14} /></button>
        {sep}
        <button onClick={handleLink} className={btn} title="Inserir link" aria-label="Inserir link"><Link2 size={14} /></button>
        <button onClick={handleTable} className={btn} title="Inserir tabela" aria-label="Inserir tabela"><Table size={14} /></button>
        <button onClick={() => insertLinePrefix('---\n')} className={btn} title="Linha horizontal" aria-label="Linha horizontal"><Minus size={14} /></button>
        {sep}
        <button onClick={handleClearFormatting} className={btn} title="Limpar formatação" aria-label="Limpar formatação"><RemoveFormatting size={14} /></button>
      </div>
      <div ref={ref} className="min-h-[calc(100vh-280px)]" />
    </div>
  )
})

export default EditorMarkdown
