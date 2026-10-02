import { ArrowUpRight, ChevronRight, Globe2, Landmark, Radio, Sparkles, Target, TriangleAlert, UserRoundCheck } from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CompanyLogo, Panel, ScoreRing, Sparkline, StatusTag, useApp } from '../components/ui'
import { companies, companyById, me, portfolio } from '../data/seed'
import { FAMILY, STATUS_COLOR, cx, opportunityScore } from '../lib/util'
import { timeAgo, useLive } from '../lib/live'
import type { GlobeMode } from '../components/Globe'

const InvestmentGlobe = lazy(() => import('../components/Globe'))

export function GlobeFallback() {
  return <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><div className="typing"><i /><i /><i /></div></div>
}

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }

export default function Dashboard() {
  const [mode, setMode] = useState<GlobeMode>('deals')
  const { inspect } = useApp()
  const nav = useNavigate()
  const live = useLive()
  const ranked = useMemo(() => companies.filter((c) => c.status !== 'Portfolio' && c.status !== 'Passed').sort((a, b) => opportunityScore(b.scores) - opportunityScore(a.scores)), [])
  const liveHi = live.signals.filter((s) => s.thesis)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  const focus = [
    { icon: Landmark, tone: 'accent', label: 'IC this week', title: 'Northwind Field Systems', meta: 'Score 86 · succession + competitor exit', to: '/ic/c1' },
    { icon: UserRoundCheck, tone: 'pos', label: 'Warm path opened', title: 'Michael Chen → Northwind CEO', meta: 'Board relationship · strength 0.94', to: '/relationships/c1' },
    { icon: TriangleAlert, tone: 'neg', label: 'Portfolio watch', title: 'Clearwater Revenue Ops', meta: 'CRO search at risk', to: '/portfolio' },
  ] as const

  return (
    <div className="page dash">
      {/* Header — one idea */}
      <header className="dash-head">
        <div>
          <div className="eyebrow">{today}</div>
          <h1 className="h1">{greeting()}, {me.name.split(' ')[0]}.</h1>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => nav('/query')}><Sparkles />Ask Otto</button>
          <Link to="/ic/c1" className="btn primary"><Landmark />Open IC room</Link>
        </div>
      </header>

      {/* Top of mind — scannable, 3 items max */}
      <div className="focus-row" data-tour="focus">
        {focus.map((f) => (
          <Link key={f.title} to={f.to} className="focus-card">
            <span className={cx('focus-icon', f.tone)}><f.icon size={15} /></span>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="xs muted">{f.label}</div>
              <div className="focus-title ellipsis">{f.title}</div>
              <div className="xs t2 ellipsis">{f.meta}</div>
            </div>
            <ArrowUpRight size={15} className="faint" />
          </Link>
        ))}
      </div>

      {/* KPI strip — one quiet surface */}
      <section className="panel kpi-strip">
        <KPI label="Live signals · 72h" value={live.status === 'loading' ? '—' : live.signals.length} data={[12, 18, 15, 22, 19, 27, 24, live.signals.length || 30]} />
        <KPI label="Thesis-matched" value={live.status === 'loading' ? '—' : liveHi.length} data={[6, 7, 9, 8, 11, 10, 13, liveHi.length || 14]} />
        <KPI label="Priority opportunities" value={ranked.filter((c) => opportunityScore(c.scores) >= 75).length} data={[6, 7, 7, 8, 9, 9, 11, 12]} />
        <KPI label="Portfolio on watch" value={portfolio.filter((p) => p.health !== 'Strong').length} data={[1, 0, 2, 1, 1, 3, 2, 3]} color="var(--neg)" />
      </section>

      {/* Primary canvas */}
      <div className="grid g-main">
        <section className="panel glow" data-tour="globe" style={{ minHeight: 520, overflow: 'hidden' }}>
          <div className="globe-wrap" style={{ position: 'absolute', inset: 0 }}>
            <Suspense fallback={<GlobeFallback />}><InvestmentGlobe mode={mode} /></Suspense>
            <div className="globe-overlay">
              <div className="row between wrap" style={{ alignItems: 'flex-start' }}>
                <div className="eyebrow"><Globe2 size={11} style={{ verticalAlign: -1 }} /> Investment graph</div>
                <div className="seg">
                  {(['deals', 'flows', 'network'] as GlobeMode[]).map((m) => <button key={m} className={cx(mode === m && 'on')} onClick={() => setMode(m)}>{m === 'deals' ? 'Pipeline' : m === 'flows' ? 'Transactions' : 'Access'}</button>)}
                </div>
              </div>
              <div className="globe-legend">
                {mode === 'flows'
                  ? [['#e2711d', 'DayOne'], ['#7a5fc0', 'Strategic'], ['#3d6fb2', 'Sponsor']].map(([c, l]) => <span key={l}><i className="dot" style={{ background: c }} />{l}</span>)
                  : (['IC', 'Diligence', 'Screening', 'Tracking', 'Portfolio'] as const).map((s) => <span key={s}><i className="dot" style={{ background: STATUS_COLOR[s] }} />{s}</span>)}
              </div>
            </div>
          </div>
        </section>

        <Panel tour="priority" title="Priority opportunities" icon={<Target size={14} className="accent" />} right={<Link to="/radar" className="btn ghost sm">All <ChevronRight size={12} /></Link>} flush>
          {ranked.slice(0, 6).map((c) => (
            <div key={c.id} className="list-item clickable compact" onClick={() => nav(`/company/${c.id}`)}>
              <CompanyLogo c={c} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="small ellipsis" style={{ fontWeight: 500 }}>{c.name}</div>
                <div className="xs muted ellipsis">{c.subsector}</div>
              </div>
              <StatusTag s={c.status} />
              <button onClick={(e) => { e.stopPropagation(); inspect(c.id) }} title="Inspect score"><ScoreRing value={opportunityScore(c.scores)} size={36} /></button>
            </div>
          ))}
        </Panel>
      </div>

      {/* Live wire — real public-market data */}
      <div className="grid g-main mt-16">
        <Panel
          tour="livewire"
          title={<>Live market wire <span className={cx('live-pill', live.status)}>{live.status === 'live' ? 'LIVE' : live.status === 'loading' ? 'CONNECTING' : 'OFFLINE'}</span></>}
          icon={<Radio size={14} className="accent" />}
          right={<span className="xs muted">{live.updatedAt ? `Updated ${timeAgo(live.updatedAt)}` : ''}</span>}
          flush
        >
          {live.status === 'loading' && <div className="empty"><div className="typing"><i /><i /><i /></div></div>}
          {live.status === 'error' && <div className="empty small">Live feed unavailable — retrying every 2 minutes.</div>}
          {live.signals.slice(0, 8).map((s) => {
            const F = FAMILY[s.family]
            return (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="list-item clickable compact">
                <div className="sig-icon" style={{ color: F.color, background: `${F.color}14`, borderColor: `${F.color}33` }}><F.icon /></div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="small ellipsis">{s.title}</div>
                  <div className="xs muted">{s.source} · {timeAgo(s.date)}</div>
                </div>
                {s.thesis && <span className="tag accent hide-sm">{s.thesis}</span>}
              </a>
            )
          })}
          {live.signals.length > 0 && <Link to="/signals" className="list-item clickable xs muted" style={{ justifyContent: 'center' }}>View all {live.signals.length} live signals <ChevronRight size={12} /></Link>}
        </Panel>

        <Panel title="This week" flush>
          {[
            { d: 'Thu', t: 'IC — Northwind Field Systems', s: 'Final decision', to: '/ic/c1', hot: true },
            { d: 'Tue', t: 'Partner review — Halcyon Ledger', s: 'Pre-IC', to: '/company/c2' },
            { d: 'Fri', t: 'Expert call — Meridian Claims AI', s: 'Diligence', to: '/diligence/c4' },
            { d: 'Mon', t: 'Q3 portfolio review', s: 'Fund II', to: '/portfolio' },
          ].map((x) => (
            <Link key={x.t} to={x.to} className="list-item clickable compact">
              <div className={cx('day-chip', x.hot && 'hot')}>{x.d}</div>
              <div className="grow" style={{ minWidth: 0 }}><div className="small ellipsis">{x.t}</div><div className="xs muted">{x.s}</div></div>
              <ChevronRight size={14} className="faint" />
            </Link>
          ))}
          <div className="list-item compact" style={{ display: 'block' }}>
            <div className="xs muted">Portfolio health</div>
            <div className="row mt-8" style={{ gap: 6 }}>
              {portfolio.map((p) => (
                <Link key={p.companyId} to={`/company/${p.companyId}`} title={`${companyById[p.companyId].name} — ${p.health}`} className="health-dot" style={{ background: p.health === 'Strong' ? 'var(--pos)' : p.health === 'Watch' ? 'var(--warn)' : 'var(--neg)' }} />
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function KPI({ label, value, data, color = 'var(--accent)' }: { label: string; value: React.ReactNode; data: number[]; color?: string }) {
  return (
    <div className="kpi">
      <div className="xs muted">{label}</div>
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div className="kpi-value">{value}</div>
        <Sparkline data={data} w={64} h={24} color={color} />
      </div>
    </div>
  )
}
