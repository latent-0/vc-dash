import { Briefcase, Building2, Cog, Crown, LineChart, Package, ShieldAlert, Users } from 'lucide-react'
import type { Company, Scores, SignalFamily } from '../data/types'
import { TODAY } from '../data/seed'

export const SCORE_META: { key: keyof Scores; label: string; q: string; weight: number; invert?: boolean }[] = [
  { key: 'fit', label: 'Thesis Fit', q: 'How closely the company matches the active strategy', weight: 0.24 },
  { key: 'signal', label: 'Signal Strength', q: 'How meaningful and convergent recent changes are', weight: 0.16 },
  { key: 'timing', label: 'Timing', q: 'Whether there is a current catalyst or decision window', weight: 0.18 },
  { key: 'access', label: 'Access', q: 'Quality of available relationship paths', weight: 0.14 },
  { key: 'evidence', label: 'Evidence Coverage', q: 'How much of the case is supported', weight: 0.1 },
  { key: 'risk', label: 'Risk Load', q: 'Number / importance of unresolved negative signals', weight: 0.08, invert: true },
  { key: 'action', label: 'Actionability', q: 'Whether the team has a practical next move', weight: 0.1 },
]

export function opportunityScore(s: Scores) {
  return Math.round(SCORE_META.reduce((acc, m) => acc + (m.invert ? 100 - s[m.key] : s[m.key]) * m.weight, 0))
}

export const FAMILY: Record<SignalFamily, { color: string; icon: typeof Crown }> = {
  Leadership: { color: '#ff8a1f', icon: Crown },
  Capital: { color: '#6fbf93', icon: LineChart },
  Operations: { color: '#7fa6dc', icon: Cog },
  Market: { color: '#a894d9', icon: Building2 },
  Risk: { color: '#e07a6b', icon: ShieldAlert },
  Product: { color: '#5fb8b0', icon: Package },
  People: { color: '#ffb35c', icon: Users },
  Ownership: { color: '#d9a54a', icon: Briefcase },
}

export const STATUS_COLOR: Record<Company['status'], string> = {
  Tracking: '#7f8590', Screening: '#7fa6dc', Diligence: '#a894d9', IC: '#ff8a1f', Portfolio: '#6fbf93', Passed: '#545a64',
}

export function ago(iso: string) {
  const d = (TODAY.getTime() - new Date(iso).getTime()) / 86400000
  if (d < 1 / 24) return 'just now'
  if (d < 1) return `${Math.max(1, Math.round(d * 24))}h ago`
  if (d < 30) return `${Math.round(d)}d ago`
  if (d < 365) return `${Math.round(d / 30)}mo ago`
  return `${(d / 365).toFixed(1)}y ago`
}
export const daysSince = (iso: string) => (TODAY.getTime() - new Date(iso).getTime()) / 86400000
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const money = (m: number) => (Math.abs(m) >= 1000 ? `$${(m / 1000).toFixed(1)}bn` : `$${m.toFixed(m < 10 ? 1 : 0)}m`)
export const scoreColor = (v: number, invert = false) => {
  const x = invert ? 100 - v : v
  return x >= 80 ? 'var(--pos)' : x >= 62 ? 'var(--accent)' : x >= 45 ? 'var(--warn)' : 'var(--neg)'
}
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')
