import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Nota } from '../types'

function renderConteudo(conteudo: string, notas: Nota[], onSelect: (n: Nota) => void) {
  const parts = conteudo.split(/(\[\[[^\]]+\]\])/)
  return parts.map((part, i) => {
    const m = part.match(/^\[\[([^\]]+?)(?:\|([^\]]+))?\]\]$/)
    if (!m) return <span key={i}>{part}</span>
    const titulo = m[1].trim()
    const alias = m[2]?.trim() || titulo
    const target = notas.find(n => n.titulo.toLowerCase() === titulo.toLowerCase())
    if (!target) return <span key={i} className="text-danger/70">{alias}</span>
    return (
      <button key={i} onClick={() => onSelect(target)}
        className="text-accent hover:underline cursor-pointer font-semibold">
        {alias}
      </button>
    )
  })
}

const mockNotas: Nota[] = [
  { id: 1, titulo: 'Teste', conteudo: '', pasta_id: null, tipo_id: null, criado_em: '2026-06-01', atualizado_em: '2026-06-01', ordem: null },
  { id: 2, titulo: 'Projeto X', conteudo: '', pasta_id: null, tipo_id: null, criado_em: '2026-06-01', atualizado_em: '2026-06-01', ordem: null },
]

describe('renderConteudo', () => {
  it('renderiza texto sem links', () => {
    const { container } = render(<>{renderConteudo('texto simples', mockNotas, vi.fn())}</>)
    expect(container.textContent).toBe('texto simples')
  })

  it('renderiza wikilink com target existente como botão clicável', () => {
    render(<>{renderConteudo('[[Teste]]', mockNotas, vi.fn())}</>)
    const btn = screen.getByText('Teste')
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.className).toContain('text-accent')
  })

  it('renderiza wikilink com alias', () => {
    render(<>{renderConteudo('[[Projeto X|Ver Projeto]]', mockNotas, vi.fn())}</>)
    const btn = screen.getByText('Ver Projeto')
    expect(btn).toBeTruthy()
  })

  it('renderiza wikilink quebrado em cor danger', () => {
    render(<>{renderConteudo('[[Inexistente]]', mockNotas, vi.fn())}</>)
    const span = screen.getByText('Inexistente')
    expect(span.className).toContain('text-danger')
  })

  it('chama onSelect ao clicar em wikilink válido', () => {
    const onSelect = vi.fn()
    render(<>{renderConteudo('[[Teste]]', mockNotas, onSelect)}</>)
    screen.getByText('Teste').click()
    expect(onSelect).toHaveBeenCalledWith(mockNotas[0])
  })

  it('renderiza texto misto com links e texto comum', () => {
    const { container } = render(<>{renderConteudo('antes [[Teste]] depois', mockNotas, vi.fn())}</>)
    expect(container.textContent).toContain('antes')
    expect(container.textContent).toContain('depois')
    expect(container.textContent).toContain('Teste')
  })

  it('case insensitive no match do titulo', () => {
    render(<>{renderConteudo('[[teste]]', mockNotas, vi.fn())}</>)
    const btn = screen.getByText('teste')
    expect(btn.className).toContain('text-accent')
  })
})
