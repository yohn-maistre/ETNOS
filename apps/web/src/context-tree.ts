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
  const roots = all.filter((n) => n.kind === 'topic' && !(n.parents ?? []).some((p) => all.some((x) => x.id === p))).sort(byTitle)
  const topicGroups = roots.filter((n) => children.has(n.id)).map(branch),
    lenses = roots.filter((n) => !children.has(n.id))
  for (const n of roots) placed.add(n.id)
  for (const b of topicGroups) for (const c of b.children) placed.add(c.id)
  const languages = all.filter((n) => n.kind === 'language').sort(byTitle)
  const other = all.filter((n) => n.kind !== 'language' && !placed.has(n.id)).sort(byTitle)
  return { regions, provinces, languages, lenses, topicGroups, other }
}

/** Parents in reading order: reference region, then province, then the rest. */
export function orderedParents<T extends { facet?: string; title: string }>(parents: T[]) {
  const rank = (p: T) => (p.facet === 'customary-region' ? 0 : p.facet === 'province' ? 1 : 2)
  return [...parents].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, 'id'))
}
