import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LogoFull } from './components/Logo'
import { Shell } from './components/Shell'
import { AppProvider } from './components/ui'
import { GlobeFallback } from './pages/Dashboard'
import Dashboard from './pages/Dashboard'

const pages = {
  Thesis: lazy(() => import('./pages/Thesis')),
  Signals: lazy(() => import('./pages/Signals')),
  Radar: lazy(() => import('./pages/Radar')),
  Query: lazy(() => import('./pages/Query')),
  Company: lazy(() => import('./pages/Company')),
  Relationships: lazy(() => import('./pages/Relationships')),
  Diligence: lazy(() => import('./pages/Diligence')),
  IC: lazy(() => import('./pages/IC')),
  Memory: lazy(() => import('./pages/Memory')),
  Portfolio: lazy(() => import('./pages/Portfolio')),
  Value: lazy(() => import('./pages/Value')),
  Exit: lazy(() => import('./pages/Exit')),
  Sponsors: lazy(() => import('./pages/Sponsors')),
  Watchlists: lazy(() => import('./pages/Watchlists')),
}

function Splash() {
  const [out, setOut] = useState(() => { try { return sessionStorage.getItem('bryant.splash') === '1' } catch { return false } })
  const [gone, setGone] = useState(out)
  useEffect(() => {
    if (out) return
    const t1 = window.setTimeout(() => { setOut(true); try { sessionStorage.setItem('bryant.splash', '1') } catch { /* ignore */ } }, 1900)
    const t2 = window.setTimeout(() => setGone(true), 2600)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [out])
  if (gone) return null
  return (
    <div className={`splash ${out ? 'out' : ''}`} onClick={() => setOut(true)}>
      <div className="splash-inner">
        <LogoFull size={92} />
        <div className="splash-line" />
        <div className="eyebrow mt-16" style={{ letterSpacing: '0.3em' }}>Bryant · Private Capital Intelligence</div>
      </div>
    </div>
  )
}

export default function App() {
  const P = pages
  return (
    <BrowserRouter>
      <AppProvider>
        <Splash />
        <Shell>
          <Suspense fallback={<div className="page" style={{ height: 400 }}><GlobeFallback /></div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/thesis" element={<P.Thesis />} />
              <Route path="/thesis/:id" element={<P.Thesis />} />
              <Route path="/signals" element={<P.Signals />} />
              <Route path="/radar" element={<P.Radar />} />
              <Route path="/query" element={<P.Query />} />
              <Route path="/company/:id" element={<P.Company />} />
              <Route path="/relationships" element={<P.Relationships />} />
              <Route path="/relationships/:id" element={<P.Relationships />} />
              <Route path="/diligence" element={<P.Diligence />} />
              <Route path="/diligence/:id" element={<P.Diligence />} />
              <Route path="/ic" element={<P.IC />} />
              <Route path="/ic/:id" element={<P.IC />} />
              <Route path="/memory" element={<P.Memory />} />
              <Route path="/portfolio" element={<P.Portfolio />} />
              <Route path="/value" element={<P.Value />} />
              <Route path="/exit" element={<P.Exit />} />
              <Route path="/sponsors" element={<P.Sponsors />} />
              <Route path="/watchlists" element={<P.Watchlists />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </Suspense>
        </Shell>
      </AppProvider>
    </BrowserRouter>
  )
}
