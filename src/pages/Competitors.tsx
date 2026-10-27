import { Crosshair, ExternalLink, Plus, RefreshCw, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Panel } from '../components/ui'
import { LogoMark } from '../components/Logo'
import { SECTORS, useFundraise } from '../lib/fund'
import { streamAsk } from '../lib/ask'
import { timeAgo } from '../lib/live'
import { cx } from '../lib/util'

type Move = string
interface Item { id: string; competitor: string; move: Move; threat: 'High' | 'Medium' | 'Low'; title: string; source: string; url: string; date: string }

const DEFAULT_WATCH = ['Waystar (healthcare)', 'AKASA (healthcare AI)', 'Finix (payments)', 'Payabli (payments)', 'ServiceTrade (field service)', 'Formant (robotics)', 'InOrbit (robots)']
const KEY = 'otto.competitors.watch'
const REFRESH_MS = 180_000
const THREAT_TONE = { High: 'neg', Medium: 'warn', Low: '' } as const
const MOVE_COLOR: Record<string, string> = {
  Funding: '#2e8657', 'M&A': '#c2463a', Pricing: '#c2463a', Product: '#3d6fb2', Partnership: '#7a5fc0', Leadership: '#e2711d',
  Hiring: '#2b8a82', Layoffs: '#a87420', Legal: '#a87420', 'Fund close': '#c2463a', 'Fund launch': '#e2711d', 'Form D': '#3d6fb2', News: '#8a8276',
}

