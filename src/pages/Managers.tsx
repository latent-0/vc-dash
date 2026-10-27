import { Check, ExternalLink, Minus, RefreshCw, Search, Sparkles, Telescope, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Panel, ScoreRing, useApp } from '../components/ui'
import { LogoMark } from '../components/Logo'
import { streamAsk } from '../lib/ask'
import { timeAgo } from '../lib/live'
import { cx } from '../lib/util'

/* LP workspace: discover and screen managers raising right now (SEC Form D, public data). */

interface Manager {
  id: string; fund: string; cik: string; city: string; state: string; fundType: string; amendment: boolean
  firstSale: string | null; yearInc: string | null; minInvestment: number | null; offering: number | null
  sold: number | null; investors: number | null; fundNumber: number | null; emerging: boolean; filedAt: string; url: string; gpEntity: string | null
}
interface Mandate { lpName: string; types: string[]; keywords: string; emergingPref: 'prefer' | 'neutral' | 'avoid'; ticket: number; maxFund: number }
type MStage = 'Watching' | 'Screening' | 'DDQ' | 'IC' | 'Committed' | 'Passed'
const STAGES: MStage[] = ['Watching', 'Screening', 'DDQ', 'IC', 'Committed', 'Passed']
const FUND_TYPES = ['Venture Capital Fund', 'Private Equity Fund', 'Other Investment Fund', 'Hedge Fund']
const DEFAULT: Mandate = { lpName: 'Family office (example)', types: ['Venture Capital Fund', 'Private Equity Fund'], keywords: 'climate, energy, software, AI, health', emergingPref: 'prefer', ticket: 1, maxFund: 500 }
const KEY = 'otto.lp.v1'

