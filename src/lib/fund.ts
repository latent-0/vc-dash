// Otto v1 — emerging-GP fundraising workspace.
// Each GP's fund fact base, pipeline and drafts live only in this browser (data sovereignty: never pooled).

import { useSyncExternalStore } from 'react'
import type { Firm } from './investors'

export const SECTORS: { label: string; rx: RegExp }[] = [
  { label: 'Climate & energy', rx: /climate|energy|clean|renewabl|sustainab|carbon|mobility|\bev\b|electric|solar/i },
  { label: 'Software & SaaS', rx: /software|saas|technology|tech\b|digital|internet|cloud/i },
  { label: 'AI & data', rx: /\bai\b|artificial intelligence|machine learning|\bdata\b|analytics/i },
  { label: 'Fintech', rx: /fintech|financial services|payments?|insurance|banking/i },
  { label: 'Healthcare', rx: /health|biotech|medical|life science|pharma/i },
  { label: 'Consumer', rx: /consumer|retail|brand|food|e-?commerce/i },
  { label: 'Industrial & deep tech', rx: /industrial|manufactur|robot|hardware|deep ?tech|semiconductor/i },
  { label: 'Impact & emerging markets', rx: /impact|africa|emerging market|frontier|esg|social/i },
]
export const FUND_STAGES = ['Pre-seed / Seed', 'Seed / Series A', 'Growth', 'Buyout'] as const
export const LP_REGIONS = ['North America', 'Europe', 'APAC', 'MENA', 'LatAm'] as const
export const PIPELINE = ['Target', 'Contacted', 'Replied', 'Meeting', 'Soft-circle', 'Committed'] as const
export type Stage = (typeof PIPELINE)[number]

export interface FactBase {
  fundName: string; managerName: string; vintage: string
  strategy: string; sectors: string[]; stage: (typeof FUND_STAGES)[number]
  portfolioGeos: string; lpRegions: string[]
  targetSize: number; minTicket: number; maxTicket: number; firstClose: string
  trackRecord: string; team: string; differentiators: string; keyFacts: string
}

export const EXAMPLE_FUND: FactBase = {
  fundName: 'Northline Climate Fund I', managerName: 'Northline Ventures', vintage: '2026',
  strategy: 'Pre-seed and seed investments in software that decarbonises energy, mobility and the built environment, with reserves for follow-ons.',
  sectors: ['Climate & energy', 'Software & SaaS'], stage: 'Pre-seed / Seed',
  portfolioGeos: 'UK, Ireland, Nordics', lpRegions: ['Europe', 'North America'],
  targetSize: 40, minTicket: 0.25, maxTicket: 3, firstClose: '2027-03-31',
  trackRecord: 'Partners made 14 angel and syndicate investments since 2018; 2 realised exits (3.1x and 5.4x gross); 4 companies have raised Series A.',
  team: 'Two partners: a former energy-trading operator and an ex-founder who scaled a grid-software company to 120 staff.',
  differentiators: 'Operator network across European utilities; proprietary dealflow from a 600-member climate founder community.',
  keyFacts: '$6m committed to date from partners and two angels.\nTarget 25 portfolio companies; 50% of the fund reserved for follow-ons.\nFirst close targeted for Q1 2027.',
}
export const EMPTY_FUND: FactBase = { ...EXAMPLE_FUND, fundName: '', managerName: '', strategy: '', sectors: [], portfolioGeos: '', trackRecord: '', team: '', differentiators: '', keyFacts: '', targetSize: 0, minTicket: 0, maxTicket: 0, firstClose: '' }

export interface Draft { subject: string; body: string; claims: Claim[]; createdAt: string; approvedAt?: string; euUk?: boolean }
export interface Claim { claim: string; status: 'supported' | 'unsupported' | 'check'; basis: string; fix?: string }
export interface PipeItem { id: string; name: string; type: string; region: string; stage: Stage; fit: number; history: { stage: Stage; at: string }[]; draft?: Draft; note?: string }

