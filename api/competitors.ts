import { companyCompetitors, competingFunds } from './_competitors.js'

// GET /api/competitors?lens=companies&names=A|B  or  ?lens=funds&sectors=Climate%20%26%20energy|Software%20%26%20SaaS
export async function GET(request: Request) {
  try {
    const u = new URL(request.url)
    const lens = u.searchParams.get('lens') ?? 'companies'
    const split = (k: string) => (u.searchParams.get(k) ?? '').split('|').map((s) => s.trim()).filter(Boolean)
    const items = lens === 'funds'
      ? await competingFunds(split('sectors'), process.env.SEC_USER_AGENT)
      : await companyCompetitors(split('names'), Number(u.searchParams.get('days') ?? 14))
    return Response.json({ updatedAt: new Date().toISOString(), items }, { headers: { 'cache-control': 'public, s-maxage=180, stale-while-revalidate=600' } })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
