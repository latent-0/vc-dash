import { Telescope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CompanyLogo, Panel, Sparkline, Stat } from '../components/ui'
import { companyById, portfolio, signals } from '../data/seed'
import { FAMILY, ago, cx, money } from '../lib/util'

const HEALTH_TONE = { Strong: 'pos', Watch: 'warn', Concern: 'neg' } as const

export default function Portfolio() {
  const nav = useNavigate()
  const invested = portfolio.reduce((a, p) => a + p.invested, 0)
  const value = portfolio.reduce((a, p) => a + p.invested * p.moic, 0)
  const pSignals = signals.filter((s) => portfolio.some((p) => p.companyId === s.companyId)).slice(0, 12)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Telescope size={11} style={{ verticalAlign: -1 }} /> Feature 11 · Portfolio Watchtower</div>
          <h1 className="h1">Intelligence that <em>doesn&apos;t stop at close</em>.</h1>
          <p className="lede">Executive changes, hiring velocity, competitive moves, add-on targets and exit-relevant market shifts — monitored across every asset.</p>
        </div>
      </div>
      <div className="grid g-4">
        <Stat label="Invested capital" value={money(invested)} delta={`${portfolio.length} active assets`} />
        <Stat label="Current value" value={money(value)} delta={`+${money(value - invested)} unrealised`} pos />
        <Stat label="Gross MOIC" value={`${(value / invested).toFixed(2)}x`} delta="+0.12x QoQ" pos />
        <Stat label="Assets on watch" value={portfolio.filter((p) => p.health !== 'Strong').length} delta="1 concern · 2 watch" pos={false} />
      </div>

      <div className="grid g-3 mt-16">
        {portfolio.map((p) => {
          const c = companyById[p.companyId]
          const sig = signals.find((s) => s.companyId === c.id)
          return (
            <div key={p.companyId} className="panel" style={{ padding: 16, cursor: 'pointer' }} onClick={() => nav(`/company/${c.id}`)}>
              <div className="row">
                <CompanyLogo c={c} />
                <div className="grow" style={{ minWidth: 0 }}><div style={{ fontWeight: 500 }} className="ellipsis">{c.name}</div><div className="xs muted">{p.fund} · since {p.acquired.slice(0, 4)}</div></div>
                <span className={cx('tag', HEALTH_TONE[p.health])}>{p.health}</span>
              </div>
              <div className="grid g-3 mt-16" style={{ gap: 8 }}>
                <div><div className="xs muted">MOIC</div><div className="num" style={{ fontSize: 18 }}>{p.moic.toFixed(1)}x</div></div>
                <div><div className="xs muted">IRR</div><div className="num" style={{ fontSize: 18 }}>{p.irr}%</div></div>
                <div><div className="xs muted">Exit ready</div><div className="num" style={{ fontSize: 18, color: p.exitReadiness > 70 ? 'var(--pos)' : 'var(--text)' }}>{p.exitReadiness}</div></div>
              </div>
              <div className="row between mt-12">
                <div><div className="xs muted">Revenue · 8q</div><Sparkline data={p.revenue} w={120} h={28} color="var(--blue)" /></div>
                <div><div className="xs muted">EBITDA · 8q</div><Sparkline data={p.ebitda} w={120} h={28} color={p.ebitda[7] > p.ebitda[0] ? 'var(--pos)' : 'var(--neg)'} /></div>
              </div>
              {sig && <div className="xs t2 mt-12" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}><span style={{ color: FAMILY[sig.family].color }}>● {sig.family}</span> · {sig.title} <span className="faint">· {ago(sig.date)}</span></div>}
            </div>
          )
        })}
      </div>

      <Panel title="Portfolio signal feed" className="mt-16" flush>
        {pSignals.map((s) => {
          const c = companyById[s.companyId]
          const F = FAMILY[s.family]
          return (
            <div key={s.id} className="list-item clickable" onClick={() => nav(`/company/${c.id}`)}>
              <div className="sig-icon" style={{ color: F.color, background: `${F.color}14`, borderColor: `${F.color}33` }}><F.icon /></div>
              <div className="grow"><div className="small">{s.title}</div><div className="xs muted">{c.name} · {s.type} · {ago(s.date)}</div></div>
              <span className={cx('tag', s.family === 'Risk' ? 'neg' : s.family === 'Market' ? 'warn' : '')}>{s.family === 'Risk' ? 'Emerging risk' : s.family === 'Market' ? 'Competitive' : s.family}</span>
            </div>
          )
        })}
      </Panel>
    </div>
  )
}
