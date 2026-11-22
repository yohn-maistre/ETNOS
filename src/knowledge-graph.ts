/**
 * Graph measures for the knowledge model (research/epistemic-multiplex-2026-11-19.md §6):
 * Leiden clusters (M2), strategic roles (M3), a degree-preserving null model,
 * Hill numbers over voices (M15), link prediction turned into questions (M9) and
 * a deterministic layout. Pure functions with a seeded generator: the same input
 * always gives the same output, so the map can be rebuilt and diffed.
 *
 * Leiden follows Traag, Waltman and van Eck (2019), "From Louvain to Leiden:
 * guaranteeing well-connected communities", with the modularity quality function.
 * Written for ETNOS; no code copied.
 */

export type WeightedEdge = [string, string, number]

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Adjacency on integer node ids. Self-loops carry aggregated internal weight. */
interface Level {
  n: number
  adj: Map<number, number>[]
  self: number[]
  k: number[]
}

function levelFrom(nodes: string[], edges: WeightedEdge[]): { level: Level; index: Map<string, number> } {
  const index = new Map(nodes.map((n, i) => [n, i]))
  const adj = nodes.map(() => new Map<number, number>()), self = nodes.map(() => 0), k = nodes.map(() => 0)
  for (const [a, b, w] of edges) {
    const i = index.get(a), j = index.get(b)
    if (i === undefined || j === undefined || !(w > 0)) continue
    if (i === j) {
      self[i]! += w
      k[i]! += 2 * w
      continue
    }
    adj[i]!.set(j, (adj[i]!.get(j) ?? 0) + w)
    adj[j]!.set(i, (adj[j]!.get(i) ?? 0) + w)
    k[i]! += w
    k[j]! += w
  }
  return { level: { n: nodes.length, adj, self, k }, index }
}

function moveNodes(level: Level, part: number[], gamma: number, m2: number, random: () => number): boolean {
  const total = new Map<number, number>()
  for (let i = 0; i < level.n; i++) total.set(part[i]!, (total.get(part[i]!) ?? 0) + level.k[i]!)
  const queue = shuffle([...Array(level.n).keys()], random), queued = new Set(queue)
  let changed = false
  while (queue.length) {
    const v = queue.shift()!
    queued.delete(v)
    const own = part[v]!, kv = level.k[v]!
    const toCommunity = new Map<number, number>()
    for (const [u, w] of level.adj[v]!) toCommunity.set(part[u]!, (toCommunity.get(part[u]!) ?? 0) + w)
    total.set(own, total.get(own)! - kv)
    const gain = (c: number) => (toCommunity.get(c) ?? 0) - (gamma * kv * (total.get(c) ?? 0)) / m2
    let best = own, bestGain = gain(own)
    for (const c of [...toCommunity.keys()].sort((x, y) => x - y)) {
      const g = gain(c)
      if (g > bestGain + 1e-12) {
        best = c
        bestGain = g
      }
    }
    // An empty community is always available; moving there is worth 0 - 0.
    if (bestGain < -1e-12) {
      let fresh = 0
      while (total.has(fresh) && total.get(fresh)! > 0) fresh++
      best = fresh
    }
    total.set(best, (total.get(best) ?? 0) + kv)
    if (best !== own) {
      part[v] = best
      changed = true
      for (const u of level.adj[v]!.keys()) if (part[u] !== best && !queued.has(u)) {
        queue.push(u)
        queued.add(u)
      }
    }
  }
  return changed
}

