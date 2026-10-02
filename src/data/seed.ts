import type {
  Company, Decision, Edge, Member, Person, PortfolioAsset, Signal, SignalFamily, Source, Sponsor, Thesis, Transaction,
} from './types'

// Deterministic PRNG so the demo is stable across reloads.
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20261002)
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]
const between = (a: number, b: number) => a + rnd() * (b - a)

// Seeded records are positioned relative to the real current time so they sit naturally beside live data.
export const TODAY = new Date()
export const daysAgo = (d: number) => new Date(TODAY.getTime() - d * 86400000).toISOString()

export const FIRM = { name: 'DayOne Venture Partners', short: 'DayOne', fund: 'DayOne Fund III', aum: 2.4 }

export const team: Member[] = [
  { id: 'm1', name: 'Eleanor Whitcombe', title: 'Managing Partner', initials: 'EW' },
  { id: 'm2', name: 'Rafael Okafor', title: 'Partner, Software', initials: 'RO' },
  { id: 'm3', name: 'Sofia Lindqvist', title: 'Partner, Healthcare', initials: 'SL' },
  { id: 'm4', name: 'Julien Moreau', title: 'Principal', initials: 'JM' },
  { id: 'm5', name: 'Dana Castellano', title: 'Operating Partner', initials: 'DC' },
  { id: 'm6', name: 'Priya Raman', title: 'Associate', initials: 'PR' },
]
export const me = team[0]

export const theses: Thesis[] = [
  {
    id: 't1', name: 'Vertical Software & Adjacent Infrastructure', owner: 'm2', strategy: 'Buy-and-build', color: '#ff8a1f',
    sectors: ['Vertical SaaS', 'Payments infra', 'Data infrastructure'], geos: ['North America', 'Europe'], sizeBand: '$15–120m revenue',
    description: 'Mission-critical software for fragmented, under-digitised verticals where embedded payments and data create a second revenue engine. Platform + 3–5 add-ons over hold.',
    positive: ['Net revenue retention > 110%', 'Founder succession window', 'Embedded payments attach < 30%', 'Hiring acceleration in GTM'],
    negative: ['Customer concentration > 25%', 'Heavy services mix', 'Platform-risk from hyperscaler'],
    exclusions: ['Consumer', 'Ad-tech', 'Crypto'],
    adjacencies: ['Field-service software', 'Construction ERP', 'Specialty insurance tech', 'Logistics visibility'],
    universe: 4812, inThesis: 386, newlyQualifying: 23, drift: 0.18, version: 4,
  },
  {
    id: 't2', name: 'Industrial Automation Software', owner: 'm4', strategy: 'Buyout', color: '#7fa6dc',
    sectors: ['Industrial software', 'Robotics software', 'IoT'], geos: ['North America', 'Europe'], sizeBand: '$20–200m revenue',
    description: 'Software layers on top of installed industrial hardware — MES, predictive maintenance, quality and robotics orchestration — where reshoring drives budget.',
    positive: ['Reshoring capex exposure', 'Recurring > 60%', 'OEM partnerships', 'Succession signals'],
    negative: ['Hardware-heavy revenue', 'Single OEM dependency'],
    exclusions: ['Defence primes'],
    adjacencies: ['Quality inspection AI', 'Energy management', 'Warehouse robotics'],
    universe: 2290, inThesis: 171, newlyQualifying: 11, drift: -0.07, version: 2,
  },
  {
    id: 't3', name: 'Healthcare Revenue Cycle & Ops', owner: 'm3', strategy: 'Growth', color: '#6fbf93',
    sectors: ['Healthcare IT', 'RCM', 'Clinical ops'], geos: ['North America'], sizeBand: '$10–80m revenue',
    description: 'Tech-enabled RCM and clinical-operations software for provider groups facing labour shortages and payer complexity.',
    positive: ['AI-led automation of coding/denials', 'Provider consolidation tailwind', 'Payer-mix diversification'],
    negative: ['Reimbursement-rate exposure', 'Offshore labour dependency'],
    exclusions: ['Direct care delivery'],
    adjacencies: ['Prior authorisation', 'Ambient documentation', 'Credentialing'],
    universe: 1630, inThesis: 142, newlyQualifying: 9, drift: 0.31, version: 3,
  },
  {
    id: 't4', name: 'AI Infrastructure & Tooling', owner: 'm2', strategy: 'Venture', color: '#a894d9',
    sectors: ['AI infrastructure', 'Developer tools', 'Data infrastructure'], geos: ['North America', 'Europe', 'Asia-Pacific'], sizeBand: 'Series A–C',
    description: 'Picks-and-shovels for applied AI: inference optimisation, evaluation, data pipelines and governance for regulated enterprises.',
    positive: ['Open-source traction', 'Enterprise design partners', 'Senior hires from hyperscalers'],
    negative: ['Commoditisation by model labs', 'Thin moats'],
    exclusions: ['Foundation model training'],
    adjacencies: ['AI security', 'Synthetic data', 'Model governance'],
    universe: 6204, inThesis: 512, newlyQualifying: 41, drift: 0.44, version: 6,
  },
  {
    id: 't5', name: 'Grid & Energy Transition Software', owner: 'm4', strategy: 'Growth', color: '#5fb8b0',
    sectors: ['Climate tech', 'Energy software'], geos: ['Europe', 'North America'], sizeBand: '$5–60m revenue',
    description: 'Software that unlocks grid capacity — DER orchestration, interconnection, and utility asset analytics.',
    positive: ['Utility contracts', 'Regulatory tailwind (FERC 2023)', 'Interconnection backlog'],
    negative: ['Subsidy dependency', 'Long utility sales cycles'],
    exclusions: ['Project finance'],
    adjacencies: ['EV charging software', 'Carbon accounting'],
    universe: 1180, inThesis: 97, newlyQualifying: 6, drift: 0.12, version: 1,
  },
]

type CSeed = [
  name: string, sector: string, subsector: string, city: string, country: string, region: Company['region'],
  lat: number, lng: number, thesis: string[], ownership: Company['ownership'], status: Company['status'], rev: number, growth: number,
]

