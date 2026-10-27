// Shared loader + types for DayOne's firm-level LP / investor dataset (public/data/investors.json).

export interface Provenance { src: ('A' | 'B')[]; verified: string | null; conf: number }
export interface Firm {
  id: string; name: string; type: string; city: string; country: string; region: string
  contacts: number; senior: number; roles: string[]; lat?: number; lng?: number; aum?: number; founded?: number
  checkMin?: number; checkMax?: number; focus?: string; about?: string; stage?: string; stages?: string[]; website?: string
  wigo?: { temperature?: string; category?: string; research?: string }
  prov: Provenance
}
export interface SourceMeta { label: string; compiled: string | null; note: string }
export interface InvestorData {
  meta: { firms: number; contacts: number; independentAngels: number; generated: string; sources: Record<'A' | 'B', SourceMeta>; verifiedLast90d: number; verifiedEver: number }
  firms: Firm[]
}

let cache: Promise<InvestorData> | null = null
export const loadInvestors = () => (cache ??= fetch('/data/investors.json').then((r) => r.json()))

export const confLabel = (c: number) => (c >= 80 ? 'High' : c >= 60 ? 'Medium' : 'Low')
export const confColor = (c: number) => (c >= 80 ? 'var(--pos)' : c >= 60 ? 'var(--warn)' : 'var(--neg)')
export const fmtAum = (m?: number) => (!m ? '—' : m >= 1e6 ? `$${(m / 1e6).toFixed(1)}tn` : m >= 1000 ? `$${(m / 1000).toFixed(m >= 10000 ? 0 : 1)}bn` : `$${Math.round(m)}m`)
