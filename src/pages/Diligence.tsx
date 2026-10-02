import { ArrowUp, BookmarkPlus, FileSearch, MessageSquareText, ShieldQuestion, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CompanyLogo, Panel, useApp } from '../components/ui'
import { companies, companyById, signals, sourceById } from '../data/seed'
import type { Company, Source } from '../data/types'
import { LogoMark } from '../components/Logo'
import { cx, fmtShort, money } from '../lib/util'
import { copilotContext, streamAsk } from '../lib/ask'

type Msg = { role: 'user' | 'ai'; text: string; cites?: Source[]; table?: { claim: string; status: string }[]; streaming?: boolean; model?: string }

const PROMPTS = [
  'Where does the evidence contradict management?',
  'What information is missing for IC?',
  'Generate diligence questions for the management meeting',
  'Build an evidence matrix for the core thesis claims',
  'What are the downside scenarios?',
]

function answer(c: Company, q: string): Msg {
  const sigs = signals.filter((s) => s.companyId === c.id)
  const cites = [...new Set(sigs.flatMap((s) => s.sourceIds))].slice(0, 4).map((id) => sourceById[id])
  const ql = q.toLowerCase()
  if (/contradict|management claim/.test(ql)) {
    return { role: 'ai', cites, text: c.contradictions.length
      ? `I found ${c.contradictions.length} material contradictions between management's materials and external evidence:\n\n${c.contradictions.map((x, i) => `${i + 1}. ${x} [${(i % cites.length) + 1}]`).join('\n')}\n\nNeither is disqualifying, but both affect the revenue-quality narrative. I'd prioritise the retention question — it touches valuation directly.`
      : `No direct contradictions found across ${cites.length} sources. Coverage is ${c.scores.evidence}%, so absence of contradiction is moderately informative [1].` }
  }
  if (/missing|lack|gap/.test(ql)) {
    return { role: 'ai', cites, text: `Evidence coverage is ${c.scores.evidence}%. Items still missing for an IC-grade case:\n\n${c.missing.map((m, i) => `• ${m}${i === 0 ? ' — highest priority; affects the base case' : ''}`).join('\n')}\n\nSuggested route: request via data room for the first item; use an expert call [${cites.length}] for the rest.` }
  }
  if (/question/.test(ql)) {
    return { role: 'ai', cites, text: `Proposed questions for the management meeting, ordered by impact on the investment case:\n\n1. Walk us through gross retention by cohort since 2023 — excluding payments revenue.\n2. ${c.contradictions[0] ? `Help us reconcile: ${c.contradictions[0].toLowerCase()}.` : 'What drove the last two quarters of hiring acceleration?'}\n3. How does the ${c.catalysts[0]?.toLowerCase() ?? 'leadership change'} change decision rights over the next 12 months? [1]\n4. What is the plan for ${c.risks[0]?.toLowerCase() ?? 'customer concentration'}? [2]\n5. Which add-on targets have you already spoken with?\n\nI've linked each question to its originating signal so answers update the evidence matrix automatically.` }
  }
  if (/matrix|claim/.test(ql)) {
    return { role: 'ai', cites, text: `Evidence matrix for the ${c.name} thesis:`, table: [
      { claim: c.catalysts[0] ?? 'Catalyst present', status: 'Supported' },
      { claim: c.catalysts[1] ?? 'Market tailwind', status: 'Supported' },
      { claim: `Growth of ${c.growth}% is durable`, status: 'Partial' },
      { claim: c.contradictions[0] ?? 'Management KPIs accurate', status: c.contradictions[0] ? 'Contradicted' : 'Supported' },
      { claim: `${c.ebitdaMargin}% EBITDA margin expandable`, status: 'Unsupported' },
    ] }
  }
  if (/downside|scenario|bear/.test(ql)) {
    return { role: 'ai', cites, text: `Three downside scenarios, weighted by current signals:\n\n• Execution slip (35%) — ${c.risks[0]?.toLowerCase() ?? 'key risk'} persists; growth decelerates to ${Math.round(c.growth * 0.55)}%. MOIC ≈ 1.6x [1]\n• Competitive response (20%) — incumbent bundles the core product; pricing pressure of 8–12% [2]\n• Leadership gap (15%) — transition stalls; 2–3 quarter delay to value-creation plan [3]\n\nRevenue of ${money(c.revenue)} provides a floor; the main protection is a structured earn-out tied to retention.` }
  }
  return { role: 'ai', cites, text: `Based on ${sigs.length} signals and ${cites.length} sources, ${c.name} looks ${c.scores.fit > 80 ? 'strongly' : 'moderately'} aligned with the thesis. The most important open item is ${c.missing[0]?.toLowerCase() ?? 'retention data'} [1]. Want me to draft questions for management?` }
}