const cseeds: CSeed[] = [
  ['Northwind Field Systems', 'Vertical SaaS', 'Field-service software', 'Columbus', 'US', 'North America', 39.96, -83.0, ['t1'], 'Founder-owned', 'IC', 64, 31],
  ['Halcyon Ledger', 'Payments infra', 'Embedded payments for SMB verticals', 'London', 'UK', 'Europe', 51.51, -0.13, ['t1'], 'VC-backed', 'Diligence', 38, 58],
  ['Corvane Robotics OS', 'Industrial software', 'Robotics orchestration', 'Pittsburgh', 'US', 'North America', 40.44, -79.99, ['t2', 't4'], 'VC-backed', 'Screening', 22, 74],
  ['Meridian Claims AI', 'Healthcare IT', 'Denials management', 'Nashville', 'US', 'North America', 36.16, -86.78, ['t3'], 'Sponsor-backed', 'Diligence', 47, 39],
  ['Ostrava Precision MES', 'Industrial software', 'Manufacturing execution', 'Brno', 'CZ', 'Europe', 49.19, 16.61, ['t2'], 'Family-owned', 'Screening', 31, 18],
  ['Tidewater Construction Cloud', 'Vertical SaaS', 'Construction ERP', 'Charlotte', 'US', 'North America', 35.23, -80.84, ['t1'], 'Founder-owned', 'Tracking', 52, 24],
  ['Lumen Inference', 'AI infrastructure', 'Inference optimisation', 'San Francisco', 'US', 'North America', 37.77, -122.42, ['t4'], 'VC-backed', 'Screening', 14, 210],
  ['Vireo Grid', 'Energy software', 'DER orchestration', 'Copenhagen', 'DK', 'Europe', 55.68, 12.57, ['t5'], 'VC-backed', 'Tracking', 18, 88],
  ['Arcadia Credentialing', 'Healthcare IT', 'Provider credentialing', 'Austin', 'US', 'North America', 30.27, -97.74, ['t3'], 'Founder-owned', 'Tracking', 21, 42],
  ['Brightline Logistics Visibility', 'Vertical SaaS', 'Logistics visibility', 'Rotterdam', 'NL', 'Europe', 51.92, 4.48, ['t1'], 'Sponsor-backed', 'Screening', 73, 21],
  ['Sable Eval Labs', 'AI infrastructure', 'Model evaluation', 'Toronto', 'CA', 'North America', 43.65, -79.38, ['t4'], 'VC-backed', 'Tracking', 6, 260],
  ['Keystone Quality Vision', 'Industrial software', 'Quality inspection AI', 'Stuttgart', 'DE', 'Europe', 48.78, 9.18, ['t2', 't4'], 'VC-backed', 'Diligence', 27, 63],
  ['Harbor Specialty Underwriting', 'Vertical SaaS', 'Specialty insurance tech', 'Hartford', 'US', 'North America', 41.76, -72.68, ['t1'], 'Corporate carve-out', 'Screening', 88, 12],
  ['Pallas Data Mesh', 'Data infrastructure', 'Data pipelines', 'Tel Aviv', 'IL', 'Middle East', 32.09, 34.78, ['t4', 't1'], 'VC-backed', 'Tracking', 19, 95],
  ['Cobalt Interconnect', 'Energy software', 'Interconnection analytics', 'Denver', 'US', 'North America', 39.74, -104.99, ['t5'], 'Founder-owned', 'Screening', 11, 120],
  ['Wexford Ambient', 'Healthcare IT', 'Ambient documentation', 'Boston', 'US', 'North America', 42.36, -71.06, ['t3', 't4'], 'VC-backed', 'Tracking', 16, 180],
  ['Ironbridge Maintenance', 'Industrial software', 'Predictive maintenance', 'Houston', 'US', 'North America', 29.76, -95.37, ['t2'], 'Sponsor-backed', 'Tracking', 44, 15],
  ['Aster Vet Practice', 'Vertical SaaS', 'Veterinary practice mgmt', 'Dublin', 'IE', 'Europe', 53.35, -6.26, ['t1'], 'Founder-owned', 'Screening', 26, 34],
  ['Kairo Guardrails', 'AI infrastructure', 'AI security & governance', 'Singapore', 'SG', 'Asia-Pacific', 1.35, 103.82, ['t4'], 'VC-backed', 'Tracking', 9, 150],
  ['Selkirk Utility Analytics', 'Energy software', 'Utility asset analytics', 'Vancouver', 'CA', 'North America', 49.28, -123.12, ['t5'], 'Family-owned', 'Tracking', 23, 19],
  ['Paloma Prior Auth', 'Healthcare IT', 'Prior authorisation', 'Phoenix', 'US', 'North America', 33.45, -112.07, ['t3'], 'VC-backed', 'Screening', 12, 97],
  ['Fenwick Warehouse Robotics', 'Industrial software', 'Warehouse robotics software', 'Lyon', 'FR', 'Europe', 45.76, 4.84, ['t2'], 'VC-backed', 'Tracking', 17, 56],
  ['Granite Legal Ops', 'Vertical SaaS', 'Legal practice software', 'Sydney', 'AU', 'Asia-Pacific', -33.87, 151.21, ['t1'], 'Sponsor-backed', 'Tracking', 41, 17],
  ['Quarry Synthetic Data', 'AI infrastructure', 'Synthetic data', 'Berlin', 'DE', 'Europe', 52.52, 13.41, ['t4'], 'VC-backed', 'Passed', 7, 140],
  ['Mosaic Dental Cloud', 'Vertical SaaS', 'Dental practice mgmt', 'São Paulo', 'BR', 'LatAm', -23.55, -46.63, ['t1'], 'Founder-owned', 'Tracking', 19, 46],
  ['Riverstone Energy Mgmt', 'Industrial software', 'Industrial energy management', 'Milan', 'IT', 'Europe', 45.46, 9.19, ['t2', 't5'], 'Family-owned', 'Tracking', 29, 22],
  ['Beacon Payroll Rails', 'Payments infra', 'Payroll infrastructure', 'New York', 'US', 'North America', 40.71, -74.0, ['t1'], 'VC-backed', 'Tracking', 33, 67],
  ['Tessera Lab Informatics', 'Healthcare IT', 'Lab informatics', 'Cambridge', 'UK', 'Europe', 52.2, 0.12, ['t3'], 'Corporate carve-out', 'Screening', 58, 9],
  ['Atlas Fleet Telematics', 'Vertical SaaS', 'Fleet telematics', 'Dallas', 'US', 'North America', 32.78, -96.8, ['t1', 't2'], 'Sponsor-backed', 'Portfolio', 96, 19],
  ['Clearwater Revenue Ops', 'Healthcare IT', 'RCM automation', 'Minneapolis', 'US', 'North America', 44.98, -93.27, ['t3'], 'Sponsor-backed', 'Portfolio', 71, 23],
  ['Helix Compliance Cloud', 'Vertical SaaS', 'Regulatory compliance', 'Chicago', 'US', 'North America', 41.88, -87.63, ['t1'], 'Sponsor-backed', 'Portfolio', 54, 27],
  ['Vantage Inspection AI', 'Industrial software', 'Visual inspection', 'Munich', 'DE', 'Europe', 48.14, 11.58, ['t2'], 'VC-backed', 'Portfolio', 24, 61],
  ['Orchid Grid Services', 'Energy software', 'Virtual power plants', 'Amsterdam', 'NL', 'Europe', 52.37, 4.9, ['t5'], 'VC-backed', 'Portfolio', 15, 92],
  ['Summit Practice Partners', 'Vertical SaaS', 'Physio practice mgmt', 'Edinburgh', 'UK', 'Europe', 55.95, -3.19, ['t1', 't3'], 'Sponsor-backed', 'Portfolio', 37, 21],
  ['Kestrel Tokyo Robotics', 'Industrial software', 'Cobot programming', 'Tokyo', 'JP', 'Asia-Pacific', 35.68, 139.69, ['t2'], 'VC-backed', 'Tracking', 13, 70],
  ['Juniper Freight Audit', 'Vertical SaaS', 'Freight audit & pay', 'Toronto', 'CA', 'North America', 43.7, -79.42, ['t1'], 'Founder-owned', 'Tracking', 35, 26],
  ['Saffron Clinical Ops', 'Healthcare IT', 'Clinical workforce ops', 'Bengaluru', 'IN', 'Asia-Pacific', 12.97, 77.59, ['t3'], 'VC-backed', 'Tracking', 10, 115],
  ['Dunmore Hydrogen Controls', 'Energy software', 'Electrolyser controls', 'Abu Dhabi', 'AE', 'Middle East', 24.45, 54.38, ['t5'], 'Corporate carve-out', 'Tracking', 21, 38],
]

