import { ExternalLink, Flame, Search, Sparkles, Users, X } from 'lucide-react'
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Panel } from '../components/ui'
import { LogoMark } from '../components/Logo'
import { streamAsk } from '../lib/ask'
import { cx } from '../lib/util'
import { GlobeFallback } from './Dashboard'
import type { CustomPoint } from '../components/Globe'

const InvestmentGlobe = lazy(() => import('../components/Globe'))

interface Firm {
  id: string; name: string; type: string; lists: string[]; city: string; country: string; region: string
  contacts: number; senior: number; roles: string[]; lat?: number; lng?: number; aum?: number; founded?: number
  checkMin?: number; checkMax?: number; focus?: string; about?: string; stage?: string; website?: string
  wigo?: { temperature?: string; bestBet?: string; shortTerm?: string; longTerm?: string; category?: string; research?: string; verification?: string }
}
interface Data { meta: { firms: number; contacts: number; independentAngels: number; lists: Record<string, number>; generated: string }; firms: Firm[] }

let cache: Promise<Data> | null = null
const load = () => (cache ??= fetch('/data/investors.json').then((r) => r.json()))

const LENSES = ['All lists', 'Wigo Energy', 'BLKBOXX'] as const
const REGIONS = ['All', 'North America', 'Europe', 'APAC', 'MENA', 'LatAm'] as const
const AUM_BANDS: [string, number][] = [['Any AUM', 0], ['$100m+', 100], ['$1bn+', 1000], ['$10bn+', 10000]]
const BET_COLOR: Record<string, string> = { Green: 'var(--pos)', Yellow: 'var(--warn)', Brown: 'var(--faint)' }

const fmtAum = (m?: number) => (!m ? '—' : m >= 1e6 ? `$${(m / 1e6).toFixed(1)}tn` : m >= 1000 ? `$${(m / 1000).toFixed(m >= 10000 ? 0 : 1)}bn` : `$${Math.round(m)}m`)

