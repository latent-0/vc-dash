import react from '@vitejs/plugin-react'
import type { IncomingMessage } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Runs api/**/*.ts Vercel-style functions (export GET/POST(request) => Response) inside the dev server.
function devApi(): Plugin {
  return {
    name: 'otto-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/')) return next()
        const name = url.pathname.slice(5).replace(/\/$/, '')
        if (!name || name.split('/').some((p) => p.startsWith('_'))) return next()
        let mod: Record<string, (r: Request) => Promise<Response>>
        try {
          mod = await server.ssrLoadModule(`/api/${name}.ts`)
        } catch {
          return next()
        }
        const handler = mod[req.method ?? 'GET']
        if (!handler) { res.statusCode = 405; return res.end() }
        try {
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
          const request = new Request(url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: hasBody ? (req as unknown as ReadableStream) : undefined,
            ...(hasBody ? { duplex: 'half' } : {}),
          } as RequestInit)
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          if (response.body) for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) res.write(chunk)
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
  // Expose server-side secrets from .env.local to the dev API functions (never to the client bundle).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    base: '/',
    plugins: [react(), devApi()],
    build: { chunkSizeWarningLimit: 2500 },
  }
})
