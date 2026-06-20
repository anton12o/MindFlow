import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    testTimeout: 10000,
    hookTimeout: 10000,
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
