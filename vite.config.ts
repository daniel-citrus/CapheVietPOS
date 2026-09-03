import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load *all* env vars (not just VITE_-prefixed) so the Square token can be
  // read here, server-side, without ever exposing it to the browser bundle.
  const env = loadEnv(mode, process.cwd(), '')

  const squareHost =
    env.SQUARE_ENVIRONMENT === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

  const token = env.SQUARE_ACCESS_TOKEN?.trim()

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Browser calls `/api/square/v2/...`; the dev server rewrites to the
        // real Square host and injects the Authorization header.
        '/api/square': {
          target: squareHost,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/square/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (token) {
                proxyReq.setHeader('Authorization', `Bearer ${token}`)
              }
              proxyReq.setHeader('Square-Version', '2025-01-23')
              proxyReq.setHeader('Content-Type', 'application/json')
            })
          },
        },
      },
    },
  }
})
