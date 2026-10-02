import { companies, companyById, decisions, portfolio, signals, sourceById, sponsors, team } from '../data/seed'
import type { Source } from '../data/types'
import { opportunityScore } from './util'
import type { LiveSignal } from './live'

type History = { role: 'user' | 'assistant'; content: string }[]

/** Streams an answer from /api/ask (Groq · gpt-oss-120b). Calls onDelta with the accumulated text. */
export async function streamAsk(
  body: { mode: 'copilot' | 'query'; question: string; context: unknown; history?: History },
  onDelta: (text: string) => void,
  signal?: AbortSignal,
) {
  const r = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal })
  if (!r.ok || !r.body) throw new Error(`ask ${r.status}`)
  const reader = r.body.getReader()
  const dec = new TextDecoder()
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    text += dec.decode(value, { stream: true })
    onDelta(text)
  }
  if (!text.trim()) throw new Error('empty answer')
  return text
}

/** Company dossier for the Diligence Copilot, with a numbered source list the model cites as [n]. */
export function copilotContext(companyId: string) {
  const c = companyById[companyId]
  const sigs = signals.filter((s) => s.companyId === c.id)
  const sources: Source[] = [...new Set(sigs.flatMap((s) => s.sourceIds))].map((id) => sourceById[id])
  const idx = (id: string) => sources.findIndex((s) => s.id === id) + 1
  return {
    sources,
    context: {
      company: {
        name: c.name, sector: c.sector, subsector: c.subsector, hq: `${c.city}, ${c.country}`, founded: c.founded, ownership: c.ownership, stage: c.stage,
        revenueUSDm: c.revenue, growthPct: c.growth, ebitdaMarginPct: c.ebitdaMargin, employees: c.employees, description: c.description,
        status: c.status, opportunityScore: opportunityScore(c.scores), scores: c.scores, whyNow: c.whyNow, catalysts: c.catalysts, risks: c.risks,
        contradictions: c.contradictions, missingEvidence: c.missing, competitors: c.competitors, nextAction: c.nextAction,
        owner: team.find((m) => m.id === c.owner)?.name,
      },
      signals: sigs.map((s) => ({ date: s.date.slice(0, 10), family: s.family, type: s.type, title: s.title, detail: s.detail, confidence: s.confidence, sources: s.sourceIds.map(idx) })),
      priorDecisions: decisions.filter((d) => d.companyId === c.id).map((d) => ({ date: d.date, outcome: d.outcome, rationale: d.rationale })),
      SOURCES: sources.map((s, i) => `[${i + 1}] ${s.name} (${s.type}, ${s.kind}, ${s.date.slice(0, 10)}${s.stale ? ', stale' : ''})`),
    },
  }
}

/** Compact investment-graph snapshot for Universal Query. */
export function queryContext(live: LiveSignal[]) {
  return {
    trackedCompanies: companies.map((c) => ({
      name: c.name, sector: c.sector, subsector: c.subsector, city: c.city, status: c.status, ownership: c.ownership, revenueUSDm: c.revenue, growthPct: c.growth,
      score: opportunityScore(c.scores), access: c.scores.access, evidence: c.scores.evidence, whyNow: c.whyNow,
      recentSignals: signals.filter((s) => s.companyId === c.id).slice(0, 3).map((s) => `${s.date.slice(0, 10)} ${s.family}: ${s.title}`),
      contradictions: c.contradictions, missing: c.missing,
    })),
    portfolio: portfolio.map((p) => ({ company: companyById[p.companyId].name, health: p.health, moic: p.moic, atRisk: p.initiatives.filter((i) => i.status === 'At risk').map((i) => `${i.title}: ${i.signal}`) })),
    sponsors: sponsors.map((s) => ({ name: s.name, type: s.type, aumBn: s.aum, sectors: s.sectors.map((x) => x.name), recent: s.recent, interest: s.interest })),
    liveMarketHeadlines: live.slice(0, 40).map((s) => ({ date: s.date.slice(0, 16), family: s.family, type: s.type, title: s.title, source: s.source, thesis: s.thesis })),
  }
}
