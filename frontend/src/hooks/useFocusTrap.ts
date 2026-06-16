import { useEffect } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || !ref.current) return

    const el = ref.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusables = el.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (focusables.length > 0) {
      focusables[0].focus()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusables = el.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [isOpen, ref])
}
