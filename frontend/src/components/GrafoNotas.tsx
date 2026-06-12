import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGrafo, type GrafoNode } from '../api/grafo'
import * as d3 from 'd3-force'

interface SimNode extends GrafoNode {
  x: number
  y: number
  vx: number
  vy: number
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
}

const TIPO_ICONES: Record<string, string> = {
  Nota: '📄',
  Tarefa: '✅',
  Projeto: '📋',
  Pessoa: '👤',
  Recurso: '🔗',
}

function getNodeColor(node: SimNode): string {
  if (node.tipo_nome && TIPO_CORES[node.tipo_nome]) return TIPO_CORES[node.tipo_nome]
  return 'var(--color-accent)'
}

function getNodeIcon(node: SimNode): string {
  if (node.tipo_nome && TIPO_ICONES[node.tipo_nome]) return TIPO_ICONES[node.tipo_nome]
  return '📄'
}

export default function GrafoNotas({ onSelectNota }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [simNodes, setSimNodes] = useState<SimNode[]>([])
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({ queryKey: ['grafo'], queryFn: getGrafo, staleTime: 300_000 })

  useEffect(() => {
    if (!data || data.nodes.length === 0) return

    const width = 800
    const height = 500
    const nodes: SimNode[] = data.nodes.map(n => ({ ...n, x: width / 2, y: height / 2, vx: 0, vy: 0 }))
    const links = data.links as d3.SimulationLinkDatum<SimNode>[]

    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const validLinks = links.filter(l => nodeMap.has(l.source as number) && nodeMap.has(l.target as number))

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(validLinks).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))

    simulation.on('end', () => {
      setSimNodes([...nodes])
    })

    const timeoutId = setTimeout(() => { simulation.stop(); setSimNodes([...nodes]) }, 2000)

    return () => { simulation.stop(); clearTimeout(timeoutId) }
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
        Crie notas com [[links]] para ver o grafo
      </div>
    )
  }

  const nodeMap = new Map(simNodes.map(n => [n.id, n]))
  const validLinks = (data.links || []).filter(l => nodeMap.has(l.source) && nodeMap.has(l.target))
  const usedTipos = [...new Set(simNodes.map(n => n.tipo_nome).filter(Boolean))]

  const hoveredNode = hoveredId !== null ? simNodes.find(n => n.id === hoveredId) : null

  return (
    <div>
      <svg ref={svgRef} viewBox="0 0 800 500" className="w-full h-auto max-h-[500px]">
        {validLinks.map((l, i) => {
          const source = nodeMap.get(l.source)
          const target = nodeMap.get(l.target)
          if (!source || !target) return null
          return (
            <line key={`link-${i}`}
              x1={source.x} y1={source.y} x2={target.x} y2={target.y}
              stroke="var(--color-border)" strokeWidth={1.5} />
          )
        })}
        {simNodes.map(n => (
          <g key={n.id} onClick={() => onSelectNota?.(n.id)}
            onMouseEnter={() => setHoveredId(n.id)} onMouseLeave={() => setHoveredId(null)}
            className="cursor-pointer">
            <circle cx={n.x} cy={n.y} r={hoveredId === n.id ? 10 : 8}
              fill={getNodeColor(n)} stroke="var(--color-bg-primary)" strokeWidth={2} />
            <text x={n.x + 12} y={n.y + 4} fontSize={11}
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
              {TIPO_ICONES[tipo!] || '📄'} {tipo}
            </div>
          ))}
        </div>
      )}
      {hoveredNode && (
        <div className="mt-1 px-2 text-xs text-accent">
          {getNodeIcon(hoveredNode)} {hoveredNode.label}{hoveredNode.tipo_nome ? ` — ${hoveredNode.tipo_nome}` : ''}
        </div>
      )}
    </div>
  )
}