interface State {
  fund: FactBase | null
  savedAt?: string
  shortlistAt?: string
  pipeline: Record<string, PipeItem>
  costs: { agents: number; analyst: number; analystMeetings: number }
}

const KEY = 'otto.fundraise.v1'
const read = (): State => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) return { costs: { agents: 900, analyst: 2000, analystMeetings: 4 }, pipeline: {}, ...s } } catch { /* ignore */ }
  return { fund: null, pipeline: {}, costs: { agents: 900, analyst: 2000, analystMeetings: 4 } }
}
let state: State = read()
const subs = new Set<() => void>()
const commit = (s: State) => { state = s; try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ } subs.forEach((f) => f()) }

export const useFundraise = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state)
export const fundraise = {
  get: () => state,
  saveFund: (fund: FactBase) => commit({ ...state, fund, savedAt: new Date().toISOString() }),
  markShortlist: () => commit({ ...state, shortlistAt: state.shortlistAt ?? new Date().toISOString() }),
  setCosts: (c: Partial<State['costs']>) => commit({ ...state, costs: { ...state.costs, ...c } }),
  add: (f: Firm, fit: number) => {
    if (state.pipeline[f.id]) return
    const now = new Date().toISOString()
    commit({ ...state, pipeline: { ...state.pipeline, [f.id]: { id: f.id, name: f.name, type: f.type, region: f.region, stage: 'Target', fit, history: [{ stage: 'Target', at: now }] } } })
  },
  remove: (id: string) => { const p = { ...state.pipeline }; delete p[id]; commit({ ...state, pipeline: p }) },
  move: (id: string, stage: Stage) => {
    const it = state.pipeline[id]
    if (!it || it.stage === stage) return
    commit({ ...state, pipeline: { ...state.pipeline, [id]: { ...it, stage, history: [...it.history, { stage, at: new Date().toISOString() }] } } })
  },
  setDraft: (id: string, draft: Draft | undefined) => {
    const it = state.pipeline[id]
    if (it) commit({ ...state, pipeline: { ...state.pipeline, [id]: { ...it, draft } } })
  },
  reset: () => commit({ fund: null, pipeline: {}, costs: state.costs }),
}

/* ---------------- Fit score with plain-language reasons ---------------- */

const APPETITE: Record<string, number> = {
  'Single-family office': 82, 'Multi-family office': 80, 'Family office': 80, 'Private Investor': 70, 'Endowment': 64, 'Angel network': 62,
  'Wealth manager': 58, 'Investment consultant': 50, 'Private capital': 50, 'Investment firm': 48, 'Venture capital': 42,
  'Private equity': 32, 'Hedge fund': 28, 'Real estate PE': 8, 'Business Lender': 5,
}
const EM_RX = /fund of funds|fund-of-funds|emerging manager|first[- ]time (fund|manager)|fund investments|manager selection|alternative investments|private (equity|market) funds|venture (capital )?funds|\blp\b commitments/i
const STAGE_MAP: Record<FactBase['stage'], string[]> = {
  'Pre-seed / Seed': ['Seed', 'Early stage'], 'Seed / Series A': ['Seed', 'Early stage'], Growth: ['Growth'], Buyout: ['Buyout'],
}

export interface Reason { ok: boolean | null; text: string }
export interface Fit { score: number; reasons: Reason[] }

