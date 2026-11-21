/** Percakapan (docs/plan/one-page-system-2026-11-21.md §4): find entry names in a post, with no model.
 *
 * One matcher serves the composer's inline suggestion and the "Tandai …?" prompt after posting, so both offer the
 * same entries. It is case-insensitive, matches whole words only, and takes the longest name at each place in the
 * text, so "Danau Paniai" wins over "Paniai" and "Kabupaten Puncak Jaya" over "Puncak Jaya". One name that belongs to
 * two entries (the regency Puncak Jaya and the mountain Puncak Jaya) comes back once with both, so the author picks.
 * Links and @mentions are skipped. The server decides which names of an entry are matched (src/tentang.ts); this
 * file only finds them.
 *
 * It lives in the web app so the dev server can serve it; the server imports it from here. It has no imports and no
 * Node APIs. */

/** An entry as the composer and the matcher see it. `names` are the forms that the matcher looks for; an entry with
 * none (a topic, whose name is an everyday word) can still be chosen in the Tentang picker. */
export type NameEntry = { slug: string; title: string; kind: string; label: string; names: string[]; search?: string[] }
export type NameIndex = { byKey: Map<string, NameEntry[]>; longest: number }
export type NameMatch = { text: string; start: number; end: number; entries: NameEntry[] }

/** At most this many tags on one post. */
export const MAX_TENTANG = 5

/** Lowercase, without accents, words split on anything that is not a letter or a digit. */
export function normName(s: string): string {
  return s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function nameIndex(list: NameEntry[]): NameIndex {
  const byKey = new Map<string, NameEntry[]>()
  let longest = 0
  for (const e of list) for (const n of new Set(e.names.map(normName))) {
    if (!n) continue
    const at = byKey.get(n) ?? []
    if (!at.some((x) => x.slug === e.slug)) at.push(e)
    byKey.set(n, at)
    longest = Math.max(longest, n.split(' ').length)
  }
  return { byKey, longest }
}

/** Links and mentions are blanked out first, so a name inside an address is never offered. */
const SKIP = /https?:\/\/\S+|www\.\S+|\]\([^)]*\)|@[\p{L}\p{N}_.-]+/gu
const WORD = /[\p{L}\p{M}\p{N}]+/gu

/** Every name found in the text, in reading order, with no overlaps. */
export function matchNames(text: string, index: NameIndex): NameMatch[] {
  if (!text || !index.longest) return []
  const clean = text.replace(SKIP, (m) => (m.startsWith('](') ? '](' + ' '.repeat(m.length - 3) + ')' : ' '.repeat(m.length)))
  const words = [...clean.matchAll(WORD)].map((m) => ({ norm: normName(m[0]), start: m.index!, end: m.index! + m[0].length }))
  const out: NameMatch[] = []
  for (let i = 0; i < words.length; ) {
    let size = 0
    for (let k = Math.min(index.longest, words.length - i); k >= 1 && !size; k--) {
      const entries = index.byKey.get(words.slice(i, i + k).map((w) => w.norm).join(' '))
      if (entries) { size = k; out.push({ text: text.slice(words[i].start, words[i + k - 1].end), start: words[i].start, end: words[i + k - 1].end, entries }) }
    }
    i += size || 1
  }
  return out
}

/** The names worth offering: each name once, without entries already chosen or given, at most `limit`. */
export function suggestions(text: string, index: NameIndex, skip: Iterable<string>, limit = 3): NameMatch[] {
  const taken = new Set(skip), seen = new Set<string>(), out: NameMatch[] = []
  for (const m of matchNames(text, index)) {
    const entries = m.entries.filter((e) => !taken.has(e.slug))
    const key = entries.map((e) => e.slug).sort().join('|')
    if (!entries.length || seen.has(key)) continue
    seen.add(key)
    out.push({ ...m, entries })
    if (out.length >= limit) break
  }
  return out
}

/** Entries for the Tentang picker, best first: a title that starts with the query, then a name that does, then any
 * word of a name that does. */
export function searchNames(query: string, list: NameEntry[], limit = 8): NameEntry[] {
  const q = normName(query)
  if (!q) return []
  const scored: [number, NameEntry][] = []
  for (const e of list) {
    const title = normName(e.title), forms = [title, ...(e.search ?? e.names).map(normName)]
    const score = title.startsWith(q) ? 0 : forms.some((f) => f.startsWith(q)) ? 1 : forms.some((f) => f.split(' ').some((w) => w.startsWith(q)) || f.includes(' ' + q)) ? 2 : -1
    if (score >= 0) scored.push([score, e])
  }
  return scored.sort((a, b) => a[0] - b[0] || a[1].title.length - b[1].title.length || a[1].title.localeCompare(b[1].title, 'id')).slice(0, limit).map((x) => x[1])
}
