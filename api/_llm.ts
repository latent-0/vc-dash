// Groq-backed reasoning for Otto. Streams plain-text deltas back to the client.
// Used by the Vercel function (api/ask.ts) and the Vite dev middleware.

const MODEL = 'openai/gpt-oss-120b'

export interface AskBody {
  mode: 'copilot' | 'query' | 'investors'
  question: string
  context: unknown
  history?: { role: 'user' | 'assistant'; content: string }[]
}

const SYSTEM: Record<AskBody['mode'], string> = {
  copilot: `You are Otto, the diligence copilot inside Otto Intelligence by DayOne Venture Partners, a private-capital firm.
You help an investment team interrogate a deal. Ground every material claim in the CONTEXT provided (a company dossier with signals, risks, contradictions, missing items and a numbered SOURCES list).
Rules:
- Cite sources inline as [n] using the numbers in SOURCES. Never invent sources or numbers not in the context.
- If evidence is missing, say so and propose how to get it (data room request, expert call, management question).
- Be concise and institutional: at most ~170 words, short paragraphs or a numbered list of at most 5 items. No headings, tables or bold.
- Do not append a sources or references list at the end; inline [n] citations are enough.
- You accelerate research; humans own decisions. Never present a final investment recommendation.`,
  query: `You are Otto, the natural-language query layer of Otto Intelligence by DayOne Venture Partners.
You answer questions over the firm's investment graph supplied in CONTEXT: tracked companies (with scores, status, signals), sponsors, portfolio and a LIVE feed of real public-market headlines.
Rules:
- Answer directly in 2-5 sentences or a short numbered list. Name specific companies from the context.
- When you use a live headline, mention its source. Do not invent companies, numbers or events beyond the context.
- If the context cannot answer the question, say what data would be needed.
- Plain text only: no headings, no markdown tables, no bold.`,
  investors: `You are Otto, the fundraising intelligence layer of Otto Intelligence by DayOne Venture Partners.
CONTEXT is DayOne's own investor database (firm-level) used for portfolio-company fundraising.
Each firm has type, location, AUM, contacts, decision-makers, focus, stage, cheque size where known, and for some firms the team's research notes.
Rules:
- Recommend specific firms by name with a one-line reason grounded in their fields. Prefer stage and cheque-size fit and firms with positive research notes.
- Be honest about gaps (e.g. most firms lack stage or cheque data) and suggest how to close them.
- At most ~170 words; short numbered list or brief paragraphs. Plain text, no headings, tables or bold.`,
}

export async function askStream(body: AskBody, apiKey: string | undefined): Promise<ReadableStream<Uint8Array>> {
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured')
  const ctx = JSON.stringify(body.context ?? {}).slice(0, 60_000)
  const messages = [
    { role: 'system', content: `${SYSTEM[body.mode] ?? SYSTEM.query}\n\nCONTEXT:\n${ctx}` },
    ...(body.history ?? []).slice(-6),
    { role: 'user', content: String(body.question).slice(0, 2000) },
  ]
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.6, top_p: 1, max_completion_tokens: 2048, reasoning_effort: 'medium', stream: true }),
  })
  if (!r.ok || !r.body) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 300)}`)

  const enc = new TextEncoder()
  const dec = new TextDecoder()
  let buf = ''
  return r.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      buf += dec.decode(chunk, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const l = line.trim()
        if (!l.startsWith('data:')) continue
        const data = l.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content
          if (delta) ctrl.enqueue(enc.encode(delta))
        } catch { /* partial line */ }
      }
    },
  }))
}
