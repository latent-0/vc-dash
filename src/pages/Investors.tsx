import { ExternalLink, Search, SlidersHorizontal, Sparkles, Users, X } from 'lucide-react'
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Panel } from '../components/ui'
import { LogoMark } from '../components/Logo'
import { streamAsk } from '../lib/ask'
import { cx } from '../lib/util'
import { GlobeFallback } from './Dashboard'
import type { CustomPoint } from '../components/Globe'

const InvestmentGlobe = lazy(() => import('../components/Globe'))

interface Firm {
  id: string; name: string; type: string; city: string; country: string; region: string
  contacts: number; senior: number; roles: string[]; lat?: number; lng?: number; aum?: number; founded?: number
  checkMin?: number; checkMax?: number; focus?: string; about?: string; stage?: string; stages?: string[]; website?: string
  wigo?: { temperature?: string; category?: string; research?: string }
}
interface Data { meta: { firms: number; contacts: number; independentAngels: number; generated: string }; firms: Firm[] }

let cache: Promise<Data> | null = null
const load = () => (cache ??= fetch('/data/investors.json').then((r) => r.json()))

const ANY = 'Any'
const REGIONS = ['North America', 'Europe', 'APAC', 'MENA', 'LatAm']
const STAGES = ['Seed', 'Early stage', 'Growth', 'Buyout', 'Real estate', 'Credit']
const AUM_BANDS: { label: string; min: number; max: number }[] = [
  { label: 'Under $100m', min: 0.01, max: 100 }, { label: '$100m – $1bn', min: 100, max: 1000 },
  { label: '$1bn – $10bn', min: 1000, max: 10000 }, { label: '$10bn+', min: 10000, max: Infinity },
]
const CHEQUES: { label: string; min: number; max: number }[] = [
  { label: 'Under $1m', min: 0, max: 1 }, { label: '$1m – $5m', min: 1, max: 5 }, { label: '$5m – $25m', min: 5, max: 25 }, { label: '$25m+', min: 25, max: Infinity },
]
const FOUNDED: { label: string; test: (y: number) => boolean }[] = [
  { label: 'Before 2000', test: (y) => y < 2000 }, { label: '2000 – 2009', test: (y) => y >= 2000 && y < 2010 }, { label: '2010 or later', test: (y) => y >= 2010 },
]
const SENIOR = [1, 3, 5]
const SORTS: { label: string; fn: (a: Firm, b: Firm) => number }[] = [
  { label: 'Largest AUM', fn: (a, b) => (b.aum ?? 0) - (a.aum ?? 0) },
  { label: 'Most contacts', fn: (a, b) => b.contacts - a.contacts },
  { label: 'Most decision-makers', fn: (a, b) => b.senior - a.senior },
  { label: 'Name A–Z', fn: (a, b) => a.name.localeCompare(b.name) },
  { label: 'Newest firms', fn: (a, b) => (b.founded ?? 0) - (a.founded ?? 0) },
]

const fmtAum = (m?: number) => (!m ? '—' : m >= 1e6 ? `$${(m / 1e6).toFixed(1)}tn` : m >= 1000 ? `$${(m / 1000).toFixed(m >= 10000 ? 0 : 1)}bn` : `$${Math.round(m)}m`)
const fmtCheque = (f: Firm) => (f.checkMin || f.checkMax ? `$${f.checkMin ?? '?'}m – $${f.checkMax ?? '?'}m` : '—')

type Filters = { q: string; type: string; region: string; country: string; stage: string; aum: string; cheque: string; founded: string; senior: string; sort: string }
const EMPTY: Filters = { q: '', type: ANY, region: ANY, country: ANY, stage: ANY, aum: ANY, cheque: ANY, founded: ANY, senior: ANY, sort: SORTS[0].label }
const LABELS: Record<keyof Filters, string> = { q: 'Search', type: 'Type', region: 'Region', country: 'Country', stage: 'Stage', aum: 'AUM', cheque: 'Cheque', founded: 'Founded', senior: 'Decision-makers', sort: 'Sort' }
const MORE: (keyof Filters)[] = ['aum', 'cheque', 'founded', 'senior']

