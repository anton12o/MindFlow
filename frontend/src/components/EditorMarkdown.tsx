import React, { useRef, useEffect } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'

interface Props {
  value: string
  onChange: (value: string) => void
  notas?: { id: number; titulo: string }[]
}

const EditorMarkdown = React.memo(function EditorMarkdown({ value, onChange, notas }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const notasRef = useRef(notas)
  notasRef.current = notas

  useEffect(() => {
    if (!ref.current || viewRef.current) return

    const startState = EditorState.create({
      doc: value,
      extensions: [
        EditorView.lineWrapping,
        markdown({ base: markdownLanguage }),
        python(),
        javascript(),
        sql(),
        oneDark,
        keymap.of([...defaultKeymap, indentWithTab]),
        EditorView.updateListener.of(update => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString())
        }),
        EditorView.theme({
          '&': { backgroundColor: 'transparent' },
          '.cm-scroller': { fontFamily: '"Inter", system-ui, -apple-system, sans-serif', fontSize: '15px', lineHeight: '1.7', overflow: 'auto' },
          '.cm-content': { caretColor: '#5B8DEF', padding: '12px 0' },
          '.cm-cursor': { borderLeftColor: '#5B8DEF' },
          '.cm-gutters': { display: 'none' },
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
    viewRef.current = new EditorView({ state: startState, parent: ref.current })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  return <div ref={ref} className="min-h-[calc(100vh-250px)]" />
})

export default EditorMarkdown
