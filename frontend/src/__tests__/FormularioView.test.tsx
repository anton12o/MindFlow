import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './utils'
import FormularioView from '../pages/consultas/FormularioView'

const createNota = vi.fn()
vi.mock('../api/notas', () => ({
  createNota: (...args: unknown[]) => createNota(...args),
}))

const defaultQuery = { tipo_objeto_id: 1 }
const defaultTipo = {
  icone: '📝', nome: 'Nota',
  schema_campos: { status: { type: 'text' }, prioridade: { type: 'select', options: ['alta', 'normal', 'baixa'] }, data: { type: 'date' }, paginas: { type: 'number' }, url: { type: 'url' } },
}

describe('FormularioView', () => {
  it('renderiza mensagem quando sem schema_campos', () => {
    renderWithProviders(<FormularioView query={defaultQuery} tipo={{ icone: '📝', nome: 'Nota' }} onClose={vi.fn()} onCreate={vi.fn()} />)
    expect(screen.getByText('Este tipo não tem schema_campos definido.')).toBeInTheDocument()
  })

  it('renderiza formulario com campos do schema', () => {
    renderWithProviders(<FormularioView query={defaultQuery} tipo={defaultTipo} onClose={vi.fn()} onCreate={vi.fn()} />)
    expect(screen.getByText('Nova nota 📝 Nota')).toBeInTheDocument()
    expect(screen.getByLabelText('Título *')).toBeInTheDocument()
    expect(screen.getByText('status')).toBeInTheDocument()
    expect(screen.getByText('prioridade')).toBeInTheDocument()
    expect(screen.getByText('data')).toBeInTheDocument()
    expect(screen.getByText('paginas')).toBeInTheDocument()
    expect(screen.getByText('url')).toBeInTheDocument()
  })

  it('cria nota ao submeter', async () => {
    createNota.mockResolvedValue({ id: 99 })
    const onCreate = vi.fn()
    renderWithProviders(<FormularioView query={defaultQuery} tipo={defaultTipo} onClose={vi.fn()} onCreate={onCreate} />)
    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Minha nota' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar Nota' }))
    await waitFor(() => {
      expect(createNota).toHaveBeenCalledWith({ titulo: 'Minha nota', tipo_id: 1, propriedades: {} })
    })
    expect(onCreate).toHaveBeenCalled()
  })

  it('cria nota com propriedades preenchidas', async () => {
    createNota.mockResolvedValue({ id: 99 })
    renderWithProviders(<FormularioView query={defaultQuery} tipo={defaultTipo} onClose={vi.fn()} onCreate={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Nota com props' } })
    const inputs = screen.getAllByRole('textbox')
    const statusInput = inputs.find(i => i.closest('div')?.textContent?.includes('status'))
    if (statusInput) fireEvent.change(statusInput, { target: { value: 'ativo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar Nota' }))
    await waitFor(() => {
      expect(createNota).toHaveBeenCalled()
    })
  })

  it('nao cria nota sem titulo', () => {
    renderWithProviders(<FormularioView query={defaultQuery} tipo={defaultTipo} onClose={vi.fn()} onCreate={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Criar Nota' })).toBeDisabled()
  })
})