const firstNames = ['Marcus', 'Helena', 'Tomás', 'Ingrid', 'Kwame', 'Mei', 'Arjun', 'Claire', 'Dmitri', 'Leila', 'Oliver', 'Nadia', 'Hugo', 'Yuki', 'Gabriel', 'Amara', 'Stefan', 'Isabel', 'Rohan', 'Fiona', 'Matteo', 'Zara', 'Callum', 'Ines', 'Theo', 'Lucia', 'Anders', 'Chiara', 'Wei', 'Elif']
const lastNames = ['Chen', 'Hartley', 'Vasquez', 'Brandt', 'Mensah', 'Tanaka', 'Kapoor', 'Delacroix', 'Volkov', 'Haddad', 'Pemberton', 'Sørensen', 'Laurent', 'Nakamura', 'Ferreira', 'Okonkwo', 'Keller', 'Ruiz', 'Mehta', 'Gallagher', 'Rossi', 'Ahmed', 'Fraser', 'Moreno', 'Weiss', 'Bianchi', 'Lund', 'Esposito', 'Zhang', 'Yilmaz']

const usedNames = new Set<string>()
function personName() {
  for (;;) {
    const n = `${pick(firstNames)} ${pick(lastNames)}`
    if (!usedNames.has(n)) { usedNames.add(n); return n }
  }
}

export const people: Person[] = []
const addPerson = (p: Omit<Person, 'id'>) => { const id = `p${people.length + 1}`; people.push({ id, ...p }); return id }

// Internal team as people (graph roots)
team.forEach((m) => people.push({ id: m.id, name: m.name, role: m.title, org: FIRM.name, city: 'New York', history: ['DayOne Venture Partners'], internal: true }))

const priorOrgs = ['Oracle', 'ServiceTitan', 'Siemens Digital', 'Epic Systems', 'Stripe', 'Rockwell Automation', 'Thoma Bravo portfolio', 'McKinsey', 'Goldman Sachs TMT', 'Procore', 'Honeywell', 'Datadog', 'Cerner', 'Schneider Electric', 'Snowflake', 'Vista portfolio']

export const companies: Company[] = cseeds.map((s, i) => {
  const [name, sector, subsector, city, country, region, lat, lng, thesisIds, ownership, status, revenue, growth] = s
  const id = `c${i + 1}`
  const ceo = addPerson({ name: personName(), role: 'Chief Executive Officer', org: name, city, history: [pick(priorOrgs), pick(priorOrgs)] })
  addPerson({ name: personName(), role: 'Chief Financial Officer', org: name, city, history: [pick(priorOrgs)] })
  addPerson({ name: personName(), role: pick(['Chief Technology Officer', 'Chief Revenue Officer', 'COO']), org: name, city, history: [pick(priorOrgs)] })
  const base = 55 + rnd() * 30
  const bump = status === 'IC' ? 14 : status === 'Diligence' ? 9 : status === 'Screening' ? 4 : status === 'Portfolio' ? 6 : status === 'Passed' ? -14 : 0
  const clamp = (v: number) => Math.max(18, Math.min(98, Math.round(v)))
  const scores = {
    fit: clamp(base + bump + between(-6, 10)),
    signal: clamp(base + bump + between(-15, 14)),
    timing: clamp(base + bump + between(-18, 12)),
    access: clamp(40 + rnd() * 50 + bump / 2),
    evidence: clamp(45 + rnd() * 40 + bump),
    risk: clamp(15 + rnd() * 45 - bump / 2),
    action: clamp(base + bump + between(-10, 8)),
  }
  let h = 80 + Math.round(revenue * 3.5 * between(0.8, 1.2))
  const slope = growth / 100 / 12
  const headcount = Array.from({ length: 12 }, () => { h = Math.round(h * (1 + slope * between(0.2, 1.6))); return h })
  const short = name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  return {
    id, name, short, sector, subsector, city, country, region, lat, lng, thesisIds, ownership, status, revenue, growth,
    founded: Math.round(between(2004, 2021)),
    employees: headcount[11],
    ebitdaMargin: Math.round(growth > 80 ? between(-35, -5) : between(8, 34)),
    stage: ownership === 'VC-backed' ? pick(['Series B', 'Series C', 'Series A', 'Series D']) : ownership === 'Sponsor-backed' ? 'Secondary buyout' : ownership === 'Corporate carve-out' ? 'Carve-out' : 'Primary',
    description: '',
    website: `${name.toLowerCase().split(' ')[0]}.${pick(['com', 'io', 'ai', 'co'])}`,
    scores,
    owner: pick(team).id,
    lastChange: daysAgo(Math.round(rnd() * 20)),
    nextAction: '',
    whyNow: '',
    headcount,
    ceo,
    competitors: [],
    risks: [], catalysts: [], contradictions: [], missing: [],
  }
})

