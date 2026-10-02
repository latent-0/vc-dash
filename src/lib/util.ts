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
  Leadership: { color: '#e2711d', icon: Crown },
  Capital: { color: '#2e8657', icon: LineChart },
  Operations: { color: '#3d6fb2', icon: Cog },
  Market: { color: '#7a5fc0', icon: Building2 },
  Risk: { color: '#c2463a', icon: ShieldAlert },
  Product: { color: '#2b8a82', icon: Package },
  People: { color: '#d98a2b', icon: Users },
  Ownership: { color: '#a87420', icon: Briefcase },
}

export const STATUS_COLOR: Record<Company['status'], string> = {
  Tracking: '#8a8276', Screening: '#3d6fb2', Diligence: '#7a5fc0', IC: '#e2711d', Portfolio: '#2e8657', Passed: '#b0a898',
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
