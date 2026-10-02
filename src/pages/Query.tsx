import { ArrowRight, Check, CornerDownLeft, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CompanyLogo, FactorStrip, Panel, ScoreRing, StatusTag } from '../components/ui'
import { companies, companyById, portfolio, signals, sponsors } from '../data/seed'
import type { Company, Signal, SignalFamily } from '../data/types'
import { FAMILY, ago, daysSince, opportunityScore } from '../lib/util'
import { pathsToCompany } from '../lib/graph'
import { PathView } from './Company'
import { LogoMark } from '../components/Logo'
import { queryContext, streamAsk } from '../lib/ask'
import { useLive } from '../lib/live'

const EXAMPLES = [
  'Find companies in industrial software showing acquisition or succession signals in the last 90 days',
  'Show portfolio companies with new competitive threats this quarter',
  'Find acquisition candidates adjacent to Atlas Fleet Telematics that fit our buy-and-build thesis',
  'Who in our network can introduce us to the CEO of Northwind?',
  'What changed in Halcyon Ledger since our last review?',
  'Show evidence that contradicts the current investment thesis',
  'Which sponsors are active in healthcare IT?',
  'Which assumptions lack evidence for Meridian Claims AI?',
]

const SECTOR_KW: [RegExp, string][] = [
  [/industrial|manufactur|robot|automation/i, 'Industrial software'], [/health|rcm|clinical|revenue cycle/i, 'Healthcare IT'],
  [/payment|fintech|ledger/i, 'Payments infra'], [/\bai\b|inference|model|llm/i, 'AI infrastructure'],
  [/energy|grid|climate|power/i, 'Energy software'], [/vertical|saas/i, 'Vertical SaaS'], [/data infra|pipeline/i, 'Data infrastructure'],
]
const FAMILY_KW: [RegExp, SignalFamily[]][] = [
  [/succession|leadership|ceo change|cfo|board/i, ['Leadership']], [/acquisition|m&a|consolidat|buyer/i, ['Market', 'Ownership']],
  [/funding|capital|debt|recap/i, ['Capital']], [/hiring|expansion|growth/i, ['Operations', 'People']],
  [/distress|layoff|risk|litigation/i, ['Risk']], [/competit|threat/i, ['Market']], [/launch|product/i, ['Product']],
]

type Intent = 'screen' | 'portfolio-threats' | 'intro' | 'changes' | 'contradictions' | 'sponsors' | 'adjacent' | 'gaps'
interface Parsed { intent: Intent; sectors: string[]; families: SignalFamily[]; days: number | null; company?: Company; chips: string[] }

function findCompany(q: string) {
  const ql = q.toLowerCase()
  return companies.find((c) => ql.includes(c.name.toLowerCase()) || ql.includes(c.name.split(' ')[0].toLowerCase()))
}

function parse(q: string): Parsed {
  const sectors = SECTOR_KW.filter(([r]) => r.test(q)).map(([, s]) => s)
  const families = [...new Set(FAMILY_KW.filter(([r]) => r.test(q)).flatMap(([, f]) => f))]
  const m = q.match(/last (\d+) days/i)
  const days = m ? +m[1] : /quarter/i.test(q) ? 90 : /month/i.test(q) ? 30 : /week/i.test(q) ? 7 : null
  const company = findCompany(q)
  let intent: Intent = 'screen'
  if (/introduc|who in our network|warm/i.test(q)) intent = 'intro'
  else if (/what changed|since our last/i.test(q)) intent = 'changes'
  else if (/contradict/i.test(q)) intent = 'contradictions'
  else if (/lack evidence|assumption|missing/i.test(q)) intent = 'gaps'
  else if (/portfolio/i.test(q) && /threat|competit|risk/i.test(q)) intent = 'portfolio-threats'
  else if (/sponsor|investor|buyer/i.test(q) && /active|which/i.test(q)) intent = 'sponsors'
  else if (/adjacent|add-on|buy-and-build/i.test(q)) intent = 'adjacent'
  const chips = [
    `Intent: ${intent.replace('-', ' ')}`,
    ...sectors.map((s) => `Sector: ${s}`),
    ...families.map((f) => `Signal: ${f}`),
    ...(days ? [`Window: ${days} days`] : []),
    ...(company ? [`Entity: ${company.name}`] : []),
  ]
  return { intent, sectors, families, days, company, chips }
}

