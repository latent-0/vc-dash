import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LogoMark } from './Logo'

interface Step { route?: string; target?: string; title: string; body: string }

const STEPS: Step[] = [
  { title: 'Welcome to Otto Intelligence', body: 'Otto is DayOne’s intelligence layer: it tells the team what changed, why it matters, who can open the door and what to do next. This two-minute tour covers the essentials.' },
  { route: '/', target: 'nav', title: 'Your workspace', body: 'Every stage of the investment lifecycle lives here, from thesis and signals through IC and portfolio to exit. Investor Network holds DayOne’s real raise databases.' },
  { route: '/', target: 'focus', title: 'Start with what matters', body: 'The Morning Brief opens on the three things that need you today. Each card is one click from action.' },
  { route: '/', target: 'globe', title: 'The live investment graph', body: 'A WebGL globe of the pipeline. Switch between Pipeline, Transactions and Access. Rings pulse where fresh signals landed, and clicking a point opens the company.' },
  { route: '/', target: 'priority', title: 'Explainable priorities', body: 'Opportunities are ranked by a seven-factor score: fit, signal, timing, access, evidence, risk and actionability. Click any score ring to see the evidence behind it.' },
  { route: '/', target: 'livewire', title: 'Real market data', body: 'This wire streams live public signals (funding rounds, buyouts, M&A, leadership changes and SEC Form D filings), each scored against DayOne’s theses.' },
  { route: '/radar', target: 'radar', title: 'Deal Radar', body: 'Your full queue, sortable by any factor. Bookmark to watch, or click a number to drill into that factor’s evidence.' },
  { route: '/company/c1', target: 'scoreband', title: 'The investment case', body: 'Each company page assembles why-now, catalysts, risks, contradictions, signals, comparables and sources, so the case is always evidence-backed.' },
  { route: '/relationships/c1', target: 'graph', title: 'Who can open the door', body: 'Warm paths from the DayOne team to a target’s leadership, ranked by strength and recency, with a suggested ask.' },
  { route: '/diligence/c1', target: 'copilot', title: 'Diligence Copilot', body: 'Interrogate a deal in plain English. Otto answers from the dossier with numbered citations, flags contradictions and drafts management questions.' },
  { route: '/ic/c1', target: 'decision', title: 'IC Room', body: 'One-page brief, risk matrix, evidence matrix and IC questions. Decisions are recorded to Decision Memory with the evidence available at the time.' },
  { route: '/investors', target: 'investor-lens', title: 'Investor Network', body: 'Wigo Energy and BLKBOXX investor databases merged into one firm-level map, with Wigo’s fit research and Ask Otto for fundraising questions.' },
  { route: '/', target: 'search', title: 'Ask anything', body: 'Press Ctrl K to search or ask Otto a question in natural language across companies, signals, people and sponsors.' },
  { route: '/', target: 'voice', title: 'Talk to Otto', body: 'Tap the orb and speak. Otto can answer questions and drive the app for you, e.g. “open Northwind’s IC room” or “show me live funding rounds”.' },
]

const KEY = 'otto.toured'

export function startTour() { window.dispatchEvent(new Event('otto:tour')) }

export function Tour() {
  const [i, setI] = useState<number | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const nav = useNavigate()
  const loc = useLocation()

  // Auto-start once for first-time visitors, after the intro splash.
  useEffect(() => {
    let seen = true
    try { seen = localStorage.getItem(KEY) === '1' } catch { /* ignore */ }
    const start = () => setI(0)
    window.addEventListener('otto:tour', start)
    const t = !seen && loc.pathname === '/' ? window.setTimeout(start, 3200) : undefined
    return () => { window.removeEventListener('otto:tour', start); if (t) window.clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const step = i === null ? null : STEPS[i]

  useEffect(() => {
    if (!step) return
    if (step.route && loc.pathname !== step.route) nav(step.route)
  }, [step, loc.pathname, nav])

  const measure = useCallback(() => {
    if (!step?.target) { setRect(null); return }
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step])

  useLayoutEffect(() => {
    if (!step) return
    setRect(null)
    if (!step.target) return
    let tries = 0
    const t = window.setInterval(() => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el || ++tries > 30) {
        window.clearInterval(t)
        if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); window.setTimeout(measure, 450) }
      }
    }, 100)
    const on = () => measure()
    window.addEventListener('resize', on)
    document.addEventListener('scroll', on, true)
    return () => { window.clearInterval(t); window.removeEventListener('resize', on); document.removeEventListener('scroll', on, true) }
  }, [step, measure])

  const close = () => { setI(null); try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } }
  useEffect(() => {
    if (i === null) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setI((x) => (x !== null && x < STEPS.length - 1 ? x + 1 : x))
      if (e.key === 'ArrowLeft') setI((x) => (x ? x - 1 : x))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [i])

  if (!step || i === null) return null
  const pad = 8
  const vw = window.innerWidth, vh = window.innerHeight
  const cardW = Math.min(360, vw - 32)
  let card: React.CSSProperties = { left: (vw - cardW) / 2, top: vh / 2 - 110, width: cardW }
  if (rect) {
    const below = rect.bottom + 14 + 200 < vh
    const left = Math.max(16, Math.min(vw - cardW - 16, rect.left + rect.width / 2 - cardW / 2))
    const sideFits = rect.width < vw * 0.45 && rect.right + 14 + cardW < vw
    card = sideFits && rect.height > 240
      ? { left: rect.right + 14, top: Math.max(16, Math.min(vh - 240, rect.top + 20)), width: cardW }
      : { left, top: below ? rect.bottom + 14 : Math.max(16, rect.top - 14 - 210), width: cardW }
  }
  const last = i === STEPS.length - 1

  return (
    <div className="tour" role="dialog" aria-label="Product tour">
      {rect
        ? <div className="tour-hole" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
        : <div className="tour-dim" />}
      <div className="tour-card" style={card}>
        <div className="row between">
          <div className="row" style={{ gap: 8 }}><LogoMark size={20} /><span className="eyebrow accent">Tour · {i + 1} of {STEPS.length}</span></div>
          <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={close} aria-label="Close tour"><X size={14} /></button>
        </div>
        <div className="tour-title">{step.title}</div>
        <p className="small t2" style={{ margin: '6px 0 0', lineHeight: 1.6 }}>{step.body}</p>
        <div className="row between mt-16">
          <div className="tour-dots">{STEPS.map((_, k) => <i key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />)}</div>
          <div className="row" style={{ gap: 6 }}>
            {i > 0 && <button className="btn sm ghost" onClick={() => setI(i - 1)}><ArrowLeft />Back</button>}
            <button className="btn sm primary" onClick={() => (last ? close() : setI(i + 1))}>{last ? 'Finish' : i === 0 ? 'Start tour' : 'Next'}{!last && <ArrowRight />}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
