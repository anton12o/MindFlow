import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './utils'
import ReflexaoTab, { extractRespostasPorOrdem, formatRange } from '../pages/ReflexaoTab'
import { getWeeklyStats } from '../api/stats'
import { getReflexoes, createNota, updateNota } from '../api/notas'

vi.mock('../api/stats')
vi.mock('../api/notas')

const mockEmptyWeekly = {
  offset: 0,
  semana: { inicio: '2026-06-22', fim: '2026-06-28', total_notas: 0, total_tarefas: 0, total_pomodoros: 0, total_minutos_foco: 0, taxa_habitos: 0, dias: [] },
  semana_passada: { inicio: '2026-06-15', fim: '2026-06-21', total_notas: 0, total_tarefas: 0, total_pomodoros: 0, total_minutos_foco: 0, taxa_habitos: 0, dias: [] },
  streak_atual: 0,
  total_habitos_ativos: 0,
  score: { total: 0, foco: 0, tarefas: 0, habitos: 0, notas: 0 },
  gerado_em: '2026-06-29T00:00:00',
}

const mockReflexaoExistente = {
  id: 42,
  titulo: 'Reflexão Semanal 📝 2026-06-22',
  conteudo: `# Reflexão Semanal\n\n> 22/06 a 28/06/26\n\n## O que funcionou bem esta semana?\n\nFoi produtivo\n\n## O que poderia ter sido melhor?\n\nOrganização\n\n## Qual foi o aprendizado mais importante?\n\nPriorizar\n\n## O que você quer focar na próxima semana?\n\nExercícios`,
  criado_em: '2026-06-28T10:00:00',
  propriedades: { tipo: 'reflexao_semanal', semana_inicio: '2026-06-22' },
}

describe('extractRespostasPorOrdem', () => {
  it('extrai respostas pela posicao dos ##', () => {
    const conteudo = `# Titulo\n\n## Perg1\n\nResposta 1\n\n## Perg2\n\nResposta 2`
    const result = extractRespostasPorOrdem(conteudo, 2)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('Resposta 1')
    expect(result[1]).toBe('Resposta 2')
  })

  it('retorna string vazia para perguntas sem resposta', () => {
    const conteudo = `# Titulo\n\n> range\n\n## Perg1\n\nResposta`
    const result = extractRespostasPorOrdem(conteudo, 3)
    expect(result).toHaveLength(3)
    expect(result[0]).toBe('Resposta')
    expect(result[1]).toBe('')
    expect(result[2]).toBe('')
  })

  it('ignora linhas com > (range) no inicio do trecho', () => {
    const conteudo = `# Titulo\n\n> 22/06 a 28/06/26\n\n## Perg1\n\nResposta\n\n## Perg2`
    const result = extractRespostasPorOrdem(conteudo, 2)
    expect(result[0]).toBe('Resposta')
  })

  it('retorna array de strings vazias se conteudo vazio', () => {
    const result = extractRespostasPorOrdem('', 2)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('')
    expect(result[1]).toBe('')
  })
})

describe('formatRange', () => {
  it('formata range de datas no padrao pt-BR', () => {
    const result = formatRange('2026-06-22', '2026-06-28')
    expect(result).toBe('22/06 a 28/06/26')
  })
})

