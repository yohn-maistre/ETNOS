// Target positions for every lens of the knowledge map (docs/observatory/README.md, build status). The stage keeps one
// set of points and moves them between these arrangements; nothing here draws. Every layout is computed once from the
// public graph and returned in world units: x to the right, y up, z toward the back. The stage chooses the camera
// and the fit, and it only interpolates between two of these arrays while a lens changes.
import { BANDS, ILC, PACE, SIZE, bandOf, type World } from './world-scale.ts'

export type Lens = 'skala' | 'tingkat' | 'bidang' | 'kebutuhan' | 'hubungan' | 'peta'
export type Vec = [number, number, number]
export type StageNode = { id: string; class: string; title: string; context?: string | null; cluster?: number; x?: number; y?: number; witnesses: number; world?: World; needs?: string[] }
export type StageLink = { a: number; b: number; w: number; strong: boolean; disputed: boolean }
/** A labelled group drawn by a cluster lens. An empty group is drawn as a dashed ring, so what is missing shows. */
export type Group = { key: string; label: string; count: number; center: Vec; radius: number; tray?: boolean }
export type Layout = { pos: Vec[]; groups: Group[] }

export const LENS_LABEL: Record<Lens, string> = {
  skala: 'Ukuran dan waktu',
  tingkat: 'Tingkat',
  bidang: 'Bidang ilmu',
  kebutuhan: 'Kebutuhan',
  hubungan: 'Hubungan',
  peta: 'Peta',
}
export const LENSES = Object.keys(LENS_LABEL) as Lens[]
export const isLens = (v: unknown): v is Lens => typeof v === 'string' && v in LENS_LABEL

/** Half-sizes of the size and pace box: size runs along x, pace along y, level along z. */
export const BOX: Vec = [1.3, 1, 0.75]

const hash = (s: string) => {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return ((h >>> 0) % 10000) / 10000
}

/**
 * The size and pace box. A thing has a range, so it sits at a fixed spot inside it (the same spot as before, from its
 * id). z is the level of organisation (the ILC class, ordered from matter to knowledge): it is the only third value
 * that separates things in the public graph today, because every statement there has the same depth.
 */
export function skalaLayout(nodes: StageNode[], domain: { size: [number, number]; pace: [number, number] } = { size: SIZE, pace: PACE }): Layout {
  const unit = (v: number, [lo, hi]: [number, number]) => ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 2 - 1
  const pos = nodes.map((n): Vec => {
    const w = n.world
    if (!w?.pace || !w.level) return [-BOX[0], -BOX[1], 0]
    const inside = (r: { lo: number; hi: number }, salt: string) => r.lo + (r.hi - r.lo) * (0.12 + 0.76 * hash(n.id + salt))
    const k = ILC.indexOf(w.level.code)
    return [
      (w.size ? unit(inside(w.size, 's'), domain.size) : -1) * BOX[0],
      unit(inside(w.pace, 'p'), domain.pace) * BOX[1],
      (k < 0 ? 0 : (k / (ILC.length - 1)) * 2 - 1) * BOX[2],
    ]
  })
  return { pos, groups: [] }
}

/** The part of the frame that holds things, with half a unit of room on each side. */
export function dataDomain(nodes: StageNode[]): { size: [number, number]; pace: [number, number] } {
  let s0 = Infinity, s1 = -Infinity, p0 = Infinity, p1 = -Infinity
  for (const { world: w } of nodes) {
    if (w?.size) { s0 = Math.min(s0, w.size.lo); s1 = Math.max(s1, w.size.hi) }
    if (w?.pace) { p0 = Math.min(p0, w.pace.lo); p1 = Math.max(p1, w.pace.hi) }
  }
  if (!Number.isFinite(s0)) { s0 = SIZE[0]; s1 = SIZE[1] }
  if (!Number.isFinite(p0)) { p0 = PACE[0]; p1 = PACE[1] }
  return { size: [Math.floor(s0 - 0.4), Math.ceil(s1 + 0.4)], pace: [Math.floor(p0 - 0.4), Math.ceil(p1 + 0.4)] }
}

/**
 * Groups as discs in reading order, each with its members on a sunflower spiral (best-sourced in the middle).
 * `aspect` is the stage's width over height, so a wide stage gets more columns than a phone.
 */
