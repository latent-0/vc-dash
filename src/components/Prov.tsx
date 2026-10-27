import { confColor, confLabel, type Firm } from '../lib/investors'

/** Compact provenance badge: data confidence, source database(s) and last verification date. */
export function Prov({ f }: { f: Pick<Firm, 'prov'> }) {
  return (
    <div className="prov" title={`Source: DayOne LP database ${f.prov.src.join(' + ')} · verified ${f.prov.verified ?? 'never'} · confidence ${f.prov.conf}/100`}>
      <span className="dot" style={{ background: confColor(f.prov.conf) }} />
      <span className="xs">{confLabel(f.prov.conf)}</span>
      <span className="xs faint">· DB {f.prov.src.join('+')}{f.prov.verified ? ` · ✓ ${f.prov.verified.slice(5)}` : ''}</span>
    </div>
  )
}
