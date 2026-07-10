import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './utils'
import Config from '../pages/Config'

vi.mock('../api/export', () => ({
  exportAll: vi.fn().mockRejectedValue(new Error('mock')),
  exportCSV: vi.fn().mockRejectedValue(new Error('mock')),
  exportTarefasFeitas: vi.fn().mockRejectedValue(new Error('mock')),
  vacuumDB: vi.fn().mockResolvedValue({ ok: true, mensagem: 'Compactado' }),
  backupDB: vi.fn().mockResolvedValue({ ok: true, mensagem: 'Backup iniciado' }),
  listBackups: vi.fn().mockResolvedValue([]),
  downloadBackup: vi.fn().mockRejectedValue(new Error('mock')),
}))
vi.mock('../api/import_export', () => ({
  importFile: vi.fn().mockRejectedValue(new Error('mock')),
}))
vi.mock('../api/tipos', () => ({
  getTipos: vi.fn().mockResolvedValue([]),
  createTipo: vi.fn().mockResolvedValue({ id: 1 }),
  updateTipo: vi.fn(),
  deleteTipo: vi.fn(),
}))

describe('Config', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renderiza o titulo Config', () => {
    renderWithProviders(<Config />)
    expect(screen.getAllByText('Config').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra abas Tipos, Exportar e Config', () => {
    renderWithProviders(<Config />)
    expect(screen.getByText('Tipos')).toBeInTheDocument()
    expect(screen.getByText('Exportar')).toBeInTheDocument()
    expect(screen.getAllByText('Config').length).toBeGreaterThanOrEqual(2)
  })

  it('alterna para aba Exportar ao clicar', () => {
    renderWithProviders(<Config />)
    fireEvent.click(screen.getByText('Exportar'))
    expect(screen.getByText('Exportar dados')).toBeInTheDocument()
  })

  it('alterna para aba Config ao clicar', () => {
    renderWithProviders(<Config />)
    fireEvent.click(screen.getAllByText('Config')[1])
    expect(screen.getByText('Aparência')).toBeInTheDocument()
  })

  it('mostra seção de atalhos com botão restaurar padrão', () => {
    renderWithProviders(<Config />)
    fireEvent.click(screen.getAllByText('Config')[1])
    expect(screen.getByText('Restaurar padrão')).toBeInTheDocument()
  })

  it('mostra seção de tutoriais com botão Resetar', () => {
    renderWithProviders(<Config />)
    fireEvent.click(screen.getAllByText('Config')[1])
    expect(screen.getByText('Reexibir tutoriais')).toBeInTheDocument()
  })

  it('mostra seção de banco de dados com botão Compactar', () => {
    renderWithProviders(<Config />)
    fireEvent.click(screen.getAllByText('Config')[1])
    expect(screen.getByText('Compactar banco')).toBeInTheDocument()
    expect(screen.getByText('Compactar agora')).toBeInTheDocument()
  })

  it('abre a aba Tipos por padrao', async () => {
    renderWithProviders(<Config />)
    await waitFor(() => {
      expect(screen.getByText('Novo tipo')).toBeInTheDocument()
    })
  })
})
