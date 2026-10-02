import { AlertTriangle, ArrowUpRight, CalendarClock, ChevronRight, Globe2, GitBranch, Landmark, Radio, Sparkles, Target, Telescope, UserRoundCheck } from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CompanyLogo, FactorStrip, Panel, ScoreRing, Sparkline, StatusTag, useApp } from '../components/ui'
import { alerts, companies, companyById, decisions, me, portfolio, signals, team, theses } from '../data/seed'
import { FAMILY, STATUS_COLOR, ago, cx, daysSince, fmtShort, opportunityScore } from '../lib/util'
import type { GlobeMode } from '../components/Globe'

const InvestmentGlobe = lazy(() => import('../components/Globe'))

export function GlobeFallback() {
  return <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><div className="typing"><i /><i /><i /></div></div>
}

const STAGES: { k: string; label: string; count: number; to: string }[] = [
  { k: 'orig', label: 'Origination', count: 1338, to: '/thesis' },
  { k: 'pre', label: 'Pre-process', count: 86, to: '/signals' },
  { k: 'screen', label: 'Screening', count: companies.filter((c) => c.status === 'Screening').length, to: '/radar' },
  { k: 'dd', label: 'Diligence', count: companies.filter((c) => c.status === 'Diligence').length, to: '/diligence' },
  { k: 'ic', label: 'IC', count: companies.filter((c) => c.status === 'IC').length + 1, to: '/ic' },
  { k: 'hold', label: 'Hold & value creation', count: portfolio.length, to: '/portfolio' },
  { k: 'exit', label: 'Exit prep', count: portfolio.filter((p) => p.exitReadiness > 70).length, to: '/exit' },
]

