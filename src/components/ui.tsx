import { CheckCircle2, ExternalLink, FileText, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { companyById, signals, sourceById } from '../data/seed'
import type { Company, Scores } from '../data/types'
import { FAMILY, SCORE_META, STATUS_COLOR, ago, cx, opportunityScore, scoreColor } from '../lib/util'

/* ---------- App state ---------- */
interface AppState {
  toast: (msg: string) => void
  inspect: (companyId: string, key?: keyof Scores) => void
  watch: Set<string>
  toggleWatch: (id: string) => void
  paletteOpen: boolean
  setPaletteOpen: (v: boolean) => void
}
const Ctx = createContext<AppState>(null!)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [insp, setInsp] = useState<{ id: string; key?: keyof Scores } | null>(null)
  const [watch, setWatch] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('bryant.watch') || '["c1","c2","c4","c3","c12"]')) } catch { return new Set(['c1', 'c2', 'c4']) }
  })
  const [paletteOpen, setPaletteOpen] = useState(false)
  const toast = useCallback((m: string) => { setMsg(m); window.setTimeout(() => setMsg(null), 2400) }, [])
  const toggleWatch = useCallback((id: string) => {
    setWatch((w) => {
      const n = new Set(w)
      if (n.has(id)) n.delete(id); else n.add(id)
      try { localStorage.setItem('bryant.watch', JSON.stringify([...n])) } catch { /* ignore */ }
      return n
    })
  }, [])
  const value = useMemo(() => ({ toast, inspect: (id: string, key?: keyof Scores) => setInsp({ id, key }), watch, toggleWatch, paletteOpen, setPaletteOpen }), [toast, watch, toggleWatch, paletteOpen])
  return (
    <Ctx.Provider value={value}>
      {children}
      {insp && <ScoreInspector companyId={insp.id} focus={insp.key} onClose={() => setInsp(null)} />}
      {msg && <div className="toast"><CheckCircle2 />{msg}</div>}
    </Ctx.Provider>
  )
}

/* ---------- Primitives ---------- */
export function Panel({ title, icon, right, children, className, flush, glow }: { title?: ReactNode; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; flush?: boolean; glow?: boolean }) {
  return (
    <section className={cx('panel', glow && 'glow', className)}>
      {title && (
        <header className="panel-head">
          <h3 className="h3">{icon}{title}</h3>
          <div className="spacer" />
          {right}
        </header>
      )}
      <div className={cx('panel-body', flush && 'flush')}>{children}</div>
    </section>
  )
}

export function ScoreRing({ value, size = 42, stroke = 3, invert, label }: { value: number; size?: number; stroke?: number; invert?: boolean; label?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="score-ring" style={{ width: size, height: size }} title={label}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(70,52,28,0.09)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(value, invert)} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.7,.2,1)' }} />
      </svg>
      <span style={{ fontSize: size > 50 ? 16 : 12 }}>{value}</span>
    </div>
  )
}

export function FactorStrip({ s, onClick }: { s: Scores; onClick?: (k: keyof Scores) => void }) {
  return (
    <div className="factor-strip">
      {SCORE_META.map((m) => (
        <i key={m.key} title={`${m.label}: ${s[m.key]}`} onClick={(e) => { e.stopPropagation(); onClick?.(m.key) }}
          style={{ height: `${Math.max(3, (s[m.key] / 100) * 18)}px`, background: scoreColor(s[m.key], m.invert), opacity: 0.9, cursor: onClick ? 'pointer' : undefined }} />
      ))}
    </div>
  )
}

