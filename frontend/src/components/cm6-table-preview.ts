import { ViewPlugin, Decoration, ViewUpdate, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'

type EditHandler = (from: number, to: number, markdown: string) => void

export function tablePreviewPlugin(onEdit: EditHandler) {
  return ViewPlugin.fromClass(class {
    decorations!: DecorationSet

    constructor(view: EditorView) {
      this.decorations = compute(view, onEdit)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = compute(update.view, onEdit)
      }
    }
  }, { decorations: v => v.decorations })
}

class HiddenWidget extends WidgetType {
  toDOM() {
    const el = document.createElement('div')
    el.style.display = 'none'
    return el
  }
  ignoreEvent() { return true }
}

class TableWidget extends WidgetType {
  constructor(
    readonly html: string,
    readonly from: number,
    readonly to: number,
    readonly markdown: string,
    readonly onEdit: EditHandler,
  ) { super() }

  toDOM() {
    const el = document.createElement('div')
    el.className = 'cm-table-wrapper'
    const table = document.createElement('table')
    table.className = 'cm-table-render'
    table.innerHTML = this.html
    el.appendChild(table)
    el.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.onEdit(this.from, this.to, this.markdown)
    })
    return el
  }

  eq(other: TableWidget) {
    return other.markdown === this.markdown
  }

  ignoreEvent() { return false }
}

function compute(view: EditorView, onEdit: EditHandler) {
  const decorations: Decoration[] = []
  const doc = view.state.doc

  for (let lineNo = 1; lineNo <= doc.lines; lineNo++) {
    const line = doc.line(lineNo)
    if (!line.text.startsWith('|')) continue
    if (lineNo >= doc.lines) continue

    const nextLine = doc.line(lineNo + 1)
    if (!/^\|[-| ]+\|$/.test(nextLine.text)) continue

    let endLine = lineNo + 1
    while (endLine < doc.lines && doc.line(endLine + 1).text.startsWith('|')) {
      endLine++
    }

    const lines: string[] = []
    for (let j = lineNo; j <= endLine; j++) {
      lines.push(doc.line(j).text)
    }

    const html = renderTableHtml(lines)
    if (!html) continue
    const markdown = lines.join('\n')

    const from = doc.line(lineNo).from
    const to = doc.line(endLine).to

    decorations.push(
      Decoration.replace({ widget: new TableWidget(html, from, to, markdown, onEdit) }).range(from, doc.line(lineNo).to)
    )

    for (let j = lineNo + 1; j <= endLine; j++) {
      decorations.push(
        Decoration.replace({ widget: new HiddenWidget() }).range(doc.line(j).from, doc.line(j).to)
      )
    }

    lineNo = endLine
  }

  return Decoration.set(decorations)
}

function renderTableHtml(lines: string[]): string {
  if (lines.length < 2) return ''

  const headers = splitRow(lines[0])
  const body = lines.slice(2).map(splitRow)
  let html = '<thead><tr>'
  for (const h of headers) html += `<th>${esc(h.trim())}</th>`
  html += '</tr></thead><tbody>'
  for (const row of body) {
    html += '<tr>'
    for (const cell of row) html += `<td>${esc(cell.trim())}</td>`
    html += '</tr>'
  }
  html += '</tbody>'
  return html
}

function splitRow(line: string): string[] {
  const parts = line.split('|')
  if (parts.length > 0 && parts[0].trim() === '') parts.shift()
  if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop()
  return parts
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
