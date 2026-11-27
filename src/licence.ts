/** Licences and paid outputs.
 *
 * Some sources may be shown on ETNOS because it is a free, non-commercial service, but may not be sold:
 * Steltenpool (1969) is CC BY-NC 3.0, Papuan Voices is CC BY-NC 4.0, D-PLACE and the BirdNET weights are NC too.
 * Anything that ETNOS or a lembaga offers for money (a paid Situs feature, a Kios offer, an export sold to
 * someone) is a paid output, and every paid output takes its rows through `forPaidOutput` or `assertPaidSafe`.
 * A free output keeps NC rows and shows their label.
 *
 * The check reads the licence that each row carries, so a row whose licence is missing counts as unknown and is
 * kept out of paid outputs as well. */
import { Fault } from './core.ts'

/** The visible label beside every non-commercial form, entry or dataset. */
export const NC_LABEL = 'CC BY-NC 4.0 · tidak untuk penggunaan komersial'

/** Outputs that are, or may be, offered for money. */
export const PAID_OUTPUTS = ['situs-berbayar', 'kios', 'ekspor-dijual'] as const
export type PaidOutput = typeof PAID_OUTPUTS[number]

/** True for any Creative Commons NonCommercial licence, in any common spelling. */
export function isNonCommercial(licence: string | null | undefined): boolean {
  const l = String(licence ?? '').toLowerCase()
  return /\bby-nc\b|\bby-nc-(sa|nd)\b|noncommercial|non-commercial|\bnc\b/.test(l)
}

/** A licence that a paid output may carry: known, and not non-commercial. */
export function paidSafe(licence: string | null | undefined): boolean {
  return !!String(licence ?? '').trim() && !isNonCommercial(licence)
}

/** The rows that a paid output may use. NC rows and rows without a licence are left out. */
export function forPaidOutput<T extends { licence?: string | null }>(rows: readonly T[]): T[] {
  return rows.filter((r) => paidSafe(r.licence))
}

/** Refuses a paid output that would carry any NC row or a row without a licence. */
export function assertPaidSafe(output: PaidOutput, rows: readonly { licence?: string | null }[]): void {
  const bad = rows.filter((r) => !paidSafe(r.licence))
  if (bad.length) throw new Fault(409, `This ${output} output would carry ${bad.length} row(s) that may not be used in anything paid`)
}
