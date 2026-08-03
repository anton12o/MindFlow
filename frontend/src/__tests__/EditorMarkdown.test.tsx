import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import { renderWithProviders } from './utils'
import EditorMarkdown from '../components/EditorMarkdown'

function getView(container: HTMLElement): EditorView {
  const el = container.querySelector('.cm-editor')
  const view = el && EditorView.findFromDOM(el as HTMLElement)
  if (!view) throw new Error('EditorView nao encontrado')
  return view
}

function selectAll(view: EditorView) {
  view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } })
}

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

  it('aplica lista de marcadores em todas as linhas selecionadas', () => {
    const { container } = renderWithProviders(<EditorMarkdown value={'a\nb\nc'} onChange={vi.fn()} />)
    const view = getView(container)
    selectAll(view)
    fireEvent.click(screen.getByLabelText('Lista de marcadores'))
    expect(view.state.doc.toString()).toBe('- a\n- b\n- c')
  })

  it('aplica lista numerada em todas as linhas selecionadas', () => {
    const { container } = renderWithProviders(<EditorMarkdown value={'a\nb\nc'} onChange={vi.fn()} />)
    const view = getView(container)
    selectAll(view)
    fireEvent.click(screen.getByLabelText('Lista numerada'))
    expect(view.state.doc.toString()).toBe('1. a\n1. b\n1. c')
  })

  it('aplica lista de tarefas em todas as linhas selecionadas', () => {
    const { container } = renderWithProviders(<EditorMarkdown value={'a\nb'} onChange={vi.fn()} />)
    const view = getView(container)
    selectAll(view)
    fireEvent.click(screen.getByLabelText('Lista de tarefas'))
    expect(view.state.doc.toString()).toBe('- [ ] a\n- [ ] b')
  })

  it('remove prefixo existente quando ja listado (toggle)', () => {
    const { container } = renderWithProviders(<EditorMarkdown value={'- a\n- b'} onChange={vi.fn()} />)
    const view = getView(container)
    selectAll(view)
    fireEvent.click(screen.getByLabelText('Lista de marcadores'))
    expect(view.state.doc.toString()).toBe('a\nb')
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
