import { useId } from 'react'

export function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffc21a" />
          <stop offset=".5" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#ff4d0a" />
        </linearGradient>
      </defs>
      <rect x="19" y="8" width="3.2" height="48" fill={`url(#${id})`} />
      <path d="M26 17 A15 15 0 0 1 26 47 Z" fill={`url(#${id})`} />
    </svg>
  )
}

export function LogoFull({ size = 96 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.12 }}>
      <LogoMark size={size} />
      <div className="wordmark" style={{ fontSize: size * 0.42, lineHeight: 1, paddingLeft: '0.32em' }}>DAYONE</div>
      <div style={{ fontSize: size * 0.13, letterSpacing: '0.42em', color: 'var(--text-2)', paddingLeft: '0.42em' }}>VENTURE PARTNERS</div>
    </div>
  )
}
