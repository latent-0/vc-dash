// LP-side manager discovery: funds raising right now, from SEC EDGAR Form D filings (public data).
// Each pooled-investment-fund filing is enriched from its primary_doc.xml: fund type, offering size,
// amount raised so far, number of investors, minimum investment, first-sale date and issuer location.
// Personal names and phone numbers in filings are deliberately not returned.

import { tag } from './_live.js'

export interface Manager {
  id: string; fund: string; cik: string; city: string; state: string
  fundType: string; amendment: boolean; firstSale: string | null; yearInc: string | null
  minInvestment: number | null; offering: number | null; sold: number | null; investors: number | null
  fundNumber: number | null; emerging: boolean; filedAt: string; url: string; gpEntity: string | null
}

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 }
const fundNumber = (name: string) => {
  const m = name.match(/\bfund\s+([IVX]{1,4}|\d{1,2})\b/i) ?? name.match(/\b([IVX]{1,4}|\d{1,2}),?\s+(l\.?p\.?|llc|ltd)\b/i)
  if (!m) return null
  const v = m[1].toUpperCase()
  return ROMAN[v] ?? (Number.isFinite(Number(v)) ? Number(v) : null)
}
const num = (s: string) => (s && /^\d+(\.\d+)?$/.test(s.trim()) ? Number(s) : null)
const FUNDLIKE = /\b(fund|ventures?|capital|partners|l\.?p\.?|opportunit|investors|holdings|co-?invest)/i

let cache: { at: number; items: Manager[] } | null = null

async function limited<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>) {
  const out: R[] = []
  for (let i = 0; i < items.length; i += n) out.push(...(await Promise.all(items.slice(i, i + n).map(fn))))
  return out
}

export async function managers(ua?: string): Promise<Manager[]> {
  if (!ua) throw new Error('SEC_USER_AGENT is not configured')
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.items
  const headers = { 'User-Agent': ua }
  const atom = await fetch('https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=D&company=&dateb=&owner=include&start=0&count=100&output=atom', { headers })
  if (!atom.ok) throw new Error(`SEC ${atom.status}`)
  const entries = (await atom.text()).split('<entry>').slice(1).map((e) => {
    const t = tag(e, 'title')
    const m = t.match(/^D(\/A)?\s+-\s+(.+?)\s+\((\d+)\)/)
    const href = (e.match(/<link[^>]*href="([^"]+)"/) ?? [])[1]
    return m && href ? { name: m[2], cik: m[3], amendment: !!m[1], href, filedAt: new Date(tag(e, 'updated')).toISOString() } : null
  }).filter((x): x is NonNullable<typeof x> => !!x && FUNDLIKE.test(x.name)).slice(0, 45)

  const docs = await limited(entries, 5, async (e) => {
    try {
      const dir = e.href.replace(/\/[^/]+$/, '')
      const r = await fetch(`${dir}/primary_doc.xml`, { headers })
      if (!r.ok) return null
      const x = await r.text()
      if (tag(x, 'industryGroupType') !== 'Pooled Investment Fund') return null
      const fundType = tag(x, 'investmentFundType') || 'Pooled investment fund'
      const gpRaw = `${tag(x.split('<relatedPersonInfo>')[1] ?? '', 'firstName')} ${tag(x.split('<relatedPersonInfo>')[1] ?? '', 'lastName')}`.trim()
      const gpEntity = /\b(llc|l\.?p\.?|ltd|gp|management|partners|capital|advisors?)\b/i.test(gpRaw) ? gpRaw : null
      const firstSaleBlock = x.split('<dateOfFirstSale>')[1]?.split('</dateOfFirstSale>')[0] ?? ''
      const fn = fundNumber(e.name)
      const yearInc = tag(x.split('<yearOfInc>')[1] ?? '', 'value') || null
      const m: Manager = {
        id: e.href.split('/').slice(-2, -1)[0] ?? e.cik,
        fund: tag(x, 'entityName') || e.name,
        cik: e.cik,
        city: tag(x.split('<issuerAddress>')[1] ?? '', 'city'),
        state: tag(x.split('<issuerAddress>')[1] ?? '', 'stateOrCountryDescription'),
        fundType,
        amendment: e.amendment,
        firstSale: tag(firstSaleBlock, 'value') || null,
        yearInc,
        minInvestment: num(tag(x, 'minimumInvestmentAccepted')),
        offering: num(tag(x, 'totalOfferingAmount')),
        sold: num(tag(x, 'totalAmountSold')),
        investors: num(tag(x, 'totalNumberAlreadyInvested')),
        fundNumber: fn,
        emerging: fn != null ? fn <= 2 : !!yearInc && Number(yearInc) >= new Date().getFullYear() - 3 && /venture|private equity/i.test(fundType),
        filedAt: e.filedAt,
        url: e.href,
        gpEntity,
      }
      return m
    } catch {
      return null
    }
  })
  const items = docs.filter((d): d is Manager => !!d)
  cache = { at: Date.now(), items }
  return items
}
