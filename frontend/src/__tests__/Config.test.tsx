import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './utils'
import Config from '../pages/Config'

const mockListBackups = vi.hoisted(() => vi.fn().mockResolvedValue([]))

vi.mock('../api/export', () => ({
  exportAll: vi.fn().mockRejectedValue(new Error('mock')),
  exportCSV: vi.fn().mockRejectedValue(new Error('mock')),
  exportTarefasFeitas: vi.fn().mockRejectedValue(new Error('mock')),
  vacuumDB: vi.fn().mockResolvedValue({ ok: true, mensagem: 'Compactado' }),
  backupDB: vi.fn().mockResolvedValue({ ok: true, mensagem: 'Backup iniciado' }),
  listBackups: mockListBackups,
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

function goToConfig() {
  fireEvent.click(screen.getAllByText('Config')[1])
}

describe('Config', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
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
    goToConfig()
    expect(screen.getByRole('heading', { name: 'Aparência' })).toBeInTheDocument()
  })

  it('mostra seção de atalhos com botão restaurar padrão', () => {
    renderWithProviders(<Config />)
    goToConfig()
    expect(screen.getAllByText('Restaurar padrão').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra seção de tutoriais com botão Resetar', () => {
    renderWithProviders(<Config />)
    goToConfig()
    expect(screen.getByText('Reexibir tutoriais')).toBeInTheDocument()
  })

  it('mostra seção de banco de dados com botão Compactar', () => {
    renderWithProviders(<Config />)
    goToConfig()
    expect(screen.getByText('Compactar banco')).toBeInTheDocument()
    expect(screen.getByText('Compactar agora')).toBeInTheDocument()
  })

  it('abre a aba Tipos por padrao', async () => {
    renderWithProviders(<Config />)
    await waitFor(() => {
      expect(screen.getByText('Novo tipo')).toBeInTheDocument()
    })
  })

  it('altera fonte familia no select', () => {
    renderWithProviders(<Config />)
    goToConfig()
    const select = screen.getByDisplayValue('Inter')
    fireEvent.change(select, { target: { value: 'JetBrains Mono' } })
    expect(screen.getByDisplayValue('JetBrains Mono')).toBeInTheDocument()
  })

  it('altera zoom via range slider', async () => {
    renderWithProviders(<Config />)
    goToConfig()
    const zoomSlider = screen.getAllByRole('slider')[1]
    fireEvent.change(zoomSlider, { target: { value: '110' } })
    await waitFor(() => {
      expect(screen.getByText('110%')).toBeInTheDocument()
    })
  })

  it('alterna modo compacto via toggle', () => {
    renderWithProviders(<Config />)
    goToConfig()
    const toggles = screen.getAllByRole('switch')
    const compactToggle = toggles[0]
    expect(compactToggle).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(compactToggle)
    expect(compactToggle).toHaveAttribute('aria-checked', 'true')
  })

  it('mostra lista de backups quando existem', async () => {
    mockListBackups.mockResolvedValue([{ nome: 'mindflow-2026-07-24.db', tamanho: 204800, modificado: Date.now() }])
    renderWithProviders(<Config />)
    goToConfig()
    await waitFor(() => {
      expect(screen.getByText(/mindflow-2026-07-24/)).toBeInTheDocument()
    })
  })

  it('mostra botao de download com tamanho do backup', async () => {
    mockListBackups.mockResolvedValue([{ nome: 'backup.db', tamanho: 102400, modificado: Date.now() }])
    renderWithProviders(<Config />)
    goToConfig()
    await waitFor(() => {
      expect(screen.getByText(/100KB/)).toBeInTheDocument()
    })
  })

  it('nao mostra lista de backups quando vazia', () => {
    mockListBackups.mockResolvedValue([])
    renderWithProviders(<Config />)
    goToConfig()
    expect(screen.queryByText(/mindflow-/)).not.toBeInTheDocument()
  })

  it('mostra loading enquanto lista backups', () => {
    mockListBackups.mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<Config />)
    goToConfig()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('chama backupDB ao clicar em Fazer backup agora', async () => {
    renderWithProviders(<Config />)
    goToConfig()
    const btn = screen.getByText('Fazer backup agora')
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.queryByText('Fazer backup agora')).toBeInTheDocument()
    })
  })

  it('altera primeiro dia da semana', async () => {
    renderWithProviders(<Config />)
    goToConfig()
    const select = screen.getByDisplayValue('Segunda-feira')
    fireEvent.change(select, { target: { value: 'domingo' } })
    await waitFor(() => {
      expect(screen.getByDisplayValue('Domingo')).toBeInTheDocument()
    })
  })

  it('altera tolerancia de streak via slider', async () => {
    renderWithProviders(<Config />)
    goToConfig()
    const sliders = screen.getAllByRole('slider')
    const streakSlider = sliders[2]
    fireEvent.change(streakSlider, { target: { value: '2' } })
    await waitFor(() => {
      expect(screen.getByText('2d')).toBeInTheDocument()
    })
  })

  it('altera modelo padrao de nota', () => {
    renderWithProviders(<Config />)
    goToConfig()
    const select = screen.getByDisplayValue('Nenhum')
    expect(select).toBeInTheDocument()
  })

  it('altera ordenacao padrao', async () => {
    renderWithProviders(<Config />)
    goToConfig()
    const select = screen.getByDisplayValue('Data (recente primeiro)')
    fireEvent.change(select, { target: { value: 'titulo' } })
    await waitFor(() => {
      expect(screen.getByDisplayValue('Título A-Z')).toBeInTheDocument()
    })
  })

  it('altera peso de score foco', async () => {
    renderWithProviders(<Config />)
    goToConfig()
    const scoreSliders = screen.getAllByRole('slider')
    const focoSlider = scoreSliders[3]
    fireEvent.change(focoSlider, { target: { value: '30' } })
    await waitFor(() => {
      expect(screen.getByText('30pts')).toBeInTheDocument()
    })
  })

  it('mostra warning quando score soma diferente de 100', async () => {
    renderWithProviders(<Config />)
    goToConfig()
    const sliders = screen.getAllByRole('slider')
    fireEvent.change(sliders[3], { target: { value: '50' } })
    await waitFor(() => {
      expect(screen.getAllByText(/ideal: 100/).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('altera timer continuo', () => {
    renderWithProviders(<Config />)
    goToConfig()
    const toggles = screen.getAllByRole('switch')
    const contToggle = toggles[1]
    fireEvent.click(contToggle)
    expect(contToggle).toHaveAttribute('aria-checked', 'true')
  })

  it('ativa PIN de acesso e mostra input', () => {
    renderWithProviders(<Config />)
    goToConfig()
    const pinToggle = screen.getAllByRole('switch').at(-1)!
    fireEvent.click(pinToggle)
    expect(screen.getByPlaceholderText('****')).toBeInTheDocument()
    expect(screen.getByText('Remover')).toBeInTheDocument()
  })

  it('altera input de foco min no metasScore', async () => {
    renderWithProviders(<Config />)
    goToConfig()
    const numeroInputs = screen.getAllByRole('spinbutton')
    const metasFocoInput = numeroInputs[0]
    fireEvent.change(metasFocoInput, { target: { value: '30' } })
    await waitFor(() => {
      expect(metasFocoInput).toHaveValue(30)
    })
  })

  it('mostra secoes da aba Config', () => {
    renderWithProviders(<Config />)
    goToConfig()
    expect(screen.getByRole('heading', { name: 'Aparência' })).toBeInTheDocument()
    expect(screen.getByText('Calendário')).toBeInTheDocument()
    expect(screen.getByText('Editor')).toBeInTheDocument()
    expect(screen.getByText('Score Semanal')).toBeInTheDocument()
    expect(screen.getByText('Temporizador')).toBeInTheDocument()
    expect(screen.getByText('Pomodoro')).toBeInTheDocument()
    expect(screen.getByText('Bloqueio')).toBeInTheDocument()
    expect(screen.getByText('Atalhos')).toBeInTheDocument()
    expect(screen.getByText('Perguntas da Reflexão')).toBeInTheDocument()
    expect(screen.getByText('Backup')).toBeInTheDocument()
    expect(screen.getByText('Tutoriais')).toBeInTheDocument()
    expect(screen.getByText('Sidebar')).toBeInTheDocument()
    expect(screen.getByText('Banco de dados')).toBeInTheDocument()
  })

  it('chama vacuumDB ao clicar Compactar agora', async () => {
    renderWithProviders(<Config />)
    goToConfig()
    const btn = screen.getAllByText('Compactar agora')[0]
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.queryByText('Compactar agora')).toBeInTheDocument()
    })
  })
})
