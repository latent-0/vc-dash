import { session } from '../_agent.js'

// GET /api/voice/session — short-lived credentials for a realtime ElevenLabs Agents conversation.
export async function GET() {
  try {
    return Response.json(await session(process.env), { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: String(e).includes('not configured') ? 501 : 500 })
  }
}
