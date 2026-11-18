// Shared data for the places, languages and topics blocks: Jelajah shows them whole, a thing page shows the one
// it belongs to. Both build from the same public context list and the bundled atlas, so a layer, a language group
// or a topic branch reads the same in both places.
import { request } from './api'
import { contextTree } from './context-tree'
import type { MapData } from './observatory'
import type { Stratum } from './PlaceStrata.svelte'
import type { TopicTile } from './TopicTiles.svelte'
import type { Atlas } from './RegionArt.svelte'

export type Ctx = { id: string; slug: string; title: string; kind: string; facet: string; parents?: string[]; indexed: number; description?: string; aliases?: string[] }
/** [language slug, x, y, customary region of its Glottolog reference point] */
export type AtlasLang = [string, number, number, string | null]

// Coast at the top, highlands in the middle, the southern lowlands at the bottom.
export const REGION_ORDER = ['mamta-tabi', 'saireri', 'domberai', 'bomberai', 'meepago', 'la-pago', 'ha-anim']

export const regionTitle = (c: { title: string }) => c.title.replace(/^Meepago$/, 'Mee Pago')

let contextsOnce: Promise<Ctx[]> | null = null
/** The public context list, fetched once per page load. A failure is not kept, so the next view retries. */
export function loadContexts(): Promise<Ctx[]> {
  contextsOnce ??= request<Ctx[]>('/v1/contexts', undefined, undefined, true).catch((error) => {
    contextsOnce = null
    throw error
  })
  return contextsOnce
}
export const loadAtlasLangs = (): Promise<AtlasLang[]> =>
  import('./papua-atlas.json').then((m) => (m.default as unknown as { langs: AtlasLang[] }).langs).catch(() => [])
/** The region outlines for the small maps on place tiles. */
export const loadAtlas = (): Promise<Atlas | null> =>
  import('./papua-atlas.json').then((m) => m.default as unknown as Atlas).catch(() => null)

export function buildStrata(contexts: Ctx[], langs: AtlasLang[], map: MapData | null): Stratum[] {
  const bySlug = new Map(contexts.map((c) => [c.slug, c]))
  return REGION_ORDER.map((slug) => bySlug.get(slug))
    .filter((r): r is Ctx => !!r)
    .map((r) => ({
      slug: r.slug,
      title: regionTitle(r),
      href: '/contexts/' + r.slug,
      places: contexts
        .filter((c) => c.kind === 'place' && c.parents?.includes(r.id))
        .sort((a, b) => a.title.localeCompare(b.title, 'id'))
        .map((c) => ({ slug: c.slug, title: c.title })),
      languages: langs.filter((l) => l[3] === r.slug).length,
      pages: map?.nodes.filter((n) => n.k === 'page' && n.reg === r.slug).length ?? 0,
    }))
}

/** The customary regions a context sits in: itself, its parents, or for a province the regions of its kabupaten. */
export function regionsOf(slug: string, contexts: Ctx[], langs: AtlasLang[]): string[] {
  const bySlug = new Map(contexts.map((c) => [c.slug, c])),
    byId = new Map(contexts.map((c) => [c.id, c]))
  const c = bySlug.get(slug)
  if (!c) return []
  if (c.facet === 'customary-region') return [c.slug]
  if (c.kind === 'language') {
    const r = langs.find((l) => l[0] === slug)?.[3]
    return r ? [r] : []
  }
  const found = new Set<string>()
  for (const p of c.parents ?? []) if (byId.get(p)?.facet === 'customary-region') found.add(byId.get(p)!.slug)
  if (c.facet === 'province')
    for (const k of contexts)
      if (k.parents?.includes(c.id)) for (const p of k.parents) if (byId.get(p)?.facet === 'customary-region') found.add(byId.get(p)!.slug)
  return REGION_ORDER.filter((r) => found.has(r))
}

export function topicTiles(contexts: Ctx[]): TopicTile[] {
  return contextTree(contexts.map((c) => ({ ...c, description: '' }))).topics.map((b) => ({
    slug: b.node.slug,
    title: b.node.title,
    children: b.children.map((c) => ({ slug: c.slug, title: c.title })),
  }))
}

/** Tiles for one topic page: a topic with branches shows its branches; a branch shows the topics it belongs to. */
export function topicNeighbourhood(slug: string, contexts: Ctx[]): { tiles: TopicTile[]; mode: 'branches' | 'parents' | 'roots' } {
  const bySlug = new Map(contexts.map((c) => [c.slug, c])),
    byId = new Map(contexts.map((c) => [c.id, c]))
  const self = bySlug.get(slug)
  if (!self) return { tiles: [], mode: 'branches' }
  const kids = (id: string) =>
    contexts
      .filter((c) => c.kind === 'topic' && c.parents?.includes(id))
      .sort((a, b) => a.title.localeCompare(b.title, 'id'))
      .map((c) => ({ slug: c.slug, title: c.title }))
  const own = contexts.filter((c) => c.kind === 'topic' && c.parents?.includes(self.id))
  if (own.length)
    return {
      mode: 'branches',
      tiles: own.sort((a, b) => a.title.localeCompare(b.title, 'id')).map((c) => ({ slug: c.slug, title: c.title, children: kids(c.id) })),
    }
  const parents = (self.parents ?? []).map((p) => byId.get(p)).filter((p): p is Ctx => !!p && p.kind === 'topic' && p.facet !== 'topic-group')
  if (parents.length) return { mode: 'parents', tiles: parents.map((p) => ({ slug: p.slug, title: p.title, children: kids(p.id) })) }
  // A starter topic with no branches of its own: the other starter topics, by name only.
  return { mode: 'roots', tiles: topicTiles(contexts).map((t) => ({ ...t, children: [] })) }
}
