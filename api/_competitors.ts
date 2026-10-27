// Realtime competitor monitoring.
// - Company lens: live news per named competitor, classified into move types with a threat level.
// - Fund lens: other managers raising in the GP's strategy (fund closes/launches in the news + SEC Form D pooled-fund filings).

import { fetchFormD, hash, tag } from './_live.js'

export type Move = 'Funding' | 'M&A' | 'Product' | 'Pricing' | 'Partnership' | 'Leadership' | 'Hiring' | 'Layoffs' | 'Legal' | 'Fund close' | 'Fund launch' | 'Form D' | 'News'
export interface CompetitorItem { id: string; competitor: string; move: Move; threat: 'High' | 'Medium' | 'Low'; title: string; source: string; url: string; date: string }

const MOVES: [Move, RegExp][] = [
  ['M&A', /acquir|acquisition|merg|buys\b|takeover/i],
  ['Funding', /raises|raised|funding|series [a-f]\b|round|investment from|valuation/i],
  ['Pricing', /pricing|price (cut|increase|hike|change)|raises prices|cuts prices|discount|free tier|cheaper/i],
  ['Product', /launch|unveil|introduc|releases?|rolls out|new (product|feature|platform)|debuts/i],
  ['Partnership', /partner|alliance|integrat|teams up|collaborat/i],
  ['Layoffs', /layoff|lays off|job cuts|cuts \d+|restructur/i],
  ['Leadership', /appoints|names .*(ceo|cfo|cto|chief|president)|steps down|resigns|new ceo/i],
  ['Hiring', /hires|hiring|expands team|opens office|expan/i],
  ['Legal', /lawsuit|sues|sued|regulator|fine[sd]?\b|probe|investigation/i],
]
const THREAT: Record<Move, CompetitorItem['threat']> = {
  'M&A': 'High', Funding: 'High', Pricing: 'High', Product: 'Medium', Partnership: 'Medium', Leadership: 'Medium', Hiring: 'Medium',
  Layoffs: 'Low', Legal: 'Low', 'Fund close': 'High', 'Fund launch': 'Medium', 'Form D': 'Medium', News: 'Low',
}

async function rss(q: string, limit: number) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Otto Intelligence POC)' } })
  if (!r.ok) return []
  const xml = await r.text()
  return xml.split('<item>').slice(1, limit + 1).map((it) => {
    const raw = tag(it, 'title')
    const source = tag(it, 'source') || raw.split(' - ').pop() || 'News'
    const title = raw.endsWith(` - ${source}`) ? raw.slice(0, -(source.length + 3)) : raw
    return { title, source, url: tag(it, 'link'), date: new Date(tag(it, 'pubDate')).toISOString() }
  }).filter((x) => !Number.isNaN(Date.parse(x.date)))
}

// Market-data pages and insider filings are noise for competitive monitoring.
const NOISE = /stock price|quote and history|form 4|sec form|shares (sold|bought|of)|price target|stock (rises|falls|jumps|drops)|\(nasdaq|\(nyse| (jumps|falls|rises|drops|slips|climbs|surges|gains) [0-9.]+%/i

const classify = (title: string): Move => MOVES.find(([, rx]) => rx.test(title))?.[0] ?? 'News'

export async function companyCompetitors(names: string[], days = 14) {
  const list = names.map((n) => n.trim()).filter(Boolean).slice(0, 12)
  const res = await Promise.allSettled(list.map(async (entry) => {
    // "Name (context words)" narrows ambiguous names, e.g. "Formant (robotics)".
    const m = entry.match(/^(.*?)\s*\((.+)\)\s*$/)
    const name = (m ? m[1] : entry).trim()
    const context = m ? ` ${m[2]}` : ''
    const items = (await rss(`"${name}"${context} when:${days}d`, 10)).filter((x) => !NOISE.test(x.title))
    return items.slice(0, 8).map((x): CompetitorItem => {
      const move = classify(x.title)
      return { id: `c${hash(name + x.title)}`, competitor: name, move, threat: THREAT[move], ...x }
    })
  }))
  return res.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).sort((a, b) => b.date.localeCompare(a.date))
}

const SECTOR_TERMS: Record<string, string> = {
  'Climate & energy': '(climate OR "clean energy" OR energy transition OR decarbonisation)',
  'Software & SaaS': '(software OR SaaS OR "B2B")',
  'AI & data': '("AI" OR "artificial intelligence")',
  Fintech: '(fintech OR "financial services")',
  Healthcare: '(healthcare OR "health tech" OR biotech)',
  Consumer: '(consumer OR retail)',
  'Industrial & deep tech': '("deep tech" OR industrial OR robotics)',
  'Impact & emerging markets': '(impact OR Africa OR "emerging markets")',
}

export async function competingFunds(sectors: string[], ua?: string) {
  const terms = sectors.map((s) => SECTOR_TERMS[s]).filter(Boolean)
  const sectorQ = terms.length ? ` ${terms.join(' OR ')}` : ''
  const [closes, launches, formD] = await Promise.all([
    rss(`("first close" OR "final close" OR "closes fund" OR "closes debut fund" OR "oversubscribed fund") (venture OR "private equity")${sectorQ} when:30d`, 14),
    rss(`("launches fund" OR "new fund" OR "Fund I" OR "debut fund" OR "emerging manager") (venture OR seed)${sectorQ} when:30d`, 12),
    fetchFormD(ua).catch(() => []),
  ])
  const news = [
    ...closes.map((x) => ({ ...x, move: 'Fund close' as Move })),
    ...launches.map((x) => ({ ...x, move: (/clos/i.test(x.title) ? 'Fund close' : 'Fund launch') as Move })),
  ]
  const seen = new Set<string>()
  const items: CompetitorItem[] = news
    .filter((x) => !seen.has(x.title) && seen.add(x.title))
    .map((x) => ({ id: `f${hash(x.title)}`, competitor: x.source, threat: THREAT[x.move], ...x }))
  // Pooled-investment-fund style Form D filings = other managers raising right now.
  const funds = formD
    .filter((s) => /\b(fund|ventures?|capital|partners|l\.?p\.?|investors|opportunit)/i.test(s.title))
    .map((s): CompetitorItem => ({ id: `d${s.id}`, competitor: s.title.replace(/ files Form D.*$/, ''), move: 'Form D', threat: 'Medium', title: s.title, source: 'SEC EDGAR', url: s.url, date: s.date }))
  return [...items, ...funds].sort((a, b) => b.date.localeCompare(a.date))
}
