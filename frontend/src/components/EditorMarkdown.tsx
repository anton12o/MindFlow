import React, { useRef, useCallback, useEffect } from 'react'
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

  return (
    <div>
      <div className="flex items-center gap-1 px-1 py-1 border-b border-border/50 mb-1">
        <button onClick={handleUndo}
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        </button>
        <button onClick={handleRedo}
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
        </button>
      </div>
      <div ref={ref} className="min-h-[calc(100vh-280px)]" />
    </div>
  )
})

export default EditorMarkdown