/** Leiden refinement: merge singletons only into well-connected subsets of their community. */
function refine(level: Level, part: number[], gamma: number, m2: number, random: () => number, theta = 0.01): number[] {
  const refined = [...Array(level.n).keys()]
  const members = new Map<number, number[]>()
  for (let i = 0; i < level.n; i++) members.set(part[i]!, [...(members.get(part[i]!) ?? []), i])
  const subTotal = level.k.slice(), subSize = refined.map(() => 1)
  for (const nodes of [...members.values()]) {
    const inC = new Set(nodes), K = nodes.reduce((s, i) => s + level.k[i]!, 0)
    // External weight of each subset to the rest of the community.
    const subExternal = new Map<number, number>()
    for (const i of nodes) {
      let w = 0
      for (const [u, x] of level.adj[i]!) if (inC.has(u)) w += x
      subExternal.set(i, w)
    }
    for (const v of shuffle(nodes, random)) {
      if (subSize[refined[v]!]! !== 1) continue
      const kv = level.k[v]!
      if (subExternal.get(refined[v]!)! < (gamma * kv * (K - kv)) / m2) continue
      const toSub = new Map<number, number>()
      for (const [u, w] of level.adj[v]!) if (inC.has(u) && refined[u] !== refined[v]) toSub.set(refined[u]!, (toSub.get(refined[u]!) ?? 0) + w)
      const options: { s: number; gain: number }[] = []
      for (const [s, w] of [...toSub].sort((a, b) => a[0] - b[0])) {
        const T = subTotal[s]!
        if (subExternal.get(s)! < (gamma * T * (K - T)) / m2) continue
        const gain = w - (gamma * kv * T) / m2
        if (gain >= 0) options.push({ s, gain })
      }
      if (!options.length) continue
      const top = Math.max(...options.map((o) => o.gain))
      const weights = options.map((o) => Math.exp((o.gain - top) / theta)), sum = weights.reduce((a, b) => a + b, 0)
      let r = random() * sum, chosen = options[options.length - 1]!.s
      for (let i = 0; i < options.length; i++) {
        r -= weights[i]!
        if (r <= 0) {
          chosen = options[i]!.s
          break
        }
      }
      const from = refined[v]!
      refined[v] = chosen
      subTotal[chosen]! += kv
      subSize[chosen]! += 1
      subSize[from] = 0
      // External weight of the merged subset: both externals minus twice the weight between them.
      const between = toSub.get(chosen) ?? 0
      subExternal.set(chosen, subExternal.get(chosen)! + subExternal.get(from)! - 2 * between)
    }
  }
  return refined
}

function aggregate(level: Level, groups: number[]): { level: Level; map: number[] } {
  const ids = [...new Set(groups)].sort((a, b) => a - b), renum = new Map(ids.map((g, i) => [g, i]))
  const n = ids.length, adj = ids.map(() => new Map<number, number>()), self = ids.map(() => 0), k = ids.map(() => 0)
  const map = groups.map((g) => renum.get(g)!)
  for (let i = 0; i < level.n; i++) {
    const a = map[i]!
    self[a]! += level.self[i]!
    k[a]! += level.k[i]!
    for (const [j, w] of level.adj[i]!) {
      if (j < i) continue
      const b = map[j]!
      if (a === b) self[a]! += w
      else {
        adj[a]!.set(b, (adj[a]!.get(b) ?? 0) + w)
        adj[b]!.set(a, (adj[b]!.get(a) ?? 0) + w)
      }
    }
  }
  return { level: { n, adj, self, k }, map }
}

export interface LeidenOptions {
  resolution?: number
  seed?: number
  maxLevels?: number
}

/** Leiden clusters. Returns a cluster number per node (0..c-1), numbered by first appearance in `nodes`. */
export function leiden(nodes: string[], edges: WeightedEdge[], options: LeidenOptions = {}): Map<string, number> {
  const gamma = options.resolution ?? 1, random = rng(options.seed ?? 1)
  let { level } = levelFrom(nodes, edges)
  const m2 = level.k.reduce((a, b) => a + b, 0)
  if (!m2) return new Map(nodes.map((n, i) => [n, i]))
  let toOriginal = nodes.map((_, i) => i) // original node -> current level node
  let part = [...Array(level.n).keys()]
  for (let round = 0; round < (options.maxLevels ?? 50); round++) {
    moveNodes(level, part, gamma, m2, random)
    if (new Set(part).size === level.n) break
    let refined = refine(level, part, gamma, m2, random)
    // If refinement merged nothing, aggregate by the moved partition so every round makes progress.
    if (new Set(refined).size === level.n) refined = part
    const { level: next, map } = aggregate(level, refined)
    const nextPart = new Array<number>(next.n)
    for (let i = 0; i < level.n; i++) nextPart[map[i]!] = part[i]!
    toOriginal = toOriginal.map((x) => map[x]!)
    level = next
    part = nextPart
  }
  const raw = toOriginal.map((x) => part[x]!), order = new Map<number, number>()
  for (const c of raw) if (!order.has(c)) order.set(c, order.size)
  return new Map(nodes.map((n, i) => [n, order.get(raw[i]!)!]))
}