export function clusterLayout(nodes: StageNode[], groups: { key: string; label: string }[], keyOf: (n: StageNode) => string | null, aspect: number, trayLabel?: string): Layout {
  const members = new Map<string, number[]>(groups.map((g) => [g.key, []]))
  const tray: number[] = []
  nodes.forEach((n, i) => { const k = keyOf(n); (k && members.has(k) ? members.get(k)! : tray).push(i) })
  const R = (count: number) => 0.09 + 0.055 * Math.sqrt(count)
  const slots = groups.map((g) => ({ ...g, list: members.get(g.key)! }))
  // When most things wait in the tray and the stage is wide, the tray sits left of the groups instead of below them,
  // so the groups get the height they need for their names.
  const trayR = tray.length ? R(tray.length) * 1.1 : 0, maxR = Math.max(...slots.map((s) => R(s.list.length)))
  const side = tray.length > 0 && trayR > maxR && aspect >= 1.2
  const shape = side ? 1 : Math.max(0.45, aspect)
  const cols = Math.max(1, Math.min(slots.length, Math.round(Math.sqrt(slots.length * shape * 1.1))))
  const rows = Math.ceil(slots.length / cols)
  const cell = Math.max(maxR * 2 + 0.22, side ? 0.62 : 0.5)
  const shift = side ? (trayR + 0.3) / 2 + 0.05 : 0
  const pos: Vec[] = nodes.map(() => [0, 0, 0])
  const out: Group[] = []
  const fill = (list: number[], c: Vec, r: number) => {
    const sorted = [...list].sort((a, b) => nodes[b].witnesses - nodes[a].witnesses || nodes[a].id.localeCompare(nodes[b].id))
    sorted.forEach((i, j) => {
      const rr = (r - 0.03) * Math.sqrt((j + 0.5) / sorted.length), t = j * 2.39996
      pos[i] = [c[0] + rr * Math.cos(t), c[1] + rr * Math.sin(t), c[2] + (hash(nodes[i].id + 'z') - 0.5) * 0.06]
    })
  }
  slots.forEach((s, k) => {
    const col = k % cols, row = Math.floor(k / cols)
    // The last row is centred when it is not full.
    const inRow = row === rows - 1 ? slots.length - row * cols : cols
    const c: Vec = [(col - (inRow - 1) / 2) * cell + shift, ((rows - 1) / 2 - row) * cell, 0]
    const r = R(s.list.length)
    fill(s.list, c, r)
    out.push({ key: s.key, label: s.label, count: s.list.length, center: c, radius: r })
  })
  if (tray.length) {
    // Things that belong to no group gather in a tray below the groups, or left of them (see `side`).
    const r = trayR, c: Vec = side ? [-((cols - 1) / 2) * cell + shift - cell / 2 - r - 0.15, 0, 0] : [0, -((rows - 1) / 2) * cell - cell / 2 - r - 0.1, 0]
    fill(tray, c, r)
    out.push({ key: '_tray', label: trayLabel ?? 'Lainnya', count: tray.length, center: c, radius: r, tray: true })
  }
  return { pos, groups: out }
}

/** The seven level bands in the order of the Integrative Levels Classification. */
export const tingkatLayout = (nodes: StageNode[], aspect: number) =>
  clusterLayout(nodes, BANDS.map((b) => ({ key: b.key, label: b.label })), (n) => bandOf(n.world?.level?.code)?.key ?? null, aspect, 'Tingkat belum diketahui')

/**
 * Fields of science, as a rule from the level class: each ILC class goes to the OpenAlex field that studies it most
 * (OpenAlex field ids in brackets). This is a stand-in until things get OpenAlex topics through embeddings (world
 * model doc §5.6), and the lens says so.
 */
