import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load *all* env vars (not just VITE_-prefixed) so secret tokens can be read
  // here, server-side, without ever exposing them to the browser bundle.
  const env = loadEnv(mode, process.cwd(), '')

  const squareHost =
    env.SQUARE_ENVIRONMENT === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

  const squareToken = env.SQUARE_ACCESS_TOKEN?.trim()
  const anthropicKey = env.ANTHROPIC_API_KEY?.trim()

  // Tiny dev-server-only endpoint so the client can tell whether the agent is
  // usable — without ever seeing the key itself, just a boolean.
  const anthropicStatus: Plugin = {
    name: 'anthropic-status',
    configureServer(server) {
      server.middlewares.use('/api/anthropic-status', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ configured: Boolean(anthropicKey) }))
      })
    },
  }

  return {
    plugins: [react(), tailwindcss(), anthropicStatus],
    server: {
      proxy: {
        // Browser calls `/api/square/v2/...`; the dev server rewrites to the
        // real Square host and injects the auth header server-side.
        '/api/square': {
          target: squareHost,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/square/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (squareToken) {
                proxyReq.setHeader('Authorization', `Bearer ${squareToken}`)
              }
              proxyReq.setHeader('Square-Version', '2025-01-23')
              proxyReq.setHeader('Content-Type', 'application/json')
            })
          },
        },
        // Browser calls `/api/anthropic/v1/messages` with NO auth header (the
        // SDK is constructed with `defaultHeaders: { "X-Api-Key": null }` —
        // see ClaudeAgent.ts). The dev server adds the real key here, so the
        // secret never reaches the client. Streaming (SSE) passes through
        // untouched.
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (anthropicKey) {
                proxyReq.setHeader('x-api-key', anthropicKey)
              }
            })
          },
        },
      },
    },
  }
})
