import { AlertTriangle, ArrowLeft, Bookmark, BookmarkCheck, CheckCircle2, ChevronRight, CircleHelp, ExternalLink, FileText, Landmark, MessageSquareText, Network, Sparkles, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bar, CompanyLogo, Panel, ScoreRing, Sparkline, StatusTag, useApp } from '../components/ui'
import { companies, companyById, decisions, signals, sourceById, team, theses, transactions } from '../data/seed'
import { FAMILY, SCORE_META, ago, cx, fmtDate, fmtShort, money, opportunityScore, scoreColor } from '../lib/util'
import { pathsToCompany } from '../lib/graph'

const TABS = ['Investment case', 'Signals', 'Relationships', 'Comparables', 'Evidence'] as const

export default function CompanyPage() {
  const { id = 'c1' } = useParams()
  const c = companyById[id] ?? companyById.c1
  const [tab, setTab] = useState<(typeof TABS)[number]>('Investment case')
  const { inspect, watch, toggleWatch, toast } = useApp()
  const nav = useNavigate()
  const sigs = useMemo(() => signals.filter((s) => s.companyId === c.id), [c.id])
  const paths = useMemo(() => pathsToCompany(c.id, 5), [c.id])
  const total = opportunityScore(c.scores)
  const owner = team.find((m) => m.id === c.owner)!
  const thesisList = theses.filter((t) => c.thesisIds.includes(t.id))
  const prior = decisions.filter((d) => d.companyId === c.id)
  const comps = companies.filter((x) => x.id !== c.id && x.sector === c.sector).slice(0, 5)
  const srcIds = [...new Set(sigs.flatMap((s) => s.sourceIds))]

  return (
    <div className="page">
      <button className="btn ghost sm" onClick={() => nav(-1)} style={{ marginBottom: 12 }}><ArrowLeft />Back</button>
      <div className="page-head" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
          <CompanyLogo c={c} lg />
          <div>
            <div className="eyebrow">{c.sector} · {c.subsector}</div>
            <h1 className="h1" style={{ marginTop: 4 }}>{c.name}</h1>
            <div className="row wrap mt-8" style={{ gap: 6 }}>
              <StatusTag s={c.status} />
              <span className="tag">{c.city}, {c.country}</span>
              <span className="tag">Founded {c.founded}</span>
              <span className="tag">{c.ownership}</span>
              <span className="tag">{c.stage}</span>
              {thesisList.map((t) => <Link key={t.id} to={`/thesis/${t.id}`} className="tag accent"><span className="dot" style={{ background: t.color }} />{t.name}</Link>)}
            </div>
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => { toggleWatch(c.id); toast(watch.has(c.id) ? 'Removed from watchlist' : 'Added to watchlist') }}>
            {watch.has(c.id) ? <BookmarkCheck className="accent" /> : <Bookmark />}{watch.has(c.id) ? 'Watching' : 'Watch'}
          </button>
          <Link to={`/diligence/${c.id}`} className="btn"><MessageSquareText />Diligence Copilot</Link>
          <Link to={`/ic/${c.id}`} className="btn primary"><Landmark />Open IC room</Link>
        </div>
      </div>

      {/* Score band */}
      <section className="panel glow" style={{ padding: 18 }}>
        <div className="row wrap" style={{ gap: 28 }}>
          <button className="row" style={{ gap: 14 }} onClick={() => inspect(c.id)}>
            <ScoreRing value={total} size={78} stroke={5} />
            <div style={{ textAlign: 'left' }}>
              <div className="eyebrow">Opportunity score</div>
              <div className="small t2 mt-4" style={{ maxWidth: 200 }}>Seven inspectable factors. Click to see evidence.</div>
            </div>
          </button>
          <div className="grow" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 14 }}>
            {SCORE_META.map((m) => (
              <button key={m.key} style={{ textAlign: 'left' }} onClick={() => inspect(c.id, m.key)}>
                <div className="row between xs"><span className="muted">{m.label}</span><span className="num" style={{ color: scoreColor(c.scores[m.key], m.invert) }}>{c.scores[m.key]}</span></div>
                <div className="mt-8"><Bar v={c.scores[m.key]} color={scoreColor(c.scores[m.key], m.invert)} /></div>
              </button>
            ))}
          </div>
        </div>
        <hr className="hr" style={{ margin: '16px 0' }} />
        <div className="grid g-main" style={{ gap: 24 }}>
          <div>
            <div className="eyebrow accent"><Zap size={11} style={{ verticalAlign: -1 }} /> Why now</div>
            <p className="note mt-8" style={{ fontStyle: 'normal' }}>{c.whyNow}</p>
          </div>
          <div>
            <div className="eyebrow">Next action</div>
            <div className="row mt-8" style={{ alignItems: 'flex-start' }}>
              <div className="avatar sm">{owner.initials}</div>
              <div><div className="small">{c.nextAction}</div><div className="xs muted">{owner.name} · due Fri</div></div>
            </div>
            <button className="btn sm mt-12" onClick={() => toast('Task assigned and added to deal room')}><CheckCircle2 />Assign & track</button>
          </div>
        </div>
      </section>

      <div className="grid g-5 mt-16">
        <Metric label="Revenue (est.)" value={money(c.revenue)} />
        <Metric label="Growth YoY" value={`${c.growth}%`} pos={c.growth > 20} />
        <Metric label="EBITDA margin" value={`${c.ebitdaMargin}%`} pos={c.ebitdaMargin > 15} />
        <div className="panel stat">
          <div className="label">Headcount · 12m</div>
          <div className="row between" style={{ alignItems: 'flex-end' }}><div className="value">{c.employees.toLocaleString()}</div><Sparkline data={c.headcount} w={80} h={28} /></div>
        </div>
        <Metric label="Last meaningful change" value={ago(c.lastChange)} />
      </div>

      <div className="tabs mt-24">
        {TABS.map((t) => <button key={t} className={cx(tab === t && 'on')} onClick={() => setTab(t)}>{t}{t === 'Signals' && <span className="nav-badge" style={{ marginLeft: 6 }}>{sigs.length}</span>}</button>)}
      </div>

      {tab === 'Investment case' && (
        <div className="grid g-main">
          <div className="col" style={{ gap: 14 }}>
            <Panel title="Company identity">
              <p className="t2" style={{ marginTop: 0 }}>{c.description}</p>
              <dl className="kv">
                <dt>Website</dt><dd className="mono small">{c.website}</dd>
                <dt>HQ</dt><dd>{c.city}, {c.country} · {c.region}</dd>
                <dt>Competitors</dt><dd>{c.competitors.join(' · ')}</dd>
                <dt>Thesis fit</dt><dd>{thesisList.map((t) => t.name).join(', ')} — matches {Math.round(c.scores.fit / 25)} of 4 positive signals</dd>
              </dl>
            </Panel>
            <div className="grid g-2">
              <Panel title="Key catalysts" icon={<Zap size={14} className="pos" />}>
                <ul className="clean">{c.catalysts.map((x) => <li key={x}><span className="dot" style={{ background: 'var(--pos)' }} />{x}</li>)}</ul>
              </Panel>
              <Panel title="Key risks" icon={<AlertTriangle size={14} className="neg" />}>
                <ul className="clean">{c.risks.map((x) => <li key={x}><span className="dot" style={{ background: 'var(--neg)' }} />{x}</li>)}</ul>
              </Panel>
            </div>
            <Panel title="Contradictory evidence" icon={<AlertTriangle size={14} className="warn" />} right={<Link to={`/diligence/${c.id}`} className="btn ghost sm"><Sparkles />Interrogate</Link>}>
              {c.contradictions.length ? (
                <div className="col">{c.contradictions.map((x) => <div key={x} className="contra">{x}</div>)}</div>
              ) : <div className="small muted">No contradictions detected across {srcIds.length} sources.</div>}
            </Panel>
          </div>
          <div className="col" style={{ gap: 14 }}>
            <Panel title="Best access path" icon={<Network size={14} className="accent" />} right={<Link to={`/relationships/${c.id}`} className="btn ghost sm">Graph <ChevronRight size={12} /></Link>}>
              {paths[0] ? <PathView p={paths[0]} /> : <div className="small muted">No warm path mapped yet.</div>}
            </Panel>
            <Panel title="Open diligence" icon={<CircleHelp size={14} className="warn" />}>
              <ul className="clean">{c.missing.map((x) => <li key={x}><span className="dot" style={{ background: 'var(--warn)' }} />{x}</li>)}</ul>
              <div className="row mt-12 xs muted between"><span>Evidence coverage</span><span className="num">{c.scores.evidence}%</span></div>
              <div className="mt-4"><Bar v={c.scores.evidence} /></div>
            </Panel>
            <Panel title="Signal timeline" right={<button className="btn ghost sm" onClick={() => setTab('Signals')}>All</button>}>
              <div className="timeline">
                {sigs.slice(0, 5).map((s) => (
                  <div key={s.id} className="tl-item" style={{ '--c': FAMILY[s.family].color } as React.CSSProperties}>
                    <div className="xs muted">{fmtShort(s.date)} · <span style={{ color: FAMILY[s.family].color }}>{s.family}</span></div>
                    <div className="small">{s.title}</div>
                  </div>
                ))}
              </div>
            </Panel>
            {prior.length > 0 && (
              <Panel title="Decision memory" icon={<FileText size={14} />}>
                {prior.map((d) => (
                  <div key={d.id} className="small">
                    <div className="row between"><span className={cx('tag', d.outcome === 'Passed' ? 'neg' : d.outcome === 'Invested' ? 'pos' : 'warn')}>{d.outcome} · {fmtShort(d.date)}</span></div>
                    <p className="t2 xs" style={{ margin: '8px 0 0' }}>{d.rationale}</p>
                  </div>
                ))}
              </Panel>
            )}
          </div>
        </div>
      )}

      {tab === 'Signals' && (
        <Panel flush>
          {sigs.map((s) => {
            const F = FAMILY[s.family]
            return (
              <div key={s.id} className="list-item">
                <div className="sig-icon" style={{ color: F.color, background: `${F.color}14`, borderColor: `${F.color}33` }}><F.icon /></div>
                <div className="grow">
                  <div className="row between wrap"><span style={{ fontWeight: 500 }}>{s.title}</span><span className="xs muted">{fmtDate(s.date)}</span></div>
                  <div className="small t2 mt-4">{s.detail}</div>
                  <div className="row wrap mt-8" style={{ gap: 6 }}>
                    <span className="tag" style={{ color: F.color }}>{s.family} · {s.type}</span>
                    <span className="tag">Relevance {s.relevance}</span>
                    <span className="tag">Confidence {s.confidence}%</span>
                    <span className="tag">Magnitude {s.magnitude}</span>
                    {s.sourceIds.map((sid) => <span key={sid} className={cx('tag', sourceById[sid].type === 'Primary' && 'blue')}>{sourceById[sid].name}</span>)}
                  </div>
                </div>
              </div>
            )
          })}
        </Panel>
      )}

      {tab === 'Relationships' && (
        <div className="grid g-2">
          {paths.map((p, i) => <Panel key={i} title={i === 0 ? 'Recommended path' : `Alternative ${i}`} glow={i === 0}><PathView p={p} /></Panel>)}
          {!paths.length && <div className="empty">No paths mapped yet.</div>}
        </div>
      )}

      {tab === 'Comparables' && (
        <div className="grid g-2">
          <Panel title="Comparable companies" flush>
            {comps.map((x) => (
              <Link key={x.id} to={`/company/${x.id}`} className="list-item clickable">
                <CompanyLogo c={x} />
                <div className="grow"><div className="small" style={{ fontWeight: 500 }}>{x.name}</div><div className="xs muted">{x.subsector} · {money(x.revenue)} · {x.growth}% growth</div></div>
                <ScoreRing value={opportunityScore(x.scores)} size={34} />
              </Link>
            ))}
          </Panel>
          <Panel title="Relevant transactions" flush>
            <table className="table">
              <thead><tr><th>Date</th><th>Target</th><th>Buyer</th><th className="r">EV</th><th className="r">EV/Rev</th></tr></thead>
              <tbody>
                {transactions.filter((t) => t.sector === c.sector || t.sector === 'Vertical SaaS').slice(0, 7).map((t) => (
                  <tr key={t.id}><td className="xs muted">{fmtShort(t.date)}</td><td>{t.target}</td><td className="t2">{t.buyer}</td><td className="r num">{t.ev ? money(t.ev) : '—'}</td><td className="r num">{t.multiple?.toFixed(1)}x</td></tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}

      {tab === 'Evidence' && (
        <Panel title="Source library" right={<span className="xs muted">{srcIds.length} sources · coverage {c.scores.evidence}%</span>} flush>
          <table className="table">
            <thead><tr><th>Source</th><th>Type</th><th>Kind</th><th>Date</th><th>Status</th><th /></tr></thead>
            <tbody>
              {srcIds.map((sid) => {
                const s = sourceById[sid]
                return (
                  <tr key={sid}>
                    <td>{s.name}</td>
                    <td><span className={cx('tag', s.type === 'Primary' ? 'blue' : s.type === 'Internal' ? 'accent' : '')}>{s.type}</span></td>
                    <td className="t2">{s.kind}</td>
                    <td className="xs muted">{fmtDate(s.date)}</td>
                    <td>{s.stale ? <span className="tag warn">Stale</span> : <span className="tag pos">Fresh</span>}</td>
                    <td className="r"><ExternalLink size={13} className="faint" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  )
}

function Metric({ label, value, pos }: { label: string; value: string; pos?: boolean }) {
  return <div className="panel stat"><div className="label">{label}</div><div className={cx('value', pos === true && 'pos')}>{value}</div></div>
}

export function PathView({ p }: { p: ReturnType<typeof pathsToCompany>[number] }) {
  return (
    <div>
      <div className="path">
        {p.nodes.map((n, i) => (
          <div key={n.id} className="path-step">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className={cx('avatar sm', n.internal && 'internal')}>{n.name.split(' ').map((x) => x[0]).join('')}</div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="small" style={{ fontWeight: 500 }}>{n.name}</div>
                <div className="xs muted ellipsis">{n.role}{n.org ? ` · ${n.org}` : ''}</div>
              </div>
            </div>
            {p.links[i] && (
              <div className="path-link">
                <span className="tag" style={{ height: 18, fontSize: 10 }}>{p.links[i].type}</span>
                <span className="num xs" style={{ color: scoreColor(p.links[i].strength * 100) }}>{p.links[i].strength.toFixed(2)}</span>
                <span className="xs faint">· {ago(p.links[i].lastContact)}</span>
                <div className="xs muted" style={{ width: '100%' }}>{p.links[i].context}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="row between mt-12">
        <span className="xs muted">Path strength</span>
        <span className="num small" style={{ color: scoreColor(p.strength * 100) }}>{p.strength.toFixed(2)}</span>
      </div>
      <div className="xs t2 mt-8"><b>Suggested ask:</b> {p.nodes.length > 2 ? `Ask ${p.nodes[1].name.split(' ')[0]} for a warm intro to ${p.target.name} framed around ${p.links[p.links.length - 1].type === 'Board' ? 'their shared board history' : 'the succession and growth agenda'}.` : `Reach out directly — existing relationship.`}</div>
    </div>
  )
}
