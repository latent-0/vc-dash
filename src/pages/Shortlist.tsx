import { ArrowRight, Check, ChevronDown, Clock, ListChecks, Mail, Minus, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Panel, ScoreRing, useApp } from '../components/ui'
import { fitScore, fundraise, useFundraise, type Fit } from '../lib/fund'
import { confColor, confLabel, fmtAum, loadInvestors, type Firm, type InvestorData } from '../lib/investors'
import { cx } from '../lib/util'
import { Prov } from '../components/Prov'

const SIZES = [25, 50, 100]

export default function Shortlist() {
  const s = useFundraise()
  const [data, setData] = useState<InvestorData | null>(null)
  const [size, setSize] = useState(50)
  const [minConf, setMinConf] = useState(50)
  const [open, setOpen] = useState<string | null>(null)
  const { toast } = useApp()
  const nav = useNavigate()
  useEffect(() => { loadInvestors().then(setData) }, [])

  const ranked = useMemo(() => {
    if (!data || !s.fund) return []
    return data.firms
      .filter((f) => f.senior > 0 && f.prov.conf >= minConf)
      .map((f) => ({ f, fit: fitScore(f, s.fund!) }))
      .sort((a, b) => b.fit.score - a.fit.score)
  }, [data, s.fund, minConf])
  const list = ranked.slice(0, size)
  useEffect(() => { if (list.length) fundraise.markShortlist() }, [list.length])

  if (!s.fund) {
    return (
      <div className="page">
        <div className="empty" style={{ padding: 80 }}>
          <ListChecks size={28} className="accent" />
          <div className="h2 mt-12">Start with your fund fact base</div>
          <p className="small muted">Otto scores LPs against your strategy, stage, sectors, geography and ticket size.</p>
          <Link to="/fund" className="btn primary mt-12">Set up fact base <ArrowRight /></Link>
        </div>
      </div>
    )
  }

  const inPipe = (id: string) => !!s.pipeline[id]
  const mins = s.savedAt && s.shortlistAt ? Math.max(0, (Date.parse(s.shortlistAt) - Date.parse(s.savedAt)) / 60000) : 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><ListChecks size={11} style={{ verticalAlign: -1 }} /> Otto v1 · Step 2 of 4 · LP shortlist</div>
          <h1 className="h1">{size} LPs for <em>{s.fund.fundName}</em>.</h1>
          <p className="lede">Ranked from {data ? data.firms.length.toLocaleString() : '…'} firms by fit with your fact base. Every score comes with its reasons and the record’s provenance.</p>
        </div>
        <div className="actions">
          <div className="seg">{SIZES.map((n) => <button key={n} className={cx(size === n && 'on')} onClick={() => setSize(n)}>Top {n}</button>)}</div>
          <button className="btn primary" onClick={() => { list.forEach(({ f, fit }) => fundraise.add(f, fit.score)); toast(`${list.length} LPs added to pipeline`) }}><Plus />Add all to pipeline</button>
        </div>
      </div>

      <section className="panel kpi-strip" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div className="kpi"><div className="xs muted"><Clock size={11} style={{ verticalAlign: -1 }} /> Fact base → shortlist</div><div className="kpi-value">{mins < 1 ? '< 1 min' : `${Math.round(mins)} min`}</div></div>
        <div className="kpi"><div className="xs muted">Median fit (shortlist)</div><div className="kpi-value">{list.length ? list[Math.floor(list.length / 2)].fit.score : '—'}</div></div>
        <div className="kpi"><div className="xs muted">High-confidence records</div><div className="kpi-value">{list.filter(({ f }) => f.prov.conf >= 80).length}<span className="small muted"> / {list.length}</span></div></div>
        <div className="kpi"><div className="xs muted">In pipeline</div><div className="kpi-value">{list.filter(({ f }) => inPipe(f.id)).length}</div></div>
      </section>

      <div className="row wrap mt-16" style={{ gap: 10 }}>
        <span className="xs muted">Minimum data confidence</span>
        <div className="seg">{[30, 50, 70, 80].map((c) => <button key={c} className={cx(minConf === c && 'on')} onClick={() => setMinConf(c)}>{c === 30 ? 'Any' : `${c}+`}</button>)}</div>
        <span className="xs muted">Only firms with at least one decision-maker on file are scored.</span>
      </div>

      <Panel flush className="mt-12">
        {!data && <div className="empty"><div className="typing"><i /><i /><i /></div></div>}
        {list.map(({ f, fit }, i) => (
          <LpRow key={f.id} i={i} f={f} fit={fit} open={open === f.id} onToggle={() => setOpen(open === f.id ? null : f.id)} inPipe={inPipe(f.id)}
            onAdd={() => { fundraise.add(f, fit.score); toast(`${f.name} added to pipeline`) }}
            onDraft={() => { fundraise.add(f, fit.score); nav(`/outreach/${f.id}`) }} />
        ))}
      </Panel>
    </div>
  )
}

function LpRow({ f, fit, i, open, onToggle, inPipe, onAdd, onDraft }: { f: Firm; fit: Fit; i: number; open: boolean; onToggle: () => void; inPipe: boolean; onAdd: () => void; onDraft: () => void }) {
  const top = fit.reasons.filter((r) => r.ok).slice(0, 2)
  return (
    <div className={cx('lp-row', open && 'open')}>
      <div className="lp-main" onClick={onToggle}>
        <span className="num xs faint" style={{ width: 22 }}>{i + 1}</span>
        <ScoreRing value={fit.score} size={40} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 8 }}><span style={{ fontWeight: 500 }} className="ellipsis">{f.name}</span><span className="tag" style={{ height: 19, fontSize: 10.5 }}>{f.type}</span></div>
          <div className="xs muted ellipsis">{[f.city, f.country].filter(Boolean).join(', ')} · AUM {fmtAum(f.aum)} · {f.senior} decision-maker{f.senior === 1 ? '' : 's'}</div>
          <div className="xs t2 ellipsis mt-4">{top.map((r) => r.text).join(' · ') || 'Generalist profile'}</div>
        </div>
        <Prov f={f} />
        <div className="row" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
          {inPipe ? <span className="tag pos"><Check />In pipeline</span> : <button className="btn sm" onClick={onAdd}><Plus />Pipeline</button>}
          <button className="btn sm primary" onClick={onDraft}><Mail />Draft</button>
        </div>
        <ChevronDown size={15} className="faint" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
      </div>
      {open && (
        <div className="lp-detail fade-in">
          <div>
            <div className="eyebrow">Why this score</div>
            <ul className="reasons">
              {fit.reasons.map((r) => (
                <li key={r.text}><span className={cx('reason-ic', r.ok === true ? 'ok' : r.ok === false ? 'no' : 'na')}>{r.ok === true ? <Check size={11} /> : r.ok === false ? <X size={11} /> : <Minus size={11} />}</span>{r.text}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="eyebrow">Record provenance</div>
            <dl className="kv mt-8" style={{ gridTemplateColumns: '110px 1fr' }}>
              <dt>Source</dt><dd>{f.prov.src.map((x) => `DayOne LP database ${x}`).join(' + ')}</dd>
              <dt>Last verified</dt><dd>{f.prov.verified ?? <span className="warn">Not verified</span>}</dd>
              <dt>Confidence</dt><dd style={{ color: confColor(f.prov.conf) }}>{confLabel(f.prov.conf)} ({f.prov.conf})</dd>
            </dl>
            {(f.focus || f.about) && <p className="xs t2" style={{ marginBottom: 0 }}>{f.focus ?? f.about}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