// Hand-tuned narrative overrides for the hero deals.
const narrative: Record<string, Partial<Company>> = {
  c1: {
    description: 'Scheduling, dispatch and invoicing platform for commercial HVAC, plumbing and electrical contractors. 2,900 customers; embedded payments launched 2025.',
    whyNow: 'Founder-CEO (age 63) appointed a COO from ServiceTitan and hired a CFO with sponsor exit history in 60 days. GTM hiring +38% while main competitor was acquired — classic succession + consolidation window.',
    nextAction: 'Finalise IC memo; confirm customer-concentration analysis with top-20 cohort data',
    catalysts: ['Founder succession planning (COO + CFO hires)', 'Competitor FieldPro acquired by strategic — customers re-evaluating', 'Embedded payments attach rising (11% → 19%)', 'Commercial HVAC replacement cycle (refrigerant regulation 2026)'],
    risks: ['Top-10 customers = 22% of ARR (near threshold)', 'Services mix 18% of revenue', 'Hosting costs up 31% YoY'],
    contradictions: ['Management claims NRR of 118%, but job-board data shows churn-related CSM hiring surge', 'Mgmt deck cites 2,900 customers; registry + web traffic suggests ~2,400 active'],
    missing: ['Cohort-level gross retention 2023–2025', 'Payments take-rate by segment', 'Hosting contract terms'],
    competitors: ['FieldPro (acq. by Kestral Industries)', 'Jobline', 'ServiceTrade'],
    scores: { fit: 92, signal: 88, timing: 91, access: 84, evidence: 76, risk: 34, action: 90 },
  },
  c2: {
    description: 'Embedded payments and ledger infrastructure for vertical SaaS vendors in UK & EU. 140 platform partners, £2.1bn TPV.',
    whyNow: 'Series C lead stepped back; company exploring structured growth round. Three senior payments hires from Adyen in Q3.',
    nextAction: 'Partner meeting with CFO; request TPV cohort data',
    catalysts: ['Lead investor not following on', 'PSD3 regulation favours licensed ledgers', 'Two partner integrations with PE-owned SaaS platforms'],
    risks: ['Take-rate compression', 'Two partners = 31% of TPV'],
    contradictions: ['Claims 140 partners; public integration directory lists 96'],
    missing: ['Loss rates', 'Partner churn'],
    competitors: ['Rainforest', 'Finix', 'Payabli'],
    scores: { fit: 86, signal: 83, timing: 88, access: 71, evidence: 64, risk: 41, action: 82 },
  },
  c4: {
    description: 'AI-driven denials prediction and appeals automation for mid-size provider groups and ASCs.',
    whyNow: 'Sponsor (Ridgeway Health Partners) entering year 6 of hold; banker mandate rumoured. CFO departed in August.',
    nextAction: 'Run expert call with former VP Revenue Cycle; map buyer universe',
    catalysts: ['Sponsor hold period ~6 years', 'CMS prior-auth rule adds denial volume', 'CFO departure'],
    risks: ['Reimbursement-policy exposure', 'Offshore coding team 40% of COGS'],
    contradictions: ['Press claims 99% coding accuracy; customer reviews cite rework'],
    missing: ['Customer logo churn', 'AI vs. human-in-loop ratio'],
    competitors: ['Waystar', 'AKASA', 'Infinitus'],
  },
  c3: {
    description: 'Vendor-neutral orchestration layer for mixed robot fleets (AMRs, cobots, arms) in manufacturing and 3PL.',
    whyNow: 'Signed OEM partnership with a top-3 cobot maker; hiring 12 solutions engineers in Texas and Ohio (reshoring corridors).',
    nextAction: 'Intro via Helena Hartley (shared board); ask for design-partner references',
    catalysts: ['OEM partnership', 'Reshoring capex cycle', 'Senior hires from Rockwell'],
    risks: ['Pre-profit; burn 14 months runway', 'OEM could build in-house'],
    contradictions: [], missing: ['Pipeline conversion'],
    competitors: ['Formant', 'InOrbit'],
  },
}
companies.forEach((c) => {
  const n = narrative[c.id]
  if (n) Object.assign(c, n)
  if (!c.description) c.description = `${c.subsector} platform serving ${c.sector === 'Healthcare IT' ? 'provider groups and health systems' : c.sector === 'Industrial software' ? 'mid-market manufacturers' : c.sector === 'Energy software' ? 'utilities and grid operators' : c.sector === 'AI infrastructure' || c.sector === 'Data infrastructure' ? 'enterprise AI and data teams' : 'SMB and mid-market operators'} across ${c.region}.`
  if (!c.whyNow) c.whyNow = pick([
    'Hiring acceleration in go-to-market (+24% in 90 days) alongside a new CRO from a category leader.',
    'Founder signalled openness to a partnership at a sector conference; board added an independent with sponsor background.',
    'Largest competitor raised prices 18% — customer review velocity shifting toward the company.',
    'Existing sponsor approaching year 5 of hold; advisor engagement spotted via banker hiring notes.',
    'New product line launched into an adjacent category, expanding TAM by an estimated 2.3x.',
  ])
  if (!c.nextAction) c.nextAction = pick(['Request intro via mapped warm path', 'Add to Q4 sector deep-dive', 'Schedule management call', 'Run expert network call', 'Monitor — awaiting next catalyst', 'Draft thesis-fit note for Monday meeting'])
  if (!c.catalysts.length) c.catalysts = [pick(['Leadership change', 'Hiring acceleration', 'Competitor consolidation', 'Regulatory tailwind', 'Product expansion']), pick(['Sponsor hold maturity', 'Pricing power', 'New geography launch'])]
  if (!c.risks.length) c.risks = [pick(['Customer concentration', 'Services-heavy revenue mix', 'Competitive pricing pressure', 'Key-person dependency']), pick(['Long sales cycles', 'Platform risk', 'Limited data coverage'])]
  if (!c.missing.length) c.missing = [pick(['Gross retention by cohort', 'Unit economics by segment', 'Management bench depth', 'Pricing history'])]
  if (!c.competitors.length) c.competitors = ['Category incumbent', 'Regional challenger']
})

export const companyById = Object.fromEntries(companies.map((c) => [c.id, c])) as Record<string, Company>

// ---------- Sources ----------
export const sources: Source[] = []
const srcNames: [string, Source['type'], Source['kind']][] = [
  ['SEC EDGAR / Form D', 'Primary', 'Filing'], ['Companies House', 'Primary', 'Registry'], ['LinkedIn hiring data', 'Secondary', 'Job board'],
  ['Company press release', 'Primary', 'Press release'], ['Financial Times', 'Secondary', 'News'], ['PitchBook', 'Secondary', 'Data vendor'],
  ['Expert call — former VP Sales', 'Primary', 'Expert call'], ['DayOne IC memo (2024)', 'Internal', 'Internal memo'], ['Bloomberg', 'Secondary', 'News'],
  ['Company careers page', 'Primary', 'Web'], ['Trade publication', 'Secondary', 'News'], ['G2 reviews', 'Secondary', 'Web'],
]
for (let i = 0; i < 90; i++) {
  const [name, type, kind] = pick(srcNames)
  const d = Math.round(rnd() * 140)
  sources.push({ id: `s${i + 1}`, name, type, kind, date: daysAgo(d), stale: d > 110 })
}
export const sourceById = Object.fromEntries(sources.map((s) => [s.id, s])) as Record<string, Source>

