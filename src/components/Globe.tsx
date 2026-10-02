import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { MeshPhongMaterial, Color } from 'three'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import { useNavigate } from 'react-router-dom'
import { companies, signals, sponsors, transactions } from '../data/seed'
import type { Company } from '../data/types'
import { STATUS_COLOR, daysSince, money, opportunityScore } from '../lib/util'

export type GlobeMode = 'deals' | 'flows' | 'network'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countries = ((feature(world as any, (world as any).objects.countries) as any).features as { properties: { name: string } }[])
  // H3 fails to tile North Korea's ring at res 3; Antarctica adds visual noise.
  .filter((f) => f.properties.name !== 'North Korea' && f.properties.name !== 'Antarctica')
const HQ = { lat: 40.71, lng: -74.0 }
const ISO_NAME: Record<string, string> = { US: 'United States of America', UK: 'United Kingdom', CZ: 'Czechia', DK: 'Denmark', NL: 'Netherlands', DE: 'Germany', IL: 'Israel', CA: 'Canada', IE: 'Ireland', SG: 'Singapore', AU: 'Australia', BR: 'Brazil', IT: 'Italy', FR: 'France', JP: 'Japan', IN: 'India', AE: 'United Arab Emirates' }
const activeCountries = new Set(companies.map((c) => ISO_NAME[c.country]))

type Pt = { lat: number; lng: number; c?: Company; size: number; color: string; label: string; kind: 'company' | 'hq' | 'sponsor' }