export function modularity(nodes: string[], edges: WeightedEdge[], clusters: Map<string, number>, resolution = 1): number {
  const k = new Map<string, number>(), inside = new Map<number, number>(), tot = new Map<number, number>()
  let m = 0
  for (const [a, b, w] of edges) {
    if (!(w > 0)) continue
    m += w
    k.set(a, (k.get(a) ?? 0) + w)
    k.set(b, (k.get(b) ?? 0) + w)
    if (clusters.get(a) === clusters.get(b)) inside.set(clusters.get(a)!, (inside.get(clusters.get(a)!) ?? 0) + w)
  }
  if (!m) return 0
  for (const n of nodes) tot.set(clusters.get(n)!, (tot.get(clusters.get(n)!) ?? 0) + (k.get(n) ?? 0))
  let q = 0
  for (const [c, t] of tot) q += (inside.get(c) ?? 0) / m - resolution * (t / (2 * m)) ** 2
  return q
}

/** Degree-preserving rewiring of the unweighted graph (double edge swaps). */
export function rewire(edges: WeightedEdge[], random: () => number, swapsPerEdge = 10): WeightedEdge[] {
  const list = edges.filter(([a, b, w]) => a !== b && w > 0).map(([a, b]) => [a, b] as [string, string])
  const key = (a: string, b: string) => (a < b ? a + "\u0000" + b : b + "\u0000" + a)
  const present = new Set(list.map(([a, b]) => key(a, b)))
  for (let t = 0; t < list.length * swapsPerEdge; t++) {
    const i = Math.floor(random() * list.length), j = Math.floor(random() * list.length)
    if (i === j) continue
    const [a, b] = list[i]!, [c, d] = list[j]!
    if (a === d || c === b || a === c || b === d) continue
    if (present.has(key(a, d)) || present.has(key(c, b))) continue
    present.delete(key(a, b))
    present.delete(key(c, d))
    present.add(key(a, d))
    present.add(key(c, b))
    list[i] = [a, d]
    list[j] = [c, b]
  }
  return list.map(([a, b]) => [a, b, 1])
}

/** Modularity of the found clusters against rewired graphs with the same degrees. */
export function nullModel(nodes: string[], edges: WeightedEdge[], options: { samples?: number; seed?: number } = {}) {
  const binary: WeightedEdge[] = edges.filter(([a, b, w]) => a !== b && w > 0).map(([a, b]) => [a, b, 1])
  const observed = modularity(nodes, binary, leiden(nodes, binary, { seed: options.seed ?? 1 }))
  const random = rng((options.seed ?? 1) + 7919), samples: number[] = []
  for (let s = 0; s < (options.samples ?? 20); s++) {
    const shuffled = rewire(binary, random)
    samples.push(modularity(nodes, shuffled, leiden(nodes, shuffled, { seed: (options.seed ?? 1) + s + 1 })))
  }
  const mean = samples.reduce((a, b) => a + b, 0) / Math.max(samples.length, 1)
  const sd = Math.sqrt(samples.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(samples.length - 1, 1))
  return { observed: round(observed), nullMean: round(mean), nullSd: round(sd), z: sd > 0 ? round((observed - mean) / sd) : null, samples: samples.length }
}

export type Role = "inti" | "dasar-tipis" | "khusus" | "baru-atau-memudar"

/** Callon's strategic diagram: centrality (ties outside) and density (ties inside), split at the medians. */
export function strategicRoles(edges: WeightedEdge[], clusters: Map<string, number>) {
  const ids = [...new Set(clusters.values())].sort((a, b) => a - b)
  const size = new Map<number, number>(), inside = new Map<number, number>(), outside = new Map<number, number>()
  for (const c of clusters.values()) size.set(c, (size.get(c) ?? 0) + 1)
  for (const [a, b, w] of edges) {
    const ca = clusters.get(a), cb = clusters.get(b)
    if (ca === undefined || cb === undefined || a === b) continue
    if (ca === cb) inside.set(ca, (inside.get(ca) ?? 0) + w)
    else {
      outside.set(ca, (outside.get(ca) ?? 0) + w)
      outside.set(cb, (outside.get(cb) ?? 0) + w)
    }
  }
  const rows = ids.map((c) => {
    const n = size.get(c)!, pairs = (n * (n - 1)) / 2
    return { cluster: c, size: n, centrality: round(outside.get(c) ?? 0), density: round(pairs ? (inside.get(c) ?? 0) / pairs : 0) }
  })
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b)
    return s.length ? (s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2) : 0
  }
  const mc = median(rows.map((r) => r.centrality)), md = median(rows.map((r) => r.density))
  return rows.map((r) => ({
    ...r,
    role: (r.centrality >= mc ? (r.density >= md ? "inti" : "dasar-tipis") : r.density >= md ? "khusus" : "baru-atau-memudar") as Role,
  }))
}