// ---------- Signals ----------
const sigTemplates: Record<SignalFamily, { type: string; title: (c: Company) => string; detail: string }[]> = {
  Leadership: [
    { type: 'CFO appointment', title: (c) => `${c.name} appoints CFO with sponsor-exit history`, detail: 'New CFO previously led two PE-backed exits; typically precedes a process within 12–18 months.' },
    { type: 'CEO succession', title: (c) => `Founder-CEO of ${c.name} names President & COO`, detail: 'Succession structure emerging; founder signals transition to Executive Chair.' },
    { type: 'Board change', title: (c) => `${c.name} adds independent director from Vista portfolio`, detail: 'Board composition shifting toward transaction experience.' },
  ],
  Capital: [
    { type: 'Funding round', title: (c) => `${c.name} raises growth round`, detail: 'Round led by crossover investor; existing lead did not participate.' },
    { type: 'Debt facility', title: (c) => `${c.name} closes $40m unitranche facility`, detail: 'Refinancing may indicate dividend recap ahead of sale.' },
    { type: 'Recapitalisation', title: (c) => `${c.name} explores minority recap`, detail: 'Banker outreach reported to select growth investors.' },
  ],
  Operations: [
    { type: 'Hiring acceleration', title: (c) => `${c.name} GTM hiring +38% in 90 days`, detail: 'Open roles concentrated in enterprise AE and solutions engineering.' },
    { type: 'Expansion', title: (c) => `${c.name} opens second hub`, detail: 'New office signals geographic expansion and nearshore cost base.' },
    { type: 'Relocation', title: (c) => `${c.name} moves HQ to lower-cost metro`, detail: 'Cost discipline ahead of profitability milestone.' },
  ],
  Market: [
    { type: 'Competitor M&A', title: (c) => `Key competitor of ${c.name} acquired by strategic`, detail: 'Consolidation reprices the category; customers of acquired competitor re-evaluating.' },
    { type: 'Spin-off', title: (c) => `Parent announces strategic review of unit adjacent to ${c.name}`, detail: 'Potential add-on or merger opportunity.' },
    { type: 'Pricing move', title: (c) => `Incumbent raises prices 18% — ${c.name} positioned to capture switchers`, detail: 'Review velocity indicates switching intent.' },
  ],
  Risk: [
    { type: 'Layoffs', title: (c) => `${c.name} cuts 8% of R&D`, detail: 'Restructuring focused on non-core product line.' },
    { type: 'Litigation', title: (c) => `Patent claim filed against ${c.name}`, detail: 'Claim relates to core scheduling algorithm; early stage.' },
    { type: 'Distress', title: (c) => `${c.name} delays vendor payments — trade-credit signal`, detail: 'Supplier reports extended DPO.' },
  ],
  Product: [
    { type: 'Product launch', title: (c) => `${c.name} launches embedded payments`, detail: 'Second revenue engine; early attach 11%.' },
    { type: 'AI launch', title: (c) => `${c.name} ships AI copilot to all customers`, detail: 'Usage-priced add-on; may expand ARPA 15–20%.' },
    { type: 'Category pivot', title: (c) => `${c.name} repositions into adjacent category`, detail: 'Messaging shift on site and in hiring.' },
  ],
  People: [
    { type: 'Key hire', title: (c) => `${c.name} hires CRO from category leader`, detail: 'Strong operator; prior company scaled 4x ARR.' },
    { type: 'Senior departure', title: (c) => `CTO departs ${c.name}`, detail: 'Departure after 7 years; replacement search ongoing.' },
  ],
  Ownership: [
    { type: 'Sponsor hold maturity', title: (c) => `${c.name} sponsor enters year 6 of hold`, detail: 'Fund nearing end of investment period; exit pressure rising.' },
    { type: 'Activist stake', title: (c) => `Activist discloses stake in ${c.name} parent`, detail: 'Pushing for portfolio simplification — carve-out likely.' },
    { type: 'Strategic interest', title: (c) => `Strategic acquirer ${pick(['Siemens', 'Roper', 'Constellation'])} sighted in ${c.name} category`, detail: 'Buyer has done 3 deals in category in 18 months.' },
  ],
}
const families = Object.keys(sigTemplates) as SignalFamily[]

export const signals: Signal[] = []
companies.forEach((c) => {
  const n = c.status === 'IC' || c.status === 'Diligence' ? 7 : c.status === 'Portfolio' ? 5 : 2 + Math.round(rnd() * 4)
  for (let i = 0; i < n; i++) {
    const family = pick(families)
    const t = pick(sigTemplates[family])
    const d = Math.round(Math.pow(rnd(), 1.6) * 120)
    signals.push({
      id: `g${signals.length + 1}`, companyId: c.id, family, type: t.type, title: t.title(c), detail: t.detail,
      date: daysAgo(d + 0.08 + rnd() * 0.85), sourceIds: [pick(sources).id, pick(sources).id].filter((v, k, a) => a.indexOf(v) === k),
      relevance: Math.round(between(48, 98)), confidence: Math.round(between(55, 97)), magnitude: Math.round(between(30, 95)),
      isNew: d < 2,
    })
  }
})
// Ensure hero signals for Northwind narrative
const hero: [string, SignalFamily, string, string, string, number][] = [
  ['c1', 'Leadership', 'COO appointment', 'Northwind Field Systems names ServiceTitan veteran as President & COO', 'COO previously ran a 1,200-person ops org. Founder-CEO to move to Executive Chair within 12 months (per trade-press interview).', 1],
  ['c1', 'Leadership', 'CFO appointment', 'Northwind appoints CFO with two sponsor exits', 'CFO previously at two Vista/Thoma-backed companies through exit. Strong pre-process indicator.', 9],
  ['c1', 'Market', 'Competitor M&A', 'FieldPro acquired by Kestral Industries — Northwind\'s closest competitor', 'Strategic acquirer historically sunsets SMB products; ~1,100 FieldPro customers may switch.', 16],
  ['c1', 'Operations', 'Hiring acceleration', 'Northwind GTM headcount +38% in 90 days', 'Hiring concentrated in Ohio and Texas; 9 open enterprise AE roles.', 4],
  ['c1', 'Risk', 'Cost signal', 'Northwind hosting spend up 31% YoY', 'Infra job posts mention migration from legacy data centre — margin pressure near-term.', 22],
  ['c2', 'Capital', 'Lead not following', 'Halcyon Ledger Series C lead declines pro-rata', 'Creates allocation for a new growth lead; structured round being discussed.', 3],
  ['c4', 'Ownership', 'Sponsor hold maturity', 'Ridgeway Health Partners in year 6 of Meridian Claims hold', 'Fund IV at end of life; LP-led secondary or sale expected within 12 months.', 6],
  ['c3', 'Market', 'OEM partnership', 'Corvane Robotics OS signs OEM deal with top-3 cobot maker', 'Distribution through OEM channel could 3x pipeline.', 0],
  ['c12', 'People', 'Key hire', 'Keystone Quality Vision hires CRO from Cognex', 'Commercial build-out ahead of US expansion.', 1],
  ['c7', 'Capital', 'Funding round', 'Lumen Inference raises $60m Series C at 4x step-up', 'Strong demand signal; crossover-led.', 0],
]
hero.forEach(([cid, family, type, title, detail, d]) => {
  signals.push({ id: `g${signals.length + 1}`, companyId: cid, family, type, title, detail, date: daysAgo(d + 0.1 + rnd() * 0.5), sourceIds: [pick(sources).id, pick(sources).id], relevance: Math.round(between(86, 99)), confidence: Math.round(between(78, 96)), magnitude: Math.round(between(70, 96)), isNew: d < 2 })
})
signals.sort((a, b) => b.date.localeCompare(a.date))
companies.forEach((c) => { const s = signals.find((x) => x.companyId === c.id); if (s) c.lastChange = s.date })

