import { TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Bar, CompanyLogo, Panel, Stat } from '../components/ui'
import { companyById, portfolio } from '../data/seed'
import type { Initiative } from '../data/types'
import { cx } from '../lib/util'

const AREAS: Initiative['area'][] = ['Revenue', 'Margin', 'Working capital', 'Talent', 'AI', 'M&A']
const INTEL: Record<Initiative['area'], string> = {
  Revenue: 'Pricing, cross-sell, market expansion, customer signals', Margin: 'Automation, procurement, cost signals, benchmarks',
  'Working capital': 'Collections, inventory, operational signals', Talent: 'Leadership, hiring, departures, capability gaps',
  AI: 'AI adoption, automation, competitive displacement', 'M&A': 'Add-on targets, adjacency mapping, consolidation',
}
const ST = { 'On track': 'blue', Ahead: 'pos', 'At risk': 'neg', 'Not started': '' } as const

export default function Value() {
  const [area, setArea] = useState<Initiative['area'] | 'all'>('all')
  const all = portfolio.flatMap((p) => p.initiatives.map((i) => ({ ...i, p })))
  const byArea = AREAS.map((a) => all.filter((i) => i.area === a).reduce((s, i) => s + i.impact, 0))
  const total = all.reduce((s, i) => s + i.impact, 0)
  const realised = all.reduce((s, i) => s + i.impact * (i.progress / 100), 0)
  const list = all.filter((i) => area === 'all' || i.area === area).sort((a, b) => b.impact - a.impact)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><TrendingUp size={11} style={{ verticalAlign: -1 }} /> Feature 12 · Value Creation Radar</div>
          <h1 className="h1">External intelligence, <em>wired into the operating plan</em>.</h1>
          <p className="lede">Every initiative is tied to the market signal that justifies it — so the plan updates when the world does.</p>
        </div>
      </div>
      <div className="grid g-4">
        <Stat label="Identified EBITDA uplift" value={`$${total.toFixed(1)}m`} delta={`${all.length} initiatives`} />
        <Stat label="Realised to date" value={`$${realised.toFixed(1)}m`} delta={`${Math.round((realised / total) * 100)}% of plan`} pos />
        <Stat label="At risk" value={all.filter((i) => i.status === 'At risk').length} delta="Triggered by external signals" pos={false} />
        <Stat label="Ahead of plan" value={all.filter((i) => i.status === 'Ahead').length} delta="Signals confirm headroom" pos />
      </div>

      <div className="grid g-main-r mt-16">
        <Panel title="Value-creation radar" right={<span className="xs muted">$m EBITDA by lever</span>}>
          <Spider values={byArea} labels={AREAS} active={area} onPick={(a) => setArea(area === a ? 'all' : a)} />
          <div className="col mt-12" style={{ gap: 8 }}>
            {AREAS.map((a, i) => (
              <button key={a} className={cx('row small', area === a && 'accent')} style={{ justifyContent: 'space-between', width: '100%' }} onClick={() => setArea(area === a ? 'all' : a)}>
                <span>{a}</span><span className="xs muted grow" style={{ textAlign: 'left', paddingLeft: 10 }}>{INTEL[a]}</span><span className="num">${byArea[i].toFixed(1)}m</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={area === 'all' ? 'All initiatives' : `${area} initiatives`} flush right={area !== 'all' && <button className="btn ghost sm" onClick={() => setArea('all')}>Clear</button>}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Company</th><th>Initiative</th><th>Lever</th><th className="r">Impact</th><th style={{ width: 120 }}>Progress</th><th>Status</th><th>Triggering signal</th></tr></thead>
              <tbody>
                {list.map((i) => {
                  const c = companyById[i.p.companyId]
                  return (
                    <tr key={i.title}>
                      <td><div className="row"><CompanyLogo c={c} /><span className="small">{c.name}</span></div></td>
                      <td className="small">{i.title}</td>
                      <td><span className="tag">{i.area}</span></td>
                      <td className="r num">${i.impact.toFixed(1)}m</td>
                      <td><Bar v={i.progress} color={i.status === 'At risk' ? 'var(--neg)' : undefined} /><div className="xs muted mt-4 num">{i.progress}%</div></td>
                      <td><span className={cx('tag', ST[i.status])}>{i.status}</span></td>
                      <td className="xs t2" style={{ maxWidth: 240 }}>{i.signal}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Spider({ values, labels, active, onPick }: { values: number[]; labels: string[]; active: string; onPick: (a: Initiative['area']) => void }) {
  const S = 300, c = S / 2, R = 108
  const max = Math.max(...values)
  const pt = (i: number, r: number) => { const a = (i / labels.length) * Math.PI * 2 - Math.PI / 2; return [c + Math.cos(a) * r, c + Math.sin(a) * r] }
  const poly = values.map((v, i) => pt(i, (v / max) * R).join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${S} ${S}`} style={{ width: '100%', maxWidth: 360, display: 'block', margin: '0 auto' }}>
      <defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4a524" stopOpacity=".45" /><stop offset="1" stopColor="#ff4d0a" stopOpacity=".2" /></linearGradient></defs>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={labels.map((_, i) => pt(i, R * f).join(',')).join(' ')} fill="none" stroke="var(--line-2)" />)}
      {labels.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" /> })}
      <polygon points={poly} fill="url(#spg)" stroke="#e2711d" strokeWidth={1.5} />
      {values.map((v, i) => { const [x, y] = pt(i, (v / max) * R); return <circle key={i} cx={x} cy={y} r={3.5} fill="#e2711d" /> })}
      {labels.map((l, i) => {
        const [x, y] = pt(i, R + 22)
        return <text key={l} x={x} y={y + 4} textAnchor="middle" onClick={() => onPick(l as Initiative['area'])} style={{ cursor: 'pointer', fontSize: 11, fontFamily: 'var(--sans)', fill: active === l ? 'var(--accent)' : 'var(--text-2)' }}>{l}</text>
      })}
    </svg>
  )
}