export default function Competitors() {
  const s = useFundraise()
  const [lens, setLens] = useState<'funds' | 'companies'>(s.fund ? 'funds' : 'companies')
  const [watch, setWatch] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') ?? DEFAULT_WATCH } catch { return DEFAULT_WATCH } })
  const [add, setAdd] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [updated, setUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [move, setMove] = useState('All')
  const [sectorOnly, setSectorOnly] = useState(false)
  const sectors = s.fund?.sectors.length ? s.fund.sectors : ['Software & SaaS', 'AI & data']

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(watch)) } catch { /* ignore */ } }, [watch])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = lens === 'funds' ? `lens=funds&sectors=${encodeURIComponent(sectors.join('|'))}` : `lens=companies&names=${encodeURIComponent(watch.join('|'))}`
      const r = await fetch(`/api/competitors?${q}`)
      const d = await r.json()
      if (r.ok) { setItems(d.items); setUpdated(d.updatedAt) }
    } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens, watch.join('|'), sectors.join('|')])

  useEffect(() => { setItems([]); setMove('All'); load(); const t = window.setInterval(load, REFRESH_MS); return () => window.clearInterval(t) }, [load])

  const sectorRx = useMemo(() => SECTORS.filter((x) => sectors.includes(x.label)).map((x) => x.rx), [sectors])
  const isSector = (t: string) => sectorRx.some((rx) => rx.test(t))
  const shown = items.filter((x) => (move === 'All' || x.move === move) && (!sectorOnly || isSector(x.title)))
  const moves = useMemo(() => { const m = new Map<string, number>(); items.forEach((x) => m.set(x.move, (m.get(x.move) ?? 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]) }, [items])
  const byCompetitor = useMemo(() => {
    if (lens !== 'companies') return []
    return watch.map((w) => {
      const name = w.replace(/\s*\(.*\)\s*$/, '')
      const its = items.filter((x) => x.competitor === name)
      const high = its.filter((x) => x.threat === 'High').length
      const days = Array.from({ length: 14 }, (_, d) => its.filter((x) => Math.floor((Date.now() - Date.parse(x.date)) / 86400000) === 13 - d).length)
      return { name, w, n: its.length, high, days, latest: its[0] }
    }).sort((a, b) => b.high - a.high || b.n - a.n)
  }, [items, watch, lens])

  const fundStats = useMemo(() => {
    if (lens !== 'funds') return null
    const formD = items.filter((x) => x.move === 'Form D')
    return { closes: items.filter((x) => x.move === 'Fund close').length, launches: items.filter((x) => x.move === 'Fund launch').length, formD: formD.length, sector: items.filter((x) => isSector(x.title)).length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, lens])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Crosshair size={11} style={{ verticalAlign: -1 }} /> Competitor Watch · realtime</div>
          <h1 className="h1">Know who is moving <em>before your LPs do</em>.</h1>
          <p className="lede">{lens === 'funds' ? 'Other managers raising in your strategy right now: fund closes and launches in the news, plus new pooled-fund Form D filings at the SEC.' : 'Funding, M&A, pricing, product and leadership moves from portfolio competitors, classified and scored as they break.'}</p>
        </div>
        <div className="actions">
          <div className="seg" data-tour="competitor-lens">
            <button className={cx(lens === 'funds' && 'on')} onClick={() => setLens('funds')}>Competing funds</button>
            <button className={cx(lens === 'companies' && 'on')} onClick={() => setLens('companies')}>Portfolio competitors</button>
          </div>
          <button className="btn" onClick={load} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} />Refresh</button>
        </div>
      </div>

      {lens === 'funds' && fundStats && (
        <section className="panel kpi-strip" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          <Kpi label="Fund closes · 30d" v={fundStats.closes} />
          <Kpi label="Fund launches · 30d" v={fundStats.launches} />
          <Kpi label="Pooled-fund Form D filings · latest" v={fundStats.formD} />
          <Kpi label={`Mentions your sectors`} v={fundStats.sector} />
        </section>
      )}

      {lens === 'companies' && (
        <Panel title="Watchlist" right={<span className="xs muted">Add context in brackets to disambiguate, e.g. “Formant (robotics)”</span>}>
          <div className="row wrap" style={{ gap: 6 }}>
            {watch.map((w) => <span key={w} className="chip-btn on">{w}<button onClick={() => setWatch(watch.filter((x) => x !== w))} aria-label={`Remove ${w}`}><X size={11} /></button></span>)}
            <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); const v = add.trim(); if (v && !watch.includes(v)) setWatch([...watch, v].slice(0, 12)); setAdd('') }}>
              <input className="input" style={{ height: 30, width: 220 }} placeholder="Add competitor…" value={add} onChange={(e) => setAdd(e.target.value)} />
              <button className="btn sm" type="submit"><Plus />Add</button>
            </form>
          </div>
          <div className="comp-grid mt-16">
            {byCompetitor.map((c) => (
              <div key={c.w} className="comp-card">
                <div className="row between"><span className="small" style={{ fontWeight: 600 }}>{c.name}</span>{c.high > 0 ? <span className="tag neg" style={{ height: 19 }}>{c.high} high</span> : <span className="xs muted">{c.n} moves</span>}</div>
                <div className="spark-bars mt-8">{c.days.map((d, i) => <i key={i} style={{ height: `${4 + d * 7}px`, opacity: d ? 1 : 0.25 }} />)}</div>
                <div className="xs t2 ellipsis mt-8">{c.latest ? c.latest.title : loading ? 'Scanning…' : 'No moves in 14 days'}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid g-main mt-16">
        <Panel
          title={<>Live feed <span className={cx('live-pill', updated && 'live')}>{updated ? 'LIVE' : 'CONNECTING'}</span></>}
          right={<span className="xs muted">{updated ? `Updated ${timeAgo(updated)} · refreshes every 3 min` : ''}</span>}
          flush tour="competitor-feed"
        >
          <div className="row wrap" style={{ gap: 6, padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
            <button className={cx('chip-btn', move === 'All' && 'on')} onClick={() => setMove('All')}>All · {items.length}</button>
            {moves.map(([m, n]) => <button key={m} className={cx('chip-btn', move === m && 'on')} onClick={() => setMove(m)}><span className="dot" style={{ background: MOVE_COLOR[m] ?? 'var(--faint)' }} />{m} · {n}</button>)}
            {lens === 'funds' && <button className={cx('chip-btn', sectorOnly && 'on')} onClick={() => setSectorOnly(!sectorOnly)}>Only my sectors</button>}
          </div>
          {loading && !items.length && <div className="empty"><div className="typing"><i /><i /><i /></div></div>}
          {!loading && !shown.length && <div className="empty small">No moves match.</div>}
          {shown.slice(0, 60).map((x) => (
            <a key={x.id} href={x.url} target="_blank" rel="noreferrer" className="list-item clickable compact">
              <span className="move-pill" style={{ color: MOVE_COLOR[x.move], background: `${MOVE_COLOR[x.move] ?? '#8a8276'}14`, borderColor: `${MOVE_COLOR[x.move] ?? '#8a8276'}33` }}>{x.move}</span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="small ellipsis">{x.title}</div>
                <div className="xs muted">{lens === 'companies' ? `${x.competitor} · ` : ''}{x.source} · {timeAgo(x.date)}{lens === 'funds' && isSector(x.title) ? ' · matches your sectors' : ''}</div>
              </div>
              <span className={cx('tag', THREAT_TONE[x.threat])} style={{ height: 19 }}>{x.threat}</span>
              <ExternalLink size={12} className="faint" />
            </a>
          ))}
        </Panel>
        <CompetitorBrief items={shown} lens={lens} fundName={s.fund?.fundName} sectors={sectors} />
      </div>
    </div>
  )
}

function Kpi({ label, v }: { label: string; v: number }) {
  return <div className="kpi"><div className="xs muted">{label}</div><div className="kpi-value">{v}</div></div>
}

function CompetitorBrief({ items, lens, fundName, sectors }: { items: Item[]; lens: string; fundName?: string; sectors: string[] }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true); setText('')
    const question = lens === 'funds'
      ? `Brief an emerging GP${fundName ? ` raising ${fundName}` : ''} (sectors: ${sectors.join(', ')}) on competing funds raising now. What does this mean for LP outreach timing and positioning? 4 bullets max.`
      : 'Summarise the most important competitor moves for our portfolio companies and the implication of each for us. 4 bullets max, highest threat first.'
    try {
      await streamAsk({ mode: 'query', question, context: { competitorMoves: items.slice(0, 40).map((x) => ({ competitor: x.competitor, move: x.move, threat: x.threat, title: x.title, source: x.source, date: x.date.slice(0, 10) })) } }, setText)
    } catch { setText('Otto is unavailable right now.') }
    setBusy(false)
  }
  return (
    <Panel title="Otto brief" icon={<Sparkles size={14} className="accent" />} glow>
      <p className="small t2" style={{ marginTop: 0 }}>{lens === 'funds' ? 'What competing raises mean for your LP outreach.' : 'The moves that matter and what to do about them.'}</p>
      <button className="btn primary" onClick={run} disabled={busy || !items.length}>{busy ? <RefreshCw className="spin" /> : <Sparkles />}Generate brief from {items.length} moves</button>
      {(text || busy) && (
        <div className="row mt-16" style={{ alignItems: 'flex-start', gap: 10 }}>
          <LogoMark size={20} />
          {busy && !text ? <div className="typing"><i /><i /><i /></div> : <div className="ai-text small" style={{ whiteSpace: 'pre-wrap' }}>{text.replace(/\*\*/g, '')}{busy && <span className="caret" />}</div>}
        </div>
      )}
    </Panel>
  )
}