// ---------- Relationship edges ----------
export const edges: Edge[] = []
const connectors: string[] = []
const connectorOrgs = ['Former CEO, ServiceTitan', 'Board member, Procore', 'Partner, Bain Capital', 'Operating Partner, Vista', 'Professor, Wharton', 'CEO, Atlas Fleet Telematics (DayOne portfolio)', 'Advisor, Rockwell Automation', 'Former CFO, Epic Systems', 'GP, Accel', 'MD, Evercore TMT', 'CEO, Clearwater Revenue Ops (DayOne portfolio)', 'Independent director']
connectorOrgs.forEach((org) => {
  const [role, o] = org.split(', ')
  connectors.push(addPerson({ name: personName(), role, org: o ?? 'Independent', city: pick(['New York', 'Boston', 'San Francisco', 'London', 'Chicago']), history: [pick(priorOrgs), pick(priorOrgs)] }))
})
// Make the doc's example path: M. Chen as best introducer for Northwind
const mchen = people.find((p) => p.id === connectors[1])!
mchen.name = 'Michael Chen'
const edgeTypes: Edge['type'][] = ['Board', 'Employment', 'Co-investor', 'Advisor', 'Education', 'Deal', 'Portfolio CEO']
const ctx: Record<Edge['type'], string> = {
  Board: 'Served together on the board of a PE-backed software company (2019–2023)',
  Employment: 'Worked together for 4 years; reported into the same COO',
  'Co-investor': 'Co-invested in two growth rounds',
  Advisor: 'Advisor on prior acquisition; strong reference',
  Education: 'Same MBA cohort; stays in regular contact',
  Deal: 'Sat across the table on a 2022 add-on transaction',
  'Portfolio CEO': 'Current DayOne portfolio CEO; trusted relationship',
}
// team -> connectors
team.forEach((m) => {
  connectors.forEach((cp) => {
    if (rnd() < 0.32) {
      const type = pick(edgeTypes)
      edges.push({ a: m.id, b: cp, type, strength: +between(0.35, 0.98).toFixed(2), lastContact: daysAgo(Math.round(rnd() * 300)), context: ctx[type] })
    }
  })
})
// connectors -> company execs
companies.forEach((c) => {
  const execs = people.filter((p) => p.org === c.name)
  const k = 1 + Math.floor(rnd() * 3)
  for (let i = 0; i < k; i++) {
    const type = pick(edgeTypes.filter((t) => t !== 'Portfolio CEO'))
    edges.push({ a: pick(connectors), b: pick(execs).id, type, strength: +between(0.3, 0.95).toFixed(2), lastContact: daysAgo(Math.round(rnd() * 400)), context: ctx[type] })
  }
  if (rnd() < 0.25) {
    edges.push({ a: pick(team).id, b: c.ceo, type: 'Deal', strength: +between(0.4, 0.8).toFixed(2), lastContact: daysAgo(Math.round(rnd() * 200)), context: 'Met during prior sale process; cordial relationship' })
  }
})
// Northwind narrative path: Eleanor -> Michael Chen (board) -> CEO
edges.push({ a: 'm1', b: mchen.id, type: 'Board', strength: 0.94, lastContact: daysAgo(12), context: 'Served together on the board of Helix Compliance Cloud (DayOne portfolio) 2020–2024' })
edges.push({ a: mchen.id, b: companyById.c1.ceo, type: 'Board', strength: 0.91, lastContact: daysAgo(30), context: 'Shared board seat at a regional contractors association; advised on 2021 pricing change' })
edges.push({ a: 'm2', b: connectors[5], type: 'Portfolio CEO', strength: 0.97, lastContact: daysAgo(3), context: ctx['Portfolio CEO'] })
edges.push({ a: connectors[5], b: companyById.c1.ceo, type: 'Co-investor', strength: 0.62, lastContact: daysAgo(90), context: 'Both early angels in a Columbus logistics startup' })

export const personById = () => Object.fromEntries(people.map((p) => [p.id, p])) as Record<string, Person>

// ---------- Sponsors ----------
export const sponsors: Sponsor[] = [
  { id: 'f1', name: 'Ridgeway Health Partners', type: 'PE', city: 'Boston', lat: 42.36, lng: -71.06, aum: 6.8, sectors: [{ name: 'Healthcare IT', pct: 58 }, { name: 'Services', pct: 30 }, { name: 'Other', pct: 12 }], pace: [3, 2, 4, 3, 2, 1, 1, 0], recent: 'Exploring exit of Meridian Claims AI', partners: ['Helena Brandt', 'Owen Pike'], interest: 42, exits: 14, portfolio: 11 },
  { id: 'f2', name: 'Kestral Industries', type: 'Strategic', city: 'Milwaukee', lat: 43.04, lng: -87.91, aum: 31, sectors: [{ name: 'Industrial software', pct: 46 }, { name: 'Vertical SaaS', pct: 34 }, { name: 'Hardware', pct: 20 }], pace: [1, 1, 2, 2, 3, 3, 4, 4], recent: 'Acquired FieldPro (field-service SaaS)', partners: ['Corp Dev: Ana Ruiz'], interest: 78, exits: 0, portfolio: 23 },
  { id: 'f3', name: 'Ashgrove Capital', type: 'PE', city: 'New York', lat: 40.76, lng: -73.98, aum: 12.4, sectors: [{ name: 'Vertical SaaS', pct: 62 }, { name: 'Payments', pct: 22 }, { name: 'Other', pct: 16 }], pace: [4, 5, 4, 6, 5, 7, 6, 8], recent: 'Raised $3.1bn Fund VII; vertical SaaS focus', partners: ['Jonah Wexler', 'Mira Shah'], interest: 81, exits: 22, portfolio: 31 },
  { id: 'f4', name: 'Northgate Growth', type: 'Growth', city: 'San Francisco', lat: 37.79, lng: -122.4, aum: 9.2, sectors: [{ name: 'AI infrastructure', pct: 48 }, { name: 'Dev tools', pct: 32 }, { name: 'Other', pct: 20 }], pace: [6, 7, 5, 8, 9, 8, 10, 11], recent: 'Led Lumen Inference Series C', partners: ['Ravi Iyer'], interest: 66, exits: 9, portfolio: 44 },
  { id: 'f5', name: 'Elbe Industrial Partners', type: 'PE', city: 'Hamburg', lat: 53.55, lng: 9.99, aum: 4.1, sectors: [{ name: 'Industrial software', pct: 55 }, { name: 'Automation', pct: 35 }, { name: 'Other', pct: 10 }], pace: [2, 2, 3, 2, 3, 4, 3, 4], recent: 'Building MES platform via add-ons', partners: ['Katrin Vogel'], interest: 73, exits: 11, portfolio: 14 },
  { id: 'f6', name: 'Roper-style Compounder Co.', type: 'Strategic', city: 'Sarasota', lat: 27.34, lng: -82.53, aum: 48, sectors: [{ name: 'Vertical SaaS', pct: 70 }, { name: 'Other', pct: 30 }], pace: [1, 2, 1, 2, 2, 1, 3, 2], recent: 'Stated intent to deploy $4bn in vertical software', partners: ['Corp Dev'], interest: 69, exits: 0, portfolio: 40 },
  { id: 'f7', name: 'Thameside Ventures', type: 'VC', city: 'London', lat: 51.52, lng: -0.08, aum: 2.2, sectors: [{ name: 'Fintech', pct: 51 }, { name: 'AI', pct: 29 }, { name: 'Other', pct: 20 }], pace: [5, 4, 6, 5, 4, 3, 3, 2], recent: 'Declined pro-rata in Halcyon Ledger', partners: ['Imogen Hale'], interest: 24, exits: 7, portfolio: 52 },
  { id: 'f8', name: 'Pacific Harbor Partners', type: 'PE', city: 'Singapore', lat: 1.28, lng: 103.85, aum: 7.5, sectors: [{ name: 'Software', pct: 44 }, { name: 'Healthcare', pct: 36 }, { name: 'Other', pct: 20 }], pace: [2, 3, 3, 3, 4, 4, 5, 5], recent: 'Opened New York office', partners: ['Daniel Goh'], interest: 51, exits: 10, portfolio: 19 },
  { id: 'f9', name: 'Gridline Energy Capital', type: 'Growth', city: 'Copenhagen', lat: 55.68, lng: 12.57, aum: 3.3, sectors: [{ name: 'Energy software', pct: 72 }, { name: 'Other', pct: 28 }], pace: [1, 2, 2, 3, 3, 4, 4, 5], recent: 'Sourcing DER orchestration platforms', partners: ['Freja Holm'], interest: 62, exits: 4, portfolio: 17 },
  { id: 'f10', name: 'Lone Star Health Systems', type: 'Strategic', city: 'Dallas', lat: 32.78, lng: -96.8, aum: 22, sectors: [{ name: 'Healthcare IT', pct: 80 }, { name: 'Other', pct: 20 }], pace: [0, 1, 1, 1, 2, 2, 2, 3], recent: 'Building RCM platform; 2 add-ons in 2026', partners: ['Corp Dev'], interest: 74, exits: 0, portfolio: 12 },
]

