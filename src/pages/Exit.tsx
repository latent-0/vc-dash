import { Compass, Download } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { CompanyLogo, Panel, ScoreRing, useApp } from '../components/ui'
import { companyById, portfolio, transactions } from '../data/seed'
import { cx, fmtShort, money } from '../lib/util'
import { GlobeFallback } from './Dashboard'

const InvestmentGlobe = lazy(() => import('../components/Globe'))

export default function Exit() {
  const [sel, setSel] = useState(portfolio[0].companyId)
  const { toast } = useApp()
  const p = portfolio.find((x) => x.companyId === sel)!
  const c = companyById[p.companyId]
  const readiness = [
    { k: 'Value-creation evidence', v: Math.min(98, p.exitReadiness + 8) },
    { k: 'Financial track record', v: Math.min(96, p.exitReadiness + 2) },
    { k: 'Management depth', v: Math.max(20, p.exitReadiness - 12) },
    { k: 'Buyer universe mapped', v: Math.min(95, 40 + p.buyers.length * 12) },
    { k: 'Diligence memory', v: Math.max(25, p.exitReadiness - 4) },
  ]

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Compass size={11} style={{ verticalAlign: -1 }} /> Feature 13 · Exit Intelligence</div>
          <h1 className="h1">Build the exit case <em>before the process starts</em>.</h1>
          <p className="lede">Strategic buyers entering the category, comparable transactions, consolidation and a continuous evidence trail across the hold.</p>
        </div>
        <div className="actions"><button className="btn" onClick={() => toast('Buyer-specific brief exported')}><Download />Export buyer brief</button></div>
      </div>

      <div className="row wrap" style={{ gap: 8, marginBottom: 14 }}>
        {portfolio.map((x) => {
          const cc = companyById[x.companyId]
          return (
            <button key={x.companyId} className={cx('thesis-card row', sel === x.companyId && 'on')} style={{ gap: 10 }} onClick={() => setSel(x.companyId)}>
              <CompanyLogo c={cc} /><div style={{ textAlign: 'left' }}><div className="small" style={{ fontWeight: 500 }}>{cc.name}</div><div className="xs muted">Readiness {x.exitReadiness}</div></div>
            </button>
          )
        })}
      </div>

      <div className="grid g-main">
        <section className="panel glow" style={{ minHeight: 460, overflow: 'hidden' }}>
          <div className="globe-wrap" style={{ position: 'absolute', inset: 0 }}>
            <Suspense fallback={<GlobeFallback />}><InvestmentGlobe mode="flows" focus={c.id} /></Suspense>
            <div className="globe-overlay">
              <div><div className="eyebrow">Category transaction flows</div><div className="h2 mt-4">Who is buying around {c.name}</div></div>
              <div className="globe-legend"><span><i className="dot" style={{ background: '#7a5fc0' }} />Strategic</span><span><i className="dot" style={{ background: '#3d6fb2' }} />Sponsor</span><span><i className="dot" style={{ background: '#e2711d' }} />DayOne</span></div>
            </div>
          </div>
        </section>
        <div className="col" style={{ gap: 14 }}>
          <Panel title="Exit readiness">
            <div className="row" style={{ gap: 18 }}>
              <ScoreRing value={p.exitReadiness} size={76} stroke={5} />
              <div className="grow col" style={{ gap: 8 }}>
                {readiness.map((r) => (
                  <div key={r.k}><div className="row between xs"><span className="muted">{r.k}</span><span className="num">{r.v}</span></div><div className="bar mt-4"><i style={{ width: `${r.v}%` }} /></div></div>
                ))}
              </div>
            </div>
          </Panel>
          <Panel title="Buyer map" flush>
            {p.buyers.map((b) => (
              <div key={b.name} className="list-item">
                <div className="grow"><div className="small" style={{ fontWeight: 500 }}>{b.name} <span className={cx('tag', b.type === 'Strategic' ? 'blue' : '')} style={{ marginLeft: 6 }}>{b.type}</span></div><div className="xs muted mt-4">{b.activity}</div></div>
                <ScoreRing value={b.fit} size={36} />
              </div>
            ))}
          </Panel>
        </div>
      </div>

      <div className="grid g-2 mt-16">
        <Panel title="Comparable transactions" flush>
          <table className="table">
            <thead><tr><th>Date</th><th>Target</th><th>Buyer</th><th className="r">EV</th><th className="r">EV/Rev</th></tr></thead>
            <tbody>{transactions.slice(0, 8).map((t) => <tr key={t.id}><td className="xs muted">{fmtShort(t.date)}</td><td>{t.target}</td><td className="t2">{t.buyer}</td><td className="r num">{money(t.ev ?? 0)}</td><td className="r num">{t.multiple?.toFixed(1)}x</td></tr>)}</tbody>
          </table>
        </Panel>
        <Panel title="Value-creation evidence trail">
          <div className="timeline">
            {p.initiatives.map((i) => (
              <div key={i.title} className="tl-item" style={{ '--c': i.status === 'At risk' ? 'var(--neg)' : 'var(--pos)' } as React.CSSProperties}>
                <div className="xs muted">{i.area} · {i.progress}% complete · ${i.impact}m EBITDA</div>
                <div className="small">{i.title}</div>
                <div className="xs t2">{i.signal}</div>
              </div>
            ))}
            <div className="tl-item" style={{ '--c': 'var(--blue)' } as React.CSSProperties}><div className="xs muted">{p.acquired} · Entry</div><div className="small">Acquired by {p.fund} — {money(p.invested)} invested</div></div>
          </div>
          <div className="eyebrow mt-16">Likely buyer diligence questions</div>
          <ul className="clean mt-8">
            <li><span className="dot" style={{ background: 'var(--warn)' }} />Durability of revenue growth post-hold ({c.growth}% today)</li>
            <li><span className="dot" style={{ background: 'var(--warn)' }} />Integration status of add-ons and synergy evidence</li>
            <li><span className="dot" style={{ background: 'var(--warn)' }} />Management retention through a change of control</li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
