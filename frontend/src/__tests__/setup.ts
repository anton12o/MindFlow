import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api')

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
})

class MockBroadcastChannel {
  postMessage = vi.fn()
  close = vi.fn()
  onmessage: ((e: MessageEvent) => void) | null = null
  constructor() {}
}
Object.defineProperty(globalThis, 'BroadcastChannel', {
  writable: true,
  value: MockBroadcastChannel,
})
