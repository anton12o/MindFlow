import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './utils'
import IdeiasEditor from '../components/IdeiasEditor'
import type { Nota, Tag, TipoObjeto, Pasta } from '../types'

const mockNota: Nota = {
  id: 1, titulo: 'Minha nota', conteudo: 'Conteúdo interessante',
  pasta_id: null, tipo_id: null, ordem: null,
  criado_em: '2026-06-20T10:00:00', atualizado_em: '2026-06-22T10:00:00',
  favoritado: false, acessos: 5,
}
const mockTags: Tag[] = [
  { id: 1, nome: 'urgente', cor: '#ef4444' },
  { id: 2, nome: 'ideia', cor: '#3b82f6' },
]
const mockTipos: TipoObjeto[] = [
  { id: 1, nome: 'Tarefa', icone: '📋', schema_campos: {}, schema_relacoes: {}, criado_em: '2026-06-01T00:00:00' },
]
const mockPastas: Pasta[] = [
  { id: 1, nome: 'Projetos', pai_id: null },
]

function renderEditor(overrides: Record<string, unknown> = {}) {
  const props = {
    notaAtual: mockNota,
    notas: [mockNota],
    tipos: mockTipos,
    pastas: mockPastas,
    entrada: [],
    saida: [],
    notaTagsData: mockTags,
    selectedId: 1,
    savePending: false,
    deletePending: false,
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onFavoritar: vi.fn(),
    onRemoveTag: vi.fn(),
    onSelectNota: vi.fn(),
    onShowTagModal: vi.fn(),
    ...overrides,
  }
  return { ...renderWithProviders(<IdeiasEditor {...props} />), props }
}

