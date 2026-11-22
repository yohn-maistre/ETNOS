/**
 * Kios house rules (docs/plan/one-page-system-2026-11-21.md §7). One list, shown when someone opens a Kios and
 * checked on every offer and request by a plain word match; people report the rest with the normal report button.
 *
 * A rule is written as phrases of lowercase words, the same form an operator uses in etnos.yaml
 * (schemas/etnos.schema.json): `(a|b)` offers a choice, so `(jual|sewa) tanah` matches "jual tanah" and
 * "sewa tanah". A phrase matches whole words only. There are no regular expressions in the file, so an operator
 * cannot write a pattern that hangs the server. DEFAULT_KIOS_RULES apply until an operator applies an etnos.yaml
 * with its own `kios.rules` (src/deployment.ts).
 *
 * The land rule waits for the owner's confirmation (§12, question 3). To drop it, delete the `tanah` entry.
 */
export type KiosRuleWords = { key: string; label: string; words: string[] }
export type KiosRule = KiosRuleWords & { patterns: RegExp[] }

const LAND = '(tanah|lahan|kavling|kapling)'
export const DEFAULT_KIOS_RULES: KiosRuleWords[] = [
  { key: 'satwa', label: 'Satwa yang dilindungi atau bagian tubuhnya, misalnya bulu cenderawasih, tidak boleh dijual.', words: ['cenderawasih', 'cendrawasih', 'paradisaea', 'kasuari', 'kakatua', 'mambruk', 'kanguru pohon', 'kuskus', 'penyu', 'telur penyu', 'sisik penyu', 'nuri', 'burung hidup', 'opsetan', 'awetan'] },
  { key: 'alkohol', label: 'Minuman beralkohol tidak boleh dijual.', words: ['miras', 'minuman keras', 'beralkohol', 'alkohol', 'bir', 'sopi', 'saguer', '(whisky|whiskey)', 'vodka', 'ciu'] },
  { key: 'tanah', label: 'Tanah dan lahan tidak boleh dijual atau disewakan di sini.', words: [`(jual|dijual|menjual|sewa|disewakan|over) ${LAND}`, `${LAND} (dijual|murah|disewakan)`, `${LAND} siap bangun`, '(kapling|kavpling)', 'tanah ulayat', 'sertifikat tanah', 'shm'] },
]

const WORD = /^[a-z0-9-]+$/
/** One phrase as a pattern, or null when it is not in the phrase form. */
export function phrasePattern(phrase: string): RegExp | null {
  const parts = phrase.split(' ')
  const out: string[] = []
  for (const p of parts) {
    const choice = /^\((.+)\)$/.exec(p)
    const words = choice ? choice[1].split('|') : [p]
    if ((choice && words.length < 2) || !words.every((w) => WORD.test(w))) return null
    out.push(choice ? `(?:${words.join('|')})` : p)
  }
  return parts.length ? new RegExp(`(?<![a-z0-9-])${out.join('\\s+')}(?![a-z0-9-])`) : null
}

const compiled = new Map<string, KiosRule[]>()
/** Rules with their patterns, cached by content. Phrases that are not in the phrase form are skipped. */
export function compileRules(rules: KiosRuleWords[]): KiosRule[] {
  const id = JSON.stringify(rules)
  let r = compiled.get(id)
  if (!r) {
    r = rules.map((x) => ({ ...x, patterns: x.words.map(phrasePattern).filter((p): p is RegExp => !!p) }))
    if (compiled.size > 20) compiled.clear()
    compiled.set(id, r)
  }
  return r
}

type Reader = { get<T>(sql: string, ...args: string[]): T | undefined }
/** The rules in force: the ones an operator applied through etnos.yaml, else the defaults. */
export function activeRules(db?: Reader): KiosRule[] {
  let words = DEFAULT_KIOS_RULES
  try {
    const row = db?.get<{ value: string }>("SELECT value FROM deployment_settings WHERE key='kios.rules'")
    if (row) words = JSON.parse(row.value) as KiosRuleWords[]
  } catch {
    // An older database without the settings table keeps the defaults.
  }
  return compileRules(words)
}

/** The first rule a text breaks, or null. Matching is on lower case, with accents removed. */
export function brokenRule(rules: KiosRule[], ...texts: (string | undefined | null)[]): KiosRule | null {
  const t = texts.filter((x): x is string => typeof x === 'string').join('\n').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  if (!t.trim()) return null
  return rules.find((r) => r.patterns.some((p) => p.test(t))) ?? null
}

/** The rules as shown to people: key and sentence only. */
export const kiosRules = (rules: KiosRule[]) => rules.map(({ key, label }) => ({ key, label }))
