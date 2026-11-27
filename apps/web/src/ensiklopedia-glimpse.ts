// Real glimpses of what each kind of the Ensiklopedia holds, for the category cards on Jelajah and /wiki.
// Nothing here is invented: the forms come from Peta Kata's published wordlists, the names and counts from the entry
// index. These functions take plain data so they can be tested without a network; glimpse-data.ts loads it.

export type GlimpseLang = { code: string; slug: string; name: string; concepts: number }
export type GlimpseWord = { lang: string; form: string; nc?: true }
export type Specimen = { code: string; slug: string; name: string; form: string }
export type Glimpse = {
  concept: { key: string; id: string }
  /** Every catalogue language, with how many basic words it has. */
  languages: GlimpseLang[]
  /** Languages with at least one form for this concept, by Glottocode. */
  forms: Map<string, string>
  /** A few languages spread over Tanah Papua with their form, for the word specimen and the labels on the map. */
  specimen: Specimen[]
}

/** Spread over the island, west to east: Meyah (Domberai), Biak (Saireri), Ekari (Mee Pago), Sentani (Mamta), Marind (Ha Anim). */
export const SPECIMEN_ORDER = ['meya1236', 'biak1248', 'ekar1243', 'nucl1632', 'nucl1622', 'moni1261', 'west2594', 'hata1243']

/** The first form of each language that comes from an attribution licence; NonCommercial forms are left out here,
 * because a small card has no room for their label. */
export function firstForms(words: GlimpseWord[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const w of words) if (!w.nc && w.form && !out.has(w.lang)) out.set(w.lang, w.form.replace(/_/g, ' '))
  return out
}

/** Up to `n` languages for the specimen: the preferred spread first, then any other language with a form. */
export function pickSpecimen(forms: Map<string, string>, languages: GlimpseLang[], n = 5): Specimen[] {
  const by = new Map(languages.map((l) => [l.code, l]))
  const order = [...SPECIMEN_ORDER, ...[...forms.keys()].filter((c) => !SPECIMEN_ORDER.includes(c)).sort()]
  const out: Specimen[] = []
  for (const code of order) {
    const l = by.get(code), form = forms.get(code)
    if (l && form && !out.some((s) => s.code === code)) out.push({ code, slug: l.slug, name: l.name, form })
    if (out.length >= n) break
  }
  return out
}

/** Names of a kind for a typographic card: entries with an article first, then by title, without the kind word. */
export function sampleNames(entries: { title: string; article: boolean }[], strip: RegExp, n = 8): string[] {
  return [...entries]
    .sort((a, b) => Number(b.article) - Number(a.article) || a.title.localeCompare(b.title, 'id'))
    .slice(0, n)
    .map((e) => e.title.replace(strip, '').trim())
}

/** "Burung, Mamalia dan Kupu-kupu": a list in plain words. */
export function joinWords(words: string[]): string {
  if (words.length < 2) return words[0] ?? ''
  return words.slice(0, -1).join(', ') + ' dan ' + words[words.length - 1]
}
