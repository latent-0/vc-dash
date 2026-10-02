import { Check, CircleHelp, Download, FileText, Landmark, MessageCircle, Minus, Plus, ShieldAlert, X, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CompanyLogo, Panel, ScoreRing, StatusTag, useApp } from '../components/ui'
import { companies, companyById, sourceById, signals, team, transactions } from '../data/seed'
import { cx, fmtShort, money, opportunityScore } from '../lib/util'
import { pathsToCompany } from '../lib/graph'
import { PathView } from './Company'

export default function IC() {
  const { id } = useParams()
  if (!id) return <ICIndex />
  return <ICRoom id={id} />
}

function ICIndex() {
  const rooms = companies.filter((c) => c.status === 'IC' || c.status === 'Diligence')
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Landmark size={11} style={{ verticalAlign: -1 }} /> Feature 09 · IC Room</div>
          <h1 className="h1">Decision workspaces that <em>remember</em>.</h1>
          <p className="lede">Every brief, question, piece of evidence and decision is preserved — and linked back into the investment graph.</p>
        </div>
      </div>
      <div className="grid g-3">
        {rooms.map((c) => (
          <Link key={c.id} to={`/ic/${c.id}`} className="panel" style={{ padding: 18, display: 'block' }}>
            <div className="row"><CompanyLogo c={c} /><div className="grow"><div style={{ fontWeight: 500 }}>{c.name}</div><div className="xs muted">{c.subsector}</div></div><ScoreRing value={opportunityScore(c.scores)} size={38} /></div>
            <div className="row mt-16 between"><StatusTag s={c.status} /><span className="xs muted">{c.status === 'IC' ? 'IC Thu 2 Oct · 09:00 ET' : 'Pre-IC · draft brief'}</span></div>
            <div className="xs t2 mt-12">{c.whyNow.slice(0, 140)}…</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

type Log = { who: string; what: string; when: string; kind: 'decision' | 'note' | 'action' }

function ICRoom({ id }: { id: string }) {
  const c = companyById[id] ?? companyById.c1
  const { toast } = useApp()
  const path = useMemo(() => pathsToCompany(c.id, 1)[0], [c.id])
  const sigs = signals.filter((s) => s.companyId === c.id)
  const [questions, setQuestions] = useState<{ q: string; by: string; resolved: boolean }[]>([
    { q: 'What is gross retention for the 2023 cohort, excluding payments revenue?', by: 'm1', resolved: false },
    { q: 'How dependent is the GTM plan on the new COO versus the founder?', by: 'm2', resolved: false },
    { q: 'What happens to margin if hosting migration slips two quarters?', by: 'm5', resolved: true },
    ...c.missing.map((m) => ({ q: `Can management provide: ${m.toLowerCase()}?`, by: 'm6', resolved: false })),
  ])
  const [draft, setDraft] = useState('')
  const [log, setLog] = useState<Log[]>([
    { who: 'Priya Raman', what: 'Draft brief assembled by IC Preparation Agent — 14 claims, 11 sourced', when: 'Sep 29', kind: 'action' },
    { who: 'Rafael Okafor', what: 'Advanced to IC after partner review; conditional on cohort data', when: 'Sep 24', kind: 'decision' },
    { who: 'Dana Castellano', what: '100-day plan outline: payments attach, pricing, hosting migration', when: 'Sep 22', kind: 'note' },
    { who: 'Eleanor Whitcombe', what: 'Deferred in May 2025 (founder not ready) — linked from Decision Memory', when: 'May 14, 2025', kind: 'decision' },
  ])
  const decide = (d: string) => { setLog((l) => [{ who: 'Eleanor Whitcombe', what: `Decision recorded: ${d}`, when: 'Just now', kind: 'decision' }, ...l]); toast(`Decision recorded: ${d}`) }

  const risks = [
    ...c.risks.map((r, i) => ({ r, l: [2, 1, 2, 0][i % 4], im: [2, 2, 1, 1][i % 4] })),
    ...c.contradictions.map((r, i) => ({ r, l: 1 + (i % 2), im: 2 - (i % 2) })),
  ]
  const claims = [
    { claim: 'Founder succession is under way', s: 'Supported', src: 3 },
    { claim: 'Competitor exit creates switching demand', s: 'Supported', src: 2 },
    { claim: 'NRR ≥ 115%', s: 'Contradicted', src: 2 },
    { claim: 'Payments attach can reach 35% in 3 years', s: 'Partial', src: 1 },
    { claim: 'Customer count 2,900', s: 'Contradicted', src: 2 },
    { claim: 'Gross margin expands post hosting migration', s: 'Unsupported', src: 0 },
  ]
  const SC: Record<string, string> = { Supported: 'pos', Contradicted: 'neg', Partial: 'warn', Unsupported: '' }

  return (
    <div className="page">
      <div className="page-head" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
          <CompanyLogo c={c} lg />
          <div>
            <div className="eyebrow accent">IC Room · {c.status === 'IC' ? 'Final IC · Thu 2 Oct 09:00 ET' : 'Pre-IC draft'}</div>
            <h1 className="h1" style={{ marginTop: 4 }}>{c.name}</h1>
            <div className="row wrap mt-8" style={{ gap: 6 }}>
              <span className="tag">Proposed: majority recap · {money(c.revenue * 4.6)} EV</span>
              <span className="tag">{money(c.revenue * 4.6 * 0.55)} equity</span>
              <span className="tag">DayOne Fund III</span>
              <span className="tag accent">Deal team: RO · JM · PR</span>
            </div>
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => toast('IC pack exported (PDF + appendix)')}><Download />Export IC pack</button>
          <Link to={`/diligence/${c.id}`} className="btn"><MessageCircle />Copilot</Link>
        </div>
      </div>

      <div className="grid g-main">
        <div className="col" style={{ gap: 14 }}>
          <Panel title="One-page investment brief" icon={<FileText size={14} className="accent" />} glow right={<span className="xs muted">Drafted by IC Preparation Agent · reviewed by RO</span>}>
            <p className="serif" style={{ fontSize: 18, lineHeight: 1.55, margin: 0 }}>
              {c.name} is a {c.subsector.toLowerCase()} platform with {money(c.revenue)} revenue growing {c.growth}% and {c.ebitdaMargin}% EBITDA margin.
              We believe a <span className="accent">founder-succession window</span> and a <span className="accent">competitor exit</span> create a rare entry point into a fragmented category, with embedded payments and 3–5 add-ons as the value-creation engine.
            </p>
            <div className="grid g-3 mt-16">
              <div><div className="eyebrow">Thesis fit</div><div className="num" style={{ fontSize: 22, marginTop: 4 }}>{c.scores.fit}<span className="xs muted"> / 100</span></div><div className="xs muted">Vertical Software & Infra v4</div></div>
              <div><div className="eyebrow">Base-case MOIC</div><div className="num" style={{ fontSize: 22, marginTop: 4 }}>2.8x<span className="xs muted"> · 26% IRR</span></div><div className="xs muted">Bear 1.6x · Bull 4.1x</div></div>
              <div><div className="eyebrow">Evidence coverage</div><div className="num" style={{ fontSize: 22, marginTop: 4 }}>{c.scores.evidence}%</div><div className="xs muted">11 of 14 claims sourced</div></div>
            </div>
          </Panel>

          <div className="grid g-2">
            <Panel title="Key catalysts" icon={<Zap size={14} className="pos" />}>
              <ul className="clean">{c.catalysts.map((x) => <li key={x}><span className="dot" style={{ background: 'var(--pos)' }} />{x}</li>)}</ul>
            </Panel>
            <Panel title="Risk matrix" icon={<ShieldAlert size={14} className="neg" />} right={<span className="xs faint">likelihood × impact</span>}>
              <div className="risk-grid">
                {[2, 1, 0].map((im) => [0, 1, 2].map((l) => {
                  const here = risks.filter((r) => r.l === l && r.im === im)
                  const heat = (l + im) / 4
                  return (
                    <div key={`${im}${l}`} className="risk-cell" style={{ background: `rgba(224,122,107,${0.04 + heat * 0.18})` }}>
                      {here.map((r) => <span key={r.r} className="risk-dot" title={r.r}>{risks.indexOf(r) + 1}</span>)}
                    </div>
                  )
                }))}
              </div>
              <ol className="xs t2" style={{ margin: '10px 0 0', paddingLeft: 18 }}>{risks.map((r) => <li key={r.r} style={{ marginBottom: 3 }}>{r.r}</li>)}</ol>
            </Panel>
          </div>

          <Panel title="Evidence matrix" right={<span className="xs muted">claim → support → sources</span>} flush>
            <table className="table">
              <thead><tr><th>Claim</th><th>Status</th><th className="r">Sources</th><th>Latest evidence</th></tr></thead>
              <tbody>
                {claims.map((x, i) => (
                  <tr key={x.claim}>
                    <td>{x.claim}</td>
                    <td><span className={cx('tag', SC[x.s])}>{x.s === 'Supported' ? <Check /> : x.s === 'Contradicted' ? <X /> : x.s === 'Partial' ? <Minus /> : <CircleHelp />}{x.s}</span></td>
                    <td className="r num">{x.src}</td>
                    <td className="xs muted">{sigs[i] ? `${sourceById[sigs[i].sourceIds[0]].name} · ${fmtShort(sigs[i].date)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Comparable transactions" flush>
            <table className="table">
              <thead><tr><th>Date</th><th>Target</th><th>Buyer</th><th>Type</th><th className="r">EV</th><th className="r">EV/Rev</th></tr></thead>
              <tbody>
                {transactions.filter((t) => t.sector === 'Vertical SaaS').map((t) => (
                  <tr key={t.id}><td className="xs muted">{fmtShort(t.date)}</td><td>{t.target}</td><td className="t2">{t.buyer}</td><td><span className="tag">{t.type}</span></td><td className="r num">{money(t.ev ?? 0)}</td><td className="r num">{t.multiple?.toFixed(1)}x</td></tr>
                ))}
                <tr><td colSpan={4} className="xs muted">Median EV / revenue</td><td /><td className="r num accent">7.8x</td></tr>
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <Panel title="Record decision" glow>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn primary grow" style={{ justifyContent: 'center' }} onClick={() => decide('Approve, subject to cohort data')}><Check />Approve</button>
              <button className="btn grow" style={{ justifyContent: 'center' }} onClick={() => decide('Defer pending diligence')}><Minus />Defer</button>
              <button className="btn grow" style={{ justifyContent: 'center' }} onClick={() => decide('Decline')}><X />Decline</button>
            </div>
            <div className="xs muted mt-8">Decisions, rationale and evidence-at-the-time are written to Decision Memory.</div>
          </Panel>

          <Panel title="IC questions" icon={<CircleHelp size={14} className="warn" />} right={<span className="xs muted">{questions.filter((q) => !q.resolved).length} open</span>}>
            <div className="col" style={{ gap: 10 }}>
              {questions.map((q, i) => {
                const m = team.find((t) => t.id === q.by)!
                return (
                  <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
                    <button onClick={() => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, resolved: !x.resolved } : x)))} className={cx('check', q.resolved && 'on')}>{q.resolved && <Check size={10} />}</button>
                    <div className="grow small" style={{ textDecoration: q.resolved ? 'line-through' : undefined, color: q.resolved ? 'var(--muted)' : undefined }}>{q.q}</div>
                    <div className="avatar sm" title={m.name}>{m.initials}</div>
                  </div>
                )
              })}
              <form className="row" onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; setQuestions((qs) => [...qs, { q: draft.trim(), by: 'm1', resolved: false }]); setDraft('') }}>
                <input className="input" placeholder="Add an IC question…" value={draft} onChange={(e) => setDraft(e.target.value)} />
                <button className="btn" type="submit"><Plus /></button>
              </form>
            </div>
          </Panel>

          <Panel title="Relationship path">{path ? <PathView p={path} /> : <span className="muted small">—</span>}</Panel>

          <Panel title="Decision & action log">
            <div className="timeline">
              {log.map((l, i) => (
                <div key={i} className="tl-item" style={{ '--c': l.kind === 'decision' ? 'var(--accent)' : l.kind === 'note' ? 'var(--blue)' : 'var(--pos)' } as React.CSSProperties}>
                  <div className="xs muted">{l.when} · {l.who}</div>
                  <div className="small">{l.what}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