const STEPS = ['Parsing intent & entities', 'Traversing investment graph', 'Scoring relevance & convergence', 'Assembling evidence']

export default function Query() {
  const [params, setParams] = useSearchParams()
  const q0 = params.get('q') ?? ''
  const [q, setQ] = useState(q0)
  const [step, setStep] = useState(q0 ? 0 : 99)
  const nav = useNavigate()
  useEffect(() => { setQ(q0); if (q0) { setStep(0); const t = setInterval(() => setStep((s) => { if (s >= STEPS.length) { clearInterval(t); return s } return s + 1 }), 320); return () => clearInterval(t) } }, [q0])
  const parsed = useMemo(() => (q0 ? parse(q0) : null), [q0])
  const done = step >= STEPS.length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Sparkles size={11} style={{ verticalAlign: -1 }} /> Feature 06 · Universal Investment Query</div>
          <h1 className="h1">Ask the graph <em>anything</em>.</h1>
          <p className="lede">Natural language over companies, signals, people, sponsors and decisions. Every answer shows how it was interpreted and the evidence behind it.</p>
        </div>
      </div>
      <form className="query-box" onSubmit={(e) => { e.preventDefault(); if (q.trim()) setParams({ q: q.trim() }) }}>
        <Sparkles className="accent" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Find companies in industrial software showing succession signals in the last 90 days" autoFocus />
        <button className="btn primary" type="submit"><CornerDownLeft />Ask</button>
      </form>

      {!q0 && (
        <div className="mt-24">
          <div className="eyebrow">Try</div>
          <div className="row wrap mt-12" style={{ gap: 8 }}>
            {EXAMPLES.map((e) => <button key={e} className="chip-btn" onClick={() => setParams({ q: e })}><ArrowRight />{e}</button>)}
          </div>
        </div>
      )}

      {parsed && (
        <div className="grid g-main mt-24">
          <div className="col" style={{ gap: 14 }}>
            <OttoAnswer q={q0} />
            {done ? <><div className="eyebrow" style={{ marginTop: 4 }}>Matching records</div><Answer p={parsed} nav={nav} /></> : <Panel><div className="row muted small"><Loader2 size={14} className="spin" /> {STEPS[Math.min(step, STEPS.length - 1)]}…</div></Panel>}
          </div>
          <div className="col" style={{ gap: 14 }}>
            <Panel title="Interpretation">
              <div className="row wrap" style={{ gap: 6 }}>{parsed.chips.map((c) => <span key={c} className="tag accent">{c}</span>)}</div>
              <div className="col mt-16" style={{ gap: 8 }}>
                {STEPS.map((s, i) => (
                  <div key={s} className="row small" style={{ color: i < step ? 'var(--text-2)' : 'var(--faint)' }}>
                    {i < step ? <Check size={13} className="pos" /> : i === step ? <Loader2 size={13} className="spin accent" /> : <span style={{ width: 13 }} />}{s}
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Related questions">
              <div className="col" style={{ gap: 6 }}>
                {EXAMPLES.filter((e) => e !== q0).slice(0, 4).map((e) => <button key={e} className="chip-btn" style={{ borderRadius: 8 }} onClick={() => setParams({ q: e })}><ArrowRight />{e}</button>)}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}

function CompanyRow({ c, sig, nav }: { c: Company; sig?: Signal; nav: (p: string) => void }) {
  return (
    <div className="list-item clickable" onClick={() => nav(`/company/${c.id}`)}>
      <CompanyLogo c={c} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row between"><span style={{ fontWeight: 500 }}>{c.name}</span><StatusTag s={c.status} /></div>
        <div className="xs muted">{c.subsector} · {c.city}</div>
        {sig && <div className="small t2 mt-4"><span style={{ color: FAMILY[sig.family].color }}>● </span>{sig.title} <span className="faint xs">· {ago(sig.date)}</span></div>}
        <div className="mt-8"><FactorStrip s={c.scores} /></div>
      </div>
      <ScoreRing value={opportunityScore(c.scores)} size={38} />
    </div>
  )
}

function Answer({ p, nav }: { p: Parsed; nav: (x: string) => void }) {
  if (p.intent === 'intro') {
    const c = p.company ?? companyById.c1
    const paths = pathsToCompany(c.id, 3)
    return (
      <>
        <Panel glow><p className="serif" style={{ fontSize: 18, margin: 0, lineHeight: 1.5 }}>The strongest route to {c.name}&apos;s leadership is through <span className="accent">{paths[0]?.nodes[1]?.name ?? 'a direct contact'}</span> (path strength {paths[0]?.strength.toFixed(2)}). {paths.length - 1} alternative paths are available.</p></Panel>
        {paths.map((x, i) => <Panel key={i} title={i ? `Alternative ${i}` : 'Best path'}><PathView p={x} /></Panel>)}
      </>
    )
  }
  if (p.intent === 'changes' || p.intent === 'gaps') {
    const c = p.company ?? companyById.c2
    const sigs = signals.filter((s) => s.companyId === c.id).slice(0, 6)
    return (
      <>
        <Panel glow>
          <p className="serif" style={{ fontSize: 18, margin: 0, lineHeight: 1.5 }}>
            {p.intent === 'changes'
              ? <>Since the last review, {c.name} logged <span className="accent">{sigs.length} material signals</span>, led by “{sigs[0]?.title}”. Opportunity score is now {opportunityScore(c.scores)}.</>
              : <>{c.missing.length + c.contradictions.length} assumptions in the {c.name} case are unsupported or contradicted. Evidence coverage is {c.scores.evidence}%.</>}
          </p>
        </Panel>
        {p.intent === 'gaps' ? (
          <Panel title="Assumptions lacking evidence">
            <div className="col">{[...c.missing.map((m) => `Missing — ${m}`), ...c.contradictions.map((m) => `Contradicted — ${m}`)].map((x) => <div key={x} className="contra">{x}</div>)}</div>
          </Panel>
        ) : (
          <Panel title="Changes" flush>{sigs.map((s) => <div key={s.id} className="list-item"><span className="dot" style={{ background: FAMILY[s.family].color, marginTop: 7 }} /><div className="grow"><div className="small">{s.title}</div><div className="xs muted">{s.detail}</div></div><span className="xs faint">{ago(s.date)}</span></div>)}</Panel>
        )}
        <Link to={`/company/${c.id}`} className="btn" style={{ alignSelf: 'flex-start' }}>Open {c.name} <ArrowRight /></Link>
      </>
    )
  }
  if (p.intent === 'contradictions') {
    const list = companies.filter((c) => c.contradictions.length)
    return (
      <>
        <Panel glow><p className="serif" style={{ fontSize: 18, margin: 0 }}>{list.reduce((a, c) => a + c.contradictions.length, 0)} pieces of contradictory evidence across {list.length} active cases.</p></Panel>
        {list.map((c) => <Panel key={c.id} title={c.name} right={<Link to={`/diligence/${c.id}`} className="btn ghost sm">Interrogate</Link>}><div className="col">{c.contradictions.map((x) => <div key={x} className="contra">{x}</div>)}</div></Panel>)}
      </>
    )
  }
  if (p.intent === 'sponsors') {
    const sec = p.sectors[0]
    const list = sponsors.filter((s) => !sec || s.sectors.some((x) => x.name.toLowerCase().includes(sec.split(' ')[0].toLowerCase()))).sort((a, b) => b.interest - a.interest)
    return (
      <>
        <Panel glow><p className="serif" style={{ fontSize: 18, margin: 0 }}>{list.length} sponsors and strategics are active{sec ? ` in ${sec}` : ''}; {list[0]?.name} shows the strongest current activity.</p></Panel>
        <Panel flush>{list.map((s) => <div key={s.id} className="list-item"><div className="grow"><div style={{ fontWeight: 500 }}>{s.name} <span className="tag" style={{ marginLeft: 6 }}>{s.type}</span></div><div className="xs muted">{s.recent}</div></div><ScoreRing value={s.interest} size={36} /></div>)}</Panel>
      </>
    )
  }
  if (p.intent === 'portfolio-threats') {
    const list = portfolio.map((x) => ({ x, c: companyById[x.companyId], s: signals.find((s) => s.companyId === x.companyId && (s.family === 'Market' || s.family === 'Risk')) })).filter((r) => r.s)
    return (
      <>
        <Panel glow><p className="serif" style={{ fontSize: 18, margin: 0 }}>{list.length} portfolio companies show new competitive or risk signals this quarter.</p></Panel>
        <Panel flush>{list.map(({ c, s }) => <CompanyRow key={c.id} c={c} sig={s} nav={nav} />)}</Panel>
      </>
    )
  }
  // screen / adjacent
  let list = companies.filter((c) => c.status !== 'Portfolio')
  if (p.intent === 'adjacent') {
    const base = p.company ?? companyById.c29
    list = list.filter((c) => c.thesisIds.some((t) => base.thesisIds.includes(t)) && c.revenue < base.revenue)
  }
  if (p.sectors.length) list = list.filter((c) => p.sectors.includes(c.sector))
  const hits = list.map((c) => ({ c, s: signals.find((s) => s.companyId === c.id && (!p.families.length || p.families.includes(s.family)) && (!p.days || daysSince(s.date) <= p.days)) }))
    .filter((r) => r.s || (!p.families.length && !p.days))
    .sort((a, b) => opportunityScore(b.c.scores) - opportunityScore(a.c.scores))
  return (
    <>
      <Panel glow>
        <p className="serif" style={{ fontSize: 18, margin: 0, lineHeight: 1.5 }}>
          <span className="accent">{hits.length} companies</span> match{p.sectors.length ? ` in ${p.sectors.join(', ')}` : ''}{p.families.length ? ` with ${p.families.join(' / ').toLowerCase()} signals` : ''}{p.days ? ` in the last ${p.days} days` : ''}. Ranked by opportunity score; {hits.filter((h) => h.c.scores.access > 70).length} have a warm path.
        </p>
      </Panel>
      <Panel flush>{hits.length ? hits.map(({ c, s }) => <CompanyRow key={c.id} c={c} sig={s} nav={nav} />) : <div className="empty">No matches — try widening the window.</div>}</Panel>
    </>
  )
}

function OttoAnswer({ q }: { q: string }) {
  const live = useLive()
  const [text, setText] = useState('')
  const [state, setState] = useState<'thinking' | 'streaming' | 'done' | 'error'>('thinking')
  const ready = live.status !== 'loading'
  useEffect(() => {
    if (!ready) return
    const ac = new AbortController()
    setText(''); setState('thinking')
    streamAsk({ mode: 'query', question: q, context: queryContext(live.signals) }, (t) => { setState('streaming'); setText(t) }, ac.signal)
      .then(() => setState('done'))
      .catch(() => { if (!ac.signal.aborted) setState('error') })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, ready])
  if (state === 'error') return null
  return (
    <Panel glow>
      <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <LogoMark size={24} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="xs muted" style={{ marginBottom: 6 }}>Otto · gpt-oss-120b over {companies.length} companies, {sponsors.length} sponsors and {live.signals.length} live headlines</div>
          {state === 'thinking'
            ? <div className="typing"><i /><i /><i /></div>
            : <div className="ai-text" style={{ whiteSpace: 'pre-wrap', fontSize: 14.5 }}>{text.replace(/\*\*/g, '')}{state === 'streaming' && <span className="caret" />}</div>}
        </div>
      </div>
    </Panel>
  )
}
