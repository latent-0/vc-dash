import { speak } from '../_voice.js'

// POST /api/voice/tts — { text } → audio/mpeg from ElevenLabs Eleven v3.
export async function POST(request: Request) {
  try {
    const { text } = (await request.json()) as { text?: string }
    return await speak(String(text ?? ''), process.env)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: String(e).includes('not configured') ? 501 : 500 })
  }
}
