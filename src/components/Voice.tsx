import { useConversation } from '@elevenlabs/react'
import { Mic, PhoneOff, Send, Square, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { companies, me, portfolio, theses } from '../data/seed'
import { opportunityScore } from '../lib/util'
import { useLive } from '../lib/live'
import { queryContext, streamAsk } from '../lib/ask'
import { LogoMark } from './Logo'
import { startTour } from './Tour'
import { useApp } from './ui'

/*
  Otto Voice
  1. Realtime (preferred): ElevenLabs Agents over WebRTC — streaming ASR, LLM, TTS, barge-in.
     App control + data questions run as client tools (ask_otto → Groq over DayOne data).
  2. Fallback turn-based pipeline: ElevenLabs Scribe / browser ASR → Groq agent → ElevenLabs v3 / browser TTS.
*/

type Phase = 'idle' | 'connecting' | 'listening' | 'transcribing' | 'thinking' | 'speaking'
type Line = { role: 'user' | 'otto'; text: string }

const stripTags = (t: string) => t.replace(/\[[^\]]{1,24}\]\s*/g, '').trim()
const findCompany = (name: string) => {
  const n = name.toLowerCase().replace(/[^a-z0-9 ]/g, '')
  return companies.find((c) => c.name.toLowerCase().includes(n)) ?? companies.find((c) => n.includes(c.name.toLowerCase().split(' ')[0]))
}
const INVESTOR_Q = /investor|fund(?!ing round)|family office|angel|lp\b|raise|fundrais|endowment|wealth manager/i

type InvestorFirm = { name: string; type: string; city: string; country: string; aum?: number; contacts: number; senior: number; focus?: string; stage?: string; lists: string[]; wigo?: unknown }
let investorCache: Promise<{ firms: InvestorFirm[] }> | null = null

