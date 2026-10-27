import { AlertTriangle, ArrowRight, Check, CheckCircle2, ClipboardCopy, Mail, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Panel, useApp } from '../components/ui'
import { OPT_OUT, factBaseText, fundraise, useFundraise, type Claim, type Draft } from '../lib/fund'
import { loadInvestors, type Firm } from '../lib/investors'
import { cx } from '../lib/util'
import { Prov } from '../components/Prov'

const HOURLY_CAP = 10
const EU_UK = new Set(['United Kingdom', 'Ireland', 'France', 'Germany', 'Switzerland', 'Netherlands', 'Sweden', 'Spain', 'Italy', 'Luxembourg', 'Belgium', 'Denmark', 'Norway', 'Finland', 'Austria', 'Portugal', 'Poland', 'Greece', 'Monaco', 'Liechtenstein', 'Jersey', 'Guernsey', 'Czech Republic', 'Bulgaria'])

export default function Outreach() {
  const { id } = useParams()
  const s = useFundraise()
  const nav = useNavigate()
  const { toast } = useApp()
  const [firms, setFirms] = useState<Record<string, Firm>>({})
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [claims, setClaims] = useState<Claim[]>([])
  const [busy, setBusy] = useState<'' | 'draft' | 'check'>('')
  const [err, setErr] = useState('')
  const [consent, setConsent] = useState(false)

  useEffect(() => { loadInvestors().then((d) => setFirms(Object.fromEntries(d.firms.map((f: Firm) => [f.id, f])))) }, [])
  const queue = Object.values(s.pipeline).filter((p) => p.stage === 'Target' || p.draft).sort((a, b) => b.fit - a.fit)
  const item = id ? s.pipeline[id] : undefined
  const lp = id ? firms[id] : undefined
  const euUk = !!lp && EU_UK.has(lp.country)

  useEffect(() => {
    setErr(''); setConsent(false)
    const d = item?.draft
    setSubject(d?.subject ?? ''); setBody(d?.body ?? ''); setClaims(d?.claims ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const approvalsLastHour = useMemo(() => Object.values(s.pipeline).filter((p) => p.draft?.approvedAt && Date.now() - Date.parse(p.draft.approvedAt) < 3600_000).length, [s.pipeline])
  const capped = approvalsLastHour >= HOURLY_CAP

  if (!s.fund) return <Gate text="Set up your fund fact base first. Outreach can only use facts you have approved." to="/fund" cta="Set up fact base" />
  if (!queue.length && !item) return <Gate text="Add LPs from your shortlist to start drafting outreach." to="/shortlist" cta="Open shortlist" />

  const lpProfile = lp ? { name: lp.name, type: lp.type, location: [lp.city, lp.country].filter(Boolean).join(', '), focus: lp.focus, about: lp.about, stages: lp.stages, aumUSDm: lp.aum } : { name: item?.name, type: item?.type }
  const save = (patch: Partial<Draft>) => id && fundraise.setDraft(id, { subject, body, claims, createdAt: item?.draft?.createdAt ?? new Date().toISOString(), euUk, ...item?.draft, ...patch })

  const draft = async () => {
    if (!id) return
    setBusy('draft'); setErr('')
    try {
      const r = await fetch('/api/outreach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'draft', factBase: factBaseText(s.fund!), lp: lpProfile }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setSubject(d.subject); setBody(d.body); setClaims(d.claims)
      fundraise.setDraft(id, { subject: d.subject, body: d.body, claims: d.claims, createdAt: new Date().toISOString(), euUk })
    } catch (e) { setErr(String(e).slice(0, 160)) }
    setBusy('')
  }
  const recheck = async () => {
    setBusy('check'); setErr('')
    try {
      const r = await fetch('/api/outreach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'check', factBase: factBaseText(s.fund!), lp: lpProfile, subject, text: body }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setClaims(d.claims); save({ subject, body, claims: d.claims })
    } catch (e) { setErr(String(e).slice(0, 160)) }
    setBusy('')
  }

  const unsupported = claims.filter((c) => c.status === 'unsupported').length
  const toCheck = claims.filter((c) => c.status === 'check').length
  const blockers = [
    !body && 'Generate or write a draft',
    unsupported > 0 && `${unsupported} unsupported claim${unsupported > 1 ? 's' : ''}: fix or remove, then re-check`,
    euUk && !consent && 'Confirm a lawful basis for contacting this EU/UK recipient',
    capped && `Hourly cap reached (${HOURLY_CAP}/hour)`,
  ].filter(Boolean) as string[]
  const full = `${body}\n\n${OPT_OUT}`
  const approved = !!item?.draft?.approvedAt

  const approve = () => {
    if (!id || blockers.length) return
    fundraise.setDraft(id, { subject, body, claims, createdAt: item?.draft?.createdAt ?? new Date().toISOString(), approvedAt: new Date().toISOString(), euUk })
    fundraise.move(id, 'Contacted')
    toast('Approved. Moved to Contacted; send it from your own inbox')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><Mail size={11} style={{ verticalAlign: -1 }} /> Otto v1 · Step 3 of 4 · Outreach with claims check</div>
          <h1 className="h1">Otto drafts. <em>You approve.</em></h1>
          <p className="lede">Each draft uses only your fact base, then every claim is checked against it before you see the approve button. Nothing is sent automatically.</p>
        </div>
        <div className="actions"><span className={cx('tag', capped ? 'neg' : 'pos')}>{approvalsLastHour}/{HOURLY_CAP} approvals this hour</span></div>
      </div>

      <div className="grid outreach-grid">
        <Panel title="Queue" flush>
          <div className="scroll-y" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {queue.map((p) => (
              <button key={p.id} className={cx('list-item clickable', p.id === id && 'sel-row')} style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/outreach/${p.id}`)}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="small ellipsis" style={{ fontWeight: 500 }}>{p.name}</div>
                  <div className="xs muted">{p.type} · fit {p.fit}</div>
                </div>
                {p.draft?.approvedAt ? <span className="tag pos" style={{ height: 19 }}><Check />Approved</span> : p.draft ? <span className="tag warn" style={{ height: 19 }}>Draft</span> : null}
              </button>
            ))}
          </div>
        </Panel>

        {!item ? (
          <div className="panel empty" style={{ padding: 60 }}>Pick an LP from the queue to draft outreach.</div>
        ) : (
          <>
            <Panel title={<>{item.name}{approved && <span className="tag pos" style={{ marginLeft: 8 }}><CheckCircle2 />Approved {new Date(item.draft!.approvedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}</>}
              right={lp && <Prov f={lp} />} tour="draft">
              <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
                <button className="btn primary" onClick={draft} disabled={!!busy}>{busy === 'draft' ? <RefreshCw className="spin" /> : <Sparkles />}{body ? 'Redraft' : 'Draft with Otto'}</button>
                <button className="btn" onClick={recheck} disabled={!!busy || !body}>{busy === 'check' ? <RefreshCw className="spin" /> : <ShieldCheck />}Re-check claims</button>
                {err && <span className="xs neg">{err}</span>}
              </div>
              {busy === 'draft' && !body ? <div className="typing" style={{ padding: 20 }}><i /><i /><i /></div> : (
                <>
                  <input className="input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} onBlur={() => body && save({ subject })} />
                  <textarea className="input mt-8 email-body" rows={12} value={body} placeholder="Draft appears here. You can edit it freely; re-check claims after editing." onChange={(e) => setBody(e.target.value)} onBlur={() => body && save({ body })} />
                  <div className="optout xs"><Check size={12} className="pos" />Appended automatically: “{OPT_OUT}”</div>
                </>
              )}
            </Panel>

            <div className="col" style={{ gap: 14 }}>
              <Panel title="Claims check" icon={<ShieldCheck size={14} className="accent" />}>
                {!claims.length ? <div className="small muted">Claims appear after drafting.</div> : (
                  <>
                    <div className="row" style={{ gap: 6, marginBottom: 10 }}>
                      <span className="tag pos">{claims.length - unsupported - toCheck} supported</span>
                      {toCheck > 0 && <span className="tag warn">{toCheck} to confirm</span>}
                      {unsupported > 0 && <span className="tag neg">{unsupported} unsupported</span>}
                    </div>
                    <div className="col" style={{ gap: 8 }}>
                      {claims.map((c, i) => (
                        <div key={i} className={cx('claim', c.status)}>
                          <div className="row" style={{ gap: 6, alignItems: 'flex-start' }}>
                            {c.status === 'supported' ? <Check size={13} className="pos" /> : c.status === 'unsupported' ? <X size={13} className="neg" /> : <AlertTriangle size={13} className="warn" />}
                            <span className="small">{c.claim}</span>
                          </div>
                          <div className="xs muted" style={{ marginLeft: 19 }}>{c.basis}</div>
                          {c.fix && <div className="xs" style={{ marginLeft: 19, marginTop: 4 }}><b>Suggested fix:</b> {c.fix}</div>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Panel>

              <Panel title="Approve & send" glow>
                {euUk && (
                  <label className="row small" style={{ gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
                    <span>{lp?.country} recipient: I have a lawful basis (e.g. legitimate interest for a professional investor) and will honour opt-outs.</span>
                  </label>
                )}
                {blockers.length > 0 && <ul className="clean small" style={{ marginBottom: 10 }}>{blockers.map((b) => <li key={b}><span className="dot" style={{ background: 'var(--warn)' }} />{b}</li>)}</ul>}
                <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={blockers.length > 0 || approved} onClick={approve}>
                  <CheckCircle2 />{approved ? 'Approved' : 'Approve'}
                </button>
                <div className="row mt-8" style={{ gap: 6 }}>
                  <button className="btn sm grow" style={{ justifyContent: 'center' }} disabled={!body} onClick={() => { navigator.clipboard?.writeText(`Subject: ${subject}\n\n${full}`); toast('Copied to clipboard') }}><ClipboardCopy />Copy</button>
                  <a className={cx('btn sm grow', !approved && 'disabled')} style={{ justifyContent: 'center' }} href={approved ? `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(full)}` : undefined}><Mail />Open in mail app</a>
                </div>
                <div className="xs muted mt-8">You send from your own inbox. Otto never sends on your behalf.</div>
                {approved && <Link to="/pipeline" className="btn ghost sm mt-8">Go to pipeline <ArrowRight /></Link>}
              </Panel>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Gate({ text, to, cta }: { text: string; to: string; cta: string }) {
  return (
    <div className="page">
      <div className="empty" style={{ padding: 80 }}>
        <Mail size={28} className="accent" />
        <p className="small muted mt-12">{text}</p>
        <Link to={to} className="btn primary mt-12">{cta} <ArrowRight /></Link>
      </div>
    </div>
  )
}