const money = (n: number | null) => (n == null ? '—' : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}bn` : n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}m` : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${n}`)
const KEEP = /^(l\.?p\.?|llc|l\.?l\.?c\.?|gp|ltd|spv|ii|iii|iv|vi|vii|viii|ix|xi|xii|us|uk|ai|de)$/i
const titleCase = (s: string) => s.toLowerCase().replace(/[a-z0-9.]+/gi, (w) => (KEEP.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))

function readStore(): { mandate: Mandate; pipe: Record<string, { stage: MStage; fund: string; at: string }> } {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) return s } catch { /* ignore */ }
  return { mandate: DEFAULT, pipe: {} }
}

interface Fit { score: number; reasons: { ok: boolean | null; text: string }[] }
function fit(m: Manager, d: Mandate): Fit {
  const reasons: Fit['reasons'] = []
  const typeOk = d.types.includes(m.fundType)
  reasons.push({ ok: typeOk, text: typeOk ? `${m.fundType} is inside your mandate` : `${m.fundType} is outside your mandate` })
  const em = d.emergingPref === 'neutral' ? 60 : (m.emerging === (d.emergingPref === 'prefer')) ? 100 : 20
  reasons.push({ ok: d.emergingPref === 'neutral' ? null : m.emerging === (d.emergingPref === 'prefer'), text: m.emerging ? `Emerging manager${m.fundNumber ? ` (Fund ${m.fundNumber})` : ''}` : m.fundNumber ? `Established manager (Fund ${m.fundNumber})` : 'Manager generation not stated' })
  const minOk = m.minInvestment == null || m.minInvestment === 0 ? null : m.minInvestment <= d.ticket * 1e6
  reasons.push({ ok: minOk, text: minOk == null ? 'No minimum commitment disclosed' : `Minimum ${money(m.minInvestment)} ${minOk ? 'fits' : 'exceeds'} your ${money(d.ticket * 1e6)} ticket` })
  const sizeOk = m.offering == null ? null : m.offering <= d.maxFund * 1e6
  reasons.push({ ok: sizeOk, text: m.offering == null ? 'Target size indefinite or undisclosed' : `Target ${money(m.offering)} ${sizeOk ? 'within' : 'above'} your ${money(d.maxFund * 1e6)} fund-size limit` })
  const kws = d.keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
  const kw = kws.find((k) => m.fund.toLowerCase().includes(k))
  reasons.push({ ok: kw ? true : null, text: kw ? `Name signals your theme: “${kw}”` : 'Strategy not evident from the filing; confirm in screening' })
  const pct = m.offering && m.sold != null ? m.sold / m.offering : null
  if (pct != null) reasons.push({ ok: pct < 0.9 ? true : false, text: pct >= 0.9 ? `${Math.round(pct * 100)}% raised: likely closing soon` : `${Math.round(pct * 100)}% of target raised: allocation likely available` })
  const score = Math.round((typeOk ? 40 : 5) + em * 0.2 + (minOk === false ? 0 : minOk ? 15 : 9) + (sizeOk === false ? 0 : sizeOk ? 10 : 6) + (kw ? 15 : 4) + (pct == null ? 3 : pct < 0.9 ? 5 : 0))
  return { score: Math.min(100, score), reasons }
}

export default function Managers() {
  const [store, setStore] = useState(readStore)
  const [items, setItems] = useState<Manager[]>([])
  const [updated, setUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [onlyFit, setOnlyFit] = useState(true)
  const [sel, setSel] = useState<Manager | null>(null)
  const { toast } = useApp()
  const d = store.mandate
  const save = (s: typeof store) => { setStore(s); try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ } }
  const setM = <K extends keyof Mandate>(k: K, v: Mandate[K]) => save({ ...store, mandate: { ...d, [k]: v } })

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/managers')
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      const seen = new Set<string>()
      setItems(j.items.filter((m: Manager) => !seen.has(m.fund) && seen.add(m.fund)))
      setUpdated(j.updatedAt)
    } catch (e) { setErr(String(e).includes('not configured') ? 'SEC access is not configured on this deployment.' : 'Could not reach SEC EDGAR. Try refresh.') }
    setLoading(false)
  }, [])
  useEffect(() => { load(); const t = window.setInterval(load, 600_000); return () => window.clearInterval(t) }, [load])

  const ranked = useMemo(() => items
    .map((m) => ({ m, f: fit(m, d) }))
    .filter(({ m, f }) => (!onlyFit || (d.types.includes(m.fundType) && f.score >= 50)) && (!q || `${m.fund} ${m.city} ${m.state} ${m.fundType}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.f.score - a.f.score), [items, d, onlyFit, q])

  const stats = useMemo(() => ({
    total: items.length,
    vcpe: items.filter((m) => /Venture|Private Equity/.test(m.fundType)).length,
    emerging: items.filter((m) => m.emerging).length,
    raised: items.reduce((a, m) => a + (m.sold ?? 0), 0),
  }), [items])

  const pipe = store.pipe
  const track = (m: Manager, stage: MStage) => { save({ ...store, pipe: { ...pipe, [m.id]: { stage, fund: m.fund, at: new Date().toISOString() } } }); toast(`${titleCase(m.fund)} → ${stage}`) }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Telescope size={11} style={{ verticalAlign: -1 }} /> LP workspace · Manager Discovery</div>
          <h1 className="h1">Managers raising <em>right now</em>, screened against your mandate.</h1>
          <p className="lede">Every pooled fund that filed a Form D with the SEC in the latest batch: fund type, target size, capital raised, LP count and minimum commitment, read straight from the filing.</p>
        </div>
        <div className="actions"><button className="btn" onClick={load} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} />Refresh</button></div>
      </div>

      <section className="panel kpi-strip" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div className="kpi"><div className="xs muted">Pooled funds in latest filings</div><div className="kpi-value">{stats.total || '—'}</div></div>
        <div className="kpi"><div className="xs muted">Venture & private equity</div><div className="kpi-value">{stats.vcpe || '—'}</div></div>
        <div className="kpi"><div className="xs muted">Emerging managers</div><div className="kpi-value">{stats.emerging || '—'}</div></div>
        <div className="kpi"><div className="xs muted">Capital already raised</div><div className="kpi-value">{stats.raised ? money(stats.raised) : '—'}</div></div>
      </section>

      <div className="grid g-main-r mt-16">
        <div className="col" style={{ gap: 14 }}>
          <Panel title="Your mandate" tour="lp-mandate">
            <div className="col" style={{ gap: 12 }}>
              <label className="field"><span className="xs muted">LP name</span><input className="input" value={d.lpName} onChange={(e) => setM('lpName', e.target.value)} /></label>
              <div className="field"><span className="xs muted">Fund types</span>
                <div className="row wrap" style={{ gap: 6 }}>{FUND_TYPES.map((t) => <button key={t} className={cx('chip-btn', d.types.includes(t) && 'on')} onClick={() => setM('types', d.types.includes(t) ? d.types.filter((x) => x !== t) : [...d.types, t])}>{t.replace(' Fund', '')}</button>)}</div>
              </div>
              <label className="field"><span className="xs muted">Themes (comma separated)</span><input className="input" value={d.keywords} onChange={(e) => setM('keywords', e.target.value)} /></label>
              <div className="field"><span className="xs muted">Emerging managers</span>
                <div className="seg">{(['prefer', 'neutral', 'avoid'] as const).map((x) => <button key={x} className={cx(d.emergingPref === x && 'on')} onClick={() => setM('emergingPref', x)}>{x[0].toUpperCase() + x.slice(1)}</button>)}</div>
              </div>
              <div className="grid g-2" style={{ gap: 10 }}>
                <label className="field"><span className="xs muted">Typical ticket ($m)</span><input className="input" type="number" min={0} step={0.25} value={d.ticket} onChange={(e) => setM('ticket', Number(e.target.value))} /></label>
                <label className="field"><span className="xs muted">Max fund size ($m)</span><input className="input" type="number" min={0} value={d.maxFund} onChange={(e) => setM('maxFund', Number(e.target.value))} /></label>
              </div>
              <div className="xs muted">Saved only in this browser.</div>
            </div>
          </Panel>
          <Panel title="My manager pipeline" flush>
            {!Object.keys(pipe).length && <div className="empty small">Track managers from the feed to build your pipeline.</div>}
            {STAGES.map((st) => {
              const list = Object.entries(pipe).filter(([, v]) => v.stage === st)
              return list.length ? (
                <div key={st} style={{ padding: '8px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div className="row between"><span className="xs muted">{st}</span><span className="nav-badge">{list.length}</span></div>
                  {list.map(([id, v]) => <div key={id} className="small ellipsis mt-4">{titleCase(v.fund)}</div>)}
                </div>
              ) : null
            })}
          </Panel>
        </div>

        <Panel
          title={<>Live from SEC EDGAR <span className={cx('live-pill', updated && 'live')}>{updated ? 'LIVE' : loading ? 'CONNECTING' : 'OFFLINE'}</span></>}
          right={<span className="xs muted">{updated ? `Updated ${timeAgo(updated)} · refreshes every 10 min` : ''}</span>}
          flush tour="lp-feed"
        >
          <div className="row wrap" style={{ gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
            <div className="filter-search" style={{ height: 34, flex: '1 1 200px' }}><Search size={14} className="muted" /><input placeholder="Search fund, city, type" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <button className={cx('chip-btn', onlyFit && 'on')} onClick={() => setOnlyFit(!onlyFit)}>Mandate fit only</button>
            <span className="xs muted">{ranked.length} shown</span>
          </div>
          {err && <div className="empty small">{err}</div>}
          {loading && !items.length && <div className="empty"><div className="typing"><i /><i /><i /></div></div>}
          {ranked.map(({ m, f }) => {
            const pct = m.offering && m.sold != null ? Math.min(1, m.sold / m.offering) : null
            return (
              <div key={m.id} className="list-item clickable" onClick={() => setSel(m)}>
                <ScoreRing value={f.score} size={40} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ fontWeight: 500 }} className="ellipsis">{titleCase(m.fund)}</span>
                    {m.emerging && <span className="tag accent" style={{ height: 19 }}>Emerging</span>}
                    {pipe[m.id] && <span className="tag pos" style={{ height: 19 }}>{pipe[m.id].stage}</span>}
                  </div>
                  <div className="xs muted ellipsis">{m.fundType} · {titleCase(m.city)}, {titleCase(m.state)} · filed {timeAgo(m.filedAt)}{m.amendment ? ' · amendment' : ''}</div>
                  <div className="row mt-8" style={{ gap: 14 }}>
                    <Fact k="Target" v={money(m.offering)} />
                    <Fact k="Raised" v={money(m.sold)} />
                    <Fact k="LPs in" v={m.investors == null ? '—' : String(m.investors)} />
                    <Fact k="Min" v={m.minInvestment ? money(m.minInvestment) : '—'} />
                    {pct != null && <div className="raise-bar" title={`${Math.round(pct * 100)}% of target raised`}><i style={{ width: `${pct * 100}%` }} /></div>}
                  </div>
                </div>
              </div>
            )
          })}
          {!loading && !err && items.length > 0 && !ranked.length && <div className="empty small">No managers in the latest filings match your mandate. Loosen it or turn off “Mandate fit only”.</div>}
        </Panel>
      </div>

      {sel && <ManagerDrawer m={sel} f={fit(sel, d)} mandate={d} stage={pipe[sel.id]?.stage} onTrack={(s) => track(sel, s)} onClose={() => setSel(null)} />}
    </div>
  )
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div><div className="xs faint" style={{ lineHeight: 1 }}>{k}</div><div className="num small">{v}</div></div>
}