describe('IdeiasEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza título da nota no modo visualização', () => {
    renderEditor()
    expect(screen.getByText('Minha nota')).toBeInTheDocument()
  })

  it('mostra dados do header (criado, modificado, palavras)', () => {
    renderEditor()
    expect(screen.getByText(/Criado:/)).toBeInTheDocument()
    expect(screen.getByText(/Modificado:/)).toBeInTheDocument()
    expect(screen.getByText(/palavras/)).toBeInTheDocument()
  })

  it('mostra botão "Editar" no modo visualização', () => {
    renderEditor()
    expect(screen.getByText('Editar')).toBeInTheDocument()
  })

  it('mostra "Nenhum conteúdo" quando nota vazia', () => {
    renderEditor({ notaAtual: { ...mockNota, conteudo: '' } })
    expect(screen.getByText('Nenhum conteúdo')).toBeInTheDocument()
  })

  it('exibe tags da nota com cor', () => {
    renderEditor()
    expect(screen.getByText('urgente')).toBeInTheDocument()
    expect(screen.getByText('ideia')).toBeInTheDocument()
  })

  it('mostra botão +Tag no modo edição', () => {
    renderEditor({ notaAtual: { ...mockNota, titulo: '(sem título)' } })
    expect(screen.getAllByText(/Tag/).length).toBeGreaterThanOrEqual(1)
  })

  it('alterna para modo edição ao clicar "Editar"', () => {
    renderEditor()
    fireEvent.click(screen.getByText('Editar'))
    expect(screen.getByDisplayValue('Minha nota')).toBeInTheDocument()
  })

  it('exibe propriedades quando existem', () => {
    const notaComProps = { ...mockNota, propriedades: { autor: 'teste' } }
    renderEditor({ notaAtual: notaComProps })
    expect(screen.getByText('autor')).toBeInTheDocument()
    expect(screen.getByText('teste')).toBeInTheDocument()
  })

  it('painel Extrair aparece ao clicar no botão', () => {
    renderEditor({ notaAtual: { ...mockNota, titulo: '(sem título)' } })
    fireEvent.click(screen.getByTitle(/Extrair/))
    expect(screen.getByPlaceholderText('Cole o trecho aqui...')).toBeInTheDocument()
  })

  it('botões de export .md e .json', () => {
    renderEditor()
    expect(screen.getByTitle('Exportar como Markdown')).toBeInTheDocument()
    expect(screen.getByTitle('Exportar como JSON')).toBeInTheDocument()
  })

  it('botão favoritar presente', () => {
    renderEditor()
    expect(screen.getByTitle('Adicionar aos favoritos')).toBeInTheDocument()
  })

  it('exibe conexões "Aponta para"', () => {
    const saida = [{ id: 2, titulo: 'Nota destino', conteudo: '' }]
    renderEditor({ saida } as any)
    expect(screen.getByText('Aponta para')).toBeInTheDocument()
    expect(screen.getByText('Nota destino')).toBeInTheDocument()
  })

  it('exibe conexões "Apontam para esta"', () => {
    const entrada = [{ id: 3, titulo: 'Nota origem', conteudo: '' }]
    renderEditor({ entrada } as any)
    expect(screen.getByText('Apontam para esta')).toBeInTheDocument()
    expect(screen.getByText('Nota origem')).toBeInTheDocument()
  })

  it('executa onSave ao salvar no modo edição', () => {
    const { props } = renderEditor()
    fireEvent.click(screen.getByText('Editar'))
    const titleInput = screen.getByDisplayValue('Minha nota')
    fireEvent.change(titleInput, { target: { value: 'Nota alterada' } })
    fireEvent.click(screen.getByText('Salvar'))
    expect(props.onSave).toHaveBeenCalledWith(1, expect.objectContaining({ titulo: 'Nota alterada' }))
  })

  it('mostra botão "Salvar" no modo edição', () => {
    renderEditor({ notaAtual: { ...mockNota, titulo: '(sem título)' } })
    expect(screen.getByText('Salvar')).toBeInTheDocument()
  })

  it('dispara onSave automático via debounce ao alterar conteúdo', async () => {
    vi.useFakeTimers()
    const { props } = renderEditor({ notaAtual: { ...mockNota, titulo: '(sem título)' } })
    const titleInput = screen.getByDisplayValue('(sem título)')
    fireEvent.change(titleInput, { target: { value: 'Alterado auto' } })
    vi.advanceTimersByTime(2000)
    expect(props.onSave).toHaveBeenCalledWith(1, expect.objectContaining({ titulo: 'Alterado auto' }))
    vi.useRealTimers()
  })

  it('chama onFavoritar ao clicar na estrela', () => {
    const { props } = renderEditor()
    fireEvent.click(screen.getByTitle('Adicionar aos favoritos'))
    expect(props.onFavoritar).toHaveBeenCalledWith(1)
  })

  it('chama onDelete ao clicar Excluir', () => {
    const { props } = renderEditor()
    fireEvent.click(screen.getByText('Excluir'))
    expect(props.onDelete).toHaveBeenCalledWith(1)
  })

  it('chama onSelectNota ao clicar em wikilink de saída', () => {
    const saida = [{ id: 2, titulo: 'Destino', conteudo: '' }]
    const { props } = renderEditor({ saida } as any)
    fireEvent.click(screen.getByText('Destino'))
    expect(props.onSelectNota).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  })

  it('chama onShowTagModal ao clicar +Tag', () => {
    const { props } = renderEditor({ notaAtual: { ...mockNota, titulo: '(sem título)' } })
    fireEvent.click(screen.getAllByText(/Tag/)[0])
    expect(props.onShowTagModal).toHaveBeenCalled()
  })

  it('mostra botão ID Zettelkasten no modo edição', () => {
    renderEditor({ notaAtual: { ...mockNota, titulo: '(sem título)' } })
    expect(screen.getByTitle(/Zettelkasten/)).toBeInTheDocument()
  })

  it('mostra select de categoria e grupo no modo edição', () => {
    renderEditor({ notaAtual: { ...mockNota, titulo: '(sem título)' } })
    expect(screen.getByText('Categoria:')).toBeInTheDocument()
    expect(screen.getByText('Grupo:')).toBeInTheDocument()
  })

  it('exibe ícone e nome do tipo no modo visualização quando nota tem tipo', () => {
    const notaComTipo = { ...mockNota, tipo_id: 1 }
    renderEditor({ notaAtual: notaComTipo })
    expect(screen.getByText('📋 Tarefa')).toBeInTheDocument()
  })

  it('exibe nome da pasta no modo visualização quando nota tem pasta', () => {
    const notaComPasta = { ...mockNota, pasta_id: 1 }
    renderEditor({ notaAtual: notaComPasta })
    expect(screen.getByText('Projetos')).toBeInTheDocument()
  })
})
