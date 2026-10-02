import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Serves /api/live in dev using the same module the Vercel function uses.
function liveApi(): Plugin {
  return {
    name: 'otto-live-api',
    configureServer(server) {
      server.middlewares.use('/api/live', async (_req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/_live.ts')
          const data = await mod.getLive({ SEC_USER_AGENT: process.env.SEC_USER_AGENT })
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(data))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [react(), liveApi()],
  build: { chunkSizeWarningLimit: 2500 },
})
