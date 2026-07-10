import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './utils'
import Tipos from '../pages/Tipos'
import { getTipos } from '../api/tipos'

vi.mock('../api/tipos')

const mockTipos = [
  { id: 1, nome: 'Artigo', icone: '📝', schema_campos: { autor: 'texto' }, contagem: 3 },
  { id: 2, nome: 'Tarefa', icone: '✅', schema_campos: {}, contagem: 0 },
]

beforeEach(() => {
  vi.mocked(getTipos).mockResolvedValue(mockTipos)
})

function renderTipos() {
  return renderWithProviders(<Tipos />)
}

describe('Tipos', () => {
  it('renderiza titulo', () => {
    renderTipos()
    expect(screen.getByText('Tipos de Objeto')).toBeInTheDocument()
  })

  it('exibe lista de tipos', async () => {
    renderTipos()
    expect(await screen.findByText('Artigo')).toBeInTheDocument()
    expect(await screen.findByText('Tarefa')).toBeInTheDocument()
  })

  it('exibe icone e nome de cada tipo', async () => {
    renderTipos()
    expect(await screen.findByText('📝')).toBeInTheDocument()
    expect(await screen.findByText('✅')).toBeInTheDocument()
  })

  it('exibe contagem de notas e campos', async () => {
    renderTipos()
    expect(await screen.findByText('3 notas · 1 campos')).toBeInTheDocument()
    expect(await screen.findByText('0 notas · 0 campos')).toBeInTheDocument()
  })

  it('exibe formulario de novo tipo', () => {
    renderTipos()
    expect(screen.getByPlaceholderText('Nome do tipo')).toBeInTheDocument()
    expect(screen.getByText('Criar')).toBeInTheDocument()
  })

  it('mostra estado de carregamento', () => {
    vi.mocked(getTipos).mockImplementationOnce(() => new Promise(() => {}))
    renderTipos()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('mostra estado de erro', async () => {
    vi.mocked(getTipos).mockRejectedValueOnce(new Error('fail'))
    renderTipos()
    expect(await screen.findByText('Erro ao carregar tipos')).toBeInTheDocument()
  })

  it('mostra mensagem de lista vazia', async () => {
    vi.mocked(getTipos).mockResolvedValueOnce([])
    renderTipos()
    expect(await screen.findByText('Nenhum tipo criado ainda')).toBeInTheDocument()
  })

  it('valida nome vazio no formulario de criar', async () => {
    renderTipos()
    await screen.findByText('Criar')
    fireEvent.click(screen.getByText('Criar'))
    expect(screen.getByText('Informe o nome do tipo')).toBeInTheDocument()
  })

  it('abre formulario de edicao ao clicar Editar', async () => {
    renderTipos()
    await screen.findByText('Artigo')
    fireEvent.click(screen.getAllByText('Editar')[0])
    expect(screen.getByDisplayValue('Artigo')).toBeInTheDocument()
    expect(screen.getByText('Salvar')).toBeInTheDocument()
  })
})
