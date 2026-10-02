export type SignalFamily =
  | 'Leadership'
  | 'Capital'
  | 'Operations'
  | 'Market'
  | 'Risk'
  | 'Product'
  | 'People'
  | 'Ownership'

export type DealStatus = 'Tracking' | 'Screening' | 'Diligence' | 'IC' | 'Portfolio' | 'Passed'

export interface Scores {
  fit: number
  signal: number
  timing: number
  access: number
  evidence: number
  risk: number
  action: number
}

export interface Company {
  id: string
  name: string
  short: string
  sector: string
  subsector: string
  city: string
  country: string
  region: 'North America' | 'Europe' | 'Asia-Pacific' | 'LatAm' | 'Middle East'
  lat: number
  lng: number
  founded: number
  employees: number
  revenue: number // $m est
  growth: number // yoy %
  ebitdaMargin: number
  ownership: 'Founder-owned' | 'Sponsor-backed' | 'VC-backed' | 'Corporate carve-out' | 'Family-owned'
  stage: string
  description: string
  website: string
  thesisIds: string[]
  scores: Scores
  status: DealStatus
  owner: string // team member id
  lastChange: string // ISO
  nextAction: string
  whyNow: string
  headcount: number[] // 12 months
  ceo: string // person id
  competitors: string[]
  risks: string[]
  catalysts: string[]
  contradictions: string[]
  missing: string[]
}

export interface Source {
  id: string
  name: string
  type: 'Primary' | 'Secondary' | 'Internal'
  kind: 'Filing' | 'News' | 'Job board' | 'Registry' | 'Expert call' | 'Internal memo' | 'Data vendor' | 'Press release' | 'Web'
  date: string
  stale?: boolean
}

export interface Signal {
  id: string
  companyId: string
  family: SignalFamily
  type: string
  title: string
  detail: string
  date: string
  sourceIds: string[]
  relevance: number
  confidence: number
  magnitude: number
  isNew?: boolean
}

export interface Person {
  id: string
  name: string
  role: string
  org: string
  city: string
  history: string[]
  internal?: boolean
}

export interface Edge {
  a: string
  b: string
  type: 'Board' | 'Employment' | 'Co-investor' | 'Advisor' | 'Education' | 'Deal' | 'Portfolio CEO'
  strength: number // 0-1
  lastContact: string
  context: string
}

export interface Thesis {
  id: string
  name: string
  owner: string
  strategy: 'Buyout' | 'Growth' | 'Venture' | 'Buy-and-build'
  sectors: string[]
  geos: string[]
  sizeBand: string
  description: string
  positive: string[]
  negative: string[]
  exclusions: string[]
  adjacencies: string[]
  universe: number
  inThesis: number
  newlyQualifying: number
  drift: number // -1..1
  version: number
  color: string
}

export interface Sponsor {
  id: string
  name: string
  type: 'PE' | 'VC' | 'Strategic' | 'Growth'
  city: string
  lat: number
  lng: number
  aum: number // $bn
  sectors: { name: string; pct: number }[]
  pace: number[] // deals per quarter (8q)
  recent: string
  partners: string[]
  interest: number
  exits: number
  portfolio: number
}

export interface Transaction {
  id: string
  date: string
  target: string
  buyer: string
  seller: string
  type: 'Buyout' | 'Add-on' | 'Strategic' | 'Growth' | 'Merger' | 'Carve-out'
  sector: string
  ev?: number
  multiple?: number
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
}

export interface Member {
  id: string
  name: string
  title: string
  initials: string
}

export interface Initiative {
  area: 'Revenue' | 'Margin' | 'Working capital' | 'Talent' | 'AI' | 'M&A'
  title: string
  impact: number // $m EBITDA
  progress: number
  status: 'On track' | 'At risk' | 'Ahead' | 'Not started'
  signal: string
}

export interface PortfolioAsset {
  companyId: string
  acquired: string
  fund: string
  invested: number
  moic: number
  irr: number
  revenue: number[]
  ebitda: number[]
  health: 'Strong' | 'Watch' | 'Concern'
  initiatives: Initiative[]
  buyers: { name: string; type: 'Strategic' | 'Sponsor'; fit: number; activity: string }[]
  exitReadiness: number
}

export interface Decision {
  id: string
  companyId: string
  date: string
  outcome: 'Advanced' | 'Passed' | 'Invested' | 'Deferred'
  rationale: string
  keyQuestions: string[]
  laterTruth?: { claim: string; proved: boolean }[]
  partners: string[]
}