export default function Investors() {
  const [data, setData] = useState<Data | null>(null)
  const [lens, setLens] = useState<(typeof LENSES)[number]>('All lists')
  const [region, setRegion] = useState<(typeof REGIONS)[number]>('All')
  const [type, setType] = useState('All types')
  const [aum, setAum] = useState(0)
  const [q, setQ] = useState('')
  const [bestOnly, setBestOnly] = useState(false)
  const [limit, setLimit] = useState(60)
  const [sel, setSel] = useState<Firm | null>(null)

  useEffect(() => { load().then(setData) }, [])
  useEffect(() => setLimit(60), [lens, region, type, aum, q, bestOnly])

  const filtered = useMemo(() => {
    if (!data) return []
    const ql = q.toLowerCase().trim()
    return data.firms.filter((f) =>
      (lens === 'All lists' || f.lists.includes(lens)) &&
      (region === 'All' || f.region === region) &&
      (type === 'All types' || f.type === type) &&
      (!aum || (f.aum ?? 0) >= aum) &&
      (!bestOnly || (f.wigo && (f.wigo.bestBet === 'Green' || f.wigo.bestBet === 'Yellow' || f.wigo.temperature !== 'Cold'))) &&
      (!ql || `${f.name} ${f.city} ${f.country} ${f.focus ?? ''} ${f.about ?? ''}`.toLowerCase().includes(ql)))
  }, [data, lens, region, type, aum, q, bestOnly])

  const types = useMemo(() => {
    const m = new Map<string, number>()
    data?.firms.forEach((f) => (lens === 'All lists' || f.lists.includes(lens)) && m.set(f.type, (m.get(f.type) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [data, lens])

  const points: CustomPoint[] = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; n: number; c: number; city: string; country: string }>()
    filtered.forEach((f) => {
      if (f.lat == null || f.lng == null) return
      const k = `${f.lat},${f.lng}`
      const e = m.get(k) ?? { lat: f.lat, lng: f.lng, n: 0, c: 0, city: f.city, country: f.country }
      e.n += 1; e.c += f.contacts
      m.set(k, e)
    })
    const max = Math.max(1, ...[...m.values()].map((e) => e.n))
    return [...m.values()].map((e) => ({
      lat: e.lat, lng: e.lng, size: 0.15 + Math.sqrt(e.n / max) * 1.6,
      color: e.n / max > 0.3 ? '#e0541a' : e.n / max > 0.08 ? '#ec7a1f' : '#f4a524',
      label: `<b>${e.city || e.country}</b><div class="k">${e.n.toLocaleString()} investors · ${e.c.toLocaleString()} contacts</div>`,
    }))
  }, [filtered])

  const stats = useMemo(() => ({
    firms: filtered.length,
    contacts: filtered.reduce((a, f) => a + f.contacts, 0),
    senior: filtered.reduce((a, f) => a + f.senior, 0),
    aum: filtered.reduce((a, f) => a + (f.aum ?? 0), 0),
    hot: filtered.filter((f) => f.wigo && f.wigo.temperature !== 'Cold').length,
  }), [filtered])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Users size={11} style={{ verticalAlign: -1 }} /> Investor Network · DayOne raise databases</div>
          <h1 className="h1">{data ? <>{data.meta.contacts.toLocaleString()} relationships, <em>one map</em>.</> : 'Loading investor network…'}</h1>
          <p className="lede">The Wigo Energy and BLKBOXX investor lists merged into one firm-level universe: VCs, PE, family offices, angels, wealth managers and endowments, with Wigo's fit research layered on top.</p>
        </div>
        <div className="seg" data-tour="investor-lens">{LENSES.map((l) => <button key={l} className={cx(lens === l && 'on')} onClick={() => setLens(l)}>{l}</button>)}</div>
      </div>

      <section className="panel kpi-strip" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        <Kpi label="Investor firms" v={stats.firms.toLocaleString()} />
        <Kpi label="Contacts" v={stats.contacts.toLocaleString()} />
        <Kpi label="Decision-makers" v={stats.senior.toLocaleString()} />
        <Kpi label="AUM tracked" v={fmtAum(stats.aum)} />
        <Kpi label="Wigo hot / warm / fit" v={stats.hot.toLocaleString()} />
      </section>

      <div className="grid g-main mt-16">
        <section className="panel glow" style={{ minHeight: 440, overflow: 'hidden' }}>
          <div className="globe-wrap" style={{ position: 'absolute', inset: 0 }}>
            {data ? <Suspense fallback={<GlobeFallback />}><InvestmentGlobe custom={points} /></Suspense> : <GlobeFallback />}
            <div className="globe-overlay">
              <div className="eyebrow">Investor density · {points.length} cities</div>
              <div className="xs muted">Hover a city for counts · filters update the map</div>
            </div>
          </div>
        </section>
        <Panel title="By investor type" flush>
          <div className="type-list">
            {types.slice(0, 12).map(([t, n]) => (
              <button key={t} className={cx('type-row', type === t && 'on')} onClick={() => setType(type === t ? 'All types' : t)}>
                <span className="grow ellipsis small">{t}</span>
                <span className="type-bar"><i style={{ width: `${(n / types[0][1]) * 100}%` }} /></span>
                <span className="num xs" style={{ width: 48, textAlign: 'right' }}>{n.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="row wrap mt-16" style={{ gap: 10 }}>
        <div className="row" style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
          <Search size={14} className="muted" style={{ position: 'absolute', left: 12 }} />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Search firm, city, focus — e.g. energy, Geneva, seed" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg">{REGIONS.map((r) => <button key={r} className={cx(region === r && 'on')} onClick={() => setRegion(r)}>{r}</button>)}</div>
        <div className="seg">{AUM_BANDS.map(([l, v]) => <button key={l} className={cx(aum === v && 'on')} onClick={() => setAum(v)}>{l}</button>)}</div>
        <button className={cx('chip-btn', bestOnly && 'on')} onClick={() => setBestOnly(!bestOnly)}><Flame />Wigo hot / best bets</button>
        {type !== 'All types' && <button className="chip-btn" onClick={() => setType('All types')}><X />{type}</button>}
      </div>

      <div className="grid g-main mt-12">
        <Panel flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Investor</th><th>Type</th><th>Location</th><th className="r">AUM</th><th className="r">Contacts</th><th>Lists</th><th>Wigo fit</th></tr></thead>
              <tbody>
                {filtered.slice(0, limit).map((f) => (
                  <tr key={f.id} className="clickable" onClick={() => setSel(f)}>
                    <td style={{ maxWidth: 280 }}><div style={{ fontWeight: 500 }} className="ellipsis">{f.name}</div>{f.focus && <div className="xs muted ellipsis">{f.focus}</div>}</td>
                    <td className="small t2" style={{ whiteSpace: 'nowrap' }}>{f.type}</td>
                    <td className="small t2" style={{ whiteSpace: 'nowrap' }}>{[f.city, f.country].filter(Boolean).join(', ')}</td>
                    <td className="r num small">{fmtAum(f.aum)}</td>
                    <td className="r num small">{f.contacts}<span className="faint">{f.senior ? ` · ${f.senior} sr` : ''}</span></td>
                    <td><div className="row" style={{ gap: 4 }}>{f.lists.map((l) => <span key={l} className={cx('tag', l === 'Wigo Energy' ? 'accent' : 'blue')} style={{ height: 19, fontSize: 10 }}>{l === 'Wigo Energy' ? 'Wigo' : 'BLKBOXX'}</span>)}</div></td>
                    <td>{f.wigo ? <FitBadge w={f.wigo} /> : <span className="faint xs">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > limit && <button className="list-item clickable xs muted" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setLimit((l) => l + 120)}>Show more · {(filtered.length - limit).toLocaleString()} remaining</button>}
          {!filtered.length && <div className="empty">{data ? 'No investors match these filters.' : 'Loading…'}</div>}
        </Panel>
        <div className="col" style={{ gap: 14 }}>
          <AskInvestors firms={filtered} lens={lens} />
          <Panel title="About this data">
            <ul className="clean small">
              <li><span className="dot" style={{ background: 'var(--accent)' }} />Merged from the Wigo Energy and BLKBOXX raise databases; duplicates across lists are combined.</li>
              <li><span className="dot" style={{ background: 'var(--accent)' }} />{data ? `${data.meta.independentAngels.toLocaleString()} independent angels are counted in totals but not listed as firms.` : 'Independent angels are counted in totals.'}</li>
              <li><span className="dot" style={{ background: 'var(--pos)' }} />Personal contact details stay in the source files; this view is firm-level.</li>
            </ul>
          </Panel>
        </div>
      </div>

      {sel && <FirmDrawer f={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

function Kpi({ label, v }: { label: string; v: string }) {
  return <div className="kpi"><div className="xs muted">{label}</div><div className="kpi-value">{v}</div></div>
}

function FitBadge({ w }: { w: NonNullable<Firm['wigo']> }) {
  const hot = w.temperature && w.temperature !== 'Cold'
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className="dot" title={`Best bet: ${w.bestBet}`} style={{ background: BET_COLOR[w.bestBet ?? 'Brown'] }} />
      <span className={cx('xs', hot ? 'neg' : 'muted')}>{w.temperature ?? 'Cold'}</span>
    </span>
  )
}

function FirmDrawer({ f, onClose }: { f: Firm; onClose: () => void }) {
  return (
    <>
      <div className="overlay" style={{ background: 'rgba(40,30,15,.18)', padding: 0 }} onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className="grow">
            <div className="eyebrow">{f.type}</div>
            <div className="h2 mt-4">{f.name}</div>
            <div className="xs muted mt-4">{[f.city, f.country].filter(Boolean).join(', ')}{f.founded ? ` · founded ${f.founded}` : ''}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="drawer-body">
          <div className="grid g-3" style={{ gap: 10 }}>
            <div><div className="xs muted">AUM</div><div className="num">{fmtAum(f.aum)}</div></div>
            <div><div className="xs muted">Contacts</div><div className="num">{f.contacts}</div></div>
            <div><div className="xs muted">Decision-makers</div><div className="num">{f.senior}</div></div>
          </div>
          {(f.checkMin || f.checkMax) && <div className="small mt-16"><span className="muted">Cheque size </span>${f.checkMin ?? '?'}m – ${f.checkMax ?? '?'}m</div>}
          {f.stage && <div className="small mt-8"><span className="muted">Stage </span>{f.stage}</div>}
          {f.focus && <div className="small mt-8"><span className="muted">Focus </span>{f.focus}</div>}
          {f.about && <p className="small t2 mt-16">{f.about}</p>}
          {f.roles.length > 0 && <><div className="eyebrow mt-16">Roles on file</div><div className="row wrap mt-8" style={{ gap: 6 }}>{f.roles.map((r) => <span key={r} className="tag">{r}</span>)}</div></>}
          {f.wigo && (
            <div className="panel mt-16" style={{ padding: 14 }}>
              <div className="eyebrow accent">Wigo Energy research</div>
              <div className="row wrap mt-8" style={{ gap: 6 }}>
                <span className="tag">Temperature · {f.wigo.temperature}</span>
                <span className="tag" style={{ color: BET_COLOR[f.wigo.shortTerm ?? 'Brown'] }}>30–60d · {f.wigo.shortTerm}</span>
                <span className="tag" style={{ color: BET_COLOR[f.wigo.longTerm ?? 'Brown'] }}>180d+ · {f.wigo.longTerm}</span>
              </div>
              {f.wigo.category && <div className="small mt-8">{f.wigo.category}</div>}
              {f.wigo.research && <p className="small t2" style={{ marginBottom: 0 }}>{f.wigo.research}</p>}
            </div>
          )}
          <div className="row mt-16 wrap">
            {f.lists.map((l) => <span key={l} className="tag accent">On {l} list</span>)}
            {f.website && <a className="btn sm" href={`https://${f.website}`} target="_blank" rel="noreferrer"><ExternalLink />{f.website}</a>}
          </div>
        </div>
      </aside>
    </>
  )
}

function AskInvestors({ firms, lens }: { firms: Firm[]; lens: string }) {
  const [q, setQ] = useState('')
  const [ans, setAns] = useState('')
  const [busy, setBusy] = useState(false)
  const suggestions = lens === 'Wigo Energy'
    ? ['Which investors are the best short-term fit for a $7M Wigo seed?', 'Summarise why most energy funds were ruled out']
    : ['Which family offices should we prioritise for a first close?', 'Where are investors most concentrated and what does that mean for roadshow planning?']
  const ask = async (question: string) => {
    if (!question.trim() || busy) return
    setBusy(true); setAns('')
    const top = [...firms].sort((a, b) => (b.wigo ? 1 : 0) - (a.wigo ? 1 : 0) || (b.aum ?? 0) - (a.aum ?? 0)).slice(0, 120)
    const context = {
      lens, totalFirmsInView: firms.length,
      firms: top.map((f) => ({ name: f.name, type: f.type, location: [f.city, f.country].filter(Boolean).join(', '), aumUSDm: f.aum, contacts: f.contacts, decisionMakers: f.senior, focus: f.focus, stage: f.stage, checkUSDm: f.checkMin || f.checkMax ? [f.checkMin, f.checkMax] : undefined, lists: f.lists, wigo: f.wigo })),
    }
    try {
      await streamAsk({ mode: 'investors', question, context }, setAns)
    } catch { setAns('Otto is unavailable right now. Try again in a moment.') }
    setBusy(false)
  }
  return (
    <Panel title="Ask Otto about these investors" icon={<Sparkles size={14} className="accent" />} glow>
      <form className="row" onSubmit={(e) => { e.preventDefault(); ask(q) }}>
        <input className="input" placeholder="e.g. Who should we call first?" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn primary" type="submit" disabled={busy}>Ask</button>
      </form>
      {!ans && !busy && <div className="col mt-12" style={{ gap: 6 }}>{suggestions.map((s) => <button key={s} className="chip-btn" style={{ borderRadius: 8 }} onClick={() => { setQ(s); ask(s) }}><Sparkles />{s}</button>)}</div>}
      {(ans || busy) && (
        <div className="row mt-12" style={{ alignItems: 'flex-start', gap: 10 }}>
          <LogoMark size={20} />
          {busy && !ans ? <div className="typing"><i /><i /><i /></div> : <div className="ai-text small" style={{ whiteSpace: 'pre-wrap' }}>{ans.replace(/\*\*/g, '')}{busy && <span className="caret" />}</div>}
        </div>
      )}
    </Panel>
  )
}
