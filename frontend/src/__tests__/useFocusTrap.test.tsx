import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'

function createContainer() {
  const div = document.createElement('div')
  div.innerHTML = `
    <button data-testid="first">Primeiro</button>
    <a href="#" data-testid="second">Segundo</a>
    <input data-testid="third" />
  `
  document.body.appendChild(div)
  return div
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('foca o primeiro elemento focado ao abrir', () => {
    const container = createContainer()
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null!)
      ref.current = container as HTMLDivElement
      useFocusTrap(ref, true)
      return ref
    })
    act(() => {})
    expect(document.activeElement).toBe(container.querySelector('button'))
  })

  it('nao foca nada quando isOpen=false', () => {
    const container = createContainer()
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null!)
      ref.current = container as HTMLDivElement
      useFocusTrap(ref, false)
      return ref
    })
    act(() => {})
    expect(document.activeElement).not.toBe(container.querySelector('button'))
  })

  it('retorna foco ao elemento anterior ao fechar', () => {
    const prev = document.createElement('button')
    prev.setAttribute('data-testid', 'prev')
    document.body.appendChild(prev)
    prev.focus()

    const container = createContainer()
    const { rerender } = renderHook(
      ({ isOpen }) => {
        const ref = useRef<HTMLDivElement>(null!)
        ref.current = container as HTMLDivElement
        useFocusTrap(ref, isOpen)
        return ref
      },
      { initialProps: { isOpen: true } },
    )
    act(() => {})
    rerender({ isOpen: false })
    expect(document.activeElement).toBe(prev)
  })

  it('Tab cicla do ultimo para o primeiro elemento', () => {
    const container = createContainer()
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null!)
      ref.current = container as HTMLDivElement
      useFocusTrap(ref, true)
      return ref
    })
    act(() => {
      ;(container.querySelector('input') as HTMLElement).focus()
    })
    act(() => {
      const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      window.dispatchEvent(ev)
    })
    expect(document.activeElement).toBe(container.querySelector('button'))
  })

  it('Shift+Tab cicla do primeiro para o ultimo elemento', () => {
    const container = createContainer()
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null!)
      ref.current = container as HTMLDivElement
      useFocusTrap(ref, true)
      return ref
    })
    act(() => {
      ;(container.querySelector('button') as HTMLElement).focus()
    })
    act(() => {
      const ev = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
      window.dispatchEvent(ev)
    })
    expect(document.activeElement).toBe(container.querySelector('input'))
  })

  it('remove event listener no cleanup', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const container = createContainer()
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null!)
      ref.current = container as HTMLDivElement
      useFocusTrap(ref, true)
      return ref
    })
    act(() => {})
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})