export function Voice() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [lines, setLines] = useState<Line[]>([])
  const [note, setNote] = useState('')
  const [typed, setTyped] = useState('')
  const [level, setLevel] = useState(0)
  const [realtime, setRealtime] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const live = useLive()
  const { toggleWatch, watch, toast } = useApp()
  const locRef = useRef(loc.pathname)
  locRef.current = loc.pathname
  const liveRef = useRef(live.signals)
  liveRef.current = live.signals
  const history = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])
  const fallbackRec = useRef<{ stop: () => void } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const serverStt = useRef(true)
  const push = (l: Line) => setLines((x) => [...x.slice(-7), l])

  /* ---------------- shared tools ---------------- */
  const askOtto = async (question: string) => {
    if (INVESTOR_Q.test(question)) {
      investorCache ??= fetch('/data/investors.json').then((r) => r.json())
      const { firms } = await investorCache
      const top = [...firms].sort((a, b) => (b.wigo ? 1 : 0) - (a.wigo ? 1 : 0) || (b.aum ?? 0) - (a.aum ?? 0)).slice(0, 100)
      return streamAsk({ mode: 'investors', question: `${question}\nAnswer in at most 3 spoken sentences.`, context: { totalFirms: firms.length, firms: top } }, () => {})
    }
    return streamAsk({ mode: 'query', question: `${question}\nAnswer in at most 3 spoken sentences, no lists.`, context: queryContext(liveRef.current) }, () => {})
  }
  const openCompany = (name: string, view = 'profile') => {
    const c = findCompany(name)
    if (!c) return `No tracked company matches "${name}".`
    const path = view === 'ic' ? `/ic/${c.id}` : view === 'relationships' ? `/relationships/${c.id}` : view === 'diligence' ? `/diligence/${c.id}` : `/company/${c.id}`
    nav(path)
    return `Opened ${c.name} (${view}).`
  }
  const appContext = () => JSON.stringify({
    page: locRef.current,
    pageTitle: document.querySelector('.h1')?.textContent ?? '',
    companies: companies.slice(0, 40).map((c) => `${c.name} (${c.status}, score ${opportunityScore(c.scores)})`),
    theses: theses.map((t) => t.name),
    portfolioOnWatch: portfolio.filter((p) => p.health !== 'Strong').map((p) => companies.find((c) => c.id === p.companyId)?.name),
  })

  const clientTools = {
    navigate: ({ path }: { path?: string }) => { if (path?.startsWith('/')) { nav(path); return `Navigated to ${path}.` } return 'Invalid path.' },
    open_company: ({ name, view }: { name?: string; view?: string }) => openCompany(name ?? '', view),
    ask_otto: async ({ question }: { question?: string }) => { try { return await askOtto(question ?? '') } catch { return 'Data lookup failed; please try again.' } },
    run_query: ({ text }: { text?: string }) => { nav(`/query?q=${encodeURIComponent(text ?? '')}`); return 'Query is on screen.' },
    search_investors: ({ query }: { query?: string }) => { nav(`/investors?q=${encodeURIComponent(query ?? '')}`); return `Investor Network filtered by "${query}".` },
    add_to_watchlist: ({ name }: { name?: string }) => {
      const c = findCompany(name ?? '')
      if (!c) return 'Company not found.'
      if (!watch.has(c.id)) toggleWatch(c.id)
      toast(`${c.name} added to watchlist`)
      return `${c.name} is on the watchlist.`
    },
    start_tour: () => { setOpen(false); window.setTimeout(startTour, 400); return 'Tour started.' },
    get_app_context: () => appContext(),
  }

  /* ---------------- realtime (ElevenLabs Agents) ---------------- */
  const convo = useConversation({
    onConnect: () => { setRealtime(true); setPhase('listening'); setNote('') },
    onDisconnect: () => { setRealtime(false); setPhase('idle'); setLevel(0) },
    onError: (e: unknown) => { setNote(`Voice error: ${String(e).slice(0, 120)}`); setPhase('idle') },
    onMessage: (m: { message: string; source?: string; role?: string }) => {
      const role = (m.role ?? m.source) === 'user' ? 'user' : 'otto'
      if (m.message?.trim()) push({ role, text: stripTags(m.message) })
    },
    onModeChange: ({ mode }: { mode: string }) => setPhase(mode === 'speaking' ? 'speaking' : 'listening'),
  })

  useEffect(() => {
    if (!realtime) return
    convo.sendContextualUpdate(`The user is now viewing ${loc.pathname} (${document.title}).`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname, realtime])

  useEffect(() => {
    if (!realtime) return
    let raf = 0
    const tick = () => { setLevel(Math.min(1, (convo.isSpeaking ? convo.getOutputVolume() : convo.getInputVolume()) * 1.6)); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [realtime, convo])

  const startRealtime = async (): Promise<boolean> => {
    setPhase('connecting')
    try {
      const r = await fetch('/api/voice/session')
      if (!r.ok) return false
      const s = await r.json()
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const base = { dynamicVariables: { user_name: me.name.split(' ')[0], current_page: locRef.current }, clientTools }
      convo.startSession(s.conversationToken ? { ...base, conversationToken: s.conversationToken, connectionType: 'webrtc' } : { ...base, signedUrl: s.signedUrl })
      return true
    } catch {
      return false
    }
  }

  /* ---------------- fallback pipeline ---------------- */
  const sayFallback = async (text: string) => {
    setPhase('speaking')
    try {
      const r = await fetch('/api/voice/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
      if (!r.ok) throw new Error()
      const url = URL.createObjectURL(await r.blob())
      const a = new Audio(url)
      audioRef.current = a
      a.onended = () => { setPhase('idle'); URL.revokeObjectURL(url) }
      await a.play()
    } catch {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(stripTags(text))
        u.onend = () => setPhase('idle')
        speechSynthesis.speak(u)
      } else setPhase('idle')
    }
  }

  const thinkFallback = async (text: string) => {
    if (!text.trim()) { setPhase('idle'); setNote('I didn’t catch that.'); return }
    push({ role: 'user', text })
    setPhase('thinking')
    try {
      const r = await fetch('/api/voice/agent', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcript: text, history: history.current, context: { currentPage: locRef.current, app: appContext(), liveHeadlines: liveRef.current.slice(0, 12).map((s) => s.title), companyIds: companies.map((c) => `${c.id}=${c.name}`) } }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      history.current = [...history.current, { role: 'user' as const, content: text }, { role: 'assistant' as const, content: JSON.stringify(d) }].slice(-8)
      push({ role: 'otto', text: stripTags(d.say) })
      for (const a of d.actions ?? []) {
        if (a.type === 'navigate' && a.path) nav(a.path)
        else if (a.type === 'query' && a.text) nav(`/query?q=${encodeURIComponent(a.text)}`)
        else if (a.type === 'watch' && a.companyId && !watch.has(a.companyId)) toggleWatch(a.companyId)
        else if (a.type === 'tour') { setOpen(false); startTour() }
      }
      await sayFallback(d.say)
    } catch {
      setPhase('idle'); push({ role: 'otto', text: 'I’m unavailable right now. Please try again.' })
    }
  }

  const listenFallback = async () => {
    if (phase === 'listening') { fallbackRec.current?.stop(); return }
    const C = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
    if (serverStt.current) {
      let stream: MediaStream
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch { setNote('Microphone permission is needed.'); setPhase('idle'); return }
      const mr = new MediaRecorder(stream)
      const chunks: Blob[] = []
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      const ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 1024
      ctx.createMediaStreamSource(stream).connect(an)
      const buf = new Uint8Array(an.fftSize)
      let spoke = false, quiet = performance.now(), raf = 0
      const t0 = performance.now()
      const stop = () => { cancelAnimationFrame(raf); if (mr.state !== 'inactive') mr.stop() }
      const tick = () => {
        an.getByteTimeDomainData(buf)
        let s = 0; for (const v of buf) s += ((v - 128) / 128) ** 2
        const rms = Math.sqrt(s / buf.length); setLevel(Math.min(1, rms * 8))
        const now = performance.now()
        if (rms > 0.035) { spoke = true; quiet = now }
        if ((spoke && now - quiet > 1100) || now - t0 > 15000 || (!spoke && now - t0 > 7000)) return stop()
        raf = requestAnimationFrame(tick)
      }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop()); ctx.close(); setLevel(0)
        if (!spoke) { setPhase('idle'); return }
        setPhase('transcribing')
        const fd = new FormData(); fd.append('audio', new Blob(chunks, { type: mr.mimeType || 'audio/webm' }), 'speech.webm')
        const r = await fetch('/api/voice/stt', { method: 'POST', body: fd }).catch(() => null)
        if (!r || !r.ok) { serverStt.current = false; setPhase('idle'); setNote('Using browser speech recognition — tap again.'); return }
        thinkFallback((await r.json()).text ?? '')
      }
      fallbackRec.current = { stop }
      mr.start(); setPhase('listening'); raf = requestAnimationFrame(tick)
      return
    }
    const Rec = C.SpeechRecognition ?? C.webkitSpeechRecognition
    if (!Rec) { setNote('Voice input isn’t supported here; type below.'); return }
    const r = new Rec(); r.lang = 'en-US'; r.interimResults = false
    let got = ''
    r.onresult = (e) => { got = e.results[0][0].transcript }
    r.onend = () => thinkFallback(got)
    r.onerror = () => setPhase('idle')
    fallbackRec.current = r; setPhase('listening'); r.start()
  }

  /* ---------------- controls ---------------- */
  const toggle = async () => {
    setOpen(true)
    if (realtime) { convo.endSession(); return }
    if (phase !== 'idle' && phase !== 'listening') return
    if (phase === 'listening') return listenFallback()
    window.speechSynthesis?.cancel(); audioRef.current?.pause()
    if (!(await startRealtime())) { setNote(''); setPhase('idle'); listenFallback() }
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.altKey && e.key.toLowerCase() === 'o') { e.preventDefault(); toggle() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  const sendTyped = (t: string) => {
    if (!t.trim()) return
    if (realtime) { convo.sendUserMessage(t); push({ role: 'user', text: t }) } else thinkFallback(t)
  }

  const label = realtime
    ? phase === 'speaking' ? 'Otto is speaking' : 'Listening — just talk'
    : { idle: 'Talk to Otto', connecting: 'Connecting…', listening: 'Listening…', transcribing: 'Transcribing…', thinking: 'Thinking…', speaking: 'Speaking…' }[phase]

  return (
    <>
      {open && (
        <div className="voice-panel">
          <div className="row between">
            <div className="row" style={{ gap: 8 }}>
              <LogoMark size={18} /><span className="small" style={{ fontWeight: 600 }}>Otto Voice</span>
              <span className={`live-pill ${realtime ? 'live' : ''}`}>{realtime ? 'REALTIME' : 'ELEVENLABS'}</span>
            </div>
            <div className="row" style={{ gap: 2 }}>
              {realtime && <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => convo.endSession()} title="End conversation"><PhoneOff size={14} /></button>}
              <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => { if (realtime) convo.endSession(); setOpen(false) }} aria-label="Close"><X size={14} /></button>
            </div>
          </div>
          <div className="voice-body">
            {!lines.length && <div className="small muted">Try “What changed overnight?”, “Open Northwind’s IC room”, “Which family offices fit Wigo?” or “Give me the tour”. You can interrupt Otto anytime.</div>}
            {lines.map((l, i) => (
              <div key={i} className={l.role === 'user' ? 'voice-you' : 'voice-otto'} style={{ marginTop: i ? 8 : 0 }}>
                <span className={`xs ${l.role === 'user' ? 'muted' : 'accent'}`}>{l.role === 'user' ? 'You' : 'Otto'}</span>
                <div className="small">{l.text}</div>
              </div>
            ))}
            {(phase === 'thinking' || phase === 'connecting') && <div className="typing" style={{ marginTop: 10 }}><i /><i /><i /></div>}
            {note && <div className="xs muted mt-8">{note}</div>}
          </div>
          <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); sendTyped(typed); setTyped('') }}>
            <input className="input" style={{ height: 32 }} placeholder="Or type to Otto…" value={typed} onChange={(e) => setTyped(e.target.value)} />
            <button className="btn sm" type="submit" aria-label="Send"><Send /></button>
          </form>
        </div>
      )}
      <button data-tour="voice" className={`voice-orb ${realtime ? `rt ${phase}` : phase}`} style={{ '--lvl': level } as React.CSSProperties} onClick={toggle} title="Talk to Otto (Alt+O)" aria-label="Talk to Otto">
        <span className="voice-ring" />
        {realtime ? <span className="voice-bars">{[0, 1, 2, 3].map((i) => <i key={i} style={{ height: `${6 + level * (10 + i * 4)}px` }} />)}</span> : phase === 'listening' ? <Square size={16} /> : <Mic size={18} />}
        <span className="voice-label">{label}</span>
      </button>
    </>
  )
}

interface SpeechRecognitionLike { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void }
