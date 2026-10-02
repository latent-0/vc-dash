import { askStream, type AskBody } from './_llm.js'

// Vercel serverless function: POST /api/ask — streams an Otto answer as plain text.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AskBody
    const stream = await askStream(body, process.env.GROQ_API_KEY)
    return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}
