import { ArrowRight, Check, Database, FileCheck2, Lock, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel, useApp } from '../components/ui'
import { EMPTY_FUND, EXAMPLE_FUND, FUND_STAGES, LP_REGIONS, SECTORS, fundraise, useFundraise, type FactBase } from '../lib/fund'
import { confColor, loadInvestors, type InvestorData } from '../lib/investors'
import { cx } from '../lib/util'

const REQUIRED: { k: keyof FactBase; label: string }[] = [
  { k: 'fundName', label: 'Fund name' }, { k: 'strategy', label: 'Strategy' }, { k: 'sectors', label: 'Sectors' },
  { k: 'targetSize', label: 'Target size' }, { k: 'maxTicket', label: 'LP ticket range' }, { k: 'trackRecord', label: 'Track record' },
  { k: 'team', label: 'Team' }, { k: 'keyFacts', label: 'Key facts for outreach' },
]
const filled = (f: FactBase, k: keyof FactBase) => { const v = f[k]; return Array.isArray(v) ? v.length > 0 : typeof v === 'number' ? v > 0 : String(v).trim().length > 0 }

export default function Fund() {
  const s = useFundraise()
  const [f, setF] = useState<FactBase>(s.fund ?? EMPTY_FUND)
  const [data, setData] = useState<InvestorData | null>(null)
  const nav = useNavigate()
  const { toast } = useApp()
  useEffect(() => { loadInvestors().then(setData) }, [])
  const set = <K extends keyof FactBase>(k: K, v: FactBase[K]) => setF((x) => ({ ...x, [k]: v }))
  const done = REQUIRED.filter((r) => filled(f, r.k)).length
  const ready = done === REQUIRED.length

  const audit = useMemo(() => {
    if (!data) return null
    const n = data.firms.length
    const hi = data.firms.filter((x) => x.prov.conf >= 80).length
    const mid = data.firms.filter((x) => x.prov.conf >= 60 && x.prov.conf < 80).length
    const a = data.firms.filter((x) => x.prov.src.includes('A')).length
    const b = data.firms.filter((x) => x.prov.src.includes('B')).length
    return { n, hi, mid, lo: n - hi - mid, a, b, v90: data.meta.verifiedLast90d, ver: data.meta.verifiedEver }
  }, [data])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><FileCheck2 size={11} style={{ verticalAlign: -1 }} /> Otto v1 · Step 1 of 4 · Fund fact base</div>
          <h1 className="h1">Structure the facts <em>before</em> any agent writes a word.</h1>
          <p className="lede">Everything Otto drafts is checked against this fact base. It stays in this browser for your fund only: never pooled, never shared with other GPs.</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setF(EXAMPLE_FUND)}><Sparkles />Load example fund</button>
          <button className="btn ghost" onClick={() => { setF(EMPTY_FUND); fundraise.reset(); toast('Fact base and pipeline cleared') }}><RotateCcw />Reset</button>
        </div>
      </div>

      <div className="grid g-main">
        <div className="col" style={{ gap: 14 }}>
          <Panel title="Fund" tour="fund-form">
            <div className="form-grid">
              <Field label="Fund name"><input className="input" value={f.fundName} onChange={(e) => set('fundName', e.target.value)} placeholder="e.g. Northline Climate Fund I" /></Field>
              <Field label="Manager / GP"><input className="input" value={f.managerName} onChange={(e) => set('managerName', e.target.value)} /></Field>
              <Field label="Vintage"><input className="input" value={f.vintage} onChange={(e) => set('vintage', e.target.value)} /></Field>
              <Field label="Stage"><select className="input" value={f.stage} onChange={(e) => set('stage', e.target.value as FactBase['stage'])}>{FUND_STAGES.map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Strategy" wide><textarea className="input" rows={3} value={f.strategy} onChange={(e) => set('strategy', e.target.value)} placeholder="What you invest in, where, at which stage, and why now" /></Field>
              <Field label="Sectors" wide>
                <div className="row wrap" style={{ gap: 6 }}>
                  {SECTORS.map((x) => <button key={x.label} type="button" className={cx('chip-btn', f.sectors.includes(x.label) && 'on')} onClick={() => set('sectors', f.sectors.includes(x.label) ? f.sectors.filter((y) => y !== x.label) : [...f.sectors, x.label])}>{f.sectors.includes(x.label) && <Check />}{x.label}</button>)}
                </div>
              </Field>
              <Field label="Portfolio geographies"><input className="input" value={f.portfolioGeos} onChange={(e) => set('portfolioGeos', e.target.value)} /></Field>
              <Field label="Target LP regions">
                <div className="row wrap" style={{ gap: 6 }}>
                  {LP_REGIONS.map((x) => <button key={x} type="button" className={cx('chip-btn', f.lpRegions.includes(x) && 'on')} onClick={() => set('lpRegions', f.lpRegions.includes(x) ? f.lpRegions.filter((y) => y !== x) : [...f.lpRegions, x])}>{x}</button>)}
                </div>
              </Field>
              <Field label="Target size ($m)"><input className="input" type="number" min={0} value={f.targetSize || ''} onChange={(e) => set('targetSize', Number(e.target.value))} /></Field>
              <Field label="First close"><input className="input" type="date" value={f.firstClose} onChange={(e) => set('firstClose', e.target.value)} /></Field>
              <Field label="Min LP ticket ($m)"><input className="input" type="number" min={0} step={0.05} value={f.minTicket || ''} onChange={(e) => set('minTicket', Number(e.target.value))} /></Field>
              <Field label="Max LP ticket ($m)"><input className="input" type="number" min={0} step={0.05} value={f.maxTicket || ''} onChange={(e) => set('maxTicket', Number(e.target.value))} /></Field>
            </div>
          </Panel>
          <Panel title="Track record & facts Otto may use">
            <div className="form-grid">
              <Field label="Track record" wide><textarea className="input" rows={3} value={f.trackRecord} onChange={(e) => set('trackRecord', e.target.value)} placeholder="Prior investments, realised exits with multiples, follow-on rates" /></Field>
              <Field label="Team" wide><textarea className="input" rows={2} value={f.team} onChange={(e) => set('team', e.target.value)} /></Field>
              <Field label="Differentiators" wide><textarea className="input" rows={2} value={f.differentiators} onChange={(e) => set('differentiators', e.target.value)} /></Field>
              <Field label="Key facts (one per line). Only these can appear as claims in outreach" wide><textarea className="input" rows={4} value={f.keyFacts} onChange={(e) => set('keyFacts', e.target.value)} /></Field>
            </div>
          </Panel>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <Panel title="Readiness" glow>
            <div className="row between"><span className="small">{done} of {REQUIRED.length} essentials</span><span className="num small accent">{Math.round((done / REQUIRED.length) * 100)}%</span></div>
            <div className="bar mt-8"><i style={{ width: `${(done / REQUIRED.length) * 100}%` }} /></div>
            <ul className="clean mt-12">
              {REQUIRED.map((r) => <li key={r.k}><span className="dot" style={{ background: filled(f, r.k) ? 'var(--pos)' : 'var(--line-3)' }} /><span className={filled(f, r.k) ? '' : 'muted'}>{r.label}</span></li>)}
            </ul>
            <button className="btn primary mt-16" style={{ width: '100%', justifyContent: 'center' }} disabled={!ready} onClick={() => { fundraise.saveFund(f); toast('Fact base saved'); nav('/shortlist') }}>
              Save and build my LP shortlist <ArrowRight />
            </button>
            {s.savedAt && <div className="xs muted mt-8">Last saved {new Date(s.savedAt).toLocaleString()}</div>}
          </Panel>

          <Panel title="LP data audit" icon={<Database size={14} className="accent" />} tour="data-audit">
            {!audit ? <div className="typing"><i /><i /><i /></div> : (
              <>
                <div className="grid g-2" style={{ gap: 10 }}>
                  <div><div className="xs muted">LP & investor firms</div><div className="kpi-value" style={{ fontSize: 24 }}>{audit.n.toLocaleString()}</div></div>
                  <div><div className="xs muted">Verified in last 90 days</div><div className="kpi-value" style={{ fontSize: 24, color: audit.v90 ? 'var(--text)' : 'var(--neg)' }}>{audit.v90}</div></div>
                </div>
                <div className="xs muted mt-12">Data confidence</div>
                <div className="conf-bar mt-4">
                  <i style={{ flex: audit.hi, background: confColor(90) }} title={`High: ${audit.hi}`} />
                  <i style={{ flex: audit.mid, background: confColor(70) }} title={`Medium: ${audit.mid}`} />
                  <i style={{ flex: audit.lo, background: confColor(40) }} title={`Low: ${audit.lo}`} />
                </div>
                <div className="row xs muted mt-4" style={{ gap: 12 }}><span>High {audit.hi.toLocaleString()}</span><span>Medium {audit.mid.toLocaleString()}</span><span>Low {audit.lo.toLocaleString()}</span></div>
                <ul className="clean small mt-12">
                  <li><span className="dot" style={{ background: 'var(--accent)' }} />Database A: {audit.a.toLocaleString()} firms, compiled {data?.meta.sources.A.compiled}</li>
                  <li><span className="dot" style={{ background: 'var(--accent)' }} />Database B: {audit.b.toLocaleString()} firms, compile date not recorded</li>
                  <li><span className="dot" style={{ background: 'var(--neg)' }} />Only {audit.ver} firms carry a desk-verification date. Re-verify shortlisted LPs before outreach.</li>
                </ul>
              </>
            )}
          </Panel>

          <Panel title="Guardrails" icon={<ShieldCheck size={14} className="pos" />}>
            <ul className="clean small">
              <li><span className="dot" style={{ background: 'var(--pos)' }} />Otto drafts and shortlists; you approve every message</li>
              <li><span className="dot" style={{ background: 'var(--pos)' }} />Email only, opt-out in every message, max 10 per hour</li>
              <li><span className="dot" style={{ background: 'var(--pos)' }} />EU/UK recipients need a consent check before sending</li>
              <li><span className="dot" style={{ background: 'var(--pos)' }} />No LinkedIn automation</li>
              <li><span className="dot" style={{ background: 'var(--warn)' }} />Solicitation rules vary by country: take legal advice before going live</li>
            </ul>
            <div className="row xs muted mt-12" style={{ gap: 6 }}><Lock size={12} />Stored only in this browser · isolated per GP</div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={cx('field', wide && 'wide')}><span className="xs muted">{label}</span>{children}</label>
}
