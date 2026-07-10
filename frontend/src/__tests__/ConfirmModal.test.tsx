import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './utils'
import ConfirmModal from '../components/ConfirmModal'

describe('ConfirmModal', () => {
  it('renderiza titulo e mensagem quando aberto', () => {
    renderWithProviders(
      <ConfirmModal
        titulo="Excluir item?"
        mensagem="Esta ação não pode ser desfeita."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Excluir item?')).toBeInTheDocument()
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument()
  })

  it('chama onConfirm ao clicar em Confirmar', () => {
    const onConfirm = vi.fn()
    renderWithProviders(
      <ConfirmModal
        titulo="Confirmar?"
        mensagem="Tem certeza?"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Confirmar'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('chama onCancel ao clicar em Cancelar', () => {
    const onCancel = vi.fn()
    renderWithProviders(
      <ConfirmModal
        titulo="Sair?"
        mensagem="Deseja sair?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByText('Cancelar'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('chama onCancel ao pressionar Escape', () => {
    const onCancel = vi.fn()
    renderWithProviders(
      <ConfirmModal
        titulo="Sair?"
        mensagem="Deseja sair?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('exibe label customizado quando destructive=true', () => {
    renderWithProviders(
      <ConfirmModal
        titulo="Deletar?"
        mensagem="Isto é destrutivo."
        confirmLabel="Sim, deletar"
        cancelLabel="Não"
        destructive
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Sim, deletar')).toBeInTheDocument()
    expect(screen.getByText('Não')).toBeInTheDocument()
  })

  it('desabilita botao de confirmar quando disabled=true', () => {
    renderWithProviders(
      <ConfirmModal
        titulo="Aguarde"
        mensagem="Processando..."
        disabled
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Aguarde...')).toBeDisabled()
  })
})
