import { companyById, edges, people, team } from '../data/seed'
import type { Edge, Person } from '../data/types'

const byId = Object.fromEntries(people.map((p) => [p.id, p])) as Record<string, Person>
const adj = new Map<string, { to: string; e: Edge }[]>()
edges.forEach((e) => {
  if (!adj.has(e.a)) adj.set(e.a, [])
  if (!adj.has(e.b)) adj.set(e.b, [])
  adj.get(e.a)!.push({ to: e.b, e })
  adj.get(e.b)!.push({ to: e.a, e })
})

export interface Path { nodes: Person[]; links: Edge[]; strength: number; target: Person }

export const person = (id: string) => byId[id]

/** All simple paths (max 3 hops) from any DayOne team member to any exec of the company, ranked by strength. */
export function pathsToCompany(companyId: string, max = 6): Path[] {
  const c = companyById[companyId]
  const targets = new Set(people.filter((p) => p.org === c.name).map((p) => p.id))
  const out: Path[] = []
  const teamIds = new Set(team.map((m) => m.id))
  team.forEach((m) => {
    const walk = (node: string, nodes: string[], links: Edge[]) => {
      if (targets.has(node) && links.length) {
        const strength = links.reduce((a, l) => a * l.strength, 1) ** (1 / Math.sqrt(links.length))
        out.push({ nodes: nodes.map((id) => byId[id]), links: [...links], strength, target: byId[node] })
        return
      }
      if (links.length >= 3) return
      for (const { to, e } of adj.get(node) ?? []) {
        if (nodes.includes(to) || (teamIds.has(to) && to !== m.id)) continue
        walk(to, [...nodes, to], [...links, e])
      }
    }
    walk(m.id, [m.id], [])
  })
  out.sort((a, b) => b.strength - a.strength)
  const seen = new Set<string>()
  return out.filter((p) => { const k = p.nodes.map((n) => n.id).join('>'); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, max)
}

/** Local neighbourhood for the network visual: target execs + up to 2 hops back toward the team. */
export function neighbourhood(companyId: string) {
  const paths = pathsToCompany(companyId, 10)
  const nodeIds = new Set<string>()
  const linkSet = new Map<string, Edge>()
  paths.forEach((p) => { p.nodes.forEach((n) => nodeIds.add(n.id)); p.links.forEach((l) => linkSet.set(`${l.a}-${l.b}`, l)) })
  const c = companyById[companyId]
  people.filter((p) => p.org === c.name).forEach((p) => nodeIds.add(p.id))
  return { nodes: [...nodeIds].map((id) => byId[id]), links: [...linkSet.values()], paths }
}
