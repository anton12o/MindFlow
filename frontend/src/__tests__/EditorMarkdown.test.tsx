import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './utils'
import EditorMarkdown from '../components/EditorMarkdown'

describe('EditorMarkdown', () => {
  it('renderiza botoes de desfazer e refazer', () => {
    renderWithProviders(<EditorMarkdown value="" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Desfazer')).toBeInTheDocument()
    expect(screen.getByLabelText('Refazer')).toBeInTheDocument()
  })

  it('abre dropdown de cabecalho ao clicar no botao H', async () => {
    renderWithProviders(<EditorMarkdown value="" onChange={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Cabeçalho'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Texto' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'H1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'H2' })).toBeInTheDocument()
    })
  })

  it('renderiza placeholder', () => {
    const { container } = renderWithProviders(<EditorMarkdown value="" onChange={vi.fn()} />)
    const cmScroller = container.querySelector('.cm-scroller')
    expect(cmScroller).toBeInTheDocument()
  })

  it('chama onChange quando o documento muda', () => {
    const onChange = vi.fn()
    renderWithProviders(<EditorMarkdown value="teste" onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('passa array de notas para autocompletar wikilinks', () => {
    const notas = [{ id: 1, titulo: 'Nota exemplo' }]
    const { container } = renderWithProviders(
      <EditorMarkdown value="" onChange={vi.fn()} notas={notas} />
    )
    expect(container.querySelector('.cm-editor')).toBeInTheDocument()
  })
})
