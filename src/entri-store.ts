/**
 * The entry adapter's reads from this node's own tables (src/entri.ts). Every read is the anonymous, public one:
 * contexts that are active, public groups, listed communities, accepted revisions of pages in public communities,
 * the public part of the knowledge model, open datasets, and the Kamus of public communities.
 */
import type { EtnosCore } from './core.ts'
import type { Groups } from './groups.ts'
import type { Wiki } from './wiki.ts'
import type { KnowledgeModel, KnowledgeSeed } from './knowledge-model.ts'
import type { Datasets } from './datasets.ts'
import type { Kamus } from './kamus.ts'
import type { Lembaga } from './lembaga.ts'
import type { Kios } from './kios.ts'
import { contextFamily } from './catalogue.ts'
import { sukuPlace, SUKU } from './suku.ts'
import { viewerRecords, type Commons, type EntrySource, type ViewerRecord, type LocalName } from './entri.ts'

/** The knowledge seed as the public commons, for a node that has not imported it: the same file builds the public map. */
export function seedCommons(seed: KnowledgeSeed): Commons {
  const excerpts = new Map<string, Set<string>>()
  for (const m of seed.mentions) excerpts.set(m.witness + '|' + m.excerpt, (excerpts.get(m.witness + '|' + m.excerpt) ?? new Set()).add(m.entity))
  const pairs = new Map<string, { a: string; b: string; weight: number }>()
  for (const set of excerpts.values()) {
    const list = [...set].sort()
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const k = list[i] + '|' + list[j], p = pairs.get(k) ?? { a: list[i]!, b: list[j]!, weight: 0 }; p.weight++; pairs.set(k, p) }
  }
  return {
    entities: seed.entities.map((e) => ({ slug: e.slug, class: e.class, title: e.title, description: e.description, aliases: e.aliases ?? [], context: e.context })),
    statements: seed.assertions.filter((a) => a.status === 'accepted').map((a) => ({ subject: a.subject, predicate: a.predicate, object: a.object })),
    comentions: [...pairs.values()],
  }
}

