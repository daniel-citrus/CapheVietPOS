import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_PORT = process.env.API_PORT || '3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      shared: fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  server: {
    // Everything server-side — the catalog, sales, the agent loop, and both
    // secrets — lives in the Fastify backend. The browser only ever calls
    // `/api/*`; in dev, Vite forwards that to the backend.
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
})
