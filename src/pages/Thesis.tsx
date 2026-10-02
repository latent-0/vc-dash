import { GitBranch, Map as MapIcon, Plus, Sparkles, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CompanyLogo, Panel, ScoreRing, StatusTag, useApp } from '../components/ui'
import { companies, team, theses } from '../data/seed'
import { cx, money, opportunityScore } from '../lib/util'

export default function Thesis() {
  const { id = 't1' } = useParams()
  const nav = useNavigate()
  const { toast } = useApp()
  const t = theses.find((x) => x.id === id) ?? theses[0]
  const owner = team.find((m) => m.id === t.owner)!
  const inT = useMemo(() => companies.filter((c) => c.thesisIds.includes(t.id)).sort((a, b) => b.scores.fit - a.scores.fit), [t.id])
  const [text, setText] = useState('Mission-critical vertical software for fragmented trades in the US and UK, $15–120m revenue, founder-owned or late sponsor hold, with embedded payments upside. Avoid heavy services and anything consumer.')
  const [structured, setStructured] = useState(false)

  const funnel = [
    { k: 'Total universe', v: t.universe },
    { k: 'In-thesis', v: t.inThesis },
    { k: 'Showing signals', v: Math.round(t.inThesis * 0.22) },
    { k: 'Newly qualifying', v: t.newlyQualifying },
    { k: 'Priority', v: inT.filter((c) => opportunityScore(c.scores) > 70).length },
  ]

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><MapIcon size={11} style={{ verticalAlign: -1 }} /> Feature 01 · Thesis Engine</div>
          <h1 className="h1">The thesis as a <em>living market map</em>.</h1>
          <p className="lede">Written conviction translated into structured criteria, adjacency maps and a continuously refreshed universe — with drift tracked as the market moves.</p>
        </div>
        <div className="actions"><button className="btn" onClick={() => toast('New thesis draft created')}><Plus />New thesis</button></div>
      </div>

      <div className="thesis-tabs">
        {theses.map((x) => (
          <button key={x.id} className={cx('thesis-card', x.id === t.id && 'on')} onClick={() => nav(`/thesis/${x.id}`)}>
            <div className="row between"><span className="dot" style={{ background: x.color }} /><span className="xs faint mono">v{x.version}</span></div>
            <div className="small mt-8" style={{ fontWeight: 500, textAlign: 'left' }}>{x.name}</div>
            <div className="row between mt-8 xs"><span className="muted">{x.strategy}</span><span className="num" style={{ color: x.newlyQualifying > 20 ? 'var(--accent)' : 'var(--text-2)' }}>+{x.newlyQualifying} new</span></div>
          </button>
        ))}
      </div>

      <div className="grid g-main mt-16">
        <div className="col" style={{ gap: 14 }}>
          <Panel title={t.name} icon={<span className="dot" style={{ background: t.color }} />} glow right={<span className="xs muted">Owner · {owner.name}</span>}>
            <p className="serif" style={{ fontSize: 17, lineHeight: 1.55, margin: 0 }}>{t.description}</p>
            <div className="grid g-2 mt-16" style={{ gap: 18 }}>
              <Crit label="Sectors" items={t.sectors} />
              <Crit label="Geography" items={t.geos} />
              <Crit label="Positive signals" items={t.positive} tone="pos" />
              <Crit label="Negative signals" items={t.negative} tone="neg" />
              <Crit label="Exclusions" items={t.exclusions} tone="neg" />
              <Crit label="Size band" items={[t.sizeBand, t.strategy]} />
            </div>
          </Panel>

          <Panel title="Universe funnel">
            <div className="funnel">
              {funnel.map((f, i) => (
                <div key={f.k} className="funnel-row">
                  <div className="xs muted" style={{ width: 120 }}>{f.k}</div>
                  <div className="grow"><div className="funnel-bar" style={{ width: `${Math.max(4, (Math.log10(f.v + 1) / Math.log10(t.universe + 1)) * 100)}%`, opacity: 0.35 + i * 0.16 }} /></div>
                  <div className="num small" style={{ width: 60, textAlign: 'right' }}>{f.v.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Companies in thesis" flush right={<Link to="/radar" className="btn ghost sm">Deal Radar</Link>}>
            {inT.map((c) => (
              <div key={c.id} className="list-item clickable" onClick={() => nav(`/company/${c.id}`)}>
                <CompanyLogo c={c} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row between"><span style={{ fontWeight: 500 }}>{c.name}</span><StatusTag s={c.status} /></div>
                  <div className="xs muted">{c.subsector} · {money(c.revenue)} · {c.growth}% growth · {c.ownership}</div>
                </div>
                <div style={{ textAlign: 'right' }}><div className="xs muted">Fit</div><div className="num" style={{ color: t.color }}>{c.scores.fit}</div></div>
                <ScoreRing value={opportunityScore(c.scores)} size={36} />
              </div>
            ))}
          </Panel>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <Panel title="Adjacency map" right={<span className="xs muted">buy-and-build whitespace</span>}>
            <AdjacencyMap name={t.name} color={t.color} adj={t.adjacencies} n={inT.length} />
          </Panel>
          <Panel title="Thesis drift" icon={<GitBranch size={14} className="warn" />}>
            <div className="row between">
              <div>
                <div className="num" style={{ fontSize: 28, color: Math.abs(t.drift) > 0.3 ? 'var(--warn)' : 'var(--text)' }}>{t.drift > 0 ? '+' : ''}{t.drift.toFixed(2)}</div>
                <div className="xs muted">vs. thesis v{t.version - 1 || 1} baseline</div>
              </div>
              <div className="drift-gauge"><i style={{ left: `${50 + t.drift * 50}%` }} /></div>
            </div>
            <p className="small t2" style={{ marginBottom: 0 }}>
              {t.drift > 0.3 ? 'Market is moving faster than the written thesis — adjacent categories are absorbing in-thesis companies. Consider a v' + (t.version + 1) + ' revision.' : 'Market broadly aligned with the written thesis. Minor movement in adjacencies.'}
            </p>
          </Panel>
          <Panel title="Translate a thesis" icon={<Wand2 size={14} className="accent" />}>
            <textarea className="input" rows={4} value={text} onChange={(e) => { setText(e.target.value); setStructured(false) }} />
            <button className="btn primary mt-12" onClick={() => setStructured(true)}><Sparkles />Structure criteria</button>
            {structured && (
              <div className="col mt-16 fade-in" style={{ gap: 10 }}>
                <Crit label="Sectors" items={['Vertical SaaS', 'Field-service', 'Construction ERP']} />
                <Crit label="Geography" items={['United States', 'United Kingdom']} />
                <Crit label="Size" items={['$15–120m revenue']} />
                <Crit label="Ownership" items={['Founder-owned', 'Sponsor year ≥ 5']} />
                <Crit label="Positive" items={['Embedded payments attach < 30%']} tone="pos" />
                <Crit label="Exclude" items={['Services > 25%', 'Consumer']} tone="neg" />
                <div className="xs muted">→ 412 companies match · 19 show signals this month</div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Crit({ label, items, tone }: { label: string; items: string[]; tone?: 'pos' | 'neg' }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div className="row wrap" style={{ gap: 5 }}>{items.map((i) => <span key={i} className={cx('tag', tone)}>{i}</span>)}</div>
    </div>
  )
}

function AdjacencyMap({ name, color, adj, n }: { name: string; color: string; adj: string[]; n: number }) {
  const W = 380, H = 300, cx0 = W / 2, cy0 = H / 2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {[110, 70].map((r) => <circle key={r} cx={cx0} cy={cy0} r={r} fill="none" stroke="var(--line-2)" strokeDasharray="2 4" />)}
      {adj.map((a, i) => {
        const ang = (i / adj.length) * Math.PI * 2 - Math.PI / 2
        const x = cx0 + Math.cos(ang) * 110, y = cy0 + Math.sin(ang) * 110
        const dots = 3 + ((i * 7) % 6)
        return (
          <g key={a}>
            <line x1={cx0} y1={cy0} x2={x} y2={y} stroke={color} strokeOpacity={0.25} />
            {Array.from({ length: dots }).map((_, k) => {
              const a2 = ang + (k - dots / 2) * 0.09, r2 = 82 + ((k * 13) % 22)
              return <circle key={k} cx={cx0 + Math.cos(a2) * r2} cy={cy0 + Math.sin(a2) * r2} r={2} fill={color} opacity={0.55} />
            })}
            <circle cx={x} cy={y} r={5} fill="var(--ink-2)" stroke={color} />
            <text x={x} y={y + (y > cy0 ? 18 : -10)} textAnchor="middle" style={{ fontSize: 10.5, fill: 'var(--text-2)', fontFamily: 'var(--sans)' }}>{a}</text>
          </g>
        )
      })}
      <circle cx={cx0} cy={cy0} r={34} fill={`${color}22`} stroke={color} />
      <text x={cx0} y={cy0 - 2} textAnchor="middle" style={{ fontSize: 16, fill: 'var(--text)', fontFamily: 'var(--mono)' }}>{n}</text>
      <text x={cx0} y={cy0 + 12} textAnchor="middle" style={{ fontSize: 8.5, fill: 'var(--muted)', fontFamily: 'var(--sans)', letterSpacing: '0.1em' }}>{name.split(' ')[0].toUpperCase()}</text>
    </svg>
  )
}
