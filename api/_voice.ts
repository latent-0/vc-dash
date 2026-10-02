// Otto voice: ElevenLabs Scribe (speech-to-text) → Groq agent (reply + app actions) → ElevenLabs v3 (expressive TTS).

const EL = 'https://api.elevenlabs.io/v1'
const DEFAULT_VOICE = 'EXAVITQu4vr4xnSDxMaL' // ElevenLabs premade "Sarah"

export interface VoiceEnv { ELEVENLABS_API_KEY?: string; ELEVENLABS_VOICE_ID?: string; GROQ_API_KEY?: string }

export async function transcribe(audio: Blob, env: VoiceEnv): Promise<string> {
  if (!env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY is not configured')
  const fd = new FormData()
  fd.append('model_id', 'scribe_v1')
  fd.append('file', audio, 'speech.webm')
  const r = await fetch(`${EL}/speech-to-text`, { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY }, body: fd })
  if (!r.ok) throw new Error(`ElevenLabs STT ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const d = (await r.json()) as { text?: string }
  return String(d.text ?? '').trim()
}

export async function speak(text: string, env: VoiceEnv): Promise<Response> {
  if (!env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY is not configured')
  const voice = env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE
  const call = (model_id: string, body: string) => fetch(`${EL}/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY!, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: body, model_id }),
  })
  // Eleven v3 is the expressive model and understands audio tags like [warmly]; fall back to Flash if unavailable.
  let r = await call('eleven_v3', text.slice(0, 1200))
  if (!r.ok) r = await call('eleven_flash_v2_5', text.replace(/\[[^\]]+\]\s*/g, '').slice(0, 1200))
  if (!r.ok || !r.body) throw new Error(`ElevenLabs TTS ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return new Response(r.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } })
}

const SYSTEM = `You are Otto, the voice assistant inside "Otto Intelligence by DayOne Venture Partners", a private-capital intelligence app.
You can answer questions and operate the app. Reply ONLY with a JSON object: {"say": string, "actions": Action[]}.

"say" is spoken aloud by an expressive voice model: 1-3 short, natural sentences, warm and confident, no lists, no markdown, no URLs.
You may start "say" with ONE ElevenLabs v3 audio tag such as [warmly], [confident], [curious] or [excited] when it fits. Never use more than one tag.

Action types (use ids/paths exactly as given in CONTEXT):
- {"type":"navigate","path":"/radar"}  (any route in CONTEXT.routes, or /company/<id>, /ic/<id>, /relationships/<id>, /diligence/<id>, /thesis/<id>)
- {"type":"query","text":"natural-language question"}  opens Universal Query with that question
- For investors, LPs, family offices, angels or fundraising (Wigo Energy, BLKBOXX), use {"type":"navigate","path":"/investors?q=<search term>"} — the Investor Network, not Universal Query.
- {"type":"watch","companyId":"c1"}  adds a company to the watchlist
- {"type":"tour"}  starts the guided product tour
- {"type":"search","text":"..."}  opens the command palette with text
If the user asks to go somewhere or open something, include the action and briefly confirm in "say". Prefer the most specific path, e.g. /ic/c1 rather than /ic when a company is named (map names to ids via CONTEXT).
If they ask a factual question, answer from CONTEXT (companies, live headlines, portfolio, investors summary). Do not invent numbers.
If something is not in CONTEXT, say so and offer where in the app to look.`

export async function agent(body: { transcript: string; context: unknown; history?: { role: 'user' | 'assistant'; content: string }[] }, env: VoiceEnv) {
  if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured')
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: `${SYSTEM}\n\nCONTEXT:\n${JSON.stringify(body.context ?? {}).slice(0, 40_000)}` },
        ...(body.history ?? []).slice(-6),
        { role: 'user', content: String(body.transcript).slice(0, 1000) },
      ],
      temperature: 0.5,
      max_completion_tokens: 900,
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
    }),
  })
  if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const d = (await r.json()) as { choices?: { message?: { content?: string } }[] }
  const raw = d.choices?.[0]?.message?.content ?? '{}'
  try {
    const j = JSON.parse(raw)
    return { say: String(j.say ?? ''), actions: Array.isArray(j.actions) ? j.actions : [] }
  } catch {
    return { say: String(raw).slice(0, 400), actions: [] }
  }
}
