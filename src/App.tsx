import { LogoFull } from './components/Logo'

export default function App() {
  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'radial-gradient(ellipse at 50% 40%, rgba(255,138,31,0.08), transparent 60%), var(--ink-0)' }}>
      <div style={{ textAlign: 'center' }}>
        <LogoFull size={110} />
        <div className="eyebrow mt-24">Bryant · Private Capital Intelligence</div>
        <p className="lede" style={{ margin: '10px auto 0' }}>Find the signal. Understand the case. Move first.</p>
      </div>
    </div>
  )
}
