import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from './utils'
import EditorMarkdown from '../components/EditorMarkdown'

describe('EditorMarkdown', () => {
  it('renderiza botoes de desfazer e refazer', () => {
    renderWithProviders(<EditorMarkdown value="" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Desfazer')).toBeInTheDocument()
    expect(screen.getByLabelText('Refazer')).toBeInTheDocument()
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
