import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from './utils'
import GanttView from '../pages/consultas/GanttView'

vi.mock('../api/notas', () => ({
  updateNota: vi.fn(),
}))

const defaultQuery = { tipo_objeto_id: 1, campo_agrupamento: 'data_inicio' }
const makeItem = (id: number, titulo: string, data_inicio: string, data_fim: string) => ({
  id, titulo, propriedades: { data_inicio, data_fim },
})

describe('GanttView', () => {
  it('renderiza loading', () => {
    renderWithProviders(<GanttView query={defaultQuery} result={undefined} resLoad={true} resErr={false} />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('renderiza erro', () => {
    renderWithProviders(<GanttView query={defaultQuery} result={undefined} resLoad={false} resErr={true} errorMsg="Falha no gantt" />)
    expect(screen.getByText('Falha no gantt')).toBeInTheDocument()
  })

  it('renderiza mensagem sem campo_agrupamento', () => {
    renderWithProviders(<GanttView query={{ tipo_objeto_id: 1 }} result={undefined} resLoad={false} resErr={false} />)
    expect(screen.getByText('Selecione um campo de agrupamento (campo_agrupamento) na consulta')).toBeInTheDocument()
  })

  it('renderiza mensagem vazia quando sem dados', () => {
    renderWithProviders(<GanttView query={defaultQuery} result={{ dados: [], total: 0 }} resLoad={false} resErr={false} />)
    expect(screen.getByText('Nenhum item com data_inicio e data_fim')).toBeInTheDocument()
  })

  it('renderiza itens no gantt', () => {
    renderWithProviders(<GanttView query={defaultQuery} result={{
      dados: [makeItem(1, 'Projeto A', '2026-06-01', '2026-06-05')], total: 1,
    }} resLoad={false} resErr={false} />)
    expect(screen.getByText('Projeto A')).toBeInTheDocument()
    expect(screen.getByText(/2026-06-01.*2026-06-05/)).toBeInTheDocument()
  })

  it('mostra contagem de itens', () => {
    renderWithProviders(<GanttView query={defaultQuery} result={{
      dados: [makeItem(1, 'P1', '2026-06-01', '2026-06-02'), makeItem(2, 'P2', '2026-06-03', '2026-06-04')], total: 2,
    }} resLoad={false} resErr={false} />)
    expect(screen.getByText(/2 itens/)).toBeInTheDocument()
  })

  it('renderiza seletor de escala', () => {
    renderWithProviders(<GanttView query={defaultQuery} result={{
      dados: [makeItem(1, 'P1', '2026-06-01', '2026-06-02')], total: 1,
    }} resLoad={false} resErr={false} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
