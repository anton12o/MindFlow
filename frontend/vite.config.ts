import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js')
      if (!fs.existsSync(swPath)) return
      const content = fs.readFileSync(swPath, 'utf-8')
      const updated = content.replace('__VERSION__', String(Date.now()))
      fs.writeFileSync(swPath, updated)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swVersionPlugin()],
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
  },
})
