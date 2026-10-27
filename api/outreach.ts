import { draftOutreach, recheck } from './_outreach.js'

// POST /api/outreach — { action: 'draft' | 'check', factBase, lp, subject?, text? } → draft + claims check.
export async function POST(request: Request) {
  try {
    const b = (await request.json()) as { action?: string; factBase: string; lp: Record<string, unknown>; subject?: string; text?: string; tone?: string }
    const out = b.action === 'check'
      ? await recheck({ factBase: b.factBase, lp: b.lp, subject: b.subject ?? '', text: b.text ?? '' }, process.env.GROQ_API_KEY)
      : await draftOutreach(b, process.env.GROQ_API_KEY)
    return Response.json(out, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
