// Shared live-data fetcher used by the Vercel function (api/live.ts) and the Vite dev middleware.
// Sources: Google News RSS (public headlines per signal family) and, optionally, SEC EDGAR Form D filings.

export type Family = 'Leadership' | 'Capital' | 'Operations' | 'Market' | 'Risk' | 'Product' | 'People' | 'Ownership'

export interface LiveSignal {
  id: string
  title: string
  source: string
  url: string
  date: string
  family: Family
  type: string
  thesis: string | null
  relevance: number
  origin: 'news' | 'sec'
}

const QUERIES: { family: Family; type: string; q: string }[] = [
  { family: 'Capital', type: 'Funding round', q: '("raises" OR "secures") ("Series A" OR "Series B" OR "Series C" OR "growth round") software' },
  { family: 'Ownership', type: 'Sponsor buyout', q: '"private equity" (acquires OR "agreed to acquire" OR "majority stake") software' },
  { family: 'Market', type: 'Strategic M&A', q: '(acquires OR acquisition) (SaaS OR "vertical software" OR "healthcare IT" OR "industrial software")' },
  { family: 'Leadership', type: 'Executive appointment', q: '(appoints OR names) ("chief executive" OR CEO OR CFO) software company' },
  { family: 'Risk', type: 'Layoffs / distress', q: '(layoffs OR restructuring OR "files for bankruptcy") software company' },
  { family: 'Product', type: 'AI launch', q: '(launches OR unveils) "AI" platform enterprise healthcare OR industrial OR fintech' },
  { family: 'Ownership', type: 'Exit / IPO', q: '("files for IPO" OR "IPO" OR "exit") "private equity"-backed software' },
]

const THESES: { id: string; name: string; kw: RegExp }[] = [
  { id: 't2', name: 'Industrial Automation', kw: /industrial|manufactur|robot|automation|iot|factory|supply chain/i },
  { id: 't3', name: 'Healthcare RCM & Ops', kw: /health|clinical|hospital|revenue cycle|medical|provider|pharma/i },
  { id: 't4', name: 'AI Infrastructure', kw: /\bai\b|artificial intelligence|machine learning|inference|llm|data platform|genai/i },
  { id: 't5', name: 'Grid & Energy Software', kw: /energy|grid|climate|solar|battery|utility|power/i },
  // Broadest lens last so specific theses win.
  { id: 't1', name: 'Vertical Software & Infra', kw: /vertical|saas|software|field service|construction|payments?|fintech|insurance|logistics|erp/i },
]

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
const tag = (xml: string, t: string) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1]) : '' }

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h).toString(36) }

function score(title: string, family: Family) {
  const hit = THESES.find((t) => t.kw.test(title)) ?? null
  const base = { Ownership: 70, Market: 66, Capital: 62, Leadership: 64, Risk: 58, Product: 52, People: 55, Operations: 50 }[family]
  const amount = /\$\s?\d+(\.\d+)?\s?(m|bn|b|million|billion)/i.test(title) ? 8 : 0
  return { thesis: hit?.name ?? null, relevance: Math.min(98, base + (hit ? 18 : 0) + amount) }
}

async function fetchNews(): Promise<LiveSignal[]> {
  const results = await Promise.allSettled(QUERIES.map(async (q) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q.q} when:3d`)}&hl=en-US&gl=US&ceid=US:en`
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Otto Intelligence POC)' } })
    if (!r.ok) throw new Error(`news ${r.status}`)
    const xml = await r.text()
    return xml.split('<item>').slice(1, 9).map((it): LiveSignal => {
      const raw = tag(it, 'title')
      const source = tag(it, 'source') || raw.split(' - ').pop() || 'News'
      const title = raw.replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
      return { id: `n${hash(title)}`, title, source, url: tag(it, 'link'), date: new Date(tag(it, 'pubDate')).toISOString(), family: q.family, type: q.type, origin: 'news', ...score(title, q.family) }
    })
  }))
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}

async function fetchFormD(ua?: string): Promise<LiveSignal[]> {
  if (!ua) return []
  const r = await fetch('https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=D&company=&dateb=&owner=include&start=0&count=40&output=atom', { headers: { 'User-Agent': ua } })
  if (!r.ok) return []
  const xml = await r.text()
  return xml.split('<entry>').slice(1).map((e): LiveSignal | null => {
    const t = tag(e, 'title') // "D - Company Name (0001234567) (Filer)"
    const m = t.match(/^D(?:\/A)?\s+-\s+(.+?)\s+\((\d+)\)/)
    if (!m) return null
    const link = (e.match(/<link[^>]*href="([^"]+)"/) ?? [])[1] ?? 'https://www.sec.gov'
    const title = `${m[1]} files Form D — new private offering`
    return { id: `d${m[2]}`, title, source: 'SEC EDGAR', url: link, date: new Date(tag(e, 'updated')).toISOString(), family: 'Capital', type: 'Form D filing', origin: 'sec', ...score(m[1], 'Capital') }
  }).filter((x): x is LiveSignal => !!x)
}

export async function getLive(env: { SEC_USER_AGENT?: string } = {}) {
  const [news, formD] = await Promise.all([fetchNews().catch(() => []), fetchFormD(env.SEC_USER_AGENT).catch(() => [])])
  const seen = new Set<string>()
  const signals = [...news, ...formD]
    .filter((s) => !Number.isNaN(Date.parse(s.date)) && !seen.has(s.id) && seen.add(s.id))
    .sort((a, b) => b.date.localeCompare(a.date))
  return { updatedAt: new Date().toISOString(), sources: { news: news.length, secFormD: formD.length }, signals }
}