export function fitScore(f: Firm, fund: FactBase): Fit {
  const text = `${f.focus ?? ''} ${f.about ?? ''} ${f.stage ?? ''} ${f.wigo?.research ?? ''}`
  const reasons: Reason[] = []

  // Emerging-manager appetite
  let appetite = APPETITE[f.type] ?? 45
  const em = EM_RX.test(text)
  if (em) appetite = Math.min(100, appetite + 18)
  reasons.push({ ok: appetite >= 60, text: em ? `${f.type}; profile mentions fund or alternatives allocations, a signal of appetite for emerging managers` : appetite >= 60 ? `${f.type}s typically back emerging managers` : `${f.type}s rarely commit to first-time funds` })

  // Sector
  const chosen = SECTORS.filter((s) => fund.sectors.includes(s.label))
  const hit = chosen.find((s) => s.rx.test(text))
  const sector = !text.trim() ? 50 : hit ? 100 : chosen.length ? 25 : 50
  reasons.push({ ok: !text.trim() ? null : !!hit, text: hit ? `Focus overlaps your ${hit.label.toLowerCase()} strategy` : !text.trim() ? 'No stated sector focus on file (treated as generalist)' : 'Stated focus does not mention your sectors' })

  // Geography
  const geoKnown = f.region !== 'Unknown' && f.region !== 'Other'
  const geo = !geoKnown ? 40 : fund.lpRegions.includes(f.region) ? 100 : 15
  reasons.push({ ok: !geoKnown ? null : geo === 100, text: !geoKnown ? 'Location unknown' : geo === 100 ? `Based in ${f.country}, inside your target LP regions` : `Based in ${f.country}, outside your target LP regions` })

  // Cheque size
  let cheque = 45
  let chequeText = 'No cheque size or AUM on file'
  let chequeOk: boolean | null = null
  if (f.checkMin != null || f.checkMax != null) {
    const lo = f.checkMin ?? 0, hi = f.checkMax ?? f.checkMin ?? 0
    chequeOk = lo <= fund.maxTicket && hi >= fund.minTicket
    cheque = chequeOk ? 100 : 30
    chequeText = `Typical cheque $${lo}m–$${hi}m ${chequeOk ? 'fits' : 'does not fit'} your $${fund.minTicket}m–$${fund.maxTicket}m LP ticket`
  } else if (f.aum) {
    // A typical LP commitment is ~0.5–2% of AUM.
    const lo = f.aum * 0.005, hi = f.aum * 0.02
    chequeOk = lo <= fund.maxTicket * 1.5 && hi >= fund.minTicket
    cheque = chequeOk ? 88 : 35
    chequeText = chequeOk ? `AUM ${f.aum >= 1000 ? `$${(f.aum / 1000).toFixed(1)}bn` : `$${Math.round(f.aum)}m`} implies commitments in your ticket range` : `AUM ${f.aum >= 1000 ? `$${(f.aum / 1000).toFixed(1)}bn` : `$${Math.round(f.aum)}m`} implies cheques ${hi < fund.minTicket ? 'below' : 'above'} your range`
  }
  reasons.push({ ok: chequeOk, text: chequeText })

  // Stage
  const want = STAGE_MAP[fund.stage]
  const st = f.stages ?? []
  const stageOk = st.some((s) => want.includes(s))
  const stage = !st.length ? 50 : stageOk ? 100 : st.every((s) => s === 'Real estate' || s === 'Credit') ? 10 : 35
  reasons.push({ ok: !st.length ? null : stageOk, text: !st.length ? 'Stage preference not recorded' : stageOk ? `Invests at ${st.filter((s) => want.includes(s)).join(' / ').toLowerCase()}, matching your ${fund.stage.toLowerCase()} strategy` : `Prefers ${st.join(', ').toLowerCase()}` })

  const raw = appetite * 0.3 + sector * 0.2 + geo * 0.15 + cheque * 0.2 + stage * 0.15
  const score = Math.round(raw * (0.82 + 0.18 * (f.prov.conf / 100)))
  return { score, reasons }
}

export const factBaseText = (f: FactBase) => [
  `Fund: ${f.fundName} (${f.vintage}) managed by ${f.managerName}`,
  `Strategy: ${f.strategy}`,
  `Sectors: ${f.sectors.join(', ')}; stage: ${f.stage}; portfolio geographies: ${f.portfolioGeos}`,
  `Target size: $${f.targetSize}m; LP commitments sought: $${f.minTicket}m–$${f.maxTicket}m; first close: ${f.firstClose}`,
  `Track record: ${f.trackRecord}`,
  `Team: ${f.team}`,
  `Differentiators: ${f.differentiators}`,
  `Key facts:\n${f.keyFacts}`,
].join('\n')

export const OPT_OUT = 'If you would rather not hear from us, reply "unsubscribe" and we will not contact you again.'
