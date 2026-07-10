import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

vi.mock('../api/logs', () => ({ logError: vi.fn() }))

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('explodiu')
  return <div>ok</div>
}

describe('ErrorBoundary', () => {
  it('renderiza children quando nao ha erro', () => {
    render(<ErrorBoundary><div>conteudo</div></ErrorBoundary>)
    expect(screen.getByText('conteudo')).toBeInTheDocument()
  })

  it('renderiza fallback quando erro ocorre', () => {
    render(<ErrorBoundary><Bomb shouldThrow /></ErrorBoundary>)
    expect(screen.getByText('Não foi possível carregar esta seção')).toBeInTheDocument()
  })

  it('exibe mensagem do erro', () => {
    render(<ErrorBoundary><Bomb shouldThrow /></ErrorBoundary>)
    expect(screen.getByText(/explodiu/)).toBeInTheDocument()
  })

  it('tem botao Recarregar', () => {
    render(<ErrorBoundary><Bomb shouldThrow /></ErrorBoundary>)
    expect(screen.getByText('Recarregar')).toBeInTheDocument()
  })

  it('renderiza null quando nao ha children e sem erro', () => {
    const { container } = render(<ErrorBoundary><div /></ErrorBoundary>)
    expect(container.innerHTML).toBe('<div></div>')
  })
})
