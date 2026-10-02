import { getLive } from './_live.js'

// Vercel serverless function: GET /api/live — cached at the edge for 5 minutes.
export async function GET() {
  const data = await getLive({ SEC_USER_AGENT: process.env.SEC_USER_AGENT })
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