export const FIELDS: { key: string; label: string; openalex: number; classes: string }[] = [
  { key: 'fisika', label: 'Fisika dan astronomi', openalex: 31, classes: 'abcdeh' },
  { key: 'kimia', label: 'Kimia', openalex: 16, classes: 'f' },
  { key: 'kebumian', label: 'Ilmu kebumian', openalex: 19, classes: 'gij' },
  { key: 'hayati', label: 'Ilmu hayati', openalex: 11, classes: 'klmn' },
  { key: 'psikologi', label: 'Psikologi', openalex: 32, classes: 'op' },
  { key: 'humaniora', label: 'Bahasa, seni dan humaniora', openalex: 12, classes: 'qrwxy' },
  { key: 'sosial', label: 'Ilmu sosial', openalex: 33, classes: 'st' },
  { key: 'ekonomi', label: 'Ekonomi', openalex: 20, classes: 'u' },
  { key: 'teknik', label: 'Teknik', openalex: 22, classes: 'v' },
]
export const fieldOf = (code: string | null | undefined) => (code ? FIELDS.find((f) => f.classes.includes(code)) : undefined)
export const bidangLayout = (nodes: StageNode[], aspect: number) =>
  clusterLayout(nodes, FIELDS.map((f) => ({ key: f.key, label: f.label })), (n) => fieldOf(n.world?.level?.code)?.key ?? null, aspect, 'Bidang belum diketahui')

/** Needs after nature's contributions to people (world model doc §6). A thing joins a need only through a checked
 * "dipakai untuk" statement; the public graph has none yet, so every thing waits in the tray. */
export const NEEDS: { key: string; label: string }[] = [
  { key: 'pangan', label: 'Pangan' },
  { key: 'air', label: 'Air' },
  { key: 'obat', label: 'Obat dan perawatan' },
  { key: 'bahan', label: 'Bahan' },
  { key: 'alat', label: 'Alat' },
  { key: 'pertukaran', label: 'Pertukaran' },
  { key: 'perlindungan', label: 'Perlindungan' },
  { key: 'belajar', label: 'Belajar dan cerita' },
  { key: 'hiasan', label: 'Hiasan' },
]
export const kebutuhanLayout = (nodes: StageNode[], aspect: number) =>
  clusterLayout(nodes, NEEDS, (n) => n.needs?.find((k) => NEEDS.some((x) => x.key === k)) ?? null, aspect, 'Belum ada catatan kebutuhan')

/**
 * The network, as the earlier 3D map laid it out: a deterministic force layout that starts from the published 2D
 * layout, gives each large group its own direction, pulls linked things together and pushes all things apart.
 */
export function hubunganLayout(nodes: StageNode[], links: StageLink[]): Layout {
  const n = nodes.length, clusters = [...new Set(nodes.map((d) => d.cluster ?? 0))].sort((a, b) => a - b)
  const dir = new Map(clusters.map((c, k) => {
    const t = Math.acos(1 - (2 * (k + 0.5)) / clusters.length), p = k * 2.39996
    return [c, [Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)] as const]
  }))
  const h3 = (s: string) => hash(s) * 1 - 0.5
  const pos = nodes.map((d) => { const v = dir.get(d.cluster ?? 0)!; return [(d.x ?? 0) * 0.6 + v[0] * 0.5, (d.y ?? 0) * 0.6 + v[1] * 0.5, v[2] * 0.7 + h3(d.id) * 0.2] })
  const ITER = 260
  for (let it = 0; it < ITER; it++) {
    const f = pos.map(() => [0, 0, 0]), step = 1 - it / ITER
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1], dz = pos[i][2] - pos[j][2], k = 0.0035 / (dx * dx + dy * dy + dz * dz + 0.01)
      f[i][0] += dx * k; f[i][1] += dy * k; f[i][2] += dz * k; f[j][0] -= dx * k; f[j][1] -= dy * k; f[j][2] -= dz * k
    }
    for (const l of links) {
      const a = pos[l.a], b = pos[l.b], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001
      const k = ((l.strong ? 0.12 : 0.03 * l.w) * (d - (l.strong ? 0.18 : 0.3))) / d
      f[l.a][0] += dx * k; f[l.a][1] += dy * k; f[l.a][2] += dz * k; f[l.b][0] -= dx * k; f[l.b][1] -= dy * k; f[l.b][2] -= dz * k
    }
    for (let i = 0; i < n; i++) {
      const v = dir.get(nodes[i].cluster ?? 0)!
      for (let d = 0; d < 3; d++) pos[i][d] += Math.max(-0.08, Math.min(0.08, f[i][d] + (v[d] * 0.65 - pos[i][d]) * 0.02 - pos[i][d] * 0.008)) * step
    }
  }
  const c = [0, 1, 2].map((d) => pos.reduce((s, p) => s + p[d], 0) / Math.max(1, n))
  for (const p of pos) for (let d = 0; d < 3; d++) p[d] -= c[d]
  const radii = pos.map((p) => Math.hypot(p[0], p[1], p[2])).sort((a, b) => a - b), r90 = radii[Math.floor(radii.length * 0.9)] || 1
  return { pos: pos.map((p) => [p[0] / r90, -p[1] / r90, p[2] / r90] as Vec), groups: [] }
}

