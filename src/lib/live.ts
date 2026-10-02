import { useEffect, useSyncExternalStore } from 'react'
import type { SignalFamily } from '../data/types'

export interface LiveSignal {
  id: string
  title: string
  source: string
  url: string
  date: string
  family: SignalFamily
  type: string
  thesis: string | null
  relevance: number
  origin: 'news' | 'sec'
}
interface LiveState { status: 'loading' | 'live' | 'error'; updatedAt: string | null; signals: LiveSignal[] }

let state: LiveState = { status: 'loading', updatedAt: null, signals: [] }
const subs = new Set<() => void>()
const set = (s: LiveState) => { state = s; subs.forEach((f) => f()) }
let started = false

async function load() {
  try {
    const r = await fetch('/api/live')
    if (!r.ok) throw new Error(String(r.status))
    const d = await r.json()
    set({ status: 'live', updatedAt: d.updatedAt, signals: d.signals })
  } catch {
    set({ ...state, status: state.signals.length ? 'live' : 'error' })
  }
}

/** Live public-market signals (news + optional SEC Form D), refreshed every 2 minutes. */
export function useLive() {
  useEffect(() => {
    if (started) return
    started = true
    load()
    const t = window.setInterval(load, 120_000)
    return () => { window.clearInterval(t); started = false }
  }, [])
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state)
}

export function timeAgo(iso: string) {
  const m = Math.max(0, (Date.now() - Date.parse(iso)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${Math.round(m)}m ago`
  if (m < 1440) return `${Math.round(m / 60)}h ago`
  return `${Math.round(m / 1440)}d ago`
}
