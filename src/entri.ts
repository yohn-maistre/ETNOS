/**
 * One entry page for every kind (docs/plan/one-page-system-2026-11-21.md §2 and §3): a read adapter over today's
 * tables. It changes no storage. Everything it returns is public: contexts, accepted revisions of public wiki pages,
 * the public part of the knowledge model, listed communities, public groups, open datasets and the static viewer
 * records. It reads as an anonymous reader whoever asks, so a member's private rooms never shape a public page.
 *
 * Where an entry comes from, and which address wins (`/wiki/<slug>`):
 * 1. A few words are routes, not entries: notes, data, peta, lihat, jenis.
 * 2. A wiki page id (a UUID) opens the entry whose article that page is, or the page on its own when it describes
 *    nothing else yet. The page id stays an alias, so old links keep working.
 * 3. A context (place, region, language, topic) owns its slug.
 * 4. A thing of the knowledge model owns its slug, unless it names a context (`context_slug`), in which case it is
 *    that context's entry; or unless a different context already holds the slug, in which case its address is
 *    `<slug>--<class>` (a double hyphen, which no catalogue slug and no model slug can contain).
 * 5. A viewer record that is not about a thing of the model is an entry of its own (a species, an object), with the
 *    same rule for a slug that is already taken. A record id is an alias of its entry.
 * An entry's article: the labelled page titled exactly with the context's name (or with its kind word in front, such
 * as "Kabupaten Paniai"), else the only labelled page that starts with that kind word; for a thing of the model or a
 * record, a public page with exactly its title. Contexts choose first, in slug order, so one page has one entry.
 */
import viewerIndexJson from './catalogues/tanah-papua-viewer-index.json' with { type: 'json' }
import { SUKU, SUKU_BY_LANGUAGE, SUKU_SOURCE, sukuWhere } from './suku.ts'
import { WORDLIST_CODES } from './peta-kata.ts'
import { indonesianOnly } from './aksara-voice.ts'