export function storeSource(o: { store: EtnosCore; groups: Groups; wiki: Wiki; model: KnowledgeModel; datasets: Datasets; kamus: Kamus; seed: KnowledgeSeed; catalogue?: string; records?: ViewerRecord[]; localNames?: (recordId: string) => LocalName[]; lembaga?: Lembaga; kios?: Kios }): EntrySource {
  const s = o.store
  const publicPage = `SELECT w.id FROM wiki_pages w JOIN communities c ON c.id=w.community_id WHERE c.visibility='public' AND w.draft=0 AND w.revision_id IS NOT NULL`
  return {
    records: o.records ?? viewerRecords,
    contexts: async () => o.groups.contexts().map((c) => ({ id: c.id, slug: c.slug, title: c.title, kind: c.kind, facet: c.facet ?? '', description: c.description, aliases: c.aliases, parents: c.parents })),
    contextDetail: async (slug) => {
      try {
        const d = o.groups.contextDetail(slug), f = contextFamily(d, o.catalogue)
        return { groups: d.groups.map((g) => ({ id: g.id, title: g.title })), children: d.children.map((x) => ({ ...x, facet: x.facet ?? '' })), childCount: d.childCount, communities: d.communities.map((x) => ({ id: x.id, title: x.title, description: x.description, visibility: x.visibility, admission: x.admission, via: x.via })), newsPlaces: d.newsPlaces, family: f ? { title: f.title, basis: f.basis, sources: f.sources } : null }
      } catch { return null }
    },
    pages: async () => o.wiki.discover().map((p) => ({ id: p.id, title: p.title, community_id: p.community_id, updated: p.updated, excerpt: p.excerpt, reviewer: p.reviewer ? { name: p.reviewer.name, kind: p.reviewer.kind } : null, review: p.review })),
    pageLabels: async () => {
      const out = new Map<string, string[]>()
      for (const r of s.all<{ record_id: string; context_id: string }>(`SELECT l.record_id,l.context_id FROM record_contexts l JOIN contexts x ON x.id=l.context_id AND x.active=1 WHERE l.record_kind='wiki' AND l.record_id IN (${publicPage}) ORDER BY l.record_id,l.context_id`))
        out.set(r.record_id, [...(out.get(r.record_id) ?? []), r.context_id])
      return out
    },
    page: async (id) => {
      if (!s.get(publicPage + ' AND w.id=?', id)) return null
      const p = o.wiki.read(id)
      const r = p.revision
      return { id: p.id, title: p.title, community_id: p.community_id, revision: r ? { id: r.id, text: r.text, citations: r.citations, created: r.created, review: r.review, language: r.language, perspective: r.perspective, author: r.author ?? null, reviewer: r.reviewer ?? null } : null }
    },
    revisions: async (id) => (s.get(publicPage + ' AND w.id=?', id) ? o.wiki.history(id).length : 0),
    commons: async () => {
      const stored = s.get<{ n: number }>('SELECT count(*) n FROM km_entities')!.n
      // Lembaga listings (src/lembaga.ts) are entries of kind lembaga beside the model, never rows of it.
      const listings = (o.lembaga?.listings() ?? []).map((l) => ({ slug: l.slug, class: 'lembaga', title: l.title, description: l.description, aliases: [], context: null, place: l.place_slug, sub: l.jenis_slug ? { key: l.jenis_slug, label: l.jenis_title! } : null }))
      // Peoples from the Wikipedia list (src/suku.ts) carry the place that the list gives.
      const placed = <T extends { slug: string; class: string }>(e: T) => (e.class === 'kelompok' && SUKU.has(e.slug) ? { ...e, place: sukuPlace(e.slug) } : e)
      if (!stored) { const seed = seedCommons(o.seed); return { ...seed, entities: [...seed.entities.map(placed), ...listings] } }
      const g = o.model.graph(undefined, { publicOnly: true })
      const about = new Map(o.model.entities(undefined).map((e) => [e.slug, e]))
      // A people of the shipped list that this node has not imported yet still has its entry; one that a steward
      // rejected or merged is in km_entities and stays out.
      const known = new Set(s.all<{ slug: string }>('SELECT slug FROM km_entities').map((r) => r.slug))
      const pending = o.seed.entities.filter((e) => e.class === 'kelompok' && SUKU.has(e.slug) && !known.has(e.slug)).map((e) => placed({ slug: e.slug, class: e.class, title: e.title, description: e.description, aliases: [] as string[], context: null }))
      return {
        entities: [...g.nodes.map((n) => placed({ slug: n.id, class: n.class, title: n.title, description: about.get(n.id)?.description ?? '', aliases: [] as string[], context: n.context })), ...pending, ...listings],
        statements: g.statements.filter((x) => x.target).map((x) => ({ subject: x.source, predicate: x.predicate, object: x.target! })),
        comentions: g.comentions,
      }
    },
    datasets: async (filter) => {
      try { return o.datasets.list(undefined, filter).map((d) => ({ id: d.id, title: d.title, kind: d.kind, publisher: d.publisher, licence: d.licence })) } catch { return [] }
    },
    kamus: async () => {
      const out = []
      for (const c of s.all<{ id: string; title: string }>("SELECT id,title FROM communities WHERE visibility='public' ORDER BY title LIMIT 200")) {
        const set = o.kamus.settings(c.id)
        if (!set.language) continue
        const entries = s.get<{ n: number }>('SELECT count(*) n FROM kamus_entries WHERE community_id=?', c.id)!.n
        const words = entries ? o.kamus.list(undefined, c.id, { state: 'checked', limit: 40 }).entries.map((e) => ({ lemma: e.lemma, gloss: e.gloss, updated: e.updated })) : []
        out.push({ communityId: c.id, title: c.title, language: set.language, languageName: set.languageName, languageSlug: set.languageSlug, entries, words })
      }
      return out
    },
    localNames: async (id) => o.localNames?.(id) ?? [],
    managedBy: async (slugs) => o.lembaga?.managedBy(slugs) ?? null,
    kios: async (id) => o.kios?.place(id) ?? [],
    // A lembaga that claimed an entry is listed through that entry, not twice.
    groups: async () => o.groups.list(undefined).filter((g) => g.visibility === 'public' && !o.lembaga?.claimedEntry(g.id)).map((g) => ({ id: g.id, title: g.title, kind: g.kind, description: g.description })),
  }
}
