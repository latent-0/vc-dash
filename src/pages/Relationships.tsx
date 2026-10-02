import { Mail, Network, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CompanyLogo, Panel, useApp } from '../components/ui'
import { companies, companyById, people, team } from '../data/seed'
import type { Edge, Person } from '../data/types'
import { neighbourhood } from '../lib/graph'
import { ago, cx, scoreColor } from '../lib/util'
import { PathView } from './Company'

const EDGE_COLOR: Record<Edge['type'], string> = {
  Board: '#e2711d', Employment: '#3d6fb2', 'Co-investor': '#2e8657', Advisor: '#7a5fc0', Education: '#2b8a82', Deal: '#a87420', 'Portfolio CEO': '#d98a2b',
}

export default function Relationships() {
  const { id = 'c1' } = useParams()
  const nav = useNavigate()
  const { toast } = useApp()
  const c = companyById[id] ?? companyById.c1
  const { nodes, links, paths } = useMemo(() => neighbourhood(c.id), [c.id])
  const [sel, setSel] = useState(0)
  const [hover, setHover] = useState<string | null>(null)
  const active = paths[sel]
  const activeIds = new Set(active?.nodes.map((n) => n.id))
  const activeLinks = new Set(active?.links.map((l) => `${l.a}-${l.b}`))

  // Layered layout
  const W = 900, H = 520
  const teamIds = new Set(team.map((m) => m.id))
  const targetIds = new Set(people.filter((p) => p.org === c.name).map((p) => p.id))
  const layers: Person[][] = [[], [], []]
  nodes.forEach((n) => (teamIds.has(n.id) ? layers[0] : targetIds.has(n.id) ? layers[2] : layers[1]).push(n))
  const pos = new Map<string, { x: number; y: number }>()
  const xs = [110, W / 2, W - 150]
  layers.forEach((L, li) => L.forEach((n, i) => pos.set(n.id, { x: xs[li] + (li === 1 ? (i % 2 ? 40 : -40) : 0), y: ((i + 1) * H) / (L.length + 1) })))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Network size={11} style={{ verticalAlign: -1 }} /> Feature 05 · Relationship Graph</div>
          <h1 className="h1">Who can <em>open the door</em> to {c.name}?</h1>
          <p className="lede">Direct, second-degree and broader paths ranked by strength and recency — shared boards, employment, co-investments and portfolio relationships.</p>
        </div>
        <div className="actions">
          <select className="input" style={{ width: 280 }} value={c.id} onChange={(e) => { setSel(0); nav(`/relationships/${e.target.value}`) }}>
            {companies.filter((x) => x.status !== 'Portfolio').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid g-main">
        <section className="panel glow" data-tour="graph" style={{ overflow: 'hidden' }}>
          <div className="panel-head">
            <CompanyLogo c={c} />
            <div><div className="h3">{c.name}</div><div className="xs muted">{nodes.length} people · {links.length} relationships · {paths.length} paths</div></div>
            <div className="spacer" />
            <div className="globe-legend hide-sm">{Object.entries(EDGE_COLOR).map(([k, v]) => <span key={k}><i className="dot" style={{ background: v }} />{k}</span>)}</div>
          </div>
          <div style={{ position: 'relative' }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', background: 'radial-gradient(ellipse at 80% 50%, rgba(226,113,29,.06), transparent 60%)' }}>
              {['DayOne team', 'Connectors', `${c.name.split(' ')[0]} leadership`].map((t, i) => (
                <text key={t} x={xs[i]} y={22} textAnchor="middle" className="svg-text" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fill: 'var(--faint)' }}>{t.toUpperCase()}</text>
              ))}
              {links.map((l) => {
                const a = pos.get(l.a), b = pos.get(l.b)
                if (!a || !b) return null
                const on = activeLinks.has(`${l.a}-${l.b}`)
                const [p, q] = a.x < b.x ? [a, b] : [b, a]
                const mx = (p.x + q.x) / 2
                return (
                  <path key={`${l.a}-${l.b}`} d={`M${p.x},${p.y} C${mx},${p.y} ${mx},${q.y} ${q.x},${q.y}`} fill="none"
                    stroke={EDGE_COLOR[l.type]} strokeWidth={on ? 1 + l.strength * 3 : 0.5 + l.strength * 1.2} strokeOpacity={on ? 0.95 : active ? 0.12 : 0.35}
                    strokeDasharray={on ? '6 5' : undefined} className={on ? 'flow' : undefined} />
                )
              })}
              {nodes.map((n) => {
                const p = pos.get(n.id)!
                const isTeam = teamIds.has(n.id), isTarget = targetIds.has(n.id)
                const on = activeIds.has(n.id) || hover === n.id
                const r = isTarget ? 15 : isTeam ? 14 : 11
                const label = n.name
                const right = !isTarget
                return (
                  <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default', opacity: active && !on ? 0.4 : 1, transition: 'opacity .2s' }}>
                    {on && <circle cx={p.x} cy={p.y} r={r + 6} fill="none" stroke={isTeam ? '#e2711d' : '#4a443b'} strokeOpacity={0.25} />}
                    <circle cx={p.x} cy={p.y} r={r} fill={isTeam ? 'rgba(226,113,29,.14)' : isTarget ? '#f1ebe0' : '#fffdf9'} stroke={isTeam ? '#e2711d' : isTarget ? '#4a443b' : 'rgba(70,52,28,.28)'} strokeWidth={1.2} />
                    <text x={p.x} y={p.y + 3.5} textAnchor="middle" style={{ fontSize: 9.5, fill: 'var(--text)', fontFamily: 'var(--sans)', fontWeight: 600 }}>{n.name.split(' ').map((x) => x[0]).join('')}</text>
                    <text x={right ? p.x + r + 8 : p.x - r - 8} y={p.y - 1} textAnchor={right ? 'start' : 'end'} style={{ fontSize: 11, fill: on ? 'var(--text)' : 'var(--text-2)', fontFamily: 'var(--sans)' }}>{label}</text>
                    <text x={right ? p.x + r + 8 : p.x - r - 8} y={p.y + 12} textAnchor={right ? 'start' : 'end'} style={{ fontSize: 9.5, fill: 'var(--muted)', fontFamily: 'var(--sans)' }}>{n.role.length > 30 ? n.role.slice(0, 30) + '…' : n.role}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        </section>

        <div className="col" style={{ gap: 14 }}>
          <Panel title="Ranked access paths" flush>
            {paths.map((p, i) => (
              <button key={i} className={cx('list-item clickable', i === sel && 'sel-row')} style={{ width: '100%', textAlign: 'left' }} onClick={() => setSel(i)}>
                <div className="num xs faint" style={{ width: 14, paddingTop: 2 }}>{i + 1}</div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="small ellipsis">{p.nodes.map((n) => n.name.split(' ')[0] + ' ' + n.name.split(' ')[1][0] + '.').join(' → ')}</div>
                  <div className="xs muted mt-4">{p.links.length === 1 ? 'Direct' : `${p.links.length - 1}${p.links.length === 2 ? 'nd' : 'rd'}-degree`} · {p.links.map((l) => l.type).join(' / ')} · last touch {ago(p.links[0].lastContact)}</div>
                </div>
                <span className="num small" style={{ color: scoreColor(p.strength * 100) }}>{p.strength.toFixed(2)}</span>
              </button>
            ))}
          </Panel>
          {active && (
            <Panel title="Suggested introduction" glow>
              <PathView p={active} />
              <div className="row mt-16">
                <button className="btn primary" onClick={() => toast(`Intro request drafted for ${active.nodes[1]?.name ?? active.target.name}`)}><Send />Draft intro request</button>
                <button className="btn" onClick={() => toast('Logged to contact history')}><Mail />Log touchpoint</button>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