export type EntryKind = 'tempat' | 'bentang-alam' | 'bahasa' | 'suku' | 'makhluk' | 'benda' | 'lembaga' | 'topik' | 'peristiwa' | 'gagasan' | 'praktik' | 'orang' | 'musim' | 'cerita' | 'halaman'
export const KIND_LABEL: Record<EntryKind, string> = {
  tempat: 'Tempat', 'bentang-alam': 'Bentang alam', bahasa: 'Bahasa', suku: 'Suku', makhluk: 'Makhluk hidup', benda: 'Benda', lembaga: 'Lembaga',
  topik: 'Topik', peristiwa: 'Peristiwa', gagasan: 'Gagasan', praktik: 'Praktik', orang: 'Tokoh', musim: 'Musim', cerita: 'Cerita', halaman: 'Halaman',
}
const CLASS_KIND: Record<string, EntryKind> = { tempat: 'tempat', makhluk: 'makhluk', kelompok: 'suku', lembaga: 'lembaga', orang: 'orang', benda: 'benda', bahasa: 'bahasa', gagasan: 'gagasan', praktik: 'praktik', peristiwa: 'peristiwa', musim: 'musim', cerita: 'cerita' }
const FACET_LABEL: Record<string, string> = { 'customary-region': 'Wilayah adat', province: 'Provinsi', regency: 'Kabupaten', city: 'Kota', 'institution-kind': 'Jenis lembaga', 'cultural-domain': 'Ranah budaya', 'community-kind': 'Jenis komunitas', 'topic-group': 'Kelompok topik' }
/** The word a page title puts before a context's name. */
export const FACET_PREFIX: Record<string, string> = { 'customary-region': 'Wilayah adat', province: 'Provinsi', regency: 'Kabupaten', city: 'Kota' }
export const RESERVED = new Set(['notes', 'data', 'peta', 'lihat', 'jenis'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** A landform by the first word of its name: the rule is written down here so the kind can be checked. */
const LANDFORM = /^(Danau|Gunung|Puncak|Lembah|Teluk|Sungai|Pulau|Tanjung|Pegunungan|Bukit)\s/
/** A thing of class bahasa whose name says that it is a group of languages ("Rumpun bahasa Dani", "Bahasa-bahasa
 * Yapen") is filed as a Kelompok bahasa: it stays a Bahasa entry at the same address, but it is not counted or
 * listed as one language. Languages themselves come from the catalogue, one per Glottocode. */
const LANGUAGE_GROUP = /^(Rumpun bahasa|Bahasa-bahasa|Kelompok bahasa)\s/i
export const LANGUAGE_GROUP_SUB = { key: 'kelompok', label: 'Kelompok bahasa' }
const LANDFORM_SUB: Record<string, [string, string]> = { Danau: ['danau', 'Danau'], Gunung: ['gunung', 'Gunung'], Puncak: ['gunung', 'Gunung'], Lembah: ['lembah', 'Lembah'], Teluk: ['teluk', 'Teluk'], Sungai: ['sungai', 'Sungai'], Pulau: ['pulau', 'Pulau'], Tanjung: ['tanjung', 'Tanjung'], Pegunungan: ['pegunungan', 'Pegunungan'], Bukit: ['bukit', 'Bukit'] }
/** Sub-kinds of living things from the GBIF taxonomy of their record. Most specific rank first. */
const TAXON_SUB: [string, string, string, string][] = [['order', 'Lepidoptera', 'kupu-kupu', 'Kupu-kupu'], ['class', 'Aves', 'burung', 'Burung'], ['class', 'Mammalia', 'mamalia', 'Mamalia'], ['class', 'Reptilia', 'reptil', 'Reptil'], ['class', 'Amphibia', 'amfibi', 'Amfibi'], ['class', 'Insecta', 'serangga', 'Serangga'], ['class', 'Actinopterygii', 'ikan', 'Ikan'], ['kingdom', 'Plantae', 'tumbuhan', 'Tumbuhan']]
const PREDICATE_LABEL: Record<string, [string, string]> = {
  'bagian-dari': ['Bagian dari', 'Mencakup'], 'berada-di': ['Berada di', 'Tempat bagi'], 'mendiami': ['Mendiami', 'Didiami oleh'], 'dituturkan-di': ['Dituturkan di', 'Bahasa di sini'],
  'dituturkan-oleh': ['Dituturkan oleh', 'Bahasa yang dipakai'], 'hidup-di': ['Hidup di', 'Tempat hidup bagi'], 'berbatasan-dengan': ['Berbatasan dengan', 'Berbatasan dengan'], 'berkerabat-dengan': ['Berkerabat dengan', 'Berkerabat dengan'],
  'bertetangga-dengan': ['Bertetangga dengan', 'Bertetangga dengan'], 'sama-dengan': ['Sama dengan', 'Sama dengan'], 'nama-lain-dari': ['Nama lain dari', 'Nama lainnya'],
}

export type Ctx = { id: string; slug: string; title: string; kind: string; facet?: string; description: string; aliases: string[]; parents: string[] }
export type CtxDetail = {
  groups: { id: string; title: string }[]
  children: { id: string; slug: string; title: string; kind: string; facet?: string }[]
  childCount: number
  communities: { id: string; title: string; description: string; visibility: string; admission: string; via: { id: string; slug: string; title: string } | null }[]
  newsPlaces: string[]
  family: { title: string; basis: string; sources: { title: string; url: string }[] } | null
}
export type PageRef = { id: string; title: string; community_id: string; updated: number; excerpt: string; reviewer: { name: string; kind?: string } | null; review: string }
/** An unreviewed draft by an agent shows only its Indonesian paragraphs; earlier drafts copied English sources as they were. */
function withoutEnglishDraft<R extends { text: string; review: string; author: { kind: string } | null }>(r: R): R & { untranslated?: boolean } {
  if (r.author?.kind !== 'agent' || r.review === 'reviewed') return r
  const { text, dropped } = indonesianOnly(r.text)
  return dropped && text ? { ...r, text, untranslated: true } : r
}

export type PageFull = { id: string; title: string; community_id: string; revision: { id: string; text: string; citations: string[]; created: number; review: string; language: string; perspective: string; author: { id: string; name: string; kind: string } | null; reviewer: { id: string; name: string; kind: string } | null } | null }
/** `place` and `sub` are set only by lembaga listings (src/lembaga.ts): the context slug it sits in, and its jenis. */
export type CommonsEntity = { slug: string; class: string; title: string; description: string; aliases: string[]; context: string | null; place?: string | null; sub?: { key: string; label: string } | null }
export type Commons = { entities: CommonsEntity[]; statements: { subject: string; predicate: string; object: string }[]; comentions: { a: string; b: string; weight: number }[] }
export type DatasetRef = { id: string; title: string; kind: string; publisher: string; licence: string }
export type KamusRef = { communityId: string; title: string; language: string; languageName: string; languageSlug?: string; entries: number; words: { lemma: string; gloss: string; updated: number }[] }
export type ViewerRecord = { id: string; kind: string; title: string; subtitle: string | null; summary: string; thumb: string | null; entry: { slug: string; class?: string; title?: string; scientificName?: string; landform?: boolean } | null; taxonomy: { rank: string; name: string }[] | null; facts: { label: string; value: string }[] }

/** Every read the adapter needs, all public. The server answers from its tables; a preview can answer over HTTP. */
export interface EntrySource {
  contexts(): Promise<Ctx[]>
  contextDetail(slug: string): Promise<CtxDetail | null>
  /** Public pages with an accepted revision. */
  pages(): Promise<PageRef[]>
  /** Context ids each public page is labelled with. */
  pageLabels(): Promise<Map<string, string[]>>
  page(id: string): Promise<PageFull | null>
  revisions(id: string): Promise<number>
  commons(): Promise<Commons>
  datasets(filter: { context?: string; thing?: string }): Promise<DatasetRef[]>
  kamus(): Promise<KamusRef[]>
  groups(): Promise<{ id: string; title: string; kind: string; description: string }[]>
  records: ViewerRecord[]
  /** Checked local names of a species from public communities' Kamus (P2, src/kamus-ask.ts). */
  localNames?(recordId: string): Promise<LocalName[]>
  /** The public lembaga that claimed one of these addresses (P3, src/lembaga.ts). */
  managedBy?(slugs: string[]): Promise<{ id: string; title: string } | null>
  /** Open Kios offers in a place and below it (P3, src/kios.ts). */
  kios?(contextId: string): Promise<KiosItem[]>
}
export type KiosItem = { post: { id: string; text: string; content?: unknown; offering: unknown; community_id: string; author_id: string }; seller: { kind: 'actor' | 'group'; id: string; title: string; href: string } }
export type LocalName = { name: string; language: string; community: { id: string; title: string } }

export type Ref = { slug: string; title: string; kind: EntryKind; href: string; sub?: string | null }
export type ChainItem = { title: string; href?: string }
type Node = {
  slug: string
  kind: EntryKind
  sub: { key: string; label: string } | null
  title: string
  description: string
  aliases: string[]
  ctx: Ctx | null
  entity: CommonsEntity | null
  record: ViewerRecord | null
  page: PageRef | null
  /** Thing slugs of the model that this entry stands for. */
  things: string[]
  media: ViewerRecord[]
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '')
const hrefOf = (slug: string) => '/wiki/' + encodeURIComponent(slug)
const familyOf = (c: Ctx) => c.description.match(/^Rumpun (.+?) menurut Glottolog/)?.[1] ?? ''
const keyOf = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
/** A description that only restates the kind ("Lensa: …", "Kelompok topik: …") drops that prefix. */
function blurb(text: string, kind: string) {
  const t = (text ?? '').trim().replace(/^Lensa:\s*/, '')
  return kind && t.toLowerCase().startsWith(kind.toLowerCase() + ':') ? t.slice(kind.length + 1).trim().replace(/^./, (c) => c.toUpperCase()) : t
}

function ctxKind(c: Ctx): EntryKind {
  return c.kind === 'language' ? 'bahasa' : c.kind === 'topic' ? 'topik' : 'tempat'
}
function ctxSub(c: Ctx): Node['sub'] {
  if (c.kind === 'language') { const f = familyOf(c); return f ? { key: keyOf(f), label: f } : null }
  const label = FACET_LABEL[c.facet ?? '']
  return label ? { key: c.facet!, label } : c.kind === 'topic' ? { key: 'topik', label: 'Topik' } : null
}
function taxonSub(taxonomy: ViewerRecord['taxonomy']): Node['sub'] {
  for (const [rank, name, key, label] of TAXON_SUB) if (taxonomy?.some((t) => t.rank === rank && t.name === name)) return { key, label }
  return null
}

/** The whole public catalogue of entries, built once per request from the source. */
export async function catalogue(source: EntrySource) {
  const [contexts, commons, pages, labels] = await Promise.all([source.contexts(), source.commons(), source.pages(), source.pageLabels()])
  const ctxBySlug = new Map(contexts.map((c) => [c.slug, c])), ctxById = new Map(contexts.map((c) => [c.id, c]))
  const nodes = new Map<string, Node>()
  /** Other addresses of an entry: page ids, context ids, thing slugs, record ids. */
  const alias = new Map<string, string>()
  const taken = (slug: string) => nodes.has(slug) || ctxBySlug.has(slug)

  for (const c of [...contexts].sort((a, b) => a.slug.localeCompare(b.slug))) {
    nodes.set(c.slug, { slug: c.slug, kind: ctxKind(c), sub: ctxSub(c), title: c.title, description: blurb(c.description, FACET_LABEL[c.facet ?? ''] ?? ''), aliases: c.aliases.filter((a) => !a.includes(':')), ctx: c, entity: null, record: null, page: null, things: [], media: [] })
    alias.set(c.id, c.slug)
  }
  const thingEntry = new Map<string, string>()
  const landformRecord = new Set(source.records.filter((r) => r.entry?.landform).map((r) => r.entry!.slug))
  for (const e of [...commons.entities].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const home = e.context && ctxBySlug.has(e.context) ? e.context : null
    if (home) { nodes.get(home)!.things.push(e.slug); thingEntry.set(e.slug, home); if (e.slug !== home) alias.set(e.slug, home); continue }
    const slug = taken(e.slug) ? e.slug + '--' + e.class : e.slug
    let kind = CLASS_KIND[e.class] ?? 'gagasan', sub: Node['sub'] = e.sub ?? null
    const word = e.title.match(LANDFORM)?.[1]
    if (kind === 'tempat' && (word || landformRecord.has(e.slug))) { kind = 'bentang-alam'; const s = word ? LANDFORM_SUB[word] : null; sub = s ? { key: s[0], label: s[1] } : null }
    if (kind === 'bahasa' && LANGUAGE_GROUP.test(e.title)) sub = { ...LANGUAGE_GROUP_SUB }
    nodes.set(slug, { slug, kind, sub, title: e.title, description: e.description, aliases: e.aliases ?? [], ctx: null, entity: e, record: null, page: null, things: [e.slug], media: [] })
    thingEntry.set(e.slug, slug)
    if (slug !== e.slug) alias.set(e.slug, slug)
  }
  // Viewer records: media on the entry they are about, or an entry of their own.
  const own: [ViewerRecord, string][] = []
  for (const r of source.records) {
    if (!r.entry) continue
    if (r.entry.landform) { const at = thingEntry.get(r.entry.slug); if (at) nodes.get(at)!.media.push(r), alias.set(r.id, at); continue }
    if (r.entry.class) {
      const slug = taken(r.entry.slug) && !nodes.get(r.entry.slug)?.record ? r.entry.slug + '--' + r.entry.class : r.entry.slug
      if (!nodes.has(slug)) nodes.set(slug, { slug, kind: CLASS_KIND[r.entry.class] ?? 'benda', sub: r.kind === 'species' ? taxonSub(r.taxonomy) : null, title: r.entry.title ?? r.title, description: r.summary, aliases: r.entry.scientificName ? [r.entry.scientificName] : [], ctx: null, entity: null, record: r.kind === 'species' || r.kind === 'model' || r.kind === 'images' ? r : null, page: null, things: [], media: [] })
      nodes.get(slug)!.media.push(r)
      if (r.id !== slug) alias.set(r.id, slug)
      if (r.entry.slug !== slug) alias.set(r.entry.slug, slug)
    } else own.push([r, r.entry.slug])
  }
  for (const [r, target] of own) { const at = alias.get(target) ?? target; const n = nodes.get(at); if (n) { n.media.push(r); alias.set(r.id, at) } }

  // Articles: contexts choose first, then things of the model and records, each by exact title.
  const claimed = new Set<string>(), byTitle = new Map<string, PageRef[]>()
  for (const p of pages) byTitle.set(norm(p.title), [...(byTitle.get(norm(p.title)) ?? []), p])
  const labelled = new Map<string, PageRef[]>()
  for (const p of pages) for (const id of labels.get(p.id) ?? []) labelled.set(id, [...(labelled.get(id) ?? []), p])
  const sortPages = (list: PageRef[]) => [...list].sort((a, b) => a.title.localeCompare(b.title, 'id') || a.id.localeCompare(b.id))
  for (const n of [...nodes.values()].filter((x) => x.ctx).sort((a, b) => a.slug.localeCompare(b.slug))) {
    const c = n.ctx!, prefix = FACET_PREFIX[c.facet ?? ''] ?? (c.kind === 'language' ? 'Bahasa' : '')
    const names = new Set([norm(c.title), ...(prefix ? [norm(prefix + ' ' + c.title)] : []), ...n.things.map((t) => norm(commons.entities.find((e) => e.slug === t)?.title ?? ''))].filter(Boolean))
    const mine = sortPages(labelled.get(c.id) ?? []).filter((p) => !claimed.has(p.id))
    let hit = mine.find((p) => names.has(norm(p.title)))
    if (!hit && prefix) { const pre = mine.filter((p) => p.title.toLowerCase().startsWith(prefix.toLowerCase() + ' ')); if (pre.length === 1) hit = pre[0] }
    if (hit) { n.page = hit; claimed.add(hit.id) }
  }
  for (const n of [...nodes.values()].filter((x) => !x.ctx).sort((a, b) => Number(!a.entity) - Number(!b.entity) || a.slug.localeCompare(b.slug))) {
    const hit = sortPages(byTitle.get(norm(n.title)) ?? []).find((p) => !claimed.has(p.id))
    if (hit) { n.page = hit; claimed.add(hit.id) }
  }
  for (const p of sortPages(pages)) {
    if (claimed.has(p.id)) continue
    // A page that describes nothing else yet keeps its id as its address; its title's first word gives the kind.
    const word = p.title.match(LANDFORM)?.[1], lead = p.title.match(/^(Bahasa|Suku|Kabupaten|Kota)\s/)?.[1]
    const kind: EntryKind = word ? 'bentang-alam' : lead === 'Bahasa' ? 'bahasa' : lead === 'Suku' ? 'suku' : lead ? 'tempat' : 'halaman'
    const sub = word ? { key: LANDFORM_SUB[word][0], label: LANDFORM_SUB[word][1] } : null
    nodes.set(p.id, { slug: p.id, kind, sub, title: p.title, description: p.excerpt, aliases: [], ctx: null, entity: null, record: null, page: p, things: [], media: [] })
  }
  for (const n of nodes.values()) if (n.page && n.page.id !== n.slug) alias.set(n.page.id, n.slug)

  // Where each entry sits: a context's parents; for anything else the most specific place its article is
  // labelled with, or the place a checked statement puts it in.
  const placeRank = (c: Ctx) => (c.facet === 'regency' || c.facet === 'city' ? 0 : c.facet === 'province' ? 1 : c.facet === 'customary-region' ? 2 : 3)
  const statementsOf = (thing: string) => commons.statements.filter((s) => s.subject === thing)
  const placeOf = new Map<string, Ctx | null>()
  for (const n of nodes.values()) {
    if (n.ctx) continue
    const cands: Ctx[] = []
    for (const id of n.page ? labels.get(n.page.id) ?? [] : []) { const c = ctxById.get(id); if (c && c.kind !== 'topic' && c.kind !== 'language') cands.push(c) }
    if (n.entity?.place) { const c = ctxBySlug.get(n.entity.place); if (c) cands.push(c) }
    for (const t of n.things) for (const s of statementsOf(t)) if (['bagian-dari', 'berada-di', 'mendiami', 'dituturkan-di', 'hidup-di'].includes(s.predicate)) { const at = nodes.get(thingEntry.get(s.object) ?? ''); if (at?.ctx && at.ctx.kind !== 'topic') cands.push(at.ctx) }
    cands.sort((a, b) => placeRank(a) - placeRank(b) || a.slug.localeCompare(b.slug))
    placeOf.set(n.slug, cands[0] ?? null)
  }
  const ancestors = (c: Ctx, seen = new Set<string>()): Ctx[] => {
    const out: Ctx[] = []
    for (const id of c.parents) { const p = ctxById.get(id); if (p && !seen.has(p.id)) { seen.add(p.id); out.push(p, ...ancestors(p, seen)) } }
    return out
  }
  const within = (n: Node): string[] => {
    const base = n.ctx ?? placeOf.get(n.slug) ?? null
    if (!base) return []
    const list = [...(n.ctx ? [] : [base]), ...ancestors(base)]
    // The customary regions of an entry's article labels count too ("Danau Paniai" is labelled Mee Pago).
    if (!n.ctx && n.page) for (const id of labels.get(n.page.id) ?? []) { const c = ctxById.get(id); if (c?.facet === 'customary-region') list.push(c) }
    return [...new Set(list.map((c) => c.slug))]
  }
  return { nodes, alias, contexts, ctxBySlug, ctxById, commons, thingEntry, placeOf, ancestors, within, labels, pages }
}
export type Catalogue = Awaited<ReturnType<typeof catalogue>>

/** The address an entry answers to, or null. `redirect` is set when the asked slug is an older or other address. */
export function resolve(cat: Catalogue, asked: string): { slug: string; redirect: boolean } | null {
  if (RESERVED.has(asked)) return null
  if (cat.nodes.has(asked)) return { slug: asked, redirect: false }
  const to = cat.alias.get(asked)
  return to && cat.nodes.has(to) ? { slug: to, redirect: true } : null
}

const refOf = (n: Node): Ref => ({ slug: n.slug, title: n.title, kind: n.kind, href: hrefOf(n.slug), sub: n.sub?.label ?? null })

/** The light list behind the Ensiklopedia front and the kind pages. */
export async function entryIndex(source: EntrySource) {
  const cat = await catalogue(source)
  const [groups, kamus, datasets] = await Promise.all([source.groups(), source.kamus(), source.datasets({})])
  const entries = [...cat.nodes.values()].map((n) => ({
    ...refOf(n),
    subKey: n.sub?.key ?? null,
    article: !!n.page,
    within: cat.within(n),
    thumb: n.media.find((m) => m.thumb)?.thumb ?? null,
    reviewed: n.page && n.page.review !== 'unreviewed' && n.page.reviewer ? { at: n.page.updated, by: n.page.reviewer.name } : null,
    updated: n.page?.updated ?? null,
  }))
  // A lembaga that runs an account on the site is listed with its own page; it is an akun, not an entry.
  const lembaga = groups.filter((g) => g.kind === 'institution').map((g) => ({ id: g.id, title: g.title, href: '/groups/' + g.id }))
  // A group of languages is not one language: it has its own count and stays out of the Bahasa count and families.
  const group = (kind: string, sub: string | null | undefined) => kind === 'bahasa' && sub === LANGUAGE_GROUP_SUB.key
  const counts: Record<string, number> = {}
  for (const e of entries) { const k = group(e.kind, e.subKey) ? 'kelompok-bahasa' : e.kind; counts[k] = (counts[k] ?? 0) + 1 }
  counts.lembaga = (counts.lembaga ?? 0) + lembaga.length
  const subs: Record<string, { key: string; label: string; count: number }[]> = {}
  for (const n of cat.nodes.values()) if (n.sub && !group(n.kind, n.sub.key)) {
    const list = (subs[n.kind] ??= []), at = list.find((s) => s.key === n.sub!.key)
    if (at) at.count++
    else list.push({ ...n.sub, count: 1 })
  }
  for (const list of Object.values(subs)) list.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'id'))
  const week = Date.now() - 7 * 86400000
  return {
    entries,
    counts,
    subs,
    lembaga,
    datasets: datasets.length,
    // A community Kamus without words is not listed as a dictionary; the language page is the home of its words.
    kamus: kamus.filter((k) => k.entries > 0).map((k) => ({ communityId: k.communityId, title: k.title, language: k.language, languageName: k.languageName, languageSlug: k.languageSlug ?? '', entries: k.entries })),
    /** Languages that have words here: a published wordlist or a public community Kamus with entries. */
    kamusLanguages: new Set([...WORDLIST_CODES, ...kamus.filter((k) => k.entries > 0).map((k) => k.language)]).size,
    /** Checked words of public Kamus, newest first: the front shows them only when there are any this week. */
    words: kamus.flatMap((k) => k.words.filter((w) => w.updated >= week).map((w) => ({ ...w, languageName: k.languageName, languageSlug: k.languageSlug ?? '', communityId: k.communityId }))).sort((a, b) => b.updated - a.updated).slice(0, 12),
  }
}