function ManagerDrawer({ m, f, mandate, stage, onTrack, onClose }: { m: Manager; f: Fit; mandate: Mandate; stage?: MStage; onTrack: (s: MStage) => void; onClose: () => void }) {
  const [qs, setQs] = useState('')
  const [busy, setBusy] = useState(false)
  const screen = async () => {
    setBusy(true); setQs('')
    try {
      await streamAsk({
        mode: 'query',
        question: `You are an LP's investment team preparing a first call with this fund's GP. Using the Form D facts (target size, amount raised, LP count, minimum, vehicle age, fund number) and our mandate, write the 8 sharpest questions to ask the GP, covering team and attribution, track record, strategy and sourcing, portfolio construction, fees and terms, LP base and anchor, close timeline, and governance. Do not restate the mandate check. Order by importance; one line each, referencing filing facts where relevant. Then one sentence on what the filing alone cannot tell us.`,
        context: { filing: { ...m, source: 'SEC EDGAR Form D' }, lpMandate: mandate },
      }, setQs)
    } catch { setQs('Otto is unavailable right now.') }
    setBusy(false)
  }
  return (
    <>
      <div className="overlay" style={{ background: 'rgba(40,30,15,.18)', padding: 0 }} onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className="grow">
            <div className="eyebrow">{m.fundType}{m.emerging ? ' · emerging manager' : ''}</div>
            <div className="h2 mt-4">{titleCase(m.fund)}</div>
            <div className="xs muted mt-4">{titleCase(m.city)}, {titleCase(m.state)} · CIK {m.cik}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="drawer-body">
          <div className="row" style={{ gap: 16 }}>
            <ScoreRing value={f.score} size={64} stroke={4} />
            <div className="small t2">Mandate fit, from the Form D filing and your mandate. Not an investment recommendation.</div>
          </div>
          <ul className="reasons mt-16">
            {f.reasons.map((r) => <li key={r.text}><span className={cx('reason-ic', r.ok === true ? 'ok' : r.ok === false ? 'no' : 'na')}>{r.ok === true ? <Check size={11} /> : r.ok === false ? <X size={11} /> : <Minus size={11} />}</span>{r.text}</li>)}
          </ul>
          <div className="eyebrow mt-24">From the filing</div>
          <dl className="kv mt-8" style={{ gridTemplateColumns: '140px 1fr' }}>
            <dt>Target size</dt><dd>{money(m.offering)}</dd>
            <dt>Raised so far</dt><dd>{money(m.sold)}</dd>
            <dt>Investors in</dt><dd>{m.investors ?? '—'}</dd>
            <dt>Minimum commitment</dt><dd>{m.minInvestment ? money(m.minInvestment) : 'Not stated'}</dd>
            <dt>First sale</dt><dd>{m.firstSale ?? 'Yet to occur'}</dd>
            <dt>Vehicle formed</dt><dd>{m.yearInc ?? '—'}</dd>
            {m.gpEntity && <><dt>General partner</dt><dd>{m.gpEntity}</dd></>}
            <dt>Filing</dt><dd>{m.amendment ? 'Amendment (D/A)' : 'New notice (D)'} · {new Date(m.filedAt).toLocaleString()}</dd>
          </dl>
          <div className="eyebrow mt-24">Track</div>
          <div className="row wrap mt-8" style={{ gap: 6 }}>{STAGES.map((s) => <button key={s} className={cx('chip-btn', stage === s && 'on')} onClick={() => onTrack(s)}>{s}</button>)}</div>
          <div className="row mt-16" style={{ gap: 8 }}>
            <button className="btn primary" onClick={screen} disabled={busy}>{busy ? <RefreshCw className="spin" /> : <Sparkles />}Screening questions</button>
            <a className="btn" href={m.url} target="_blank" rel="noreferrer"><ExternalLink />SEC filing</a>
          </div>
          {(qs || busy) && (
            <div className="row mt-16" style={{ alignItems: 'flex-start', gap: 10 }}>
              <LogoMark size={20} />
              {busy && !qs ? <div className="typing"><i /><i /><i /></div> : <div className="ai-text small" style={{ whiteSpace: 'pre-wrap' }}>{qs.replace(/\*\*/g, '')}{busy && <span className="caret" />}</div>}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