export default function Dashboard() {
  const [mode, setMode] = useState<GlobeMode>('deals')
  const { inspect } = useApp()
  const nav = useNavigate()
  const ranked = useMemo(() => companies.filter((c) => c.status !== 'Portfolio' && c.status !== 'Passed').sort((a, b) => opportunityScore(b.scores) - opportunityScore(a.scores)), [])
  const fresh = signals.filter((s) => daysSince(s.date) < 3)
  const recent = signals.slice(0, 9)
  const highRel = signals.filter((s) => daysSince(s.date) < 14 && s.relevance > 85)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent">Thursday, 2 October 2026 · Morning brief</div>
          <h1 className="h1">Good morning, {me.name.split(' ')[0]}. <em>{fresh.length} material changes</em> overnight.</h1>
          <p className="lede">
            Northwind Field Systems crossed into the top decile after a CFO appointment converged with a competitor exit — IC is Thursday.
            Halcyon Ledger&apos;s lead declined pro-rata, opening an allocation. Clearwater Revenue Ops needs attention on the CRO search.
          </p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => nav('/query')}><Sparkles />Ask BRYANT</button>
          <Link to="/ic/c1" className="btn primary"><Landmark />Open Thursday IC</Link>
        </div>
      </div>

      <div className="grid g-5">
        <KPI label="New signals · 24h" value={fresh.length} sub={`${highRel.length} high-relevance this fortnight`} data={[12, 18, 15, 22, 19, 27, 24, 31]} icon={<Radio size={12} />} />
        <KPI label="Priority opportunities" value={ranked.filter((c) => opportunityScore(c.scores) >= 75).length} sub="+3 entered top decile this week" data={[6, 7, 7, 8, 9, 9, 11, 12]} icon={<Target size={12} />} />
        <KPI label="Thesis drift" value="+0.44" sub="AI Infrastructure — 41 newly qualifying" data={[0.1, 0.12, 0.2, 0.18, 0.27, 0.31, 0.38, 0.44]} icon={<GitBranch size={12} />} color="var(--warn)" />
        <KPI label="Portfolio alerts" value={alerts.filter((a) => a.kind === 'portfolio').length + 1} sub="1 concern · 2 watch" data={[1, 0, 2, 1, 1, 3, 2, 3]} icon={<Telescope size={12} />} color="var(--neg)" />
        <KPI label="Warm paths opened" value={7} sub="Michael Chen → Northwind CEO" data={[2, 3, 3, 4, 4, 5, 6, 7]} icon={<UserRoundCheck size={12} />} color="var(--pos)" />
      </div>

      <div className="grid g-main mt-16">
        <section className="panel glow" style={{ minHeight: 560, overflow: 'hidden' }}>
          <div className="globe-wrap" style={{ position: 'absolute', inset: 0 }}>
            <Suspense fallback={<GlobeFallback />}><InvestmentGlobe mode={mode} /></Suspense>
            <div className="globe-overlay">
              <div className="row between wrap" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="eyebrow"><Globe2 size={11} style={{ verticalAlign: -1 }} /> Live investment graph</div>
                  <div className="h2 mt-4">{mode === 'deals' ? 'Pipeline & signals' : mode === 'flows' ? 'Capital flows · 120 days' : 'Access network'}</div>
                  <div className="xs muted mt-4">{companies.length} tracked companies · {theses.length} theses · rings = signals &lt; 10 days</div>
                </div>
                <div className="seg">
                  {(['deals', 'flows', 'network'] as GlobeMode[]).map((m) => <button key={m} className={cx(mode === m && 'on')} onClick={() => setMode(m)}>{m === 'deals' ? 'Pipeline' : m === 'flows' ? 'Transactions' : 'Access'}</button>)}
                </div>
              </div>
              <div className="globe-legend">
                {mode === 'flows' ? (
                  <>
                    <span><i className="dot" style={{ background: '#ff8a1f' }} />DayOne add-ons</span>
                    <span><i className="dot" style={{ background: '#a894d9' }} />Strategic</span>
                    <span><i className="dot" style={{ background: '#7fa6dc' }} />Sponsor</span>
                    <span><i className="dot" style={{ background: '#e8e2d6' }} />Active buyers</span>
                  </>
                ) : (
                  (['IC', 'Diligence', 'Screening', 'Tracking', 'Portfolio'] as const).map((s) => <span key={s}><i className="dot" style={{ background: STATUS_COLOR[s] }} />{s}</span>)
                )}
              </div>
            </div>
          </div>
        </section>

        <Panel title="Priority opportunities" icon={<Target size={14} className="accent" />} right={<Link to="/radar" className="btn ghost sm">Deal Radar <ChevronRight size={12} /></Link>} flush>
          {ranked.slice(0, 6).map((c, i) => (
            <div key={c.id} className="list-item clickable" onClick={() => nav(`/company/${c.id}`)}>
              <div className="num faint xs" style={{ width: 14, paddingTop: 8 }}>{i + 1}</div>
              <CompanyLogo c={c} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row between">
                  <span style={{ fontWeight: 500 }} className="ellipsis">{c.name}</span>
                  <StatusTag s={c.status} />
                </div>
                <div className="xs muted ellipsis mt-4">{c.whyNow}</div>
                <div className="row mt-8 between">
                  <FactorStrip s={c.scores} onClick={(k) => inspect(c.id, k)} />
                  <span className="xs faint">{ago(c.lastChange)}</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); inspect(c.id) }} title="Inspect score"><ScoreRing value={opportunityScore(c.scores)} size={40} /></button>
            </div>
          ))}
        </Panel>
      </div>

      <section className="panel mt-16" style={{ padding: '14px 16px' }}>
        <div className="row between wrap">
          <div className="eyebrow">Lifecycle — one intelligence graph from origination to exit</div>
          <span className="xs faint">Click any stage</span>
        </div>
        <div className="lifecycle mt-12">
          {STAGES.map((s, i) => (
            <Link key={s.k} to={s.to} className="lc-step">
              <div className="num lc-count">{s.count.toLocaleString()}</div>
              <div className="xs t2">{s.label}</div>
              <div className="lc-bar" style={{ opacity: 0.35 + (i / STAGES.length) * 0.65 }} />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid g-3 mt-16">
        <Panel title="New signals" icon={<Radio size={14} className="accent" />} right={<Link to="/signals" className="btn ghost sm">All <ChevronRight size={12} /></Link>} flush>
          {recent.map((s) => {
            const c = companyById[s.companyId]
            const F = FAMILY[s.family]
            return (
              <div key={s.id} className="list-item clickable" onClick={() => nav(`/company/${c.id}`)}>
                <div className="sig-icon" style={{ color: F.color, background: `${F.color}14`, borderColor: `${F.color}33` }}><F.icon /></div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="small" style={{ lineHeight: 1.4 }}>{s.title}</div>
                  <div className="xs muted mt-4 row" style={{ gap: 8 }}>
                    <span style={{ color: F.color }}>{s.family}</span><span>·</span><span>rel {s.relevance}</span><span>·</span><span>{ago(s.date)}</span>
                    {s.isNew && <span className="tag accent" style={{ height: 17, fontSize: 10 }}>NEW</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </Panel>

        <div className="col" style={{ gap: 14 }}>
          <Panel title="Portfolio alerts" icon={<AlertTriangle size={14} className="neg" />} right={<Link to="/portfolio" className="btn ghost sm">Watchtower <ChevronRight size={12} /></Link>} flush>
            {portfolio.filter((p) => p.health !== 'Strong').map((p) => {
              const c = companyById[p.companyId]
              const risk = p.initiatives.find((x) => x.status === 'At risk')
              return (
                <div key={p.companyId} className="list-item clickable" onClick={() => nav('/portfolio')}>
                  <CompanyLogo c={c} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row between"><span className="small" style={{ fontWeight: 500 }}>{c.name}</span><span className={cx('tag', p.health === 'Concern' ? 'neg' : 'warn')}>{p.health}</span></div>
                    {risk && <div className="xs muted mt-4">{risk.title} — {risk.signal}</div>}
                  </div>
                </div>
              )
            })}
          </Panel>
          <Panel title="Relationship opportunities" icon={<UserRoundCheck size={14} className="pos" />} right={<Link to="/relationships" className="btn ghost sm">Graph <ChevronRight size={12} /></Link>}>
            <div className="col" style={{ gap: 12 }}>
              <PathRow from="Eleanor W." via="Michael Chen" to="CEO, Northwind" strength={0.94} note="Shared board · Helix Compliance" />
              <PathRow from="Rafael O." via="Portfolio CEO, Atlas" to="CEO, Northwind" strength={0.62} note="Co-angels in Columbus" />
              <PathRow from="Julien M." via="Helena Hartley" to="CTO, Corvane" strength={0.81} note="Former Rockwell colleagues" />
            </div>
          </Panel>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <Panel title="Upcoming IC & deadlines" icon={<CalendarClock size={14} className="accent" />}>
            <div className="col" style={{ gap: 12 }}>
              {[
                { d: 'Thu 2 Oct · 09:00', t: 'IC — Northwind Field Systems', s: 'Final', c: 'c1', hot: true },
                { d: 'Tue 7 Oct · 14:00', t: 'Partner review — Halcyon Ledger', s: 'Pre-IC', c: 'c2' },
                { d: 'Fri 10 Oct', t: 'Expert call — Meridian Claims AI', s: 'Diligence', c: 'c4' },
                { d: 'Mon 13 Oct', t: 'Q3 portfolio review — Fund II', s: 'Portfolio', c: 'c29' },
              ].map((x) => (
                <Link to={x.c === 'c1' ? '/ic/c1' : `/company/${x.c}`} key={x.t} className="row" style={{ alignItems: 'flex-start' }}>
                  <span className="dot" style={{ background: x.hot ? 'var(--accent)' : 'var(--line-3)', marginTop: 6 }} />
                  <div className="grow"><div className="small">{x.t}</div><div className="xs muted">{x.d} · {x.s}</div></div>
                  <ArrowUpRight size={13} className="faint" />
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Open diligence" right={<Link to="/diligence" className="btn ghost sm">Copilot <ChevronRight size={12} /></Link>}>
            <div className="col" style={{ gap: 10 }}>
              {[companyById.c1, companyById.c2, companyById.c4].map((c) => (
                <div key={c.id} className="small">
                  <div className="row between"><span style={{ fontWeight: 500 }}>{c.name}</span><span className="xs mono warn">{c.missing.length + c.contradictions.length} open</span></div>
                  <div className="xs muted mt-4">{c.contradictions[0] ?? c.missing[0]}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Recent decisions" right={<Link to="/memory" className="btn ghost sm">Memory <ChevronRight size={12} /></Link>}>
            <div className="col" style={{ gap: 10 }}>
              {decisions.slice(0, 3).map((d) => (
                <div key={d.id} className="row small">
                  <span className={cx('tag', d.outcome === 'Invested' ? 'pos' : d.outcome === 'Passed' ? 'neg' : 'warn')} style={{ width: 70, justifyContent: 'center' }}>{d.outcome}</span>
                  <span className="grow ellipsis">{companyById[d.companyId].name}</span>
                  <span className="xs faint">{fmtShort(d.date)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      <div className="xs faint mt-24" style={{ textAlign: 'center' }}>Illustrative data · {team.length} team members · Bryant Private Capital Intelligence for DayOne Venture Partners</div>
    </div>
  )
}

function KPI({ label, value, sub, data, icon, color = 'var(--accent)' }: { label: string; value: React.ReactNode; sub: string; data: number[]; icon: React.ReactNode; color?: string }) {
  return (
    <div className="panel stat">
      <div className="label">{icon}{label}</div>
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div className="value">{value}</div>
        <Sparkline data={data} w={74} h={28} color={color} />
      </div>
      <div className="xs muted mt-4 ellipsis">{sub}</div>
    </div>
  )
}

function PathRow({ from, via, to, strength, note }: { from: string; via: string; to: string; strength: number; note: string }) {
  return (
    <div>
      <div className="row small" style={{ gap: 6, flexWrap: 'wrap' }}>
        <span className="t2">{from}</span><ChevronRight size={12} className="faint" />
        <span style={{ fontWeight: 500 }}>{via}</span><ChevronRight size={12} className="faint" />
        <span className="t2">{to}</span>
        <span className="num xs pos" style={{ marginLeft: 'auto' }}>{strength.toFixed(2)}</span>
      </div>
      <div className="xs muted">{note}</div>
    </div>
  )
}