/** One entry in one shape, whatever table it comes from. */
export async function readEntry(source: EntrySource, asked: string) {
  const cat = await catalogue(source)
  const found = resolve(cat, asked)
  if (!found) return null
  const n = cat.nodes.get(found.slug)!
  const c = n.ctx, place = c ?? cat.placeOf.get(n.slug) ?? null
  const [detail, placeDetail, article, revisions, datasets, kamus] = await Promise.all([
    c ? source.contextDetail(c.slug) : Promise.resolve(null),
    !c && place ? source.contextDetail(place.slug) : Promise.resolve(null),
    n.page ? source.page(n.page.id) : Promise.resolve(null),
    n.page ? source.revisions(n.page.id) : Promise.resolve(0),
    c ? source.datasets({ context: c.slug }) : n.things.length ? source.datasets({ thing: n.things[0] }) : Promise.resolve([]),
    c?.kind === 'language' ? source.kamus() : Promise.resolve([]),
  ])
  const localNames = n.record?.kind === 'species' && source.localNames ? await source.localNames(n.record.id) : []
  const managedBy = source.managedBy ? await source.managedBy([n.slug, ...n.things]) : null
  // "Kios di …" shows on places and regions only, never on languages or topics.
  const kios = c && (c.kind === 'place' || c.kind === 'region') && source.kios ? await source.kios(c.id) : []
  const entryOfCtx = (x: { slug: string }) => cat.nodes.get(x.slug)
  const root: ChainItem = { title: 'Tanah Papua', href: '/wiki/jenis/tempat' }

  // The chain: the place spine with wilayah adat beside it, a language's family, a topic's group, a species' taxonomy.
  let chain: ChainItem[] = [], overlay: Ref[] = []
  const spine = (x: Ctx): ChainItem[] => {
    const up = cat.ancestors(x).filter((p) => p.facet === 'province').sort((a, b) => a.title.localeCompare(b.title, 'id'))
    return x.facet === 'province' || x.facet === 'customary-region' ? [root] : [root, ...up.slice(0, 1).map((p) => ({ title: p.title, href: hrefOf(p.slug) }))]
  }
  const adat = (x: Ctx) => [x, ...cat.ancestors(x)].filter((p) => p.facet === 'customary-region' && p.id !== c?.id)
  if (c && c.kind !== 'language' && c.kind !== 'topic') { chain = spine(c); overlay = adat(c).map((p) => refOf(entryOfCtx(p)!)) }
  else if (c?.kind === 'language') { const f = familyOf(c); chain = [{ title: 'Bahasa', href: '/wiki/jenis/bahasa' }, ...(f ? [{ title: 'Rumpun ' + f, href: '/wiki/jenis/bahasa?sub=' + keyOf(f) }] : [])] }
  else if (c?.kind === 'topic') chain = [{ title: 'Topik', href: '/wiki/jenis/topik' }, ...cat.ancestors(c).reverse().map((p) => ({ title: p.title, href: hrefOf(p.slug) }))]
  else if (place) {
    chain = [...spine(place), { title: place.title, href: hrefOf(place.slug) }]
    const labelled = n.page ? (cat.labels.get(n.page.id) ?? []).map((id) => cat.ctxById.get(id)).filter((x): x is Ctx => x?.facet === 'customary-region') : []
    overlay = [...new Map([...adat(place), ...labelled].map((p) => [p.slug, refOf(entryOfCtx(p)!)])).values()]
  } else if (n.record?.taxonomy?.length) chain = [{ title: 'Makhluk hidup', href: '/wiki/jenis/makhluk' }, ...n.record.taxonomy.filter((t) => t.rank !== 'species').map((t) => ({ title: t.name }))]
  else chain = [{ title: KIND_LABEL[n.kind], href: '/wiki/jenis/' + n.kind }]
  if (place && c?.facet === 'customary-region') overlay = []

  // What sits inside: child contexts, and entries whose place is this one.
  const inside = new Map<string, Ref>()
  for (const ch of detail?.children ?? []) { const e = cat.nodes.get(ch.slug); if (e) inside.set(e.slug, refOf(e)) }
  if (c) for (const [slug, p] of cat.placeOf) if (p?.id === c.id) { const e = cat.nodes.get(slug); if (e && e.kind !== 'halaman') inside.set(slug, refOf(e)) }
  const children = [...inside.values()].sort((a, b) => a.title.localeCompare(b.title, 'id'))

  // Typed links between things of the model, and the things most often named with this one.
  const relations: { predicate: string; label: string; entry: Ref }[] = []
  for (const s of cat.commons.statements) {
    const mine = n.things.includes(s.subject), theirs = n.things.includes(s.object)
    if (!mine && !theirs) continue
    const other = cat.nodes.get(cat.thingEntry.get(mine ? s.object : s.subject) ?? '')
    if (!other || other.slug === n.slug) continue
    const label = PREDICATE_LABEL[s.predicate] ?? [s.predicate.replace(/-/g, ' '), 'Terhubung dengan']
    relations.push({ predicate: s.predicate, label: mine ? label[0] : label[1], entry: refOf(other) })
  }
  // A people and its language from Wikipedia's list (src/suku.ts), both ways.
  const people = n.kind === 'suku' ? SUKU.get(n.slug) ?? SUKU.get(n.things[0] ?? '') : undefined
  const peopleLang = people?.language ? cat.nodes.get(people.language.slug) : undefined
  if (peopleLang) relations.push({ predicate: 'dituturkan-oleh', label: 'Bahasa yang dipakai', entry: refOf(peopleLang) })
  const speakers = c?.kind === 'language' ? (SUKU_BY_LANGUAGE.get(c.slug) ?? []).map((p) => cat.nodes.get(p.slug)).filter((x): x is Node => !!x) : []
  for (const x of speakers) relations.push({ predicate: 'dituturkan-oleh', label: 'Dituturkan oleh', entry: refOf(x) })
  const near = new Map<string, number>()
  for (const m of cat.commons.comentions) {
    const other = n.things.includes(m.a) ? m.b : n.things.includes(m.b) ? m.a : ''
    const e = other ? cat.nodes.get(cat.thingEntry.get(other) ?? '') : undefined
    if (e && e.slug !== n.slug) near.set(e.slug, (near.get(e.slug) ?? 0) + m.weight)
  }
  const shown = new Set([n.slug, ...children.map((x) => x.slug), ...overlay.map((x) => x.slug), ...(place ? [place.slug] : []), ...chain.map((x) => x.href?.slice(6) ?? '')])
  const related = [...new Map([...relations.map((r) => r.entry), ...[...near].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([slug]) => refOf(cat.nodes.get(slug)!))].filter((r) => !shown.has(r.slug)).map((r) => [r.slug, r])).values()].slice(0, 12)

  const facts: { label: string; value: string; href?: string }[] = []
  if (n.sub && n.kind !== 'bahasa') facts.push({ label: 'Jenis', value: n.sub.label })
  if (c?.kind === 'language') {
    const f = familyOf(c), code = c.aliases.find((a) => a.startsWith('glottocode:'))?.slice(11)
    if (f) facts.push({ label: 'Rumpun', value: f, href: '/wiki/jenis/bahasa?sub=' + keyOf(f) })
    if (code) facts.push({ label: 'Glottolog', value: code, href: 'https://glottolog.org/resource/languoid/id/' + code })
  }
  if (c && (c.facet === 'province' || c.facet === 'customary-region') && detail?.childCount) facts.push({ label: 'Kabupaten dan kota', value: String(detail.children.filter((x) => x.kind === 'place').length || detail.childCount) })
  const primary = n.record ?? n.media.find((m) => m.kind === 'landform') ?? null
  if (n.record?.entry?.scientificName) facts.push({ label: 'Nama ilmiah', value: n.record.entry.scientificName })
  else if (n.media.find((m) => m.kind === 'audio')?.subtitle && n.kind === 'makhluk' && !n.record) facts.push({ label: 'Nama ilmiah', value: n.media.find((m) => m.kind === 'audio')!.subtitle! })
  for (const f of primary?.facts ?? []) if (!['Model', 'Koordinat'].includes(f.label)) facts.push({ label: f.label, value: f.value })
  // Peoples from Wikipedia's list (src/suku.ts): where the list puts them, their language and the source link.
  if (people) {
    facts.push({ label: 'Tercantum di', value: sukuWhere(people) })
    const lang = peopleLang
    if (lang) facts.push({ label: 'Bahasa', value: lang.title, href: hrefOf(lang.slug) })
    facts.push(people.wikipedia ? { label: 'Sumber', value: 'Wikipedia, ' + people.wikipedia.title, href: people.wikipedia.url } : { label: 'Sumber', value: 'Wikipedia, ' + SUKU_SOURCE.title + ' (artikelnya belum ada)', href: SUKU_SOURCE.url })
  }
  if (speakers.length) {
    if (speakers.length) facts.push({ label: 'Suku', value: speakers.map((x) => x.title).join(', '), ...(speakers.length === 1 ? { href: hrefOf(speakers[0]!.slug) } : {}) })
  }

  const communities = (detail ?? placeDetail)?.communities ?? []
  const glotto = c?.aliases.find((a) => a.startsWith('glottocode:'))?.slice(11)
  const description = n.description || n.record?.summary || n.media[0]?.summary || ''
  return {
    slug: n.slug,
    asked,
    redirect: found.redirect,
    kind: n.kind,
    kindLabel: KIND_LABEL[n.kind],
    sub: n.sub,
    title: n.title,
    description,
    aliases: n.aliases,
    source: { context: c ? { id: c.id, slug: c.slug, kind: c.kind, facet: c.facet ?? '', aliases: c.aliases } : null, things: n.things, page: n.page?.id ?? null, record: n.record?.id ?? null },
    place: place && !c ? { ...refOf(entryOfCtx(place)!), id: place.id } : null,
    chain,
    overlay,
    children,
    childCount: Math.max(children.length, detail?.childCount ?? 0),
    article: article?.revision ? { pageId: article.id, title: article.title, ...withoutEnglishDraft(article.revision) } : null,
    facts,
    media: n.media.map((m) => ({ id: m.id, kind: m.kind, title: m.title, subtitle: m.subtitle, thumb: m.thumb })),
    relations,
    related,
    communities: c || place ? communities.map((x) => ({ ...x, via: x.via ?? (c ? null : { id: place!.id, slug: place!.slug, title: place!.title }) })) : [],
    groups: detail?.groups ?? [],
    localNames,
    managedBy,
    kios,
    kamus: glotto ? kamus.filter((k) => k.language === glotto).map((k) => ({ ...k, words: k.words.slice(0, 8) })) : [],
    research: { literature: c && c.facet !== 'topic-group' ? c.slug : null, datasets },
    history: n.page ? { pageId: n.page.id, revisions } : null,
    basis: detail?.family ?? null,
    newsPlaces: detail?.newsPlaces ?? [],
  }
}
export type Entry = NonNullable<Awaited<ReturnType<typeof readEntry>>>

export const viewerRecords = (viewerIndexJson as { records: ViewerRecord[] }).records
export const isUuid = (s: string) => UUID.test(s)