export function Sparkline({ data, w = 90, h = 26, color = 'var(--accent)', fill = true }: { data: number[]; w?: number; h?: number; color?: string; fill?: boolean }) {
  const min = Math.min(...data), max = Math.max(...data)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - ((v - min) / (max - min || 1)) * (h - 4)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')
  const id = `sg${Math.round(data[0] * 1000 + data.length + w)}`
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {fill && <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>}
      {fill && <path d={`${d}L${w},${h}L0,${h}Z`} fill={`url(#${id})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.2} fill={color} />
    </svg>
  )
}

export function CompanyLogo({ c, lg }: { c: Company; lg?: boolean }) {
  const hue = (c.name.charCodeAt(0) * 37 + c.name.charCodeAt(1) * 11) % 360
  return <div className={cx('logo', lg && 'lg')} style={{ background: `linear-gradient(145deg, hsl(${hue} 45% 95%), hsl(${hue} 35% 89%))`, color: `hsl(${hue} 40% 30%)` }}>{c.name[0]}</div>
}

export function StatusTag({ s }: { s: Company['status'] }) {
  return <span className="tag" style={{ color: STATUS_COLOR[s], borderColor: `${STATUS_COLOR[s]}44`, background: `${STATUS_COLOR[s]}14` }}><span className="dot" style={{ background: STATUS_COLOR[s] }} />{s}</span>
}

export function Stat({ label, value, delta, pos, icon }: { label: string; value: ReactNode; delta?: string; pos?: boolean; icon?: ReactNode }) {
  return (
    <div className="panel stat">
      <div className="label">{icon}{label}</div>
      <div className="value">{value}</div>
      {delta && <div className={cx('delta', pos === undefined ? 'muted' : pos ? 'pos' : 'neg')}>{delta}</div>}
    </div>
  )
}

export function Bar({ v, color }: { v: number; color?: string }) {
  return <div className="bar"><i style={{ width: `${v}%`, background: color }} /></div>
}

/* ---------- Score inspector ---------- */
const FACTOR_REASONS: Record<keyof Scores, (c: Company) => string[]> = {
  fit: (c) => [`Sector match: ${c.sector} → ${c.subsector}`, `Size band: ${c.revenue >= 15 ? 'inside' : 'below'} target ($${c.revenue}m est. revenue)`, `Ownership: ${c.ownership}`, `Growth ${c.growth}% vs thesis threshold 15%`],
  signal: (c) => signals.filter((s) => s.companyId === c.id).slice(0, 4).map((s) => `${s.family}: ${s.title}`),
  timing: (c) => c.catalysts.map((x) => `Catalyst — ${x}`),
  access: () => ['2 warm paths mapped (strongest: 0.94 board relationship)', 'Last touch 12 days ago', 'Portfolio-CEO bridge available'],
  evidence: (c) => [`${Math.round(c.scores.evidence / 10)} of 10 core diligence claims sourced`, ...c.missing.map((m) => `Missing — ${m}`)],
  risk: (c) => [...c.risks.map((r) => `Risk — ${r}`), ...c.contradictions.map((r) => `Contradiction — ${r}`)],
  action: (c) => [`Next: ${c.nextAction}`, 'Owner assigned; meeting slot available this week'],
}

function ScoreInspector({ companyId, focus, onClose }: { companyId: string; focus?: keyof Scores; onClose: () => void }) {
  const c = companyById[companyId]
  const total = opportunityScore(c.scores)
  const sigs = signals.filter((s) => s.companyId === c.id).slice(0, 3)
  return (
    <>
      <div className="overlay" style={{ background: 'rgba(40,30,15,.18)', padding: 0 }} onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Score breakdown">
        <div className="drawer-head">
          <CompanyLogo c={c} />
          <div className="grow">
            <div className="eyebrow">Opportunity score · inspectable</div>
            <div className="h2 mt-4">{c.name}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="drawer-body">
          <div className="row" style={{ gap: 16 }}>
            <ScoreRing value={total} size={72} stroke={4} />
            <p className="small t2" style={{ margin: 0 }}>Composite of seven explainable factors — not a probability. Weights reflect the <b className="accent">{c.thesisIds.length > 1 ? 'primary' : 'active'}</b> thesis lens. Click any factor to see evidence.</p>
          </div>
          <div className="col mt-24" style={{ gap: 14 }}>
            {SCORE_META.map((m) => (
              <details key={m.key} open={m.key === (focus ?? 'fit')} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
                <summary style={{ listStyle: 'none', cursor: 'pointer' }}>
                  <div className="row between">
                    <span style={{ fontWeight: 500 }}>{m.label} <span className="faint xs mono">×{m.weight.toFixed(2)}</span></span>
                    <span className="num" style={{ color: scoreColor(c.scores[m.key], m.invert) }}>{c.scores[m.key]}</span>
                  </div>
                  <div className="mt-8"><Bar v={c.scores[m.key]} color={scoreColor(c.scores[m.key], m.invert)} /></div>
                  <div className="xs muted mt-4">{m.q}{m.invert ? ' (lower is better)' : ''}</div>
                </summary>
                <ul style={{ margin: '10px 0 0', paddingLeft: 16, color: 'var(--text-2)', fontSize: 12.5 }}>
                  {FACTOR_REASONS[m.key](c).map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
                </ul>
              </details>
            ))}
          </div>
          <div className="eyebrow mt-24">Supporting evidence</div>
          <div className="col mt-8">
            {sigs.map((s) => (
              <div key={s.id} className="row" style={{ alignItems: 'flex-start' }}>
                <span className="dot" style={{ background: FAMILY[s.family].color, marginTop: 6 }} />
                <div className="grow small">
                  <div>{s.title}</div>
                  <div className="xs muted">{s.sourceIds.map((id) => sourceById[id].name).join(' · ')} · {ago(s.date)} · conf {s.confidence}%</div>
                </div>
              </div>
            ))}
          </div>
          <div className="row mt-24">
            <Link to={`/company/${c.id}`} className="btn primary" onClick={onClose}><ExternalLink />Open investment case</Link>
            <Link to={`/ic/${c.id}`} className="btn" onClick={onClose}><FileText />IC room</Link>
          </div>
        </div>
      </aside>
    </>
  )
}
