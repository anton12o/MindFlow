import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { NotificationProvider, useNotify, useDnd } from '../store/notification'

function TestHarness() {
  const notify = useNotify()
  const setDnd = useDnd()
  return (
    <div>
      <button onClick={() => notify('Erro teste')}>notify-error</button>
      <button onClick={() => notify('Sucesso!', 'success')}>notify-success</button>
      <button onClick={() => setDnd(true)}>dnd-on</button>
      <button onClick={() => setDnd(false)}>dnd-off</button>
    </div>
  )
}

function renderNotif() {
  return render(<NotificationProvider><TestHarness /></NotificationProvider>)
}

describe('notificationStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('notify error adiciona notificação na tela', () => {
    renderNotif()
    act(() => { screen.getByText('notify-error').click() })
    expect(screen.getByText('Erro teste')).toBeInTheDocument()
  })

  it('notify success adiciona notificação na tela', () => {
    renderNotif()
    act(() => { screen.getByText('notify-success').click() })
    expect(screen.getByText('Sucesso!')).toBeInTheDocument()
  })

  it('notificação error tem classe bg-danger', () => {
    renderNotif()
    act(() => { screen.getByText('notify-error').click() })
    const el = screen.getByText('Erro teste').parentElement!
    expect(el.className).toContain('bg-danger')
  })

  it('notificação success tem classe bg-success', () => {
    renderNotif()
    act(() => { screen.getByText('notify-success').click() })
    const el = screen.getByText('Sucesso!').parentElement!
    expect(el.className).toContain('bg-success')
  })

  it('múltiplas notificações são empilhadas', () => {
    renderNotif()
    act(() => { screen.getByText('notify-error').click() })
    act(() => { screen.getByText('notify-error').click() })
    act(() => { screen.getByText('notify-error').click() })
    expect(screen.getAllByText('Erro teste')).toHaveLength(3)
  })

  it('dndActive true bloqueia notificações', () => {
    renderNotif()
    act(() => { screen.getByText('dnd-on').click() })
    act(() => { screen.getByText('notify-error').click() })
    expect(screen.queryByText('Erro teste')).not.toBeInTheDocument()
  })

  it('dndActive false reativa notificações', () => {
    renderNotif()
    act(() => { screen.getByText('dnd-on').click() })
    act(() => { screen.getByText('dnd-off').click() })
    act(() => { screen.getByText('notify-error').click() })
    expect(screen.getByText('Erro teste')).toBeInTheDocument()
  })

  it('auto-remove notificação após 4000ms', () => {
    renderNotif()
    act(() => { screen.getByText('notify-error').click() })
    expect(screen.getByText('Erro teste')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.queryByText('Erro teste')).not.toBeInTheDocument()
  })

  it('não remove notificação antes de 4000ms', () => {
    renderNotif()
    act(() => { screen.getByText('notify-error').click() })
    act(() => { vi.advanceTimersByTime(3999) })
    expect(screen.getByText('Erro teste')).toBeInTheDocument()
  })

  it('useNotify sem provider lança erro', () => {
    function Broken() { useNotify(); return null }
    expect(() => render(<Broken />)).toThrow()
  })

  it('useDnd sem provider lança erro', () => {
    function Broken() { useDnd(); return null }
    expect(() => render(<Broken />)).toThrow()
  })
})
