import { Bell, Mail, Star } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CompanyLogo, Panel, ScoreRing, StatusTag, useApp } from '../components/ui'
import { companies, signals, theses } from '../data/seed'
import { FAMILY, ago, cx, opportunityScore } from '../lib/util'

const RULES = [
  { name: 'Leadership change in any in-thesis company', on: true, ch: 'Instant' },
  { name: 'Competitor M&A affecting a portfolio company', on: true, ch: 'Instant' },
  { name: 'Warm path opens to a priority target', on: true, ch: 'Daily digest' },
  { name: 'Sponsor hold > 5 years in vertical software', on: false, ch: 'Weekly' },
  { name: 'Distress / litigation on watched companies', on: true, ch: 'Instant' },
  { name: 'Thesis drift exceeds ±0.3', on: true, ch: 'Weekly' },
]

export default function Watchlists() {
  const { watch, toggleWatch, toast } = useApp()
  const nav = useNavigate()
  const [rules, setRules] = useState(RULES)
  const watched = companies.filter((c) => watch.has(c.id))
  const feed = signals.filter((s) => watch.has(s.companyId)).slice(0, 10)
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Star size={11} style={{ verticalAlign: -1 }} /> Feature 16 · Alerts & Watchlists</div>
          <h1 className="h1">Only the changes <em>that matter to you</em>.</h1>
        </div>
      </div>
      <div className="grid g-main">
        <div className="col" style={{ gap: 14 }}>
          <Panel title={`Company watchlist · ${watched.length}`} flush>
            {watched.map((c) => (
              <div key={c.id} className="list-item clickable" onClick={() => nav(`/company/${c.id}`)}>
                <CompanyLogo c={c} />
                <div className="grow"><div style={{ fontWeight: 500 }}>{c.name}</div><div className="xs muted">{c.subsector} · changed {ago(c.lastChange)}</div></div>
                <StatusTag s={c.status} />
                <ScoreRing value={opportunityScore(c.scores)} size={34} />
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); toggleWatch(c.id) }}>Remove</button>
              </div>
            ))}
            {!watched.length && <div className="empty">Bookmark companies from Deal Radar to watch them here.</div>}
          </Panel>
          <Panel title="Watchlist activity" flush>
            {feed.map((s) => {
              const c = companies.find((x) => x.id === s.companyId)!
              return <div key={s.id} className="list-item"><span className="dot" style={{ background: FAMILY[s.family].color, marginTop: 7 }} /><div className="grow"><div className="small">{s.title}</div><div className="xs muted">{c.name} · {ago(s.date)}</div></div></div>
            })}
          </Panel>
        </div>
        <div className="col" style={{ gap: 14 }}>
          <Panel title="Alert rules" icon={<Bell size={14} className="accent" />}>
            <div className="col" style={{ gap: 12 }}>
              {rules.map((r, i) => (
                <div key={r.name} className="row">
                  <button className={cx('switch', r.on && 'on')} onClick={() => setRules((rs) => rs.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} aria-label="toggle"><i /></button>
                  <div className="grow small">{r.name}</div>
                  <span className="xs muted">{r.ch}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Thesis & sector watchlists">
            <div className="col" style={{ gap: 8 }}>{theses.map((t) => <div key={t.id} className="row small"><span className="dot" style={{ background: t.color }} /><span className="grow">{t.name}</span><span className="num xs accent">+{t.newlyQualifying}</span></div>)}</div>
          </Panel>
          <Panel title="Weekly investment brief" icon={<Mail size={14} />} glow>
            <div className="xs muted">Monday 07:00 ET · to deal team</div>
            <p className="serif" style={{ fontSize: 15.5, lineHeight: 1.5 }}>This week: 3 companies entered the top decile, Kestral&apos;s FieldPro acquisition reshapes field-service, and two portfolio initiatives slipped on external signals.</p>
            <button className="btn sm" onClick={() => toast('Preview sent to your inbox (demo)')}>Send preview</button>
          </Panel>
        </div>
      </div>
    </div>
  )
}
