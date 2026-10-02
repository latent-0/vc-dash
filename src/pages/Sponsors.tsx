import { Building } from 'lucide-react'
import { useState } from 'react'
import { Panel, ScoreRing, Sparkline } from '../components/ui'
import { sponsors } from '../data/seed'
import { cx } from '../lib/util'

const TYPE_TONE = { PE: 'accent', VC: 'blue', Strategic: 'pos', Growth: 'warn' } as const

export default function Sponsors() {
  const [type, setType] = useState('All')
  const list = sponsors.filter((s) => type === 'All' || s.type === type).sort((a, b) => b.interest - a.interest)
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Building size={11} style={{ verticalAlign: -1 }} /> Feature 15 · Investor / Sponsor Intelligence</div>
          <h1 className="h1">Co-investors, competitors <em>and future buyers</em>.</h1>
          <p className="lede">Investment pace, sector concentration, recent activity and relationship paths for every sponsor and strategic in our categories.</p>
        </div>
        <div className="seg">{['All', 'PE', 'Growth', 'VC', 'Strategic'].map((t) => <button key={t} className={cx(type === t && 'on')} onClick={() => setType(t)}>{t}</button>)}</div>
      </div>
      <div className="grid g-3">
        {list.map((s) => (
          <Panel key={s.id}>
            <div className="row">
              <div className="grow"><div style={{ fontWeight: 500 }}>{s.name}</div><div className="xs muted">{s.city} · ${s.aum}bn AUM</div></div>
              <span className={cx('tag', TYPE_TONE[s.type])}>{s.type}</span>
            </div>
            <div className="row between mt-16" style={{ alignItems: 'flex-end' }}>
              <div><div className="xs muted">Deals / quarter · 8q</div><Sparkline data={s.pace} w={140} h={32} /></div>
              <div style={{ textAlign: 'center' }}><ScoreRing value={s.interest} size={44} /><div className="xs muted mt-4">Interest</div></div>
            </div>
            <div className="mt-16">
              <div className="sector-bar">{s.sectors.map((x, i) => <i key={x.name} style={{ width: `${x.pct}%`, opacity: 1 - i * 0.3 }} title={`${x.name} ${x.pct}%`} />)}</div>
              <div className="row wrap mt-8 xs muted" style={{ gap: 10 }}>{s.sectors.map((x) => <span key={x.name}>{x.name} {x.pct}%</span>)}</div>
            </div>
            <div className="hr" />
            <div className="small t2">{s.recent}</div>
            <div className="row between mt-8 xs muted"><span>{s.portfolio} portfolio · {s.exits} exits</span><span>{s.partners.join(', ')}</span></div>
          </Panel>
        ))}
      </div>
    </div>
  )
}
