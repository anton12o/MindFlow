import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChecklistBar from '../components/ChecklistBar'

describe('ChecklistBar', () => {
  it('retorna null quando nao ha checkboxes', () => {
    const { container } = render(<ChecklistBar conteudo="texto sem checklist" />)
    expect(container.innerHTML).toBe('')
  })

  it('mostra 0/N quando nenhum marcado', () => {
    render(<ChecklistBar conteudo={'- [ ] item 1\n- [ ] item 2'} />)
    expect(screen.getByText(/0\/2/)).toBeInTheDocument()
  })

  it('mostra contagem parcial', () => {
    render(<ChecklistBar conteudo={'- [x] feito\n- [ ] pendente'} />)
    expect(screen.getByText(/1\/2/)).toBeInTheDocument()
  })

  it('mostra 100% quando todos marcados', () => {
    render(<ChecklistBar conteudo={'- [x] um\n- [x] dois'} />)
    expect(screen.getByText(/2\/2/)).toBeInTheDocument()
  })

  it('renderiza barra de progresso com largura correta', () => {
    render(<ChecklistBar conteudo={'- [x] feito\n- [ ] pendente'} />)
    const bar = document.querySelector('.bg-accent.rounded-full')
    expect(bar).toBeInTheDocument()
    expect((bar as HTMLElement).style.width).toBe('50%')
  })

  it('ignora linhas sem formato de checklist', () => {
    render(<ChecklistBar conteudo={'- [x] feito\n- item normal\n- [ ] pendente'} />)
    expect(screen.getByText(/1\/2/)).toBeInTheDocument()
  })

  it('usa useMemo para nao recalcular em renders desnecessarios', () => {
    const { rerender } = render(<ChecklistBar conteudo={'- [x] ok'} />)
    expect(screen.getByText(/1\/1/)).toBeInTheDocument()
    rerender(<ChecklistBar conteudo={'- [x] ok'} />)
    expect(screen.getByText(/1\/1/)).toBeInTheDocument()
  })
})
