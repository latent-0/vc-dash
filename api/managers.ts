import { managers } from './_managers.js'

// GET /api/managers — pooled funds raising now (SEC Form D), enriched from each filing.
export async function GET() {
  try {
    return Response.json({ updatedAt: new Date().toISOString(), items: await managers(process.env.SEC_USER_AGENT) }, { headers: { 'cache-control': 'public, s-maxage=600, stale-while-revalidate=1200' } })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: String(e).includes('not configured') ? 501 : 500 })
  }
}
