import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Serves /api/* in dev using the same modules the Vercel functions use.
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'otto-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/live', async (_req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/_live.ts')
          const data = await mod.getLive({ SEC_USER_AGENT: env.SEC_USER_AGENT })
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(data))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
      server.middlewares.use('/api/ask', async (req, res) => {
        try {
          let raw = ''
          for await (const c of req) raw += c
          const mod = await server.ssrLoadModule('/api/_llm.ts')
          const stream: ReadableStream<Uint8Array> = await mod.askStream(JSON.parse(raw), env.GROQ_API_KEY)
          res.setHeader('content-type', 'text/plain; charset=utf-8')
          for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) res.write(chunk)
          res.end()
        } catch (e) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: '/',
    plugins: [react(), devApi(env)],
    build: { chunkSizeWarningLimit: 2500 },
  }
})
