// Outreach drafting + claims check (Groq · gpt-oss-120b, JSON mode).
// Step 1 drafts an email using ONLY the GP's fund fact base. Step 2 audits every factual claim against that fact base.

const MODEL = 'openai/gpt-oss-120b'

async function groq(apiKey: string, system: string, user: string) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, temperature: 0.4, max_completion_tokens: 1400, reasoning_effort: 'low',
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  })
  if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const d = (await r.json()) as { choices?: { message?: { content?: string } }[] }
  return JSON.parse(d.choices?.[0]?.message?.content ?? '{}') as Record<string, unknown>
}

const DRAFT = `You write first-touch LP outreach emails for an emerging venture/private-capital fund manager.
Rules:
- Use ONLY facts stated in FACT BASE. Never invent numbers, names, returns, anchors or commitments.
- Personalise to the LP using only the LP PROFILE fields given (type, location, focus). Do not claim prior contact or mutual connections.
- 110-160 words. Plain, specific, respectful. One clear ask: a 20-minute intro call. No hype words ("revolutionary", "guaranteed").
- Do not include an unsubscribe line (it is appended automatically) and do not include a signature block beyond the manager name.
Return JSON: {"subject": string, "body": string}`

const CHECK = `You are a compliance and accuracy reviewer for fundraising emails.
Extract every factual claim in DRAFT (numbers, track record, team, commitments, strategy, LP-specific statements) and check each against FACT BASE and LP PROFILE.
status: "supported" if directly stated in FACT BASE/LP PROFILE; "unsupported" if not stated or contradicted; "check" if it is a reasonable paraphrase or opinion that a human should confirm.
For unsupported claims give a "fix" that rewrites it using only the fact base.
Also flag performance claims that could be read as promising future returns as "check".
Return JSON: {"claims": [{"claim": string, "status": "supported"|"unsupported"|"check", "basis": string, "fix"?: string}]}`

export async function draftOutreach(body: { factBase: string; lp: Record<string, unknown>; tone?: string }, apiKey?: string) {
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured')
  const lp = JSON.stringify(body.lp).slice(0, 2500)
  const fb = String(body.factBase).slice(0, 6000)
  const d = await groq(apiKey, DRAFT, `FACT BASE:\n${fb}\n\nLP PROFILE:\n${lp}\n\nTone: ${body.tone ?? 'warm and concise'}`)
  const subject = String(d.subject ?? '').slice(0, 160)
  const text = String(d.body ?? '').slice(0, 3000)
  const c = await groq(apiKey, CHECK, `FACT BASE:\n${fb}\n\nLP PROFILE:\n${lp}\n\nDRAFT:\nSubject: ${subject}\n\n${text}`)
  const claims = Array.isArray(c.claims) ? c.claims.slice(0, 20) : []
  return { subject, body: text, claims }
}

export async function recheck(body: { factBase: string; lp: Record<string, unknown>; subject: string; text: string }, apiKey?: string) {
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured')
  const c = await groq(apiKey, CHECK, `FACT BASE:\n${String(body.factBase).slice(0, 6000)}\n\nLP PROFILE:\n${JSON.stringify(body.lp).slice(0, 2500)}\n\nDRAFT:\nSubject: ${body.subject}\n\n${String(body.text).slice(0, 3000)}`)
  return { claims: Array.isArray(c.claims) ? c.claims.slice(0, 20) : [] }
}
