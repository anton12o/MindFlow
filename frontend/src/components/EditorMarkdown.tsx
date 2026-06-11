import { useRef, useEffect } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'

interface Props {
  value: string
  onChange: (value: string) => void
}

export default function EditorMarkdown({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!ref.current || viewRef.current) return

    const startState = EditorState.create({
      doc: value,
      extensions: [
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
          '&': { backgroundColor: 'transparent', fontSize: '14px' },
          '.cm-scroller': { fontFamily: '"JetBrains Mono", ui-monospace, monospace', overflow: 'auto' },
          '.cm-content': { caretColor: '#5B8DEF', padding: '12px 0' },
          '.cm-cursor': { borderLeftColor: '#5B8DEF' },
          '.cm-gutters': { display: 'none' },
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
}