describe('ReflexaoTab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(getWeeklyStats).mockResolvedValue(mockEmptyWeekly)
    vi.mocked(getReflexoes).mockResolvedValue([])
    vi.mocked(createNota).mockResolvedValue({ id: 1 } as never)
    vi.mocked(updateNota).mockResolvedValue({ id: 1 } as never)
  })

  it('mostra loading skeleton enquanto carrega', () => {
    vi.mocked(getWeeklyStats).mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<ReflexaoTab />)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renderiza perguntas e textareas apos carregar', async () => {
    renderWithProviders(<ReflexaoTab />)
    await waitFor(() => {
      expect(screen.getByText(/O que funcionou bem/)).toBeInTheDocument()
    })
    expect(screen.getByText(/O que poderia ter sido melhor/)).toBeInTheDocument()
    expect(screen.getByText(/Qual foi o aprendizado/)).toBeInTheDocument()
    expect(screen.getByText(/O que você quer focar/)).toBeInTheDocument()
    const textareas = screen.getAllByPlaceholderText('Digite sua reflexão...')
    expect(textareas).toHaveLength(4)
  })

  it('mostra "Salvar reflexao" quando nao ha reflexao existente', async () => {
    renderWithProviders(<ReflexaoTab />)
    await waitFor(() => {
      expect(screen.getByText('Salvar reflexão')).toBeInTheDocument()
    })
    expect(screen.queryByText('Atualizar reflexão')).not.toBeInTheDocument()
  })

  it('mostra "Atualizar reflexao" quando reflexao existe', async () => {
    vi.mocked(getReflexoes).mockResolvedValue([mockReflexaoExistente] as never)
    renderWithProviders(<ReflexaoTab />)
    await waitFor(() => {
      expect(screen.getByText('Atualizar reflexão')).toBeInTheDocument()
    })
    expect(screen.queryByText('Salvar reflexão')).not.toBeInTheDocument()
  })

  it('preenche textareas com respostas existentes ao carregar reflexao', async () => {
    vi.mocked(getReflexoes).mockResolvedValue([mockReflexaoExistente] as never)
    renderWithProviders(<ReflexaoTab />)
    await waitFor(() => {
      const textareas = screen.getAllByPlaceholderText('Digite sua reflexão...')
      expect(textareas).toHaveLength(4)
      expect(textareas[0]).toHaveValue('Foi produtivo')
    })
  })

  it('chama createNota ao salvar nova reflexao', async () => {
    renderWithProviders(<ReflexaoTab />)
    await waitFor(() => {
      expect(screen.getByText('Salvar reflexão')).toBeInTheDocument()
    })
    const textareas = screen.getAllByPlaceholderText('Digite sua reflexão...')
    fireEvent.change(textareas[0], { target: { value: 'Foi bom' } })
    fireEvent.click(screen.getByText('Salvar reflexão'))
    await waitFor(() => {
      expect(createNota).toHaveBeenCalled()
    })
  })

  it('chama updateNota ao atualizar reflexao existente', async () => {
    vi.mocked(getReflexoes).mockResolvedValue([mockReflexaoExistente] as never)
    renderWithProviders(<ReflexaoTab />)
    await waitFor(() => {
      expect(screen.getByText('Atualizar reflexão')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Atualizar reflexão'))
    await waitFor(() => {
      expect(updateNota).toHaveBeenCalledWith(42, expect.any(Object))
    })
  })

  it('mostra historico quando ha reflexoes', async () => {
    vi.mocked(getReflexoes).mockResolvedValue([mockReflexaoExistente] as never)
    renderWithProviders(<ReflexaoTab />)
    await waitFor(() => {
      expect(screen.getByText('Histórico')).toBeInTheDocument()
    })
    expect(screen.getByText('Semana de 2026-06-22')).toBeInTheDocument()
  })

  it('abre painel de gerenciar perguntas ao clicar no gear', async () => {
    renderWithProviders(<ReflexaoTab />)
    await waitFor(() => {
      expect(screen.getByText(/O que funcionou bem/)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Gerenciar perguntas'))
    expect(screen.getByText('Gerenciar Perguntas')).toBeInTheDocument()
    expect(screen.getByText('Restaurar padrão')).toBeInTheDocument()
  })

  it('adiciona nova pergunta via painel de gerenciamento', async () => {
    renderWithProviders(<ReflexaoTab />)
    await waitFor(() => {
      expect(screen.getByText(/O que funcionou bem/)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Gerenciar perguntas'))
    const input = screen.getByPlaceholderText('Nova pergunta...')
    fireEvent.change(input, { target: { value: 'Teste?' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(screen.getByText('Teste?')).toBeInTheDocument()
  })

  it('botao salvar fica desabilitado quando todas as respostas estao vazias', async () => {
    renderWithProviders(<ReflexaoTab />)
    await waitFor(() => {
      const btn = screen.getByText('Salvar reflexão')
      expect(btn).toBeDisabled()
    })
  })
})
