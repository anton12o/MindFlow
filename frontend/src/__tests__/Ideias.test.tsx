import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './utils'
import Ideias from '../pages/Ideias'
import { getNotas, getPastas, getTags, getNotaTags } from '../api/notas'
import { getTipos } from '../api/tipos'
import { getConexoes } from '../api/conexoes'
import type { Nota, Pasta, Tag, TipoObjeto, ConexaoNota } from '../types'

vi.mock('../api/notas')
vi.mock('../api/tipos')
vi.mock('../api/conexoes')
vi.mock('../utils/date', () => ({
  hojeLocal: () => '2026-06-23',
  formatDateLocal: (d: Date) => d.toISOString().slice(0, 10),
}))

const mockNotas: Nota[] = [
  { id: 1, titulo: 'Ideia de projeto', conteudo: 'Conteúdo da nota', pasta_id: null, tipo_id: null, ordem: null, criado_em: '2026-06-20T10:00:00', atualizado_em: '2026-06-22T10:00:00', favoritado: true, acessos: 5 },
  { id: 2, titulo: 'Lista de compras', conteudo: 'Itens para comprar', pasta_id: 1, tipo_id: 1, ordem: null, criado_em: '2026-06-21T10:00:00', atualizado_em: '2026-06-21T10:00:00', favoritado: false, acessos: 2 },
]
const mockPastas: Pasta[] = [
  { id: 1, nome: 'Projetos', pai_id: null },
]
const mockTags: Tag[] = [
  { id: 1, nome: 'urgente', cor: '#ef4444' },
  { id: 2, nome: 'ideia', cor: '#3b82f6' },
]
const mockTipos: TipoObjeto[] = [
  { id: 1, nome: 'Tarefa', icone: '📋', schema_campos: {}, schema_relacoes: {}, criado_em: '2026-06-01T00:00:00' },
]

describe('Ideias', () => {
  beforeEach(() => {
    vi.mocked(getNotas).mockResolvedValue(mockNotas)
    vi.mocked(getPastas).mockResolvedValue(mockPastas)
    vi.mocked(getTags).mockResolvedValue(mockTags)
    vi.mocked(getTipos).mockResolvedValue(mockTipos)
    vi.mocked(getConexoes).mockResolvedValue([])
    vi.mocked(getNotaTags).mockResolvedValue([])
    localStorage.clear()
  })

  it('renderiza titulo', async () => {
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByText('Notas')).toBeInTheDocument()
    })
  })

  it('exibe contagem de notas na sidebar', async () => {
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByText(/2 nota/)).toBeInTheDocument()
    })
  })

  it('exibe botao de favoritos na toolbar', async () => {
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByTitle('Mostrar apenas favoritas')).toBeInTheDocument()
    })
  })

  it('exibe seção de Pastas', async () => {
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByText('Pastas')).toBeInTheDocument()
    })
  })

  it('exibe botao de filtro por tags na toolbar', async () => {
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByTitle('Filtrar por tags')).toBeInTheDocument()
    })
  })

  it('mostra estado de carregamento', async () => {
    vi.mocked(getNotas).mockResolvedValue(new Promise(() => {}))
    renderWithProviders(<Ideias />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('mostra erro ao carregar', async () => {
    vi.mocked(getNotas).mockRejectedValue(new Error('fail'))
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar notas')).toBeInTheDocument()
    })
  })

  it('mostra placeholder de selecao quando nenhuma nota selecionada', async () => {
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByText('Selecione ou crie uma nota')).toBeInTheDocument()
    })
  })

  it('exibe campo de busca', async () => {
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument()
    })
  })

  it('exibe toolbar com acoes principais', async () => {
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByTitle('Nova nota (Ctrl+N)')).toBeInTheDocument()
      expect(screen.getByTitle('Buscar (Ctrl+K)')).toBeInTheDocument()
      expect(screen.getByTitle('Grafo de conexões')).toBeInTheDocument()
      expect(screen.getAllByTitle('Selecionar múltiplas notas')[0]).toBeInTheDocument()
    })
  })

  it('abre popover de tags ao clicar no botao', async () => {
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByTitle('Filtrar por tags')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Filtrar por tags'))
    await waitFor(() => {
      expect(screen.getByText('urgente')).toBeInTheDocument()
      expect(screen.getByText('ideia')).toBeInTheDocument()
    })
  })

  it('exibe botao de filtro de pastas na toolbar', async () => {
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByTitle('Filtrar por pasta')).toBeInTheDocument()
    })
  })

  it('abre popover de pastas ao clicar no botao', async () => {
    renderWithProviders(<Ideias />)
    await waitFor(() => {
      expect(screen.getByTitle('Filtrar por pasta')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Filtrar por pasta'))
    await waitFor(() => {
      expect(screen.getByText('Projetos')).toBeInTheDocument()
    })
  })
})
