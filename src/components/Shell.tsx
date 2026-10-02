import {
  Activity, ArrowRight, Bell, BookMarked, Brain, Building, Compass, Gauge, Globe2, Home, Landmark, LogOut, Map, Menu, MessageSquareText,
  Network, Radar, Search, Sparkles, Star, TrendingUp, Telescope,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { FIRM, companies, me, signals, sponsors, theses } from '../data/seed'
import { cx } from '../lib/util'
import { timeAgo, useLive } from '../lib/live'
import { LogoMark } from './Logo'
import { useApp } from './ui'

const NAV: { label: string; items: { to: string; label: string; icon: typeof Home; badge?: string; hot?: boolean }[] }[] = [
  { label: 'Intelligence', items: [
    { to: '/', label: 'Morning Brief', icon: Home },
    { to: '/thesis', label: 'Thesis Engine', icon: Map, badge: String(theses.length) },
    { to: '/signals', label: 'Signal Engine', icon: Activity, badge: String(signals.filter((s) => s.isNew).length), hot: true },
    { to: '/radar', label: 'Deal Radar', icon: Radar },
    { to: '/query', label: 'Universal Query', icon: Sparkles },
  ] },
  { label: 'Deal work', items: [
    { to: '/relationships', label: 'Relationship Graph', icon: Network },
    { to: '/diligence', label: 'Diligence Copilot', icon: MessageSquareText },
    { to: '/ic', label: 'IC Room', icon: Landmark, badge: '2' },
    { to: '/memory', label: 'Decision Memory', icon: Brain },
  ] },
  { label: 'Portfolio', items: [
    { to: '/portfolio', label: 'Portfolio Watchtower', icon: Telescope },
    { to: '/value', label: 'Value Creation Radar', icon: TrendingUp },
    { to: '/exit', label: 'Exit Intelligence', icon: Compass },
  ] },
  { label: 'Market', items: [
    { to: '/sponsors', label: 'Sponsors & Buyers', icon: Building },
    { to: '/watchlists', label: 'Watchlists & Alerts', icon: Star },
  ] },
]
const ALL_NAV = NAV.flatMap((g) => g.items)

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { setPaletteOpen, paletteOpen } = useApp()
  const loc = useLocation()
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setOpen(false); contentRef.current?.scrollTo({ top: 0 }) }, [loc.pathname])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [setPaletteOpen])
  const current = ALL_NAV.find((n) => (n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to)))
  const crumb = loc.pathname.startsWith('/company/') ? 'Company Intelligence' : current?.label ?? 'Otto'

  return (
    <div className="shell">
      <aside className={cx('sidebar', open && 'open')}>
        <div className="brand">
          <LogoMark size={30} />
          <div>
            <div className="wordmark" style={{ fontSize: 17, letterSpacing: '0.3em' }}>DAYONE</div>
            <div className="brand-sub">Otto Intelligence</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((g) => (
            <div className="nav-group" key={g.label}>
              <div className="nav-label">{g.label}</div>
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.to === '/'} className={({ isActive }) => cx('nav-item', isActive && 'active')}>
                  <it.icon />{it.label}
                  {it.badge && <span className={cx('nav-badge', it.hot && 'hot')}>{it.badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">{me.initials}</div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="small ellipsis" style={{ fontWeight: 500 }}>{me.name}</div>
            <div className="xs muted ellipsis">{FIRM.fund}</div>
          </div>
          <button className="icon-btn" title="Sign out (demo)"><LogOut /></button>
        </div>
      </aside>
      {open && <div className="overlay" style={{ zIndex: 35, padding: 0 }} onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Menu"><Menu /></button>
          <div className="crumbs hide-sm"><span>{FIRM.short}</span><span className="faint">/</span><b>{crumb}</b></div>
          <button className="search-trigger" onClick={() => setPaletteOpen(true)}>
            <Search /> <span className="ellipsis">Ask anything — companies, signals, people, theses…</span><span className="kbd hide-sm">Ctrl K</span>
          </button>
          <LiveStatus />
          <NavLink to="/watchlists" className="icon-btn" aria-label="Alerts"><Bell /><span className="dot" /></NavLink>
        </header>
        <div className="content" ref={contentRef}>{children}</div>
      </div>
      {paletteOpen && <Palette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}

function LiveStatus() {
  const live = useLive()
  if (live.status !== 'live') return <span className="live-dot hide-sm" style={{ opacity: 0.6 }}>{live.status === 'loading' ? 'CONNECTING' : 'OFFLINE'}</span>
  return <NavLink to="/signals" className="live-dot hide-sm">LIVE · {live.signals.length} signals · {timeAgo(live.updatedAt!)}</NavLink>
}

const EXAMPLES = [
  'Find companies in industrial software showing acquisition or succession signals in the last 90 days',
  'Show portfolio companies with new competitive threats this quarter',
  'Who in our network can introduce us to the CEO of Northwind?',
  'What changed in Halcyon Ledger since our last review?',
  'Show evidence that contradicts the current investment thesis',
]

function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const nav = useNavigate()
  const ql = q.toLowerCase().trim()
  type Item = { key: string; section: string; label: ReactNode; icon: typeof Home; go: () => void }
  const items: Item[] = useMemo(() => {
    const out: Item[] = []
    if (ql) out.push({ key: 'ask', section: 'Ask Otto', label: <>Ask: <b>{q}</b></>, icon: Sparkles, go: () => nav(`/query?q=${encodeURIComponent(q)}`) })
    companies.filter((c) => !ql || c.name.toLowerCase().includes(ql) || c.subsector.toLowerCase().includes(ql)).slice(0, ql ? 6 : 4)
      .forEach((c) => out.push({ key: c.id, section: 'Companies', label: <>{c.name} <span className="muted xs">· {c.subsector} · {c.city}</span></>, icon: Building, go: () => nav(`/company/${c.id}`) }))
    ALL_NAV.filter((n) => !ql || n.label.toLowerCase().includes(ql)).slice(0, ql ? 4 : 6)
      .forEach((n) => out.push({ key: n.to, section: 'Go to', label: n.label, icon: n.icon, go: () => nav(n.to) }))
    sponsors.filter((s) => ql && s.name.toLowerCase().includes(ql)).slice(0, 3)
      .forEach((s) => out.push({ key: s.id, section: 'Sponsors & buyers', label: s.name, icon: Globe2, go: () => nav('/sponsors') }))
    if (!ql) EXAMPLES.forEach((e, i) => out.push({ key: `ex${i}`, section: 'Try asking', label: e, icon: Gauge, go: () => nav(`/query?q=${encodeURIComponent(e)}`) }))
    return out
  }, [ql, q, nav])
  useEffect(() => setSel(0), [ql])
  const run = (i: number) => { items[i]?.go(); onClose() }
  let lastSec = ''
  return (
    <div className="overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Sparkles />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask Otto or jump to…"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
              if (e.key === 'Enter') run(sel)
            }} />
          <span className="kbd">Esc</span>
        </div>
        <div className="palette-list">
          {items.map((it, i) => {
            const head = it.section !== lastSec ? <div className="palette-sec">{it.section}</div> : null
            lastSec = it.section
            return (
              <div key={it.key}>
                {head}
                <div className={cx('palette-item', i === sel && 'sel')} onMouseEnter={() => setSel(i)} onClick={() => run(i)}>
                  <it.icon /><span className="grow ellipsis">{it.label}</span>{i === sel && <ArrowRight />}
                </div>
              </div>
            )
          })}
          <div className="palette-sec" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BookMarked size={11} /> Natural-language query over the DayOne investment graph</div>
        </div>
      </div>
    </div>
  )
}
