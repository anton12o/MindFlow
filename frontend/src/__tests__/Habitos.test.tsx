import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './utils'
import Habitos from '../pages/Habitos'
import { getHabitos, createHabito, deleteHabito, createRegistro } from '../api/habitos'
import type { Habito } from '../types'

vi.mock('../api/habitos')
vi.mock('../utils/date', () => ({
  hojeLocal: () => '2026-06-23',
}))

const mockHabitos: Habito[] = [
  {
    id: 1,
    nome: 'Beber agua',
    tipo: 'quantitativo',
    meta: 8,
    unidade: 'copos',
    categoria: 'Saude',
    cor: '#3b82f6',
    ativo: true,
    criado_em: '2026-06-01T00:00:00',
    dias_semana: null,
  },
  {
    id: 2,
    nome: 'Meditar',
    tipo: 'binario',
    meta: null,
    unidade: null,
    categoria: 'Mindfulness',
    cor: '#8b5cf6',
    ativo: true,
    criado_em: '2026-06-01T00:00:00',
    dias_semana: null,
  },
]

describe('Habitos', () => {
  beforeEach(() => {
    vi.mocked(getHabitos).mockResolvedValue(mockHabitos)
    localStorage.clear()
  })

  it('renderiza titulo', async () => {
    renderWithProviders(<Habitos />)
    await waitFor(() => {
      expect(screen.getByText('Hábitos')).toBeInTheDocument()
    })
  })

  it('exibe lista de habitos ativos', async () => {
    renderWithProviders(<Habitos />)
    await waitFor(() => {
      expect(screen.getByText('Beber agua')).toBeInTheDocument()
      expect(screen.getByText('Meditar')).toBeInTheDocument()
    })
  })

  it('mostra tipo como Sim/Nao para binario', async () => {
    renderWithProviders(<Habitos />)
    await waitFor(() => {
      expect(screen.getByText('Sim/Não')).toBeInTheDocument()
    })
  })

  it('mostra tipo como Contagem para quantitativo', async () => {
    renderWithProviders(<Habitos />)
    await waitFor(() => {
      expect(screen.getByText('Contagem')).toBeInTheDocument()
    })
  })

  it('mostra botao +1 para habito quantitativo', async () => {
    renderWithProviders(<Habitos />)
    await waitFor(() => {
      const checkButtons = screen.getAllByText('+1')
      expect(checkButtons.length).toBe(1)
    })
  })

  it('mostra estado de carregamento', async () => {
    vi.mocked(getHabitos).mockResolvedValue(new Promise(() => {}))
    renderWithProviders(<Habitos />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('mostra erro ao carregar', async () => {
    vi.mocked(getHabitos).mockRejectedValue(new Error('fail'))
    renderWithProviders(<Habitos />)
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar hábitos')).toBeInTheDocument()
    })
  })

  it('mostra mensagem de lista vazia', async () => {
    vi.mocked(getHabitos).mockResolvedValue([])
    renderWithProviders(<Habitos />)
    await waitFor(() => {
      expect(screen.getByText('Nenhum hábito criado ainda')).toBeInTheDocument()
    })
  })

  it('mostra botao + Novo habito', async () => {
    renderWithProviders(<Habitos />)
    await waitFor(() => {
      expect(screen.getByText('+ Novo hábito')).toBeInTheDocument()
    })
  })

  it('mostra seção de hábitos arquivados se houver', async () => {
    const comArquivado = [...mockHabitos, {
      id: 3,
      nome: 'Exercicio',
      tipo: 'binario' as const,
      meta: null,
      unidade: null,
      categoria: null,
      cor: null,
      ativo: false,
      criado_em: '2026-06-01T00:00:00',
      dias_semana: null,
    }]
    vi.mocked(getHabitos).mockResolvedValue(comArquivado)
    renderWithProviders(<Habitos />)
    await waitFor(() => {
      expect(screen.getByText(/Hábitos arquivados/)).toBeInTheDocument()
    })
  })

  it('nao mostra arquivados se nao houver', async () => {
    renderWithProviders(<Habitos />)
    await waitFor(() => {
      expect(screen.queryByText(/Hábitos arquivados/)).not.toBeInTheDocument()
    })
  })

  it('cria habito ao submeter formulario', async () => {
    vi.mocked(createHabito).mockResolvedValue({ id: 99, nome: 'Novo habito', tipo: 'binario', meta: null, unidade: null, categoria: null, cor: null, ativo: true, criado_em: '2026-06-23T00:00:00' })
    renderWithProviders(<Habitos />)
    await waitFor(() => expect(screen.getByText('+ Novo hábito')).toBeInTheDocument())
    fireEvent.click(screen.getByText('+ Novo hábito'))
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'Novo habito' } })
    fireEvent.click(screen.getByText('Criar'))
    await waitFor(() => {
      expect(createHabito).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Novo habito' }))
    })
  })

  it('exclui habito ao confirmar no modal', async () => {
    vi.mocked(deleteHabito).mockResolvedValue({ ok: true })
    renderWithProviders(<Habitos />)
    await waitFor(() => expect(screen.getByText('Beber agua')).toBeInTheDocument())
    const kebabButtons = screen.getAllByText('⋮')
    fireEvent.click(kebabButtons[0])
    await waitFor(() => expect(screen.getByText('🗑️ Excluir')).toBeInTheDocument())
    fireEvent.click(screen.getByText('🗑️ Excluir'))
    await waitFor(() => expect(screen.getByText('Remover')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Remover'))
    await waitFor(() => {
      expect(deleteHabito).toHaveBeenCalledWith(1)
    })
  })

  it('faz checkin ao clicar +1 em habito quantitativo', async () => {
    vi.mocked(createRegistro).mockResolvedValue({ id: 1, habito_id: 1, data: '2026-06-23', valor: 1 })
    renderWithProviders(<Habitos />)
    await waitFor(() => expect(screen.getByText('+1')).toBeInTheDocument())
    fireEvent.click(screen.getByText('+1'))
    await waitFor(() => {
      expect(createRegistro).toHaveBeenCalledWith(1, { habito_id: 1, data: '2026-06-23', valor: 1 })
    })
  })
})
