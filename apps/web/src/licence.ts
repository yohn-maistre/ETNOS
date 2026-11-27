// Licence labels in the interface. Sources under a NonCommercial licence (Papuan Voices, Steltenpool 1969) may
// be shown on ETNOS, and each one carries a visible label wherever it is shown. The server keeps them out of
// paid outputs (src/licence.ts).
export const NC_LABEL = 'CC BY-NC 4.0 · tidak untuk penggunaan komersial'

export function isNonCommercial(licence: string | null | undefined): boolean {
  const l = String(licence ?? '').toLowerCase()
  return /\bby-nc\b|\bby-nc-(sa|nd)\b|noncommercial|non-commercial|\bnc\b/.test(l)
}

/** The licence as shown: a NonCommercial licence gets the words that say it may not be used commercially. */
export function licenceLabel(licence: string | null | undefined): string {
  const l = String(licence ?? '').trim()
  if (!l) return ''
  return isNonCommercial(l) ? l + ' · tidak untuk penggunaan komersial' : l
}
