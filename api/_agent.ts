// Provisions the realtime Otto voice agent on ElevenLabs Agents and issues per-session credentials.
// Conversation (ASR → LLM → TTS, turn-taking, interruptions) runs on ElevenLabs for low latency.
// Data-heavy questions are delegated back to the app via the `ask_otto` client tool (Groq · gpt-oss-120b).

const EL = 'https://api.elevenlabs.io/v1'
const AGENT_NAME = 'Otto Intelligence · DayOne · v1'
const DEFAULT_VOICE = 'EXAVITQu4vr4xnSDxMaL'

const PROMPT = `You are Otto, the realtime voice assistant inside "Otto Intelligence by DayOne Venture Partners", a private-capital intelligence platform.
You are speaking with {{user_name}} from DayOne. They are currently on the page {{current_page}}.

Style: warm, crisp and confident, like a sharp chief of staff. One to three short sentences per turn. Never read out lists, URLs, IDs or markdown. Prefer action over explanation.

You can operate the app with tools. Use them proactively:
- navigate: go to any page. Pages: / (Morning Brief), /thesis, /signals (live market wire), /radar (Deal Radar), /query, /relationships, /diligence, /ic, /memory, /portfolio, /value, /exit, /sponsors, /investors (Investor Network: Wigo Energy and BLKBOXX raise databases), /watchlists.
- open_company: open a company by name, optionally a specific view (profile, ic, relationships, diligence).
- ask_otto: for ANY question about deals, companies, scores, signals, live market news, portfolio, theses or investors. It queries DayOne's data and returns an answer; summarise it naturally in one or two sentences.
- run_query: show a natural-language query on screen in Universal Query.
- search_investors: filter the Investor Network.
- add_to_watchlist, start_tour.
- get_app_context: what is currently on screen.

Never invent numbers, companies or events; if unsure, call ask_otto. When you navigate, say briefly what you opened. Humans own investment decisions; do not give final recommendations.`

type Tool = { name: string; description: string; params: Record<string, string>; required?: string[] }
const TOOLS: Tool[] = [
  { name: 'navigate', description: 'Navigate the app to a page path such as /radar or /investors.', params: { path: 'Route path starting with /' }, required: ['path'] },
  { name: 'open_company', description: 'Open a tracked company by (fuzzy) name. view is one of profile, ic, relationships, diligence.', params: { name: 'Company name as spoken', view: 'profile | ic | relationships | diligence' }, required: ['name'] },
  { name: 'ask_otto', description: 'Answer a question using DayOne data: tracked companies, scores, signals, live market headlines, portfolio, theses and investor databases. Returns a short factual answer.', params: { question: 'The user question, fully specified' }, required: ['question'] },
  { name: 'run_query', description: 'Display a natural-language query and its results in Universal Query on screen.', params: { text: 'The query' }, required: ['text'] },
  { name: 'search_investors', description: 'Open the Investor Network filtered by a search term (sector, city, firm name).', params: { query: 'Search term' }, required: ['query'] },
  { name: 'add_to_watchlist', description: 'Add a company to the watchlist by name.', params: { name: 'Company name' }, required: ['name'] },
  { name: 'start_tour', description: 'Start the guided product tour.', params: {} },
  { name: 'get_app_context', description: 'Get what is currently on screen and key app state.', params: {} },
]

const toolConfig = (t: Tool) => ({
  type: 'client',
  name: t.name,
  description: t.description,
  expects_response: true,
  response_timeout_secs: 25,
  parameters: {
    type: 'object',
    properties: Object.fromEntries(Object.entries(t.params).map(([k, d]) => [k, { type: 'string', description: d }])),
    required: t.required ?? [],
  },
})

let cachedAgentId: string | null = null

async function el(path: string, key: string, init: RequestInit = {}) {
  const r = await fetch(`${EL}${path}`, { ...init, headers: { 'xi-api-key': key, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  const text = await r.text()
  let body: unknown = text
  try { body = JSON.parse(text) } catch { /* not json */ }
  return { ok: r.ok, status: r.status, body: body as Record<string, unknown> }
}

async function createAgent(key: string, voiceId: string) {
  // Prefer standalone tool objects (current API); fall back to inline tools.
  const ids: string[] = []
  for (const t of TOOLS) {
    const r = await el('/convai/tools', key, { method: 'POST', body: JSON.stringify({ tool_config: toolConfig(t) }) })
    if (r.ok && typeof r.body.id === 'string') ids.push(r.body.id)
    else { ids.length = 0; break }
  }
  const attempts: { llm: string; tts: string }[] = [
    { llm: 'gemini-2.5-flash', tts: 'eleven_v3_conversational' },
    { llm: 'gemini-2.5-flash', tts: 'eleven_flash_v2' },
    { llm: 'gpt-4o-mini', tts: 'eleven_flash_v2' },
  ]
  let lastErr = ''
  for (const a of attempts) {
    const body = {
      name: AGENT_NAME,
      conversation_config: {
        agent: {
          first_message: 'Hi {{user_name}}, Otto here. What would you like to look at?',
          language: 'en',
          prompt: { prompt: PROMPT, llm: a.llm, temperature: 0.4, ...(ids.length ? { tool_ids: ids } : { tools: TOOLS.map(toolConfig) }) },
          dynamic_variables: { dynamic_variable_placeholders: { user_name: 'there', current_page: '/' } },
        },
        tts: { model_id: a.tts, voice_id: voiceId, optimize_streaming_latency: 3 },
        turn: { turn_timeout: 8 },
      },
    }
    const r = await el('/convai/agents/create', key, { method: 'POST', body: JSON.stringify(body) })
    if (r.ok && typeof r.body.agent_id === 'string') return r.body.agent_id
    lastErr = `${r.status} ${JSON.stringify(r.body).slice(0, 300)}`
  }
  throw new Error(`Could not create ElevenLabs agent: ${lastErr}`)
}

async function agentId(key: string, voiceId: string, configured?: string) {
  if (configured) return configured
  if (cachedAgentId) return cachedAgentId
  const r = await el(`/convai/agents?search=${encodeURIComponent(AGENT_NAME)}&page_size=10`, key)
  const found = (r.body?.agents as { agent_id: string; name: string }[] | undefined)?.find((x) => x.name === AGENT_NAME)
  cachedAgentId = found?.agent_id ?? (await createAgent(key, voiceId))
  return cachedAgentId
}

export async function session(env: { ELEVENLABS_API_KEY?: string; ELEVENLABS_AGENT_ID?: string; ELEVENLABS_VOICE_ID?: string }) {
  const key = env.ELEVENLABS_API_KEY
  if (!key) throw new Error('ELEVENLABS_API_KEY is not configured')
  const id = await agentId(key, env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE, env.ELEVENLABS_AGENT_ID)
  const tok = await el(`/convai/conversation/token?agent_id=${id}`, key)
  if (tok.ok && typeof tok.body.token === 'string') return { agentId: id, conversationToken: tok.body.token }
  const su = await el(`/convai/conversation/get-signed-url?agent_id=${id}`, key)
  if (su.ok && typeof su.body.signed_url === 'string') return { agentId: id, signedUrl: su.body.signed_url }
  throw new Error(`ElevenLabs session ${tok.status}/${su.status}`)
}
