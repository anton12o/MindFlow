import { useState, useRef, useMemo, useCallback, memo, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import DOMPurify from 'dompurify'
import { getNota } from '../api/notas'
import type { Nota } from '../types'

function esc(val: string): string {
  return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function parseTable(data: string): string {
  const lines = data.split('\n').filter(Boolean)
  if (lines.length === 0) return ''
  const rows = lines.map(line => line.split(',').map(c => esc(c.trim())))
  const header = rows[0]
  const body = rows.slice(1)
  const hRow = `<thead><tr>${header.map(c => `<th class="border border-border px-2 py-1 text-left text-xs font-semibold">${c}</th>`).join('')}</tr></thead>`
  const bRows = body.length > 0 ? `<tbody>${body.map(r => `<tr>${r.map(c => `<td class="border border-border px-2 py-1 text-xs">${c}</td>`).join('')}</tr>`).join('')}</tbody>` : ''
  return `<table class="w-full border-collapse border border-border my-2">${hRow}${bRows}</table>`
}

function parseGraph(data: string): string {
  const pipeIdx = data.indexOf('|')
  if (pipeIdx === -1) return ''
  const type = data.slice(0, pipeIdx).trim()
  const values = data.slice(pipeIdx + 1).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n))
  if (values.length === 0) return ''
  const w = 200; const h = 120; const pad = 20

  if (type === 'barra') {
    const max = Math.max(...values, 1)
    const bw = Math.max(12, (w - pad * 2) / values.length - 4)
    const bars = values.map((v, i) => {
      const barH = ((v / max) * (h - pad * 2))
      const x = pad + i * (bw + 4)
      const y = h - pad - barH
      return `<rect x="${x}" y="${y}" width="${bw}" height="${barH}" fill="var(--color-accent)" rx="2" />`
    }).join('')
      return `<svg viewBox="0 0 ${w} ${h}" class="w-full my-2" style="max-height:${h}px"><g>${bars}</g></svg>`
  }

  if (type === 'linha') {
    const max = Math.max(...values, 1)
    const points = values.map((v, i) => {
      const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2)
      const y = h - pad - ((v / max) * (h - pad * 2))
      return `${x},${y}`
    }).join(' ')
    const circles = values.map((v, i) => {
      const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2)
      const y = h - pad - ((v / max) * (h - pad * 2))
      return `<circle cx="${x}" cy="${y}" r="3" fill="var(--color-accent)" />`
    }).join('')
    return `<svg viewBox="0 0 ${w} ${h}" class="w-full my-2" style="max-height:${h}px"><polyline points="${points}" fill="none" stroke="var(--color-accent)" stroke-width="2" />${circles}</svg>`
  }

  if (type === 'pizza') {
    const total = values.reduce((s, v) => s + v, 0) || 1
    const cx = w / 2; const cy = h / 2; const r = Math.min(cx, cy) - 4
    const colors = ['var(--color-accent)', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B']
    let cur = -Math.PI / 2
    const slices = values.map((v, i) => {
      const angle = (v / total) * 2 * Math.PI
      const x1 = cx + r * Math.cos(cur)
      const y1 = cy + r * Math.sin(cur)
      const x2 = cx + r * Math.cos(cur + angle)
      const y2 = cy + r * Math.sin(cur + angle)
      const large = angle > Math.PI ? 1 : 0
      const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`
      cur += angle
      return `<path d="${path}" fill="${colors[i % colors.length]}" stroke="var(--color-bg-primary)" stroke-width="1" />`
    }).join('')
    return `<svg viewBox="0 0 ${w} ${h}" class="w-full max-h-[${h}px] my-2">${slices}</svg>`
  }

  return `<span class="text-danger text-xs">gráfico não suportado: ${esc(type)}</span>`
}

function applyKatexOutsideCode(html: string): string {
  const parts = html.split(/(<code[^>]*>.*?<\/code>)/gs)
  return parts.map((part, i) => {
    if (i % 2 === 1) return part
    let processed = part.replace(/\$\$(.+?)\$\$/gs, (_, eq) => {
      try { return katex.renderToString(eq.trim(), { displayMode: true, throwOnError: false }) }
      catch { return `<span class="text-danger">$$${eq}$$</span>` }
    })
    processed = processed.replace(/\$(.+?)\$/g, (_, eq) => {
      try { return katex.renderToString(eq.trim(), { displayMode: false, throwOnError: false }) }
      catch { return `<span class="text-danger">$${eq}$</span>` }
    })
    return processed
  }).join('')
}

function renderMarkdown(text: string): string {
  const codeBlocks: string[] = []
  const mermaidBlocks: string[] = []
  const customBlocks: string[] = []
  const noCode = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = codeBlocks.length
    if (lang === 'mermaid') {
      mermaidBlocks.push(`<div class="mermaid">${code.trim()}</div>`)
      return `\x00MC${i}\x00`
    }
    const langLabel = lang
      ? `<div class="flex items-center px-3 py-0.5 bg-bg-tertiary/60 text-[11px] text-text-muted font-mono border-b border-border rounded-t-lg">${lang}</div>`
      : ''
    codeBlocks.push(`<div class="my-3 rounded-lg overflow-hidden border border-border">${langLabel}<pre class="p-3 overflow-x-auto text-sm leading-relaxed bg-bg-secondary/40"><code>${code.trim()}</code></pre></div>`)
    return `\x00CB${i}\x00`
  })
  const noCustom = noCode.replace(/\{\{(\w+)\|([^}]*)\}\}/g, (_, type, data) => {
    const i = customBlocks.length
    if (type === 'tabela') {
      customBlocks.push(parseTable(data))
    } else if (type === 'grafico') {
      customBlocks.push(parseGraph(data))
    } else {
      return `{{${type}|${data}}}`
    }
    return `\x00BL${i}\x00`
  })
  const paragraphs = noCustom.split(/\n{2,}/)
  let paraIdx = 0
  let html = paragraphs.map(para => {
    const trimmed = para.trim()
    if (!trimmed) return ''
    const isCustom = /^\x00BL\d+\x00$/.test(trimmed)
    if (isCustom) return trimmed
    const isHeading = /^#{1,6}\s/.test(trimmed)
    const isList = /^[\-\*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)
    const isHr = /^---+\s*$/.test(trimmed)
    if (isHr) return '<hr class="my-4 border-border" />'
    paraIdx++
    let p = trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (isHeading) {
      const level = p.match(/^(#+)\s/)?.[1]?.length || 1
      const text = p.replace(/^#+\s/, '')
      return `<h${level} id="p${paraIdx}" class="font-semibold mt-4 mb-2 text-text-primary">${text}</h${level}>`
    }
    if (isList) {
      const items = p.split('\n').map(line => {
        if (/^\d+\.\s/.test(line)) return `<li>${line.replace(/^\d+\.\s/, '')}</li>`
        if (/^[\-\*]\s/.test(line)) return `<li>${line.replace(/^[\-\*]\s/, '')}</li>`
        return `<li>${line}</li>`
      }).join('')
      return `<ul id="p${paraIdx}" class="list-disc pl-5 my-2">${items}</ul>`
    }
    p = p
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-bg-tertiary px-1 rounded text-xs">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent hover:underline">$1</a>')
    p = applyKatexOutsideCode(p)
    return `<p id="p${paraIdx}" class="my-1">${p}</p>`
  }).join('\n')
  html = html.replace(/\x00CB(\d+)\x00/g, (_, i) => codeBlocks[+i])
  html = html.replace(/\x00MC(\d+)\x00/g, (_, i) => mermaidBlocks[+i])
  html = html.replace(/\x00BL(\d+)\x00/g, (_, i) => customBlocks[+i])
  return html
}

interface Props {
  conteudo: string
  notas: Nota[]
  onSelect: (n: Nota) => void
  selectedId?: number | null
  onClickBrokenWikilink?: (titulo: string) => void
}

const RenderConteudo = memo(function RenderConteudo({ conteudo, notas, onSelect, selectedId, onClickBrokenWikilink }: Props) {
  const [tooltipContent, setTooltipContent] = useState('')
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewCache = useRef<Map<number, string>>(new Map())
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const parts = useMemo(() => conteudo.split(/(\[\[[^\]]+\]\])/), [conteudo])
  const showTooltip = useCallback(async (target: Nota, e: React.MouseEvent) => {
    if (previewCache.current.has(target.id)) {
      setTooltipContent(previewCache.current.get(target.id)!)
    } else if (target.id !== selectedId) {
      try {
        const nota = await getNota(target.id)
        const plain = (nota.conteudo || '').replace(/[#*`~>[\]]/g, '').slice(0, 200)
        previewCache.current.set(target.id, plain)
        setTooltipContent(plain)
      } catch (e) { console.error('[RenderConteudo] tooltip preview', e); return }
    } else {
      const plain = (target.conteudo || '').replace(/[#*`~>[\]]/g, '').slice(0, 200)
      previewCache.current.set(target.id, plain)
      setTooltipContent(plain)
    }
    setTooltipPos({ x: e.clientX, y: e.clientY })
    setTooltipVisible(true)
  }, [selectedId])
  const hideTooltip = useCallback(() => {
    clearTimeout(hoverTimeout.current)
    setTooltipVisible(false)
    setTooltipContent('')
  }, [])
  useEffect(() => () => clearTimeout(hoverTimeout.current), [])
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.querySelectorAll('.mermaid').forEach(el => {
        import('mermaid').then(m => {
          m.default.run({ nodes: [el as HTMLElement] })
        })
      })
    }
  }, [conteudo])
  return (
    <div ref={containerRef}>
      {parts.map((part, i) => {
        const m = part.match(/^\[\[([^\]]+?)(?:#p(\d+))?(?:\|([^\]]+))?\]\]$/)
        if (!m) return <span key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(part), {
          ALLOWED_TAGS: [
            'b','strong','em','i','a','code','span','div','br','img','pre','p','hr',
            'h1','h2','h3','h4','h5','h6','ul','ol','li',
            'table','thead','tbody','tr','td','th',
            'svg','g','rect','line','circle','path','polyline',
            'math','annotation','semantics','mrow','mi','mn','mo','msup',
            'msub','mfrac','msqrt','mover','munder','mtext','mtable','mtr','mtd',
          ],
          ALLOWED_ATTR: ['href','class','target','rel','src','alt','style','aria-hidden','id','viewBox','fill','stroke','stroke-width','rx','cx','cy','r','points','d','width','height','xmlns','x','y'],
        }) }} />
        const titulo = m[1].trim()
        const paraNum = m[2] ? parseInt(m[2], 10) : null
        const alias = m[3]?.trim() || titulo
        const target = notas.find(n => n.titulo.toLowerCase() === titulo.toLowerCase())
        if (!target) return (
          <button key={i} onClick={() => onClickBrokenWikilink?.(titulo)}
            className="text-danger/70 hover:text-accent hover:underline cursor-pointer font-semibold"
            title={`Criar nota "${titulo}"`}>
            {alias}✦
          </button>
        )
        return (
          <button key={i} onClick={() => {
            onSelect(target)
            if (paraNum) {
              requestAnimationFrame(() => {
                setTimeout(() => {
                  document.getElementById(`p${paraNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 100)
              })
            }
          }}
            onMouseEnter={(e) => { hoverTimeout.current = window.setTimeout(() => showTooltip(target, e), 300) }}
            onMouseLeave={hideTooltip}
            className="text-accent hover:underline cursor-pointer font-semibold">
            {alias}
          </button>
        )
      })}
      {tooltipVisible && (
        <div
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y + 12 }}
          className="fixed z-50 bg-bg-secondary border border-border rounded-lg shadow-lg p-3 text-sm max-w-xs text-text-primary pointer-events-none"
        >
          {tooltipContent || 'Carregando...'}
        </div>
      )}
    </div>
  )
})

export default RenderConteudo
