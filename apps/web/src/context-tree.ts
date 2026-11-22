/** Public contexts as the directory draws them: a deployment catalogue gives
 * regions and provinces a facet and regencies their parents. Contexts without
 * either still appear, under "other", so a node without a catalogue loses nothing. */
export type ContextNode = {
  id: string
  slug: string
  title: string
  description: string
  kind: string
  facet?: string
  aliases?: string[]
  parents?: string[]
  indexed?: number
}
export type ContextBranch = { node: ContextNode; children: ContextNode[] }

export const facetNames: Record<string, string> = {
  'customary-region': 'Wilayah adat',
  province: 'Provinsi',
  regency: 'Kabupaten',
  city: 'Kota',
  'institution-kind': 'Jenis lembaga',
  'cultural-domain': 'Ranah budaya',
  'community-kind': 'Jenis komunitas',
  'topic-group': 'Kelompok topik',
}

const byTitle = (a: ContextNode, b: ContextNode) => a.title.localeCompare(b.title, 'id')

export function contextTree(all: ContextNode[]) {
  const children = new Map<string, ContextNode[]>()
  for (const n of all) for (const p of n.parents ?? []) children.set(p, [...(children.get(p) ?? []), n])
  const branch = (node: ContextNode): ContextBranch => ({ node, children: [...(children.get(node.id) ?? [])].sort(byTitle) })
  const facet = (f: string) => all.filter((n) => n.kind === 'region' && n.facet === f).sort(byTitle).map(branch)
  const regions = facet('customary-region'),
    provinces = facet('province')
  const placed = new Set<string>()
  for (const b of [...regions, ...provinces]) {
    placed.add(b.node.id)
    for (const c of b.children) placed.add(c.id)
  }
  // Topic groups were display headings in earlier catalogues; running nodes may still hold them, so they are skipped.
  const groups = new Set(all.filter((n) => n.facet === 'topic-group').map((n) => n.id))
  const real = (id: string) => !groups.has(id) && all.some((x) => x.id === id)
  const roots = all.filter((n) => n.kind === 'topic' && !groups.has(n.id) && !(n.parents ?? []).some(real)).sort(byTitle)
  const topics = roots.filter((n) => !n.facet).map(branch),
    lensBranches = roots.filter((n) => n.facet).map(branch)
  for (const n of groups) placed.add(n)
  for (const b of [...topics, ...lensBranches]) {
    placed.add(b.node.id)
    for (const c of b.children) placed.add(c.id)
  }
  const languages = all.filter((n) => n.kind === 'language').sort(byTitle)
  const other = all.filter((n) => n.kind !== 'language' && !placed.has(n.id)).sort(byTitle)
  return { regions, provinces, languages, topics, lensBranches, other }
}

/** The starter topics a deployment shows first: top-level topics without a facet. */
export function topTopics<T extends ContextNode>(all: T[]) {
  return contextTree(all).topics.map((b) => b.node as T)
}
