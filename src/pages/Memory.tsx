import { Brain, Check, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CompanyLogo, Panel, Stat } from '../components/ui'
import { companyById, decisions, team } from '../data/seed'
import { cx, fmtDate } from '../lib/util'

export default function Memory() {
  const [q, setQ] = useState('')
  const [outcome, setOutcome] = useState('All')
  const list = useMemo(() => decisions.filter((d) => {
    const c = companyById[d.companyId]
    return (outcome === 'All' || d.outcome === outcome) && (!q || `${c.name} ${d.rationale} ${c.sector}`.toLowerCase().includes(q.toLowerCase()))
  }), [q, outcome])
  const truths = decisions.flatMap((d) => d.laterTruth ?? [])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Brain size={11} style={{ verticalAlign: -1 }} /> Feature 10 · Decision Memory</div>
          <h1 className="h1">The firm&apos;s reasoning, <em>as a compounding asset</em>.</h1>
          <p className="lede">Why we advanced, passed or deferred — linked to the evidence available at the time, and scored against what later proved true.</p>
        </div>
      </div>
      <div className="grid g-4">
        <Stat label="Decisions recorded" value={decisions.length * 31} delta="Since 2019 · 3 funds" />
        <Stat label="Hypotheses tracked" value={truths.length * 24} delta="Auto-checked against new signals" />
        <Stat label="Proved correct" value={`${Math.round((truths.filter((t) => t.proved).length / truths.length) * 100)}%`} delta="Calibration improving" pos />
        <Stat label="Re-engagements triggered" value={4} delta="Deferred deals with new catalysts" pos />
      </div>

      <div className="row wrap mt-16" style={{ gap: 10 }}>
        <div className="row grow" style={{ maxWidth: 520, position: 'relative' }}>
          <Search size={14} className="muted" style={{ position: 'absolute', left: 12 }} />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Why did we pass on…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg">{['All', 'Invested', 'Passed', 'Deferred'].map((o) => <button key={o} className={cx(outcome === o && 'on')} onClick={() => setOutcome(o)}>{o}</button>)}</div>
      </div>

      <div className="col mt-16" style={{ gap: 14 }}>
        {list.map((d) => {
          const c = companyById[d.companyId]
          return (
            <Panel key={d.id}>
              <div className="grid g-main" style={{ gap: 24 }}>
                <div>
                  <div className="row">
                    <CompanyLogo c={c} />
                    <div className="grow"><Link to={`/company/${c.id}`} style={{ fontWeight: 500 }}>{c.name}</Link><div className="xs muted">{c.subsector} · {fmtDate(d.date)}</div></div>
                    <span className={cx('tag', d.outcome === 'Invested' ? 'pos' : d.outcome === 'Passed' ? 'neg' : 'warn')}>{d.outcome}</span>
                  </div>
                  <p className="note mt-12">{d.rationale}</p>
                  <div className="eyebrow mt-12">Open questions at the time</div>
                  <ul className="clean mt-8">{d.keyQuestions.map((x) => <li key={x}><span className="dot" style={{ background: 'var(--warn)' }} />{x}</li>)}</ul>
                </div>
                <div>
                  <div className="eyebrow">What later proved true</div>
                  <div className="col mt-8" style={{ gap: 8 }}>
                    {(d.laterTruth ?? []).map((t) => (
                      <div key={t.claim} className="row small" style={{ alignItems: 'flex-start' }}>
                        <span className={cx('check', t.proved && 'on')} style={!t.proved ? { background: 'var(--neg-dim)', borderColor: 'var(--neg)', color: 'var(--neg)' } : undefined}>{t.proved ? <Check size={10} /> : <X size={10} />}</span>
                        <span className={t.proved ? '' : 't2'}>{t.claim}</span>
                      </div>
                    ))}
                  </div>
                  <div className="eyebrow mt-16">Decision makers</div>
                  <div className="row mt-8" style={{ gap: 4 }}>{d.partners.map((p) => { const m = team.find((x) => x.id === p)!; return <div key={p} className="avatar sm" title={m.name}>{m.initials}</div> })}</div>
                  {d.outcome === 'Deferred' && <div className="contra mt-16">New catalysts detected since deferral — re-engagement recommended.</div>}
                </div>
              </div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
