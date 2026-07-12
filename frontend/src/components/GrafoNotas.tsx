import { startTransition, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGrafo, type GrafoNode } from '../api/grafo'

interface SimNode extends GrafoNode {
  x: number
  y: number
  vx: number
  vy: number
}

function forceLayout(nodes: SimNode[], links: { source: string; target: string }[], width: number, height: number) {
  const area = width * height
  const k = Math.sqrt(area / nodes.length)
  const iterations = 120
  const gravity = 0.05

  for (let iter = 0; iter < iterations; iter++) {
    const cooling = 1 - iter / iterations
    const forces: { fx: number; fy: number }[] = nodes.map(() => ({ fx: 0, fy: 0 }))

    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const validLinks = links.filter(l => nodeMap.has(l.source) && nodeMap.has(l.target))

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x
        let dy = nodes[j].y - nodes[i].y
        let dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 1) { dist = 1; dx = Math.random() - 0.5; dy = Math.random() - 0.5 }
        const repForce = (k * k) / dist
        forces[i].fx -= (dx / dist) * repForce
        forces[i].fy -= (dy / dist) * repForce
        forces[j].fx += (dx / dist) * repForce
        forces[j].fy += (dy / dist) * repForce
      }
    }

    for (const l of validLinks) {
      const s = nodeMap.get(l.source)!
      const t = nodeMap.get(l.target)!
      const dx = t.x - s.x
      const dy = t.y - s.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const attrForce = (dist * dist) / k * 0.5
      const si = nodes.indexOf(s)
      const ti = nodes.indexOf(t)
      forces[si].fx += (dx / dist) * attrForce
      forces[si].fy += (dy / dist) * attrForce
      forces[ti].fx -= (dx / dist) * attrForce
      forces[ti].fy -= (dy / dist) * attrForce
    }

    for (let i = 0; i < nodes.length; i++) {
      forces[i].fx -= (nodes[i].x - width / 2) * gravity
      forces[i].fy -= (nodes[i].y - height / 2) * gravity

      const displacement = Math.sqrt(forces[i].fx * forces[i].fx + forces[i].fy * forces[i].fy)
      const maxDisp = cooling * k
      if (displacement > maxDisp) {
        forces[i].fx = (forces[i].fx / displacement) * maxDisp
        forces[i].fy = (forces[i].fy / displacement) * maxDisp
      }

      nodes[i].x += forces[i].fx
      nodes[i].y += forces[i].fy
      nodes[i].x = Math.max(10, Math.min(width - 10, nodes[i].x))
      nodes[i].y = Math.max(10, Math.min(height - 10, nodes[i].y))
    }
  }
}

interface Props {
  onSelectNota?: (id: number) => void
}

const TIPO_CORES: Record<string, string> = {
  Nota: '#5B8DEF',
  Tarefa: '#4CAF50',
  Projeto: '#FF9800',
  Pessoa: '#E91E63',
  Recurso: '#9C27B0',
  Flashcard: '#FF6B6B',
  Habito: '#FFD93D',
}

const TIPO_ICONES: Record<string, string> = {
  Nota: '📝',
  Tarefa: '✅',
  Projeto: '📋',
  Pessoa: '👤',
  Recurso: '🔗',
  Flashcard: '🃏',
  Habito: '🎯',
}

function getNodeColor(node: SimNode): string {
  if (node.tipo_nome && TIPO_CORES[node.tipo_nome]) return TIPO_CORES[node.tipo_nome]
  return 'var(--color-accent)'
}

function getNodeIcon(node: SimNode): string {
  if (node.tipo_nome && TIPO_ICONES[node.tipo_nome]) return TIPO_ICONES[node.tipo_nome]
  return '📝'
}

function nodeIdToNum(id: string): number {
  const m = id.match(/^\w(\d+)$/)
  return m ? parseInt(m[1], 10) : 0
}

export default function GrafoNotas({ onSelectNota }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [simNodes, setSimNodes] = useState<SimNode[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({ queryKey: ['grafo'], queryFn: getGrafo, staleTime: 300_000 })

  useEffect(() => {
    if (!data || data.nodes.length === 0) return

    const width = 800
    const height = 500
    const nodes: SimNode[] = data.nodes.map(n => ({
      ...n, x: width / 2 + (Math.random() - 0.5) * 200, y: height / 2 + (Math.random() - 0.5) * 200, vx: 0, vy: 0
    }))

    forceLayout(nodes, data.links, width, height)
    startTransition(() => setSimNodes([...nodes]))
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-sm animate-pulse">
        Carregando grafo...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-danger text-sm">
        Erro ao carregar grafo
      </div>
    )
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-sm">
        Crie notas, tarefas ou flashcards com [[links]] para ver o grafo
      </div>
    )
  }

  const nodeMap = new Map(simNodes.map(n => [n.id, n]))
  const validLinks = (data.links || []).filter(l => nodeMap.has(l.source) && nodeMap.has(l.target))
  const usedTipos = [...new Set(simNodes.map(n => n.tipo_nome).filter(Boolean))]

  const hoveredNode = hoveredId !== null ? simNodes.find(n => n.id === hoveredId) : null
  const rootFontSize = typeof document !== 'undefined' ? parseFloat(getComputedStyle(document.documentElement).fontSize) : 14
  const svgFontSize = Math.round(rootFontSize * 0.75)

  return (
    <div>
      <svg ref={svgRef} viewBox="0 0 800 500" className="w-full h-auto max-h-[500px]">
        {validLinks.map((l) => {
          const source = nodeMap.get(l.source)
          const target = nodeMap.get(l.target)
          if (!source || !target) return null
          return (
            <line key={`link-${l.source}-${l.target}`}
              x1={source.x} y1={source.y} x2={target.x} y2={target.y}
              stroke="var(--color-border)" strokeWidth={1.5} />
          )
        })}
        {simNodes.map(n => (
          <g key={n.id} onClick={() => onSelectNota?.(nodeIdToNum(n.id))}
            onMouseEnter={() => setHoveredId(n.id)} onMouseLeave={() => setHoveredId(null)}
            className="cursor-pointer">
            <circle cx={n.x} cy={n.y} r={hoveredId === n.id ? 10 : 8}
              fill={getNodeColor(n)} stroke="var(--color-bg-primary)" strokeWidth={2} />
            <text x={n.x + 12} y={n.y + 4} fontSize={svgFontSize}
              fill="var(--color-text-secondary)" className="pointer-events-none"
              fontWeight={hoveredId === n.id ? 'bold' : 'normal'}>
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      {usedTipos.length > 1 && (
        <div className="flex flex-wrap gap-3 mt-2 px-2">
          {usedTipos.map(tipo => (
            <div key={tipo} className="flex items-center gap-1 text-xs text-text-muted">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: TIPO_CORES[tipo!] || 'var(--color-accent)' }} />
              {TIPO_ICONES[tipo!] || '📝'} {tipo}
            </div>
          ))}
        </div>
      )}
      {hoveredNode && (
        <div className="mt-1 px-2 text-xs text-accent">
          {getNodeIcon(hoveredNode)} {hoveredNode.label}{hoveredNode.tipo_nome ? ` · ${hoveredNode.tipo_nome}` : ''}
        </div>
      )}
    </div>
  )
}
