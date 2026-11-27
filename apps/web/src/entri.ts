// Entries of the Ensiklopedia, read from /v1/entri (src/entri.ts on the server): one shape for a place, a language,
// a topic, a species, a landform, an object or a page. The index is fetched once per page load.
import { request, type Post } from './api'

export type EntryKind = 'tempat' | 'bentang-alam' | 'bahasa' | 'suku' | 'makhluk' | 'benda' | 'lembaga' | 'topik' | 'peristiwa' | 'gagasan' | 'praktik' | 'orang' | 'musim' | 'cerita' | 'halaman'
export type Ref = { slug: string; title: string; kind: EntryKind; href: string; sub?: string | null }
export type Person = { id: string; name: string; kind: string }
export type Entry = {
  slug: string
  asked: string
  redirect: boolean
  kind: EntryKind
  kindLabel: string
  sub: { key: string; label: string } | null
  title: string
  description: string
  aliases: string[]
  source: { context: { id: string; slug: string; kind: string; facet: string; aliases: string[] } | null; things: string[]; page: string | null; record: string | null }
  place: (Ref & { id: string }) | null
  chain: { title: string; href?: string }[]
  overlay: Ref[]
  children: Ref[]
  childCount: number
  article: { pageId: string; title: string; id: string; text: string; citations: string[]; created: number; review: string; language: string; perspective: string; untranslated?: boolean; author: Person | null; reviewer: Person | null } | null
  facts: { label: string; value: string; href?: string }[]
  /** Checked local names from public communities' Kamus (picture questions, src/kamus-ask.ts). */
  localNames?: { name: string; language: string; community: { id: string; title: string } }[]
  media: { id: string; kind: string; title: string; subtitle: string | null; thumb: string | null }[]
  relations: { predicate: string; label: string; entry: Ref }[]
  related: Ref[]
  communities: { id: string; title: string; description: string; visibility: string; admission: string; via: { id: string; slug: string; title: string } | null }[]
  groups: { id: string; title: string }[]
  /** The public lembaga that claimed this entry (P3, src/lembaga.ts), shown as "Dikelola oleh" in the rail. */
  managedBy?: { id: string; title: string } | null
  /** Open Kios offers in this place and below it (P3, src/kios.ts). */
  kios?: KiosPlaceItem[]
  kamus: { communityId: string; title: string; language: string; languageName: string; entries: number; words: { lemma: string; gloss: string }[] }[]
  research: { literature: string | null; datasets: { id: string; title: string; kind: string; publisher: string; licence: string }[] }
  history: { pageId: string; revisions: number } | null
  basis: { title: string; basis: string; sources: { title: string; url: string }[] } | null
  newsPlaces: string[]
}
export type KiosPlaceItem = { post: Post; seller: { kind: 'actor' | 'group'; id: string; title: string; href: string } }
export type IndexEntry = Ref & { subKey: string | null; article: boolean; within: string[]; thumb: string | null; reviewed: { at: number; by: string } | null; updated: number | null }
export type EntryIndex = {
  entries: IndexEntry[]
  counts: Record<string, number>
  subs: Record<string, { key: string; label: string; count: number }[]>
  lembaga: { id: string; title: string; href: string }[]
  datasets: number
  kamus: { communityId: string; title: string; language: string; languageName: string; entries: number }[]
  words: { lemma: string; gloss: string; updated: number; languageName: string; communityId: string }[]
}

/** Plural names of the kinds as the Ensiklopedia lists them. */
export const KIND_NAME: Record<string, string> = {
  tempat: 'Tempat', 'bentang-alam': 'Bentang alam', bahasa: 'Bahasa', suku: 'Suku', makhluk: 'Makhluk hidup', benda: 'Benda', lembaga: 'Lembaga', kamus: 'Kamus',
  topik: 'Topik', peristiwa: 'Peristiwa', gagasan: 'Gagasan', praktik: 'Praktik', orang: 'Tokoh', musim: 'Musim', cerita: 'Cerita', halaman: 'Halaman lain', semua: 'Semua entri',
}

let index: Promise<EntryIndex> | null = null
export function loadIndex(): Promise<EntryIndex> {
  index ??= request<EntryIndex>('/v1/entri', undefined, undefined, true).catch((e) => {
    index = null
    throw e
  })
  return index
}
export const loadEntry = (slug: string, signal?: AbortSignal) => request<Entry>('/v1/entri/' + encodeURIComponent(slug), undefined, signal, true)

/** A count in everyday short form: 1.234 stays, 12.300 becomes 12,3 rb. */
export function shortCount(n: number): string {
  if (n >= 10000) return (n / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' rb'
  return n.toLocaleString('id-ID')
}
/** Entries that sit in a place, or everything when no place is chosen. */
export const inScope = (e: IndexEntry, scope: string) => !scope || e.slug === scope || e.within.includes(scope)
