import { ArrowDown, ArrowUp, Bookmark, BookmarkCheck, Filter, Radar as RadarIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CompanyLogo, FactorStrip, ScoreRing, StatusTag, useApp } from '../components/ui'
import { companies, team, theses } from '../data/seed'
import type { Company, Scores } from '../data/types'
import { SCORE_META, ago, cx, money, opportunityScore, scoreColor } from '../lib/util'

type SortKey = 'total' | keyof Scores | 'revenue' | 'growth' | 'lastChange'

export default function Radar() {
  const nav = useNavigate()
  const { inspect, watch, toggleWatch, toast } = useApp()
  const [thesis, setThesis] = useState<string>('all')
  const [status, setStatus] = useState<string>('active')
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'total', dir: -1 })

  const rows = useMemo(() => {
    let r = companies.filter((c) => c.status !== 'Portfolio')
    if (thesis !== 'all') r = r.filter((c) => c.thesisIds.includes(thesis))
    if (status === 'active') r = r.filter((c) => c.status !== 'Passed')
    else if (status !== 'all') r = r.filter((c) => c.status === status)
    const val = (c: Company): number | string => sort.k === 'total' ? opportunityScore(c.scores) : sort.k === 'revenue' ? c.revenue : sort.k === 'growth' ? c.growth : sort.k === 'lastChange' ? c.lastChange : c.scores[sort.k]
    return [...r].sort((a, b) => (val(a) > val(b) ? 1 : -1) * sort.dir)
  }, [thesis, status, sort])

  const Th = ({ k, children, r }: { k: SortKey; children: React.ReactNode; r?: boolean }) => (
    <th className={cx('sortable', r && 'r')} onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 }))}>
      {children}{sort.k === k && (sort.dir === -1 ? <ArrowDown size={10} style={{ verticalAlign: -1, marginLeft: 3 }} /> : <ArrowUp size={10} style={{ verticalAlign: -1, marginLeft: 3 }} />)}
    </th>
  )

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow accent"><RadarIcon size={11} style={{ verticalAlign: -1 }} /> Feature 03 · Deal Radar</div>
          <h1 className="h1">A prioritised queue of what <em>deserves attention</em>.</h1>
          <p className="lede">Every score is decomposed into seven visible factors — click any bar or ring to see the evidence behind it. No black-box probability.</p>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 10, marginBottom: 14 }}>
        <Filter size={14} className="muted" />
        <div className="seg">
          <button className={cx(thesis === 'all' && 'on')} onClick={() => setThesis('all')}>All theses</button>
          {theses.map((t) => <button key={t.id} className={cx(thesis === t.id && 'on')} onClick={() => setThesis(t.id)}><span className="dot" style={{ background: t.color, marginRight: 6 }} />{t.name.split(' ')[0]} {t.name.split(' ')[1]}</button>)}
        </div>
        <div className="seg">
          {['active', 'IC', 'Diligence', 'Screening', 'Tracking', 'Passed', 'all'].map((s) => <button key={s} className={cx(status === s && 'on')} onClick={() => setStatus(s)}>{s === 'active' ? 'Active' : s === 'all' ? 'All' : s}</button>)}
        </div>
        <span className="xs muted" style={{ marginLeft: 'auto' }}>{rows.length} opportunities</span>
      </div>

      <div className="panel table-wrap" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 30 }} />
              <th>Company</th>
              <Th k="total" r>Score</Th>
              {SCORE_META.map((m) => <Th key={m.key} k={m.key} r>{m.label.split(' ')[0]}</Th>)}
              <Th k="revenue" r>Rev</Th>
              <Th k="growth" r>Growth</Th>
              <th>Status</th>
              <th>Next action</th>
              <Th k="lastChange">Changed</Th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const total = opportunityScore(c.scores)
              const owner = team.find((m) => m.id === c.owner)!
              return (
                <tr key={c.id} className="clickable" onClick={() => nav(`/company/${c.id}`)}>
                  <td onClick={(e) => { e.stopPropagation(); toggleWatch(c.id); toast(watch.has(c.id) ? `Removed ${c.name} from watchlist` : `Added ${c.name} to watchlist`) }}>
                    {watch.has(c.id) ? <BookmarkCheck size={15} className="accent" /> : <Bookmark size={15} className="faint" />}
                  </td>
                  <td>
                    <div className="row" style={{ minWidth: 240 }}>
                      <CompanyLogo c={c} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500 }}>{c.name}</div>
                        <div className="xs muted">{c.subsector} · {c.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="r" onClick={(e) => { e.stopPropagation(); inspect(c.id) }}><div style={{ display: 'inline-block' }}><ScoreRing value={total} size={36} /></div></td>
                  {SCORE_META.map((m) => (
                    <td key={m.key} className="r num" style={{ color: scoreColor(c.scores[m.key], m.invert), cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); inspect(c.id, m.key) }}>{c.scores[m.key]}</td>
                  ))}
                  <td className="r num">{money(c.revenue)}</td>
                  <td className={cx('r num', c.growth > 40 ? 'pos' : 't2')}>{c.growth}%</td>
                  <td><StatusTag s={c.status} /></td>
                  <td className="small t2" style={{ maxWidth: 260 }}><div className="ellipsis">{c.nextAction}</div></td>
                  <td className="xs muted" style={{ whiteSpace: 'nowrap' }}>{ago(c.lastChange)}</td>
                  <td><div className="avatar sm" title={owner.name}>{owner.initials}</div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="row mt-12 xs muted wrap" style={{ gap: 16 }}>
        <span>Factor strip:</span>
        <FactorStrip s={{ fit: 90, signal: 80, timing: 75, access: 65, evidence: 55, risk: 30, action: 85 }} />
        <span>{SCORE_META.map((m) => m.label).join(' · ')}</span>
      </div>
    </div>
  )
}