/** Hill numbers of order 0, 1 and 2 over counts per voice (M15). */
export function hill(counts: Record<string, number>) {
  const xs = Object.values(counts).filter((x) => x > 0), total = xs.reduce((a, b) => a + b, 0)
  if (!total) return { q0: 0, q1: 0, q2: 0 }
  const p = xs.map((x) => x / total)
  return { q0: xs.length, q1: round(Math.exp(-p.reduce((s, x) => s + x * Math.log(x), 0))), q2: round(1 / p.reduce((s, x) => s + x * x, 0)) }
}

/** Adamic–Adar scores for unlinked pairs with shared neighbours (M9). Highest first, ties by name. */
export function predictLinks(nodes: string[], edges: WeightedEdge[], limit = 20) {
  const nbr = new Map<string, Set<string>>(nodes.map((n) => [n, new Set()]))
  for (const [a, b] of edges) if (a !== b && nbr.has(a) && nbr.has(b)) {
    nbr.get(a)!.add(b)
    nbr.get(b)!.add(a)
  }
  const scores = new Map<string, number>()
  for (const [z, ns] of nbr) {
    if (ns.size < 2) continue
    const weight = 1 / Math.log(ns.size)
    const list = [...ns].sort()
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!, b = list[j]!
      if (nbr.get(a)!.has(b)) continue
      const key = a + "\u0000" + b
      scores.set(key, (scores.get(key) ?? 0) + weight)
    }
    void z
  }
  return [...scores]
    .map(([key, score]) => {
      const [a, b] = key.split("\u0000") as [string, string]
      return { a, b, score: round(score) }
    })
    .sort((x, y) => y.score - x.score || (x.a + x.b < y.a + y.b ? -1 : 1))
    .slice(0, limit)
}

/** Fruchterman–Reingold with a seeded start and fixed steps; coordinates in [-1, 1]. */
export function layout(nodes: string[], edges: WeightedEdge[], options: { seed?: number; iterations?: number } = {}) {
  const random = rng(options.seed ?? 1), n = nodes.length
  const pos = nodes.map(() => [random() * 2 - 1, random() * 2 - 1] as [number, number])
  const index = new Map(nodes.map((x, i) => [x, i]))
  const k = Math.sqrt(4 / Math.max(n, 1))
  const links = edges.filter(([a, b]) => a !== b && index.has(a) && index.has(b)).map(([a, b, w]) => [index.get(a)!, index.get(b)!, w] as const)
  const steps = options.iterations ?? 300
  for (let step = 0; step < steps; step++) {
    const t = 0.1 * (1 - step / steps) + 0.002
    const disp = nodes.map(() => [0, 0])
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = pos[i]![0] - pos[j]![0], dy = pos[i]![1] - pos[j]![1], d = Math.max(Math.hypot(dx, dy), 1e-3), f = (k * k) / d
      disp[i]![0]! += (dx / d) * f
      disp[i]![1]! += (dy / d) * f
      disp[j]![0]! -= (dx / d) * f
      disp[j]![1]! -= (dy / d) * f
    }
    for (const [i, j, w] of links) {
      const dx = pos[i]![0] - pos[j]![0], dy = pos[i]![1] - pos[j]![1], d = Math.max(Math.hypot(dx, dy), 1e-3), f = ((d * d) / k) * Math.min(w, 3)
      disp[i]![0]! -= (dx / d) * f
      disp[i]![1]! -= (dy / d) * f
      disp[j]![0]! += (dx / d) * f
      disp[j]![1]! += (dy / d) * f
    }
    for (let i = 0; i < n; i++) {
      const d = Math.max(Math.hypot(disp[i]![0]!, disp[i]![1]!), 1e-9), s = Math.min(d, t)
      pos[i]![0] = Math.max(-1, Math.min(1, pos[i]![0] + (disp[i]![0]! / d) * s))
      pos[i]![1] = Math.max(-1, Math.min(1, pos[i]![1] + (disp[i]![1]! / d) * s))
    }
  }
  return new Map(nodes.map((x, i) => [x, [round(pos[i]![0], 3), round(pos[i]![1], 3)] as [number, number]]))
}

function round(x: number, digits = 4) {
  const f = 10 ** digits
  return Math.round(x * f) / f
}
