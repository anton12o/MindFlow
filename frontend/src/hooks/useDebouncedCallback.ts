import { useCallback, useRef, useEffect } from 'react'

export function useDebouncedCallback<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fnRef = useRef(fn)

  useEffect(() => { fnRef.current = fn })
  useEffect(() => {
    return () => { clearTimeout(timerRef.current) }
  }, [])

  return useCallback((...args: unknown[]) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fnRef.current(...args), delay)
  }, [delay]) as unknown as T
}
