import { agent } from '../_voice.js'

// POST /api/voice/agent — { transcript, context, history } → { say, actions }.
export async function POST(request: Request) {
  try {
    return Response.json(await agent((await request.json()) as Parameters<typeof agent>[0], process.env))
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