// ---------- Transactions ----------
const NY = { lat: 40.71, lng: -74.0 }
export const transactions: Transaction[] = [
  ['FieldPro', 'Kestral Industries', 'Founders', 'Strategic', 'Vertical SaaS', 410, 7.8, 43.04, -87.91, 41.5, -81.69, 16],
  ['Jobline', 'Ashgrove Capital', 'Summit Growth', 'Buyout', 'Vertical SaaS', 620, 9.1, 40.76, -73.98, 33.75, -84.39, 48],
  ['ClaimRight', 'Lone Star Health Systems', 'Ridge Partners', 'Add-on', 'Healthcare IT', 180, 5.6, 32.78, -96.8, 36.16, -86.78, 70],
  ['Mesa MES', 'Elbe Industrial Partners', 'Family', 'Buyout', 'Industrial software', 140, 4.2, 53.55, 9.99, 50.11, 8.68, 33],
  ['Ledgerly', 'Ashgrove Capital', 'Thameside Ventures', 'Growth', 'Payments infra', 95, 8.4, 40.76, -73.98, 51.51, -0.13, 92],
  ['VoltOS', 'Gridline Energy Capital', 'Founders', 'Growth', 'Energy software', 60, 10.2, 55.68, 12.57, 59.33, 18.07, 25],
  ['Inferix', 'Northgate Growth', 'Seed funds', 'Growth', 'AI infrastructure', 250, 22, 37.79, -122.4, 47.61, -122.33, 40],
  ['CareFlow RCM', 'Pacific Harbor Partners', 'Founders', 'Buyout', 'Healthcare IT', 210, 6.1, 1.28, 103.85, 34.05, -118.24, 58],
  ['RoboLogic', 'Kestral Industries', 'VC syndicate', 'Strategic', 'Industrial software', 320, 11.5, 43.04, -87.91, 42.33, -83.05, 110],
  ['TradeDesk Pro', 'Roper-style Compounder Co.', 'Sponsor', 'Strategic', 'Vertical SaaS', 880, 12.3, 27.34, -82.53, 39.74, -104.99, 76],
  ['SiteBook', 'DayOne Venture Partners', 'Founders', 'Add-on', 'Vertical SaaS', 42, 5.2, NY.lat, NY.lng, 32.78, -96.8, 120],
  ['Praxis Physio', 'DayOne Venture Partners', 'Founders', 'Add-on', 'Vertical SaaS', 28, 4.8, NY.lat, NY.lng, 55.95, -3.19, 85],
].map(([target, buyer, seller, type, sector, ev, multiple, fromLat, fromLng, toLat, toLng, d], i) => ({
  id: `x${i + 1}`, target, buyer, seller, type, sector, ev, multiple, fromLat, fromLng, toLat, toLng, date: daysAgo(d as number),
} as Transaction))

