import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './utils'
import KebabMenu from '../components/matriz/KebabMenu'

describe('KebabMenu — modo items', () => {
  it('renderiza botao e abre menu ao clicar', () => {
    renderWithProviders(<KebabMenu items={[{ label: 'Ação 1', onClick: vi.fn() }]} />)
    expect(screen.queryByText('Ação 1')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Abrir menu de ações'))
    expect(screen.getByText('Ação 1')).toBeInTheDocument()
  })

  it('chama onClick do item ao clicar', () => {
    const onClick = vi.fn()
    renderWithProviders(<KebabMenu items={[{ label: 'Ação 1', onClick }]} />)
    fireEvent.click(screen.getByLabelText('Abrir menu de ações'))
    fireEvent.click(screen.getByText('Ação 1'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fecha menu ao clicar fora', () => {
    renderWithProviders(
      <div>
        <span data-testid="outside">fora</span>
        <KebabMenu items={[{ label: 'Ação 1', onClick: vi.fn() }]} />
      </div>
    )
    fireEvent.click(screen.getByLabelText('Abrir menu de ações'))
    expect(screen.getByText('Ação 1')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('Ação 1')).not.toBeInTheDocument()
  })

  it('fecha menu ao pressionar Escape', () => {
    renderWithProviders(<KebabMenu items={[{ label: 'Ação 1', onClick: vi.fn() }]} />)
    fireEvent.click(screen.getByLabelText('Abrir menu de ações'))
    expect(screen.getByText('Ação 1')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Ação 1')).not.toBeInTheDocument()
  })

  it('renderiza item com danger em vermelho', () => {
    renderWithProviders(<KebabMenu items={[{ label: 'Excluir', onClick: vi.fn(), danger: true }]} />)
    fireEvent.click(screen.getByLabelText('Abrir menu de ações'))
    const btn = screen.getByText('Excluir')
    expect(btn.className).toContain('text-danger')
  })
})

describe('KebabMenu — modo legado', () => {
  it('renderiza Concluir e Excluir quando onConcluir e onExcluir existem', () => {
    renderWithProviders(<KebabMenu onConcluir={vi.fn()} onExcluir={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Abrir menu de ações'))
    expect(screen.getByText('✓ Concluir')).toBeInTheDocument()
    expect(screen.getByText('✕ Excluir')).toBeInTheDocument()
  })

  it('chama onConcluir ao clicar', () => {
    const onConcluir = vi.fn()
    renderWithProviders(<KebabMenu onConcluir={onConcluir} onExcluir={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Abrir menu de ações'))
    fireEvent.click(screen.getByText('✓ Concluir'))
    expect(onConcluir).toHaveBeenCalledTimes(1)
  })

  it('mostra confirmacao antes de excluir', () => {
    renderWithProviders(<KebabMenu onConcluir={vi.fn()} onExcluir={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Abrir menu de ações'))
    fireEvent.click(screen.getByText('✕ Excluir'))
    expect(screen.getByText('Excluir tarefa?')).toBeInTheDocument()
    expect(screen.getByText('Sim, excluir')).toBeInTheDocument()
  })

  it('chama onExcluir apos confirmacao', () => {
    const onExcluir = vi.fn()
    renderWithProviders(<KebabMenu onConcluir={vi.fn()} onExcluir={onExcluir} />)
    fireEvent.click(screen.getByLabelText('Abrir menu de ações'))
    fireEvent.click(screen.getByText('✕ Excluir'))
    fireEvent.click(screen.getByText('Sim, excluir'))
    expect(onExcluir).toHaveBeenCalledTimes(1)
  })

  it('mostra Reabrir quando concluida=true', () => {
    renderWithProviders(<KebabMenu concluida onConcluir={vi.fn()} onExcluir={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Abrir menu de ações'))
    expect(screen.getByText('↩ Reabrir')).toBeInTheDocument()
  })

  it('mostra Remover quadrante quando onLimparQuadrante existe', () => {
    renderWithProviders(<KebabMenu onConcluir={vi.fn()} onExcluir={vi.fn()} onLimparQuadrante={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Abrir menu de ações'))
    expect(screen.getByText('↩ Remover quadrante')).toBeInTheDocument()
  })
})