/** The links of the network lens: statements strong, co-mentions weighted by how often things are named together. */
export function linksOf(nodes: StageNode[], statements: { source: string; target: string; logical?: string }[], comentions: { a: string; b: string; weight: number }[]): StageLink[] {
  const index = new Map(nodes.map((n, i) => [n.id, i])), out: StageLink[] = []
  const max = Math.max(1, ...comentions.map((c) => c.weight))
  for (const c of comentions) { const a = index.get(c.a), b = index.get(c.b); if (a !== undefined && b !== undefined) out.push({ a, b, w: c.weight / max, strong: false, disputed: false }) }
  for (const s of statements) { const a = index.get(s.source), b = index.get(s.target); if (a !== undefined && b !== undefined) out.push({ a, b, w: 1, strong: true, disputed: s.logical === 'disputed' }) }
  return out
}

/**
 * The map lens: points with a coordinate fly to it (in the site map's Web Mercator pixels, the same space as the region
 * outlines in papua-atlas.json); the rest gather in a labelled tray beside the map. `at` gives a point or null.
 */
export function petaLayout<N extends StageNode>(nodes: N[], at: (n: N) => [number, number] | null, box: [number, number, number, number], aspect: number): Layout & { scale: number; offset: [number, number] } {
  const [x0, y0, x1, y1] = box, s = 2 / Math.max(x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  const map = (x: number, y: number): Vec => [(x - cx) * s, -(y - cy) * s, 0]
  const pos: Vec[] = nodes.map(() => [0, 0, 0]), tray: number[] = []
  nodes.forEach((n, i) => { const p = at(n); if (p) pos[i] = map(p[0], p[1]); else tray.push(i) })
  const groups: Group[] = []
  if (tray.length) {
    const w = (x1 - x0) * s, h = (y1 - y0) * s, r = 0.1 + 0.05 * Math.sqrt(tray.length)
    // A wide stage keeps the tray to the right of the map; a tall one puts it below.
    const c: Vec = aspect >= 1.2 ? [w / 2 + r + 0.25, 0, 0] : [0, -h / 2 - r - 0.25, 0]
    const sorted = [...tray].sort((a, b) => nodes[b].witnesses - nodes[a].witnesses || nodes[a].id.localeCompare(nodes[b].id))
    sorted.forEach((i, j) => { const rr = (r - 0.03) * Math.sqrt((j + 0.5) / sorted.length), t = j * 2.39996; pos[i] = [c[0] + rr * Math.cos(t), c[1] + rr * Math.sin(t), 0] })
    groups.push({ key: '_tray', label: 'Belum punya titik di peta', count: tray.length, center: c, radius: r, tray: true })
  }
  return { pos, groups, scale: s, offset: [cx, cy] }
}

/** The outline of an SVG path made only of M, L and Z commands, as rings of points. */
export function pathRings(d: string): [number, number][][] {
  const rings: [number, number][][] = []
  let ring: [number, number][] = []
  for (const m of d.matchAll(/([MLZ])\s*([-\d.]+)?[ ,]?([-\d.]+)?/gi)) {
    const cmd = m[1].toUpperCase()
    if (cmd === 'Z') { if (ring.length) rings.push(ring); ring = []; continue }
    if (cmd === 'M' && ring.length) { rings.push(ring); ring = [] }
    ring.push([Number(m[2]), Number(m[3])])
  }
  if (ring.length) rings.push(ring)
  return rings
}

/** Words that a search matches: lower case, without diacritics. */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('id')
