/** Peoples (suku) of Tanah Papua from Wikipedia bahasa Indonesia's list "Daftar suku bangsa di Papua"
 * (seed/suku/tanah-papua-suku.json, built by scripts/suku/build-suku.py). Only facts were taken: each name that the
 * list links, the province and regency it is listed under, and the article that its link lands on. No article
 * text is copied, so every new entry starts as a stub with "belum ada tulisan".
 *
 * The peoples enter the knowledge model through its seed import (`withSuku`), which adds missing entities and
 * leaves existing rows alone. A stub's description is replaced on a later import only while it still holds a
 * description that this seed shipped (`previous`), so a steward's edit stays. The entry pages read the place,
 * the language and the source link from the seed file itself. */
import suku from '../seed/suku/tanah-papua-suku.json' with { type: 'json' }
import tanahPapua from './catalogues/tanah-papua.json' with { type: 'json' }
import type { KnowledgeSeed } from './knowledge-model.ts'

export type SukuPeople = {
  slug: string
  title: string
  names: string[]
  listed: string[]
  provinces: string[]
  regencies: string[]
  wikipedia: { title: string; url: string } | null
  language: { glottocode: string; slug: string; title: string } | null
  existing: boolean
}
type SukuFile = { source: { title: string; url: string; revision: string; revisionUrl: string; publisher: string; licence: string }; peoples: SukuPeople[] }
const FILE = suku as unknown as SukuFile
export const SUKU_SOURCE = FILE.source
export const SUKU = new Map(FILE.peoples.map((p) => [p.slug, p]))
/** Peoples whose language the seed links, by the language's catalogue slug. */
export const SUKU_BY_LANGUAGE = new Map<string, SukuPeople[]>()
for (const p of FILE.peoples) if (p.language) SUKU_BY_LANGUAGE.set(p.language.slug, [...(SUKU_BY_LANGUAGE.get(p.language.slug) ?? []), p])

const TITLE = new Map((tanahPapua.entries as { slug: string; title: string; facet?: string }[]).map((e) => [e.slug, e]))
const placeName = (slug: string) => {
  const e = TITLE.get(slug)
  if (!e) return slug
  return e.facet === 'province' ? 'Provinsi ' + e.title : e.facet === 'regency' && !e.title.startsWith('Kabupaten ') ? 'Kabupaten ' + e.title : e.title
}

/** Where the list puts a people, as words: "Kabupaten Sarmi, Provinsi Papua". */
export function sukuWhere(p: SukuPeople): string {
  const names = [...p.regencies.map(placeName), ...p.provinces.map(placeName)]
  return names.join(', ')
}

/** The stub description. Plain words that say where the name comes from; nothing from the article. */
export function sukuDescription(p: SukuPeople): string {
  return `Tercantum dalam Daftar suku bangsa di Papua di Wikipedia bahasa Indonesia, di bawah ${sukuWhere(p)}.`
}

/** One place for the entry: its only regency, else its only province, else the first regency or province. */
export function sukuPlace(slug: string): string | null {
  const p = SUKU.get(slug)
  if (!p) return null
  if (p.regencies.length === 1) return p.regencies[0]!
  if (p.provinces.length === 1) return p.provinces[0]!
  return p.regencies[0] ?? p.provinces[0] ?? null
}

/** The knowledge seed with the peoples that it does not hold yet. */
export function withSuku(seed: KnowledgeSeed): KnowledgeSeed {
  const have = new Set(seed.entities.map((e) => e.slug))
  const extra = FILE.peoples.filter((p) => !have.has(p.slug)).map((p) => ({ slug: p.slug, class: 'kelompok', title: p.title, description: sukuDescription(p), aliases: [], context: null, origin: 'wikipedia-daftar-suku', previous: [] as string[] }))
  return { ...seed, entities: [...seed.entities, ...extra] }
}