export default function Investors() {
  const [data, setData] = useState<Data | null>(null)
  const [params] = useSearchParams()
  const [f, setF] = useState<Filters>({ ...EMPTY, q: params.get('q') ?? '' })
  const [more, setMore] = useState(false)
  const [limit, setLimit] = useState(60)
  const [sel, setSel] = useState<Firm | null>(null)
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v, ...(k === 'region' ? { country: ANY } : {}) }))

  useEffect(() => { load().then(setData) }, [])
  useEffect(() => { const v = params.get('q'); if (v !== null) setF((x) => ({ ...x, q: v })) }, [params])
  useEffect(() => setLimit(60), [f])

  const countries = useMemo(() => {
    const m = new Map<string, number>()
    data?.firms.forEach((x) => (f.region === ANY || x.region === f.region) && x.country && x.country !== 'Unknown' && m.set(x.country, (m.get(x.country) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [data, f.region])

  const types = useMemo(() => {
    const m = new Map<string, number>()
    data?.firms.forEach((x) => m.set(x.type, (m.get(x.type) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    const ql = f.q.toLowerCase().trim()
    const aum = AUM_BANDS.find((b) => b.label === f.aum)
    const cheque = CHEQUES.find((b) => b.label === f.cheque)
    const founded = FOUNDED.find((b) => b.label === f.founded)
    const sort = SORTS.find((s) => s.label === f.sort) ?? SORTS[0]
    return data.firms.filter((x) =>
      (f.type === ANY || x.type === f.type) &&
      (f.region === ANY || x.region === f.region) &&
      (f.country === ANY || x.country === f.country) &&
      (f.stage === ANY || !!x.stages?.includes(f.stage)) &&
      (!aum || (x.aum != null && x.aum >= aum.min && x.aum < aum.max)) &&
      (!cheque || ((x.checkMin != null || x.checkMax != null) && (x.checkMin ?? 0) < cheque.max && (x.checkMax ?? x.checkMin ?? 0) >= cheque.min)) &&
      (!founded || (x.founded != null && founded.test(x.founded))) &&
      (f.senior === ANY || x.senior >= Number(f.senior)) &&
      (!ql || `${x.name} ${x.city} ${x.country} ${x.type} ${x.focus ?? ''} ${x.about ?? ''}`.toLowerCase().includes(ql)),
    ).sort(sort.fn)
  }, [data, f])

  const active = (Object.keys(f) as (keyof Filters)[]).filter((k) => k !== 'sort' && f[k] !== EMPTY[k])
  const moreCount = active.filter((k) => MORE.includes(k)).length

  const points: CustomPoint[] = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; n: number; c: number; city: string; country: string }>()
    filtered.forEach((x) => {
      if (x.lat == null || x.lng == null) return
      const k = `${x.lat},${x.lng}`
      const e = m.get(k) ?? { lat: x.lat, lng: x.lng, n: 0, c: 0, city: x.city, country: x.country }
      e.n += 1; e.c += x.contacts
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
    contacts: filtered.reduce((a, x) => a + x.contacts, 0),
    senior: filtered.reduce((a, x) => a + x.senior, 0),
    aum: filtered.reduce((a, x) => a + (x.aum ?? 0), 0),
    countries: new Set(filtered.map((x) => x.country).filter((c) => c && c !== 'Unknown')).size,
  }), [filtered])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Users size={11} style={{ verticalAlign: -1 }} /> Investor Network</div>
          <h1 className="h1">{data ? <>{data.meta.contacts.toLocaleString()} relationships, <em>one map</em>.</> : 'Loading investor network…'}</h1>
          <p className="lede">DayOne’s investor databases in one firm-level universe: VCs, private equity, family offices, angels, wealth managers and endowments.</p>
        </div>
      </div>

      <section className="panel kpi-strip" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        <Kpi label="Investor firms" v={stats.firms.toLocaleString()} />
        <Kpi label="Contacts" v={stats.contacts.toLocaleString()} />
        <Kpi label="Decision-makers" v={stats.senior.toLocaleString()} />
        <Kpi label="AUM tracked" v={fmtAum(stats.aum)} />
        <Kpi label="Countries" v={String(stats.countries)} />
      </section>

      <div className="grid g-main mt-16">
        <section className="panel glow" style={{ minHeight: 440, overflow: 'hidden' }}>
          <div className="globe-wrap" style={{ position: 'absolute', inset: 0 }}>
            {data ? <Suspense fallback={<GlobeFallback />}><InvestmentGlobe custom={points} /></Suspense> : <GlobeFallback />}
            <div className="globe-overlay">
              <div className="eyebrow">Investor density · {points.length} cities</div>
              <div className="xs muted">Hover a city for counts · the map follows your filters</div>
            </div>
          </div>
        </section>
        <Panel title="By investor type" flush>
          <div className="type-list">
            {types.slice(0, 12).map(([t, n]) => (
              <button key={t} className={cx('type-row', f.type === t && 'on')} onClick={() => set('type', f.type === t ? ANY : t)}>
                <span className="grow ellipsis small">{t}</span>
                <span className="type-bar"><i style={{ width: `${(n / types[0][1]) * 100}%` }} /></span>
                <span className="num xs" style={{ width: 48, textAlign: 'right' }}>{n.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {/* Filters */}
      <section className="panel filter-bar mt-16" data-tour="investor-filters">
        <div className="filter-row">
          <div className="filter-search">
            <Search size={14} className="muted" />
            <input placeholder="Search firm, city, focus: e.g. energy, Geneva, healthcare" value={f.q} onChange={(e) => set('q', e.target.value)} />
            {f.q && <button onClick={() => set('q', '')} aria-label="Clear search"><X size={13} /></button>}
          </div>
          <Select label="Type" value={f.type} options={types.map(([t]) => t)} onChange={(v) => set('type', v)} />
          <Select label="Region" value={f.region} options={REGIONS} onChange={(v) => set('region', v)} />
          <Select label="Country" value={f.country} options={countries} onChange={(v) => set('country', v)} />
          <Select label="Stage" value={f.stage} options={STAGES} onChange={(v) => set('stage', v)} />
          <button className={cx('btn', (more || moreCount > 0) && 'btn-set')} onClick={() => setMore(!more)}><SlidersHorizontal />More filters{moreCount ? ` · ${moreCount}` : ''}</button>
        </div>
        {more && (
          <div className="filter-row fade-in">
            <Select label="AUM" value={f.aum} options={AUM_BANDS.map((b) => b.label)} onChange={(v) => set('aum', v)} />
            <Select label="Cheque size" value={f.cheque} options={CHEQUES.map((b) => b.label)} onChange={(v) => set('cheque', v)} />
            <Select label="Founded" value={f.founded} options={FOUNDED.map((b) => b.label)} onChange={(v) => set('founded', v)} />
            <Select label="Decision-makers" value={f.senior} options={SENIOR.map(String)} format={(v) => `${v}+`} onChange={(v) => set('senior', v)} />
          </div>
        )}
        <div className="filter-foot">
          <span className="small"><b className="num">{filtered.length.toLocaleString()}</b> <span className="muted">investors</span></span>
          {active.map((k) => (
            <button key={k} className="chip-btn on" onClick={() => set(k, EMPTY[k])}>
              <X />{LABELS[k]}: {k === 'senior' ? `${f[k]}+` : f[k]}
            </button>
          ))}
          {active.length > 0 && <button className="btn ghost sm" onClick={() => setF({ ...EMPTY, sort: f.sort })}>Clear all</button>}
          <div className="grow" />
          <Select label="Sort" value={f.sort} options={SORTS.map((s) => s.label)} onChange={(v) => set('sort', v)} noAny />
        </div>
      </section>

      <div className="grid g-main mt-12">
        <Panel flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Investor</th><th>Type</th><th>Location</th><th className="r">AUM</th><th className="r">Cheque</th><th className="r">Contacts</th></tr></thead>
              <tbody>
                {filtered.slice(0, limit).map((x) => (
                  <tr key={x.id} className="clickable" onClick={() => setSel(x)}>
                    <td style={{ maxWidth: 300 }}><div style={{ fontWeight: 500 }} className="ellipsis">{x.name}</div>{x.focus && <div className="xs muted ellipsis">{x.focus}</div>}</td>
                    <td className="small t2" style={{ whiteSpace: 'nowrap' }}>{x.type}</td>
                    <td className="small t2" style={{ whiteSpace: 'nowrap' }}>{[x.city, x.country].filter(Boolean).join(', ')}</td>
                    <td className="r num small">{fmtAum(x.aum)}</td>
                    <td className="r num small" style={{ whiteSpace: 'nowrap' }}>{fmtCheque(x)}</td>
                    <td className="r num small">{x.contacts}<span className="faint">{x.senior ? ` · ${x.senior} sr` : ''}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > limit && <button className="list-item clickable xs muted" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setLimit((l) => l + 120)}>Show more · {(filtered.length - limit).toLocaleString()} remaining</button>}
          {!filtered.length && <div className="empty">{data ? 'No investors match these filters.' : 'Loading…'}</div>}
        </Panel>
        <div className="col" style={{ gap: 14 }}>
          <AskInvestors firms={filtered} />
          <Panel title="About this data">
            <ul className="clean small">
              <li><span className="dot" style={{ background: 'var(--accent)' }} />Merged from DayOne’s investor databases; duplicate firms are combined.</li>
              <li><span className="dot" style={{ background: 'var(--accent)' }} />{data ? `${data.meta.independentAngels.toLocaleString()} independent angels are counted in totals but not listed as firms.` : 'Independent angels are counted in totals.'}</li>
              <li><span className="dot" style={{ background: 'var(--pos)' }} />Personal contact details stay in the source files; this view is firm-level.</li>
            </ul>
          </Panel>
        </div>
      </div>

      {sel && <FirmDrawer x={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

function Select({ label, value, options, onChange, format, noAny }: { label: string; value: string; options: string[]; onChange: (v: string) => void; format?: (v: string) => string; noAny?: boolean }) {
  return (
    <label className={cx('select', value !== ANY && !noAny && 'set')}>
      <span className="xs muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {!noAny && <option value={ANY}>Any</option>}
        {options.map((o) => <option key={o} value={o}>{format ? format(o) : o}</option>)}
      </select>
    </label>
  )
}

function Kpi({ label, v }: { label: string; v: string }) {
  return <div className="kpi"><div className="xs muted">{label}</div><div className="kpi-value">{v}</div></div>
}

function FirmDrawer({ x, onClose }: { x: Firm; onClose: () => void }) {
  return (
    <>
      <div className="overlay" style={{ background: 'rgba(40,30,15,.18)', padding: 0 }} onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className="grow">
            <div className="eyebrow">{x.type}</div>
            <div className="h2 mt-4">{x.name}</div>
            <div className="xs muted mt-4">{[x.city, x.country].filter(Boolean).join(', ')}{x.founded ? ` · founded ${x.founded}` : ''}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="drawer-body">
          <div className="grid g-3" style={{ gap: 10 }}>
            <div><div className="xs muted">AUM</div><div className="num">{fmtAum(x.aum)}</div></div>
            <div><div className="xs muted">Contacts</div><div className="num">{x.contacts}</div></div>
            <div><div className="xs muted">Decision-makers</div><div className="num">{x.senior}</div></div>
          </div>
          {(x.checkMin || x.checkMax) && <div className="small mt-16"><span className="muted">Cheque size </span>{fmtCheque(x)}</div>}
          {x.stages && <div className="row wrap mt-12" style={{ gap: 6 }}>{x.stages.map((s) => <span key={s} className="tag accent">{s}</span>)}</div>}
          {x.stage && <div className="small mt-8"><span className="muted">Stage </span>{x.stage}</div>}
          {x.focus && <div className="small mt-8"><span className="muted">Focus </span>{x.focus}</div>}
          {x.about && <p className="small t2 mt-16">{x.about}</p>}
          {x.roles.length > 0 && <><div className="eyebrow mt-16">Roles on file</div><div className="row wrap mt-8" style={{ gap: 6 }}>{x.roles.map((r) => <span key={r} className="tag">{r}</span>)}</div></>}
          {x.wigo?.research && (
            <div className="panel mt-16" style={{ padding: 14 }}>
              <div className="eyebrow accent">Research notes</div>
              {x.wigo.category && <div className="small mt-8">{x.wigo.category}</div>}
              <p className="small t2" style={{ marginBottom: 0 }}>{x.wigo.research}</p>
            </div>
          )}
          {x.website && <div className="mt-16"><a className="btn sm" href={`https://${x.website}`} target="_blank" rel="noreferrer"><ExternalLink />{x.website}</a></div>}
        </div>
      </aside>
    </>
  )
}

function AskInvestors({ firms }: { firms: Firm[] }) {
  const [q, setQ] = useState('')
  const [ans, setAns] = useState('')
  const [busy, setBusy] = useState(false)
  const suggestions = ['Which investors should we prioritise for a first close?', 'Where are these investors concentrated, and what does that mean for a roadshow?']
  const ask = async (question: string) => {
    if (!question.trim() || busy) return
    setBusy(true); setAns('')
    const context = {
      totalFirmsInView: firms.length,
      firms: firms.slice(0, 120).map((x) => ({ name: x.name, type: x.type, location: [x.city, x.country].filter(Boolean).join(', '), aumUSDm: x.aum, contacts: x.contacts, decisionMakers: x.senior, focus: x.focus, stages: x.stages, checkUSDm: x.checkMin || x.checkMax ? [x.checkMin, x.checkMax] : undefined, notes: x.wigo?.research })),
    }
    try { await streamAsk({ mode: 'investors', question, context }, setAns) } catch { setAns('Otto is unavailable right now. Try again in a moment.') }
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
