import { transcribe } from '../_voice.js'

// POST /api/voice/stt — multipart form with "audio"; returns { text }.
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const audio = form.get('audio')
    if (!(audio instanceof Blob)) return Response.json({ error: 'missing audio' }, { status: 400 })
    const text = await transcribe(audio, process.env)
    return Response.json({ text })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: String(e).includes('not configured') ? 501 : 500 })
  }
}
