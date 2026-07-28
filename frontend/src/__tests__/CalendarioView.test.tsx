import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from './utils'
import CalendarioView from '../pages/consultas/CalendarioView'

const defaultQuery = { tipo_objeto_id: 1, campo_agrupamento: 'criado_em' }

describe('CalendarioView', () => {
  it('renderiza loading', () => {
    renderWithProviders(<CalendarioView query={defaultQuery} result={undefined} resLoad={true} resErr={false} mesAtual="2026-06" onMesChange={() => {}} />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renderiza erro', () => {
    renderWithProviders(<CalendarioView query={defaultQuery} result={undefined} resLoad={false} resErr={true} mesAtual="2026-06" onMesChange={() => {}} errorMsg="Falha na consulta" />)
    expect(screen.getByText('Falha na consulta')).toBeInTheDocument()
  })

  it('renderiza mensagem sem campo_agrupamento', () => {
    renderWithProviders(<CalendarioView query={{ tipo_objeto_id: 1 }} result={undefined} resLoad={false} resErr={false} mesAtual="2026-06" onMesChange={() => {}} />)
    expect(screen.getByText('Selecione um campo de data (campo_agrupamento) na consulta')).toBeInTheDocument()
  })

  it('renderiza mes label e navegacao', () => {
    renderWithProviders(<CalendarioView query={defaultQuery} result={{ dados: [] }} resLoad={false} resErr={false} mesAtual="2026-06" onMesChange={() => {}} />)
    expect(screen.getByText(/\w+ de 2026/)).toBeInTheDocument()
    expect(screen.getByLabelText('Mês anterior')).toBeInTheDocument()
    expect(screen.getByLabelText('Próximo mês')).toBeInTheDocument()
    expect(screen.getByLabelText('Ir para o mês atual')).toBeInTheDocument()
  })

  it('renderiza dias da semana', () => {
    renderWithProviders(<CalendarioView query={defaultQuery} result={{ dados: [] }} resLoad={false} resErr={false} mesAtual="2026-06" onMesChange={() => {}} />)
    expect(screen.getByText('Dom')).toBeInTheDocument()
    expect(screen.getByText('Seg')).toBeInTheDocument()
    expect(screen.getByText('Sáb')).toBeInTheDocument()
  })

  it('renderiza notas nos dias', () => {
    renderWithProviders(<CalendarioView query={defaultQuery} result={{ dados: [{ id: 1, titulo: 'Nota teste', criado_em: '2026-06-15' }] }} resLoad={false} resErr={false} mesAtual="2026-06" onMesChange={() => {}} />)
    expect(screen.getByText('Nota teste')).toBeInTheDocument()
  })

  it('mostra +N mais quando mais de 3 notas no dia', () => {
    renderWithProviders(<CalendarioView query={defaultQuery} result={{ dados: [
      { id: 1, titulo: 'N1', criado_em: '2026-06-10' },
      { id: 2, titulo: 'N2', criado_em: '2026-06-10' },
      { id: 3, titulo: 'N3', criado_em: '2026-06-10' },
      { id: 4, titulo: 'N4', criado_em: '2026-06-10' },
    ] }} resLoad={false} resErr={false} mesAtual="2026-06" onMesChange={() => {}} />)
    expect(screen.getByText('+1 mais')).toBeInTheDocument()
  })
})
