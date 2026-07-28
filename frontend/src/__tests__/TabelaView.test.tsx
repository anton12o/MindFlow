import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './utils'
import TabelaView from '../pages/consultas/TabelaView'

describe('TabelaView', () => {
  it('renderiza loading', () => {
    renderWithProviders(<TabelaView result={undefined} resLoad={true} resErr={false} />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renderiza erro', () => {
    renderWithProviders(<TabelaView result={undefined} resLoad={false} resErr={true} errorMsg="Erro na tabela" />)
    expect(screen.getByText('Erro na tabela')).toBeInTheDocument()
  })

  it('renderiza mensagem vazia', () => {
    renderWithProviders(<TabelaView result={{ dados: [] }} resLoad={false} resErr={false} />)
    expect(screen.getByText('Nenhum resultado')).toBeInTheDocument()
  })

  it('renderiza tabela com dados', () => {
    renderWithProviders(<TabelaView result={{ dados: [{ id: 1, titulo: 'Item 1', status: 'ativo' }] }} resLoad={false} resErr={false} />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('ativo')).toBeInTheDocument()
  })

  it('renderiza cabecalhos da tabela', () => {
    renderWithProviders(<TabelaView result={{ dados: [{ id: 1, titulo: 'Item', status: 'ok' }] }} resLoad={false} resErr={false} />)
    expect(screen.getByText('id')).toBeInTheDocument()
    expect(screen.getByText('titulo')).toBeInTheDocument()
    expect(screen.getByText('status')).toBeInTheDocument()
  })

  it('ordena por coluna ao clicar no cabecalho', () => {
    renderWithProviders(<TabelaView result={{ dados: [
      { id: 2, titulo: 'Beta' },
      { id: 1, titulo: 'Alpha' },
    ] }} resLoad={false} resErr={false} />)
    fireEvent.click(screen.getByText('titulo'))
    const cells = screen.getAllByRole('cell')
    const tituloCells = cells.filter(c => c.textContent === 'Alpha' || c.textContent === 'Beta')
    expect(tituloCells.length).toBe(2)
  })

  it('renderiza valores null como —', () => {
    renderWithProviders(<TabelaView result={{ dados: [{ id: 1, titulo: 'Item', descricao: null }] }} resLoad={false} resErr={false} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renderiza booleanos como Sim/Nao', () => {
    renderWithProviders(<TabelaView result={{ dados: [{ id: 1, titulo: 'Item', concluido: true, arquivado: false }] }} resLoad={false} resErr={false} />)
    expect(screen.getByText('Sim')).toBeInTheDocument()
    expect(screen.getByText('Não')).toBeInTheDocument()
  })
})
