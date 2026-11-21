/**
 * Kios house rules (docs/plan/one-page-system-2026-11-21.md §7). One list, shown when someone opens a Kios and
 * checked on every offer and request by a plain keyword match; people report the rest with the normal report
 * button. Each rule is one entry, so a rule is removed by deleting its line.
 *
 * The land rule waits for the owner's confirmation (§12, question 3). To drop it, delete the `tanah` line.
 */
export type KiosRule = { key: string; label: string; patterns: RegExp[] }

export const KIOS_RULES: KiosRule[] = [
  { key: 'satwa', label: 'Satwa yang dilindungi atau bagian tubuhnya, misalnya bulu cenderawasih, tidak boleh dijual.', patterns: [/\bcenderawasih\b/, /\bcendrawasih\b/, /\bparadisaea\b/, /\bkasuari\b/, /\bkakatua\b/, /\bmambruk\b/, /\bkanguru pohon\b/, /\bkuskus\b/, /\bpenyu\b/, /\btelur penyu\b/, /\bsisik penyu\b/, /\bnuri\b/, /\bburung hidup\b/, /\bopsetan\b/, /\bawetan\b/] },
  { key: 'alkohol', label: 'Minuman beralkohol tidak boleh dijual.', patterns: [/\bmiras\b/, /\bminuman keras\b/, /\bberalkohol\b/, /\balkohol\b/, /\bbir\b/, /\bsopi\b/, /\bsaguer\b/, /\bwhisk(?:e)?y\b/, /\bvodka\b/, /\bciu\b/] },
  { key: 'tanah', label: 'Tanah dan lahan tidak boleh dijual atau disewakan di sini.', patterns: [/\b(?:jual|dijual|menjual|sewa|disewakan|over)\s+(?:tanah|lahan|kavling|kapling)\b/, /\b(?:tanah|lahan|kavling|kapling)\s+(?:dijual|murah|disewakan|siap bangun)\b/, /\bkav?pling\b/, /\btanah ulayat\b/, /\bsertifikat tanah\b/, /\bshm\b/] },
]

/** The first rule a text breaks, or null. Matching is on lower case, with accents removed. */
export function brokenRule(...texts: (string | undefined | null)[]): KiosRule | null {
  const t = texts.filter((x): x is string => typeof x === 'string').join('\n').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  if (!t.trim()) return null
  return KIOS_RULES.find((r) => r.patterns.some((p) => p.test(t))) ?? null
}

/** The rules as shown to people: key and sentence only. */
export const kiosRules = () => KIOS_RULES.map(({ key, label }) => ({ key, label }))
