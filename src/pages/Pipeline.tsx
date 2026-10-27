import { ArrowRight, Calculator, KanbanSquare, Mail, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Panel, useApp } from '../components/ui'
import { PIPELINE, fundraise, useFundraise, type PipeItem, type Stage } from '../lib/fund'
import { loadInvestors, type InvestorData } from '../lib/investors'
import { cx } from '../lib/util'

const reached = (p: PipeItem, s: Stage) => p.history.some((h) => PIPELINE.indexOf(h.stage) >= PIPELINE.indexOf(s)) || PIPELINE.indexOf(p.stage) >= PIPELINE.indexOf(s)

export default function Pipeline() {
  const s = useFundraise()
  const nav = useNavigate()
  const { toast } = useApp()
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<Stage | null>(null)
  const [data, setData] = useState<InvestorData | null>(null)
  useEffect(() => { loadInvestors().then(setData) }, [])
  const items = Object.values(s.pipeline)

  const m = useMemo(() => {
    const contacted = items.filter((p) => reached(p, 'Contacted')).length
    const replied = items.filter((p) => reached(p, 'Replied')).length
    const meetings = items.filter((p) => reached(p, 'Meeting')).length
    const soft = items.filter((p) => reached(p, 'Soft-circle')).length
    const committed = items.filter((p) => p.stage === 'Committed').length
    return {
      contacted, replied, meetings, soft, committed,
      replyPer100: contacted ? Math.round((replied / contacted) * 100) : 0,
      meetingsPer100: contacted ? Math.round((meetings / contacted) * 100) : 0,
    }
  }, [items])

  const { agents, analyst, analystMeetings } = s.costs
  const ottoPerMeeting = m.meetings ? agents / m.meetings : null
  const analystPerMeeting = analystMeetings ? analyst / analystMeetings : null
  const minsToShortlist = s.savedAt && s.shortlistAt ? Math.max(0, (Date.parse(s.shortlistAt) - Date.parse(s.savedAt)) / 60000) : null
  const verifiedShare = data ? ((data.meta.verifiedLast90d / data.firms.length) * 100) : null

  const demo = () => {
    // Moves existing pipeline items through stages to preview metrics; only used when the GP asks for it.
    const list = items.slice().sort((a, b) => b.fit - a.fit)
    const plan: Stage[] = ['Committed', 'Soft-circle', 'Meeting', 'Meeting', 'Meeting', 'Replied', 'Replied', 'Replied', 'Contacted', 'Contacted', 'Contacted', 'Contacted', 'Contacted', 'Contacted']
    list.slice(0, plan.length).forEach((p, i) => { for (const st of PIPELINE.slice(1, PIPELINE.indexOf(plan[i]) + 1)) fundraise.move(p.id, st) })
    toast('Demo progress applied to your pipeline')
  }

  if (!items.length) {
    return (
      <div className="page">
        <div className="empty" style={{ padding: 80 }}>
          <KanbanSquare size={28} className="accent" />
          <div className="h2 mt-12">Your LP pipeline is empty</div>
          <p className="small muted">Add LPs from the shortlist, then track them from target to committed.</p>
          <Link to={s.fund ? '/shortlist' : '/fund'} className="btn primary mt-12">{s.fund ? 'Open shortlist' : 'Set up fact base'} <ArrowRight /></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><KanbanSquare size={11} style={{ verticalAlign: -1 }} /> Otto v1 · Step 4 of 4 · Pipeline & outcomes</div>
          <h1 className="h1">Measure meetings booked, <em>not activity</em>.</h1>
        </div>
        <div className="actions">
          <button className="btn ghost sm" onClick={demo} title="Preview metrics by advancing current pipeline items">Preview with demo progress</button>
        </div>
      </div>

      <section className="panel kpi-strip" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }} data-tour="outcomes">
        <Kpi label="Meetings booked" v={String(m.meetings)} sub={`${m.soft} soft-circled · ${m.committed} committed`} />
        <Kpi label="Replies per 100 contacted" v={m.contacted ? String(m.replyPer100) : '—'} sub={`${m.replied} of ${m.contacted} contacted`} />
        <Kpi label="Meetings per 100 contacted" v={m.contacted ? String(m.meetingsPer100) : '—'} sub="Outcome, not effort" />
        <Kpi label="Fact base → 50-LP shortlist" v={minsToShortlist == null ? '—' : minsToShortlist < 1 ? '< 1 min' : `${Math.round(minsToShortlist)} min`} sub="vs. days for manual research" />
        <Kpi label="Records verified (90 days)" v={verifiedShare == null ? '—' : `${verifiedShare.toFixed(1)}%`} sub="Re-verify before outreach" />
      </section>

      <div className="kanban mt-16">
        {PIPELINE.map((st) => {
          const col = items.filter((p) => p.stage === st).sort((a, b) => b.fit - a.fit)
          return (
            <div key={st} className={cx('kcol', over === st && 'over')}
              onDragOver={(e) => { e.preventDefault(); setOver(st) }} onDragLeave={() => setOver(null)}
              onDrop={() => { if (drag) fundraise.move(drag, st); setDrag(null); setOver(null) }}>
              <div className="kcol-head"><span className="small" style={{ fontWeight: 600 }}>{st}</span><span className="nav-badge">{col.length}</span></div>
              <div className="kcol-body">
                {col.map((p) => (
                  <div key={p.id} className="kcard" draggable onDragStart={() => setDrag(p.id)} onDragEnd={() => setDrag(null)}>
                    <div className="row between" style={{ gap: 6 }}>
                      <span className="small ellipsis" style={{ fontWeight: 500 }}>{p.name}</span>
                      <span className="num xs accent">{p.fit}</span>
                    </div>
                    <div className="xs muted ellipsis">{p.type} · {p.region}</div>
                    <div className="row between mt-8">
                      <select className="kselect" value={p.stage} onChange={(e) => fundraise.move(p.id, e.target.value as Stage)}>{PIPELINE.map((x) => <option key={x}>{x}</option>)}</select>
                      <div className="row" style={{ gap: 2 }}>
                        <button className="icon-btn" style={{ width: 24, height: 24 }} title="Outreach draft" onClick={() => nav(`/outreach/${p.id}`)}><Mail size={12} /></button>
                        <button className="icon-btn" style={{ width: 24, height: 24 }} title="Remove" onClick={() => fundraise.remove(p.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Panel title="Cost versus human" icon={<Calculator size={14} className="accent" />} className="mt-16" tour="cost-panel">
        <div className="grid g-main" style={{ gap: 24 }}>
          <div>
            <div className="grid g-3" style={{ gap: 10 }}>
              <label className="field"><span className="xs muted">Otto agents / month ($)</span><input className="input" type="number" value={agents} onChange={(e) => fundraise.setCosts({ agents: Number(e.target.value) })} /></label>
              <label className="field"><span className="xs muted">Analyst / month ($)</span><input className="input" type="number" value={analyst} onChange={(e) => fundraise.setCosts({ analyst: Number(e.target.value) })} /></label>
              <label className="field"><span className="xs muted">Analyst meetings / month</span><input className="input" type="number" value={analystMeetings} onChange={(e) => fundraise.setCosts({ analystMeetings: Number(e.target.value) })} /></label>
            </div>
            <div className="cost-compare mt-16">
              <CostBar label="Otto" value={ottoPerMeeting} max={Math.max(ottoPerMeeting ?? 0, analystPerMeeting ?? 0)} accent />
              <CostBar label="Analyst baseline" value={analystPerMeeting} max={Math.max(ottoPerMeeting ?? 0, analystPerMeeting ?? 0)} />
            </div>
          </div>
          <div>
            <div className="eyebrow">Cost per booked meeting</div>
            <div className="kpi-value mt-8" style={{ fontSize: 34 }}>{ottoPerMeeting ? `$${Math.round(ottoPerMeeting).toLocaleString()}` : '—'}</div>
            <p className="small t2">
              {ottoPerMeeting && analystPerMeeting
                ? ottoPerMeeting < analystPerMeeting
                  ? `${Math.round((1 - ottoPerMeeting / analystPerMeeting) * 100)}% cheaper per meeting than the $${analyst.toLocaleString()}/month analyst baseline.`
                  : `Currently ${Math.round((ottoPerMeeting / analystPerMeeting - 1) * 100)}% more per meeting than the analyst baseline; book ${Math.ceil(agents / analystPerMeeting) - m.meetings} more meeting(s) to break even.`
                : 'Book meetings to see cost per meeting against the analyst baseline.'}
            </p>
            <div className="xs muted">Pricing hypothesis under test: base fee plus a payment per qualified meeting, so DayOne shares the outcome risk.</div>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function Kpi({ label, v, sub }: { label: string; v: string; sub: string }) {
  return <div className="kpi"><div className="xs muted">{label}</div><div className="kpi-value">{v}</div><div className="xs faint">{sub}</div></div>
}

function CostBar({ label, value, max, accent }: { label: string; value: number | null; max: number; accent?: boolean }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <span className="small" style={{ width: 120 }}>{label}</span>
      <div className="grow bar" style={{ height: 10 }}><i style={{ width: value && max ? `${(value / max) * 100}%` : '0%', background: accent ? 'var(--grad)' : 'var(--faint)' }} /></div>
      <span className="num small" style={{ width: 70, textAlign: 'right' }}>{value ? `$${Math.round(value)}` : '—'}</span>
    </div>
  )
}