export default function Diligence() {
  const { id = 'c1' } = useParams()
  const nav = useNavigate()
  const { toast } = useApp()
  const c = companyById[id] ?? companyById.c1
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState('')
  const [saved, setSaved] = useState<string[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMsgs([]); setSaved([]) }, [c.id])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, typing])

  const ask = async (q: string) => {
    if (!q.trim() || typing) return
    const history = msgs.filter((m) => !m.streaming).map((m) => ({ role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.text }))
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setTyping(true)
    const { context, sources } = copilotContext(c.id)
    const citesIn = (t: string) => [...new Set([...t.matchAll(/\[(\d+)\]/g)].map((x) => +x[1]))].map((n) => sources[n - 1]).filter(Boolean)
    try {
      let started = false
      await streamAsk({ mode: 'copilot', question: q, context, history }, (text) => {
        if (!started) { started = true; setTyping(false); setMsgs((m) => [...m, { role: 'ai', text, streaming: true, model: 'gpt-oss-120b' }]); return }
        setMsgs((m) => [...m.slice(0, -1), { ...m[m.length - 1], text }])
      })
      setMsgs((m) => { const last = m[m.length - 1]; return [...m.slice(0, -1), { ...last, streaming: false, cites: citesIn(last.text) }] })
    } catch {
      // Offline / no key: fall back to the deterministic evidence engine.
      setMsgs((m) => [...m.filter((x) => !x.streaming), { ...answer(c, q), model: 'offline engine' }])
    } finally {
      setTyping(false)
    }
  }

  const allCites = useMemo(() => [...new Map(msgs.flatMap((m) => m.cites ?? []).map((s) => [s.id, s])).values()], [msgs])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><MessageSquareText size={11} style={{ verticalAlign: -1 }} /> Feature 08 · Diligence Copilot</div>
          <h1 className="h1">Interrogate the deal, <em>don&apos;t just summarise it</em>.</h1>
        </div>
        <div className="actions">
          <select className="input" style={{ width: 280 }} value={c.id} onChange={(e) => nav(`/diligence/${e.target.value}`)}>
            {companies.filter((x) => x.status !== 'Portfolio').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid g-main">
        <section className="panel chat-panel">
          <div className="panel-head">
            <CompanyLogo c={c} />
            <div><div className="h3">{c.name}</div><div className="xs muted">{signals.filter((s) => s.companyId === c.id).length} signals · evidence coverage {c.scores.evidence}% · scoped to deal-team permissions</div></div>
          </div>
          <div className="chat-scroll">
            {!msgs.length && (
              <div className="chat-empty">
                <LogoMark size={44} />
                <div className="h2 mt-12">What should we pressure-test?</div>
                <div className="small muted mt-4">Answers cite sources. Nothing is a final recommendation — humans own decisions.</div>
                <div className="col mt-24" style={{ gap: 8, alignItems: 'stretch', maxWidth: 520, width: '100%' }}>
                  {PROMPTS.map((p) => <button key={p} className="chip-btn" style={{ borderRadius: 10 }} onClick={() => ask(p)}><Sparkles />{p}</button>)}
                </div>
              </div>
            )}
            {msgs.map((m, i) => {
              const text = m.text
              const done = !m.streaming
              return (
                <div key={i} className="chat-msg">
                  {m.role === 'user' ? <div className="avatar sm internal">EW</div> : <div style={{ width: 22 }}><LogoMark size={22} /></div>}
                  <div className="bubble">
                    <div className="xs muted" style={{ marginBottom: 4 }}>{m.role === 'user' ? 'You' : <>Otto Copilot{m.model && <span className="faint"> · {m.model}</span>}</>}</div>
                    <div className={cx('small', m.role === 'ai' && 'ai-text')} style={{ whiteSpace: 'pre-wrap' }}>{renderCites(text.replace(/\*\*/g, ''))}{m.streaming && <span className="caret" />}</div>
                    {m.table && done && (
                      <table className="table mt-12 panel" style={{ overflow: 'hidden' }}>
                        <thead><tr><th>Claim</th><th>Status</th></tr></thead>
                        <tbody>{m.table.map((r) => <tr key={r.claim}><td>{r.claim}</td><td><span className={cx('tag', r.status === 'Supported' ? 'pos' : r.status === 'Contradicted' ? 'neg' : r.status === 'Partial' ? 'warn' : '')}>{r.status}</span></td></tr>)}</tbody>
                      </table>
                    )}
                    {m.role === 'ai' && done && (
                      <div className="row mt-8" style={{ gap: 6 }}>
                        <button className="btn sm ghost" onClick={() => { setSaved((s) => [...s, msgs[i - 1]?.text ?? '']); toast('Saved to IC room') }}><BookmarkPlus />Save to IC room</button>
                        <button className="btn sm ghost" onClick={() => toast('Annotation added')}>Annotate</button>
                        <button className="btn sm ghost" onClick={() => toast('Flagged as incorrect — sent for review')}>Correct</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {typing && <div className="chat-msg"><div style={{ width: 22 }}><LogoMark size={22} /></div><div className="typing" style={{ paddingTop: 8 }}><i /><i /><i /></div></div>}
            <div ref={endRef} />
          </div>
          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); ask(input) }}>
            <input className="input" placeholder={`Ask about ${c.name}…`} value={input} onChange={(e) => setInput(e.target.value)} />
            <button className="btn primary" type="submit" aria-label="Send"><ArrowUp /></button>
          </form>
        </section>

        <div className="col" style={{ gap: 14 }}>
          <Panel title="Cited evidence" icon={<FileSearch size={14} className="accent" />}>
            {allCites.length ? (
              <div className="col" style={{ gap: 10 }}>
                {allCites.map((s, i) => (
                  <div key={s.id} className="row small" style={{ alignItems: 'flex-start' }}>
                    <span className="cite">{i + 1}</span>
                    <div className="grow"><div>{s.name}</div><div className="xs muted">{s.type} · {s.kind} · {fmtShort(s.date)}{s.stale && <span className="warn"> · stale</span>}</div></div>
                  </div>
                ))}
              </div>
            ) : <div className="small muted">Sources appear here as the copilot answers.</div>}
          </Panel>
          <Panel title="Unresolved questions" icon={<ShieldQuestion size={14} className="warn" />}>
            <ul className="clean">{[...c.contradictions, ...c.missing].map((x) => <li key={x}><span className="dot" style={{ background: 'var(--warn)' }} />{x}</li>)}</ul>
          </Panel>
          {saved.length > 0 && (
            <Panel title="Saved to IC room">
              <ul className="clean">{saved.map((s, i) => <li key={i}><span className="dot" style={{ background: 'var(--pos)' }} />{s}</li>)}</ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

function renderCites(t: string) {
  return t.split(/(\[\d+\])/g).map((p, i) => (/^\[\d+\]$/.test(p) ? <span key={i} className="cite">{p.slice(1, -1)}</span> : p))
}