export default function InvestmentGlobe({ mode = 'deals', height, focus }: { mode?: GlobeMode; height?: number; focus?: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const ref = useRef<GlobeMethods | undefined>(undefined)
  const [size, setSize] = useState({ w: 600, h: height ?? 480 })
  const nav = useNavigate()

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: height ?? e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [height])

  const material = useMemo(() => new MeshPhongMaterial({ color: new Color('#fbf7ef'), emissive: new Color('#efe6d6'), emissiveIntensity: 0.55, shininess: 4 }), [])

  const points: Pt[] = useMemo(() => {
    const cps: Pt[] = companies.map((c) => ({
      lat: c.lat, lng: c.lng, c, kind: 'company',
      size: 0.12 + (opportunityScore(c.scores) / 100) * 0.42,
      color: STATUS_COLOR[c.status],
      label: c.name,
    }))
    const hq: Pt = { ...HQ, size: 0.6, color: '#f4a524', label: 'DayOne — New York', kind: 'hq' }
    const sp: Pt[] = mode === 'flows' ? sponsors.map((s) => ({ lat: s.lat, lng: s.lng, size: 0.25, color: '#4a443b', label: `${s.name} · ${s.type}`, kind: 'sponsor' as const })) : []
    return [...cps, hq, ...sp]
  }, [mode])

  const rings = useMemo(() => {
    const fresh = new Map<string, number>()
    signals.forEach((s) => { if (daysSince(s.date) < 10) fresh.set(s.companyId, Math.max(fresh.get(s.companyId) ?? 0, s.magnitude)) })
    return [...fresh.entries()].map(([id, mag]) => {
      const c = companies.find((x) => x.id === id)!
      return { lat: c.lat, lng: c.lng, maxR: 2 + (mag / 100) * 3.5, speed: 1.4, period: 1400 + Math.random() * 900, color: mag > 80 ? '#e2711d' : '#f4a524' }
    })
  }, [])

  const arcs = useMemo(() => {
    if (mode === 'flows') {
      return transactions.map((t) => ({
        startLat: t.fromLat, startLng: t.fromLng, endLat: t.toLat, endLng: t.toLng,
        color: t.buyer.startsWith('DayOne') ? ['rgba(244,165,36,0.95)', 'rgba(224,84,26,0.95)'] : t.type === 'Strategic' ? ['rgba(122,95,192,0.15)', 'rgba(122,95,192,0.9)'] : ['rgba(61,111,178,0.15)', 'rgba(61,111,178,0.9)'],
        label: `${t.buyer} → ${t.target} · ${t.type}${t.ev ? ` · ${money(t.ev)}` : ''}`,
      }))
    }
    const pool = mode === 'network'
      ? companies.filter((c) => c.scores.access > 62)
      : companies.filter((c) => c.status === 'IC' || c.status === 'Diligence' || c.status === 'Portfolio' || c.id === focus)
    return pool.map((c) => ({
      startLat: HQ.lat, startLng: HQ.lng, endLat: c.lat, endLng: c.lng,
      color: c.status === 'Portfolio' ? ['rgba(46,134,87,0.15)', 'rgba(46,134,87,0.9)'] : ['rgba(244,165,36,0.2)', 'rgba(224,84,26,0.95)'],
      label: `${c.name} · ${c.status}`,
    }))
  }, [mode, focus])

  useEffect(() => {
    const g = ref.current
    if (!g) return
    const ctr = g.controls()
    ctr.autoRotate = true
    ctr.autoRotateSpeed = 0.35
    ctr.enableZoom = true
    ctr.minDistance = 160
    ctr.maxDistance = 520
    const f = focus ? companies.find((c) => c.id === focus) : null
    g.pointOfView(f ? { lat: f.lat, lng: f.lng, altitude: 1.6 } : { lat: 34, lng: -40, altitude: 2.15 }, 1200)
    const scene = g.scene()
    scene.traverse((o) => { if ((o as { isDirectionalLight?: boolean }).isDirectionalLight) (o as unknown as { intensity: number }).intensity = 1.1 })
  }, [focus, size.w])

  return (
    <div ref={wrap} style={{ width: '100%', height: height ?? '100%', cursor: 'grab' }}>
      <Globe
        ref={ref}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={material}
        showAtmosphere
        atmosphereColor="#e2711d"
        atmosphereAltitude={0.16}
        hexPolygonsData={countries}
        hexPolygonResolution={3}
        hexPolygonMargin={0.42}
        hexPolygonUseDots
        hexPolygonColor={(d: object) => (activeCountries.has((d as { properties: { name: string } }).properties.name) ? 'rgba(226,113,29,0.75)' : 'rgba(74,62,44,0.32)')}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={(d: object) => (d as Pt).size * 0.12}
        pointRadius={(d: object) => ((d as Pt).kind === 'hq' ? 0.55 : 0.32)}
        pointsMerge={false}
        pointLabel={(d: object) => {
          const p = d as Pt
          if (!p.c) return `<div class="globe-tip"><b>${p.label}</b></div>`
          const c = p.c
          return `<div class="globe-tip"><div class="k">${c.city} · ${c.sector}</div><b>${c.name}</b><div style="margin-top:6px;display:flex;gap:14px"><span><span class="k">Score</span> <span style="font-family:var(--mono)">${opportunityScore(c.scores)}</span></span><span><span class="k">Rev</span> <span style="font-family:var(--mono)">${money(c.revenue)}</span></span><span style="color:${STATUS_COLOR[c.status]}">${c.status}</span></div></div>`
        }}
        onPointClick={(d: object) => { const p = d as Pt; if (p.c) nav(`/company/${p.c.id}`) }}
        ringsData={rings}
        ringColor={(d: object) => (t: number) => `${(d as { color: string }).color}${Math.round((1 - t) * 200).toString(16).padStart(2, '0')}`}
        ringMaxRadius="maxR"
        ringPropagationSpeed="speed"
        ringRepeatPeriod="period"
        arcsData={arcs}
        arcColor="color"
        arcLabel={(d: object) => `<div class="globe-tip">${(d as { label: string }).label}</div>`}
        arcStroke={0.45}
        arcAltitudeAutoScale={0.42}
        arcDashLength={0.45}
        arcDashGap={0.18}
        arcDashInitialGap={() => Math.random()}
        arcDashAnimateTime={2600}
        animateIn
      />
    </div>
  )
}