// ---------- Portfolio ----------
const series = (start: number, g: number, n = 8) => { let v = start; return Array.from({ length: n }, () => { v = +(v * (1 + g / 4 * between(0.6, 1.4))).toFixed(1); return v }) }
export const portfolio: PortfolioAsset[] = [
  {
    companyId: 'c29', acquired: '2022-03-15', fund: 'DayOne Fund II', invested: 185, moic: 2.4, irr: 31, revenue: series(62, 0.19), ebitda: series(14, 0.26), health: 'Strong', exitReadiness: 78,
    initiatives: [
      { area: 'Revenue', title: 'Usage-based pricing for EV fleets', impact: 6.2, progress: 72, status: 'Ahead', signal: 'Competitor raised prices 12% — headroom confirmed' },
      { area: 'M&A', title: 'Add-on: dashcam AI vendor', impact: 4.1, progress: 40, status: 'On track', signal: '3 targets mapped; 1 founder in succession window' },
      { area: 'AI', title: 'Predictive maintenance alerts', impact: 2.8, progress: 55, status: 'On track', signal: 'Customer pilots: 14% fewer roadside events' },
      { area: 'Margin', title: 'Cellular data contract renegotiation', impact: 1.9, progress: 90, status: 'Ahead', signal: 'Carrier pricing down 9% market-wide' },
    ],
    buyers: [
      { name: 'Kestral Industries', type: 'Strategic', fit: 88, activity: '4 deals in 18 months; active in fleet + field service' },
      { name: 'Roper-style Compounder Co.', type: 'Strategic', fit: 81, activity: 'Stated $4bn vertical SaaS deployment' },
      { name: 'Ashgrove Capital', type: 'Sponsor', fit: 77, activity: 'New $3.1bn fund; vertical SaaS mandate' },
      { name: 'Pacific Harbor Partners', type: 'Sponsor', fit: 58, activity: 'Opened New York office' },
    ],
  },
  {
    companyId: 'c30', acquired: '2023-01-20', fund: 'DayOne Fund II', invested: 140, moic: 1.7, irr: 24, revenue: series(48, 0.22), ebitda: series(9, 0.3), health: 'Watch', exitReadiness: 52,
    initiatives: [
      { area: 'AI', title: 'Autonomous coding for E&M', impact: 5.4, progress: 38, status: 'At risk', signal: 'Wexford Ambient launched competing module' },
      { area: 'Talent', title: 'Hire CRO', impact: 2.0, progress: 20, status: 'At risk', signal: '2 finalists withdrew; market for RCM CROs tight' },
      { area: 'Working capital', title: 'Payer collections acceleration', impact: 3.1, progress: 61, status: 'On track', signal: 'DSO down 6 days QoQ' },
      { area: 'M&A', title: 'Add-on: Paloma Prior Auth', impact: 4.4, progress: 15, status: 'Not started', signal: 'Paloma hiring CFO — potential window' },
    ],
    buyers: [
      { name: 'Lone Star Health Systems', type: 'Strategic', fit: 86, activity: 'Building RCM platform via add-ons' },
      { name: 'Ridgeway Health Partners', type: 'Sponsor', fit: 64, activity: 'Exiting Meridian; may re-enter category' },
    ],
  },
  {
    companyId: 'c31', acquired: '2021-06-10', fund: 'DayOne Fund I', invested: 120, moic: 3.1, irr: 28, revenue: series(30, 0.21), ebitda: series(7, 0.28), health: 'Strong', exitReadiness: 84,
    initiatives: [
      { area: 'Revenue', title: 'EU regulatory module (DORA)', impact: 3.6, progress: 81, status: 'Ahead', signal: 'DORA enforcement Jan 2026 driving demand' },
      { area: 'Margin', title: 'Offshore support hub', impact: 1.4, progress: 100, status: 'Ahead', signal: 'Complete' },
      { area: 'M&A', title: 'Add-on: ESG reporting tool', impact: 2.2, progress: 65, status: 'On track', signal: 'LOI signed' },
    ],
    buyers: [
      { name: 'Roper-style Compounder Co.', type: 'Strategic', fit: 84, activity: 'Compliance software is stated priority' },
      { name: 'Ashgrove Capital', type: 'Sponsor', fit: 79, activity: 'Owns adjacent GRC asset' },
    ],
  },
  {
    companyId: 'c32', acquired: '2024-04-02', fund: 'DayOne Fund III', invested: 60, moic: 1.3, irr: 19, revenue: series(14, 0.32), ebitda: series(-2, -0.4), health: 'Watch', exitReadiness: 31,
    initiatives: [
      { area: 'Revenue', title: 'US expansion (Midwest auto)', impact: 3.0, progress: 44, status: 'On track', signal: 'Reshoring capex rising in OH/MI' },
      { area: 'Talent', title: 'VP Engineering hire', impact: 0.8, progress: 100, status: 'Ahead', signal: 'Hired from Cognex' },
    ],
    buyers: [{ name: 'Kestral Industries', type: 'Strategic', fit: 72, activity: 'Acquired RoboLogic' }, { name: 'Elbe Industrial Partners', type: 'Sponsor', fit: 70, activity: 'MES platform build' }],
  },
  {
    companyId: 'c33', acquired: '2024-09-12', fund: 'DayOne Fund III', invested: 45, moic: 1.5, irr: 38, revenue: series(8, 0.45), ebitda: series(-3, -0.3), health: 'Strong', exitReadiness: 22,
    initiatives: [{ area: 'Revenue', title: 'German market launch', impact: 2.1, progress: 35, status: 'On track', signal: 'Grid-fee reform favours VPPs' }],
    buyers: [{ name: 'Gridline Energy Capital', type: 'Sponsor', fit: 80, activity: 'Sourcing DER orchestration' }],
  },
  {
    companyId: 'c34', acquired: '2023-08-30', fund: 'DayOne Fund II', invested: 95, moic: 1.1, irr: 4, revenue: series(33, 0.08), ebitda: series(6, 0.02), health: 'Concern', exitReadiness: 28,
    initiatives: [
      { area: 'Revenue', title: 'Cross-sell payments', impact: 2.4, progress: 18, status: 'At risk', signal: 'Attach stalled at 7%' },
      { area: 'Talent', title: 'Replace CTO', impact: 1.0, progress: 50, status: 'On track', signal: 'Search ongoing' },
      { area: 'Margin', title: 'Consolidate hosting', impact: 1.1, progress: 25, status: 'At risk', signal: 'Migration slipped one quarter' },
    ],
    buyers: [{ name: 'Ashgrove Capital', type: 'Sponsor', fit: 61, activity: 'Healthcare-adjacent SaaS interest' }],
  },
]

// ---------- Decision memory ----------
export const decisions: Decision[] = [
  { id: 'd1', companyId: 'c24', date: '2026-06-18', outcome: 'Passed', rationale: 'Synthetic data category commoditising as model labs bundle generation; no durable moat identified. Revenue concentrated in two design partners.', keyQuestions: ['Can they own the eval loop, not just generation?', 'Is there a regulated-industry wedge?'], laterTruth: [{ claim: 'Model labs would bundle synthetic data', proved: true }, { claim: 'Design partners would churn', proved: false }], partners: ['m2', 'm6'] },
  { id: 'd2', companyId: 'c29', date: '2022-02-10', outcome: 'Invested', rationale: 'Fleet telematics with embedded payments optionality; founder succession window; fragmented add-on universe of 40+ targets.', keyQuestions: ['Can hardware margin be protected?', 'Is EV transition a threat?'], laterTruth: [{ claim: 'EV transition expands ARPA', proved: true }, { claim: '3 add-ons within 24 months', proved: true }], partners: ['m1', 'm2'] },
  { id: 'd3', companyId: 'c4', date: '2024-11-04', outcome: 'Deferred', rationale: 'Strong product but sponsor not ready to sell; valuation expectations 2x above our view. Revisit when hold matures.', keyQuestions: ['AI-vs-offshore mix?', 'Customer logo churn?'], laterTruth: [{ claim: 'Sponsor would come to market in 2026', proved: true }], partners: ['m3'] },
  { id: 'd4', companyId: 'c10', date: '2025-03-22', outcome: 'Passed', rationale: 'Customer concentration in two ocean carriers; sponsor-to-sponsor price too full.', keyQuestions: ['Does the shipper-side product reduce concentration?'], laterTruth: [{ claim: 'Concentration would persist', proved: false }], partners: ['m4', 'm1'] },
  { id: 'd5', companyId: 'c30', date: '2022-12-01', outcome: 'Invested', rationale: 'RCM automation with provider consolidation tailwind; clear AI roadmap.', keyQuestions: ['Labour cost exposure?', 'Payer mix?'], laterTruth: [{ claim: 'AI coding live within 18 months', proved: false }], partners: ['m3', 'm5'] },
  { id: 'd6', companyId: 'c1', date: '2025-05-14', outcome: 'Deferred', rationale: 'Founder not ready; no succession plan. Re-engage on leadership change.', keyQuestions: ['Who runs the business post-founder?'], laterTruth: [{ claim: 'Founder would add a COO within 18 months', proved: true }], partners: ['m2'] },
]

// ---------- Activity feed for ticker ----------
export const alerts = [
  { kind: 'portfolio', text: 'Clearwater Revenue Ops — CRO finalist withdrew', level: 'neg' as const, companyId: 'c30' },
  { kind: 'ic', text: 'IC: Northwind Field Systems — Thu 9:00 ET', level: 'warn' as const, companyId: 'c1' },
  { kind: 'relationship', text: 'Michael Chen opened your intro note re: Northwind', level: 'pos' as const, companyId: 'c1' },
  { kind: 'thesis', text: 'AI Infrastructure thesis drift +0.44 — 41 newly qualifying', level: 'warn' as const },
  { kind: 'portfolio', text: 'Summit Practice Partners — CTO search 50% complete', level: 'neg' as const, companyId: 'c34' },
]
