import { Activity, CheckCircle2, ThumbsDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CompanyLogo, Panel, useApp } from '../components/ui'
import { companyById, signals, sourceById } from '../data/seed'
import type { SignalFamily } from '../data/types'
import { FAMILY, ago, cx, daysSince } from '../lib/util'
import { timeAgo, useLive } from '../lib/live'

const FAMILIES = Object.keys(FAMILY) as SignalFamily[]
const USE: Record<SignalFamily, string> = {
  Leadership: 'Timing, succession, governance', Capital: 'Liquidity & transaction readiness', Operations: 'Growth & operating momentum', Market: 'Strategic context',
  Risk: 'Downside diligence', Product: 'Thesis relevance', People: 'Capability / risk', Ownership: 'Transaction context',
}

export default function Signals() {
  const nav = useNavigate()
  const { toast } = useApp()
  const [fam, setFam] = useState<SignalFamily | 'all'>('all')
  const [view, setView] = useState<'live' | 'tracked'>('live')
  const live = useLive()
  const liveList = live.signals.filter((s) => fam === 'all' || s.family === fam)
  const [win, setWin] = useState(30)
  const [minRel, setMinRel] = useState(60)
  const list = useMemo(() => signals.filter((s) => (fam === 'all' || s.family === fam) && daysSince(s.date) <= win && s.relevance >= minRel), [fam, win, minRel])

  // Convergence: companies with ≥3 signal families in window
  const convergence = useMemo(() => {
    const m = new Map<string, Set<SignalFamily>>()
    signals.filter((s) => daysSince(s.date) <= 60).forEach((s) => { if (!m.has(s.companyId)) m.set(s.companyId, new Set()); m.get(s.companyId)!.add(s.family) })
    return [...m.entries()].filter(([, f]) => f.size >= 3).sort((a, b) => b[1].size - a[1].size).slice(0, 6)
  }, [])

  // Heat: family × week (last 12 weeks)
  const heat = FAMILIES.map((f) => Array.from({ length: 12 }, (_, w) => signals.filter((s) => s.family === f && Math.floor(daysSince(s.date) / 7) === 11 - w).length))
  const maxH = Math.max(...heat.flat())

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Activity size={11} style={{ verticalAlign: -1 }} /> Feature 02 · Signal Engine</div>
          <h1 className="h1">What changed, <em>and why it matters</em>.</h1>
          <p className="lede">Sixteen event types across eight families, scored for thesis relevance, magnitude, recency, evidence coverage and cross-signal convergence.</p>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 10, marginBottom: 14 }}>
        <div className="seg">
          <button className={cx(view === 'live' && 'on')} onClick={() => setView('live')}>Live market wire</button>
          <button className={cx(view === 'tracked' && 'on')} onClick={() => setView('tracked')}>Tracked companies</button>
        </div>
        {view === 'live' && <span className="xs muted">{live.status === 'live' ? `${live.signals.length} public signals · last 72h · refreshed ${live.updatedAt ? timeAgo(live.updatedAt) : ''}` : live.status === 'loading' ? 'Connecting…' : 'Feed unavailable'}</span>}
      </div>

      {view === 'live' ? (
        <>
          <div className="seg" style={{ marginBottom: 12 }}>
            <button className={cx(fam === 'all' && 'on')} onClick={() => setFam('all')}>All</button>
            {FAMILIES.filter((f) => live.signals.some((s) => s.family === f)).map((f) => <button key={f} className={cx(fam === f && 'on')} onClick={() => setFam(f)}>{f}</button>)}
          </div>
          <Panel flush>
            {liveList.map((s) => {
              const F = FAMILY[s.family]
              return (
                <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="list-item clickable">
                  <div className="sig-icon" style={{ color: F.color, background: `${F.color}14`, borderColor: `${F.color}33` }}><F.icon /></div>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{s.title}</div>
                    <div className="row wrap mt-8" style={{ gap: 6 }}>
                      <span className="tag" style={{ color: F.color }}>{s.type}</span>
                      <span className="tag">{s.source}</span>
                      <span className="tag">Rel {s.relevance}</span>
                      {s.thesis && <span className="tag accent">{s.thesis}</span>}
                    </div>
                  </div>
                  <span className="xs muted" style={{ whiteSpace: 'nowrap' }}>{timeAgo(s.date)}</span>
                </a>
              )
            })}
            {!liveList.length && <div className="empty small">{live.status === 'loading' ? 'Connecting to live sources…' : 'No live signals in this family right now.'}</div>}
          </Panel>
        </>
      ) : (<>
      <div className="grid g-main">
        <Panel title="Signal density · 12 weeks" right={<span className="xs muted">click a family to filter</span>}>
          <div className="heat">
            {FAMILIES.map((f, i) => (
              <div key={f} className="heat-row" onClick={() => setFam(fam === f ? 'all' : f)} style={{ opacity: fam === 'all' || fam === f ? 1 : 0.35 }}>
                <div className="xs" style={{ width: 92, color: FAMILY[f].color }}>{f}</div>
                {heat[i].map((v, w) => <i key={w} title={`${v} signals`} style={{ background: FAMILY[f].color, opacity: v ? 0.12 + (v / maxH) * 0.88 : 0.04 }} />)}
                <div className="xs muted hide-sm" style={{ width: 190, paddingLeft: 10 }}>{USE[f]}</div>
              </div>
            ))}
            <div className="row xs faint" style={{ paddingLeft: 92, justifyContent: 'space-between', paddingRight: 200 }}><span>12w ago</span><span>this week</span></div>
          </div>
        </Panel>
        <Panel title="Cross-signal convergence" right={<span className="xs muted">≥3 families · 60d</span>} flush>
          {convergence.map(([id, f]) => {
            const c = companyById[id]
            return (
              <div key={id} className="list-item clickable" onClick={() => nav(`/company/${id}`)}>
                <CompanyLogo c={c} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="small" style={{ fontWeight: 500 }}>{c.name}</div>
                  <div className="row mt-4" style={{ gap: 4 }}>{[...f].map((x) => <span key={x} className="dot" title={x} style={{ background: FAMILY[x].color }} />)}<span className="xs muted" style={{ marginLeft: 4 }}>{[...f].join(' · ')}</span></div>
                </div>
                <span className="num accent">{f.size}</span>
              </div>
            )
          })}
        </Panel>
      </div>

      <div className="row wrap mt-16" style={{ gap: 10 }}>
        <div className="seg">
          <button className={cx(fam === 'all' && 'on')} onClick={() => setFam('all')}>All</button>
          {FAMILIES.map((f) => <button key={f} className={cx(fam === f && 'on')} onClick={() => setFam(f)}>{f}</button>)}
        </div>
        <div className="seg">{[7, 30, 90].map((d) => <button key={d} className={cx(win === d && 'on')} onClick={() => setWin(d)}>{d}d</button>)}</div>
        <label className="row xs muted" style={{ gap: 8 }}>Min relevance <input type="range" min={40} max={95} value={minRel} onChange={(e) => setMinRel(+e.target.value)} /> <span className="num">{minRel}</span></label>
        <span className="xs muted" style={{ marginLeft: 'auto' }}>{list.length} signals</span>
      </div>

      <Panel flush className="mt-12">
        {list.map((s) => {
          const c = companyById[s.companyId]
          const F = FAMILY[s.family]
          return (
            <div key={s.id} className="list-item clickable" onClick={() => nav(`/company/${c.id}`)}>
              <div className="sig-icon" style={{ color: F.color, background: `${F.color}14`, borderColor: `${F.color}33` }}><F.icon /></div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row between wrap" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 500 }}>{s.title}</span>
                  <span className="xs muted">{ago(s.date)}</span>
                </div>
                <div className="small t2 mt-4">{s.detail}</div>
                <div className="row wrap mt-8" style={{ gap: 6 }}>
                  <span className="tag" style={{ color: F.color }}>{s.type}</span>
                  <span className="tag">{c.name}</span>
                  <span className="tag">Rel {s.relevance}</span>
                  <span className="tag">Mag {s.magnitude}</span>
                  <span className="tag">Conf {s.confidence}%</span>
                  {s.sourceIds.map((id) => <span key={id} className={cx('tag', sourceById[id].type === 'Primary' && 'blue')}>{sourceById[id].name}</span>)}
                  {s.isNew && <span className="tag accent">NEW</span>}
                </div>
              </div>
              <div className="col hide-sm" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button className="btn sm" onClick={() => toast('Signal confirmed — model feedback recorded')}><CheckCircle2 />Confirm</button>
                <button className="btn sm ghost" onClick={() => toast('Marked as noise — relevance model updated')}><ThumbsDown />Noise</button>
              </div>
              <CompanyLogo c={c} />
            </div>
          )
        })}
      </Panel>
      </>)}
    </div>
  )
}
