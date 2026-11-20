// The world model's coordinates as the observatory draws them (docs/observatory/world-model-and-starter-data-2026-11-20.md
// §5.2 and §9): size in log10 metres, pace in log10 seconds, and the level as one of seven colour bands of the
// Integrative Levels Classification. The bands mirror src/world-model.ts (a test keeps the two equal); the colours
// were checked with a palette validator for both themes (DESIGN.md, data colours).

export type BandKey = 'materi-langit' | 'batuan-bumi' | 'makhluk-hidup' | 'pikiran' | 'bahasa-ritus' | 'masyarakat-aturan' | 'buatan-pengetahuan'
export type Band = { key: BandKey; label: string; classes: string; light: string; dark: string }
export const BANDS: Band[] = [
  { key: 'materi-langit', label: 'Materi dan langit', classes: 'abcdefgh', light: '#008b9e', dark: '#0097ab' },
  { key: 'batuan-bumi', label: 'Batuan dan bumi', classes: 'ij', light: '#c9892b', dark: '#c68627' },
  { key: 'makhluk-hidup', label: 'Makhluk hidup', classes: 'klmn', light: '#067132', dark: '#1d7d3e' },
  { key: 'pikiran', label: 'Pikiran', classes: 'op', light: '#b54d98', dark: '#c664a8' },
  { key: 'bahasa-ritus', label: 'Bahasa dan ritus', classes: 'qr', light: '#305eb7', dark: '#4777d2' },
  { key: 'masyarakat-aturan', label: 'Masyarakat dan aturan', classes: 'stu', light: '#b32228', dark: '#be2e31' },
  { key: 'buatan-pengetahuan', label: 'Buatan dan pengetahuan', classes: 'vwxy', light: '#857d0b', dark: '#918112' },
]
export const ILC = 'abcdefghijklmnopqrstuvwxy'
export const bandOf = (code: string | null | undefined): Band | undefined => (code ? BANDS.find((b) => b.classes.includes(code)) : undefined)

export type Range = { lo: number; hi: number; basis: string; note?: string }
export type World = { size: Range | null; pace: Range | null; level: { code: string; band: string; basis: string; note?: string } | null }

/**
 * The span of each axis. It covers every class rule in src/world-model.ts (a millimetre object to a province, an hour
 * to mountain building), so new kinds of things land inside the frame without rescaling it, and the empty parts
 * show what is not recorded yet.
 */
export const SIZE: [number, number] = [-3, 7]
export const PACE: [number, number] = [3, 14.5]
export const YEAR = Math.log10(3.156e7)

export const SIZE_TICKS: [number, string, boolean][] = [
  [-3, '1 mm', true], [-2, '1 cm', false], [-1, '10 cm', false], [0, '1 m', true], [1, '10 m', false], [2, '100 m', false],
  [3, '1 km', true], [4, '10 km', false], [5, '100 km', false], [6, '1.000 km', true], [7, '10.000 km', false],
]
export const PACE_TICKS: [number, string, boolean][] = [
  [Math.log10(3600), '1 jam', true], [Math.log10(86400), '1 hari', false], [Math.log10(2.63e6), '1 bulan', false], [YEAR, '1 tahun', true],
  [YEAR + 1, '10 tahun', false], [YEAR + 2, '1 abad', true], [YEAR + 3, '1.000 tahun', false], [YEAR + 5, '100.000 tahun', true], [YEAR + 6, '1 juta tahun', false],
]

const num = (v: number) => (+v.toPrecision(v >= 10 ? 2 : 1)).toLocaleString('id-ID')

/** A length given as log10 metres, in everyday words: "50 km", "3 m", "20 cm". */
export function sizeWords(s: number): string {
  const m = 10 ** s
  if (s >= 3) return num(m / 1e3) + ' km'
  if (s >= 0) return num(m) + ' m'
  if (s >= -2) return num(m * 100) + ' cm'
  return num(m * 1000) + ' mm'
}

/** A duration given as log10 seconds, in everyday words: "3 jam", "30 tahun", "3 juta tahun". */
export function paceWords(t: number): string {
  const v = 10 ** t
  const units: [number, string][] = [[3.156e13, 'juta tahun'], [3.156e7, 'tahun'], [2.63e6, 'bulan'], [86400, 'hari'], [3600, 'jam'], [60, 'menit'], [1, 'detik']]
  for (const [s, w] of units) if (v >= s * 0.95) return num(v / s) + ' ' + w
  return 'kurang dari satu detik'
}

/** A range in words, with one unit when both ends share it: "50 sampai 60 km", or "3 bulan sampai 30 tahun". */
export function rangeWords(r: { lo: number; hi: number }, words: (v: number) => string): string {
  const a = words(r.lo), b = words(r.hi)
  if (a === b) return a
  const [na, ...ua] = a.split(' '), [nb, ...ub] = b.split(' ')
  return ua.join(' ') === ub.join(' ') ? `${na} sampai ${nb} ${ub.join(' ')}` : `${a} sampai ${b}`
}

const hash = (s: string) => {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return ((h >>> 0) % 10000) / 10000
}
const unit = (v: number, [lo, hi]: [number, number]) => ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 2 - 1

/**
 * Where a thing sits in the frame, each axis from -1 to 1: right is larger, up is slower, back is a higher level.
 * A thing has a range, not a point, so it is placed at a fixed spot inside its range (from its id), which keeps
 * things with the same rule apart without suggesting a measurement. Things with no size sit at the left edge.
 */
export function place(id: string, w: World): [number, number, number] | null {
  if (!w.pace || !w.level) return null
  const k = ILC.indexOf(w.level.code)
  const inside = (r: Range, salt: string) => r.lo + (r.hi - r.lo) * (0.12 + 0.76 * hash(id + salt))
  const x = w.size ? unit(inside(w.size, 's'), SIZE) : -1
  return [x, unit(inside(w.pace, 'p'), PACE), k < 0 ? 0 : (k / (ILC.length - 1)) * 2 - 1]
}

/** What the basis of a value means, in a few words. */
export const BASIS: Record<string, string> = { rule: 'perkiraan dari aturan umum', model: 'perkiraan model', measurement: 'hasil pengukuran', person: 'dikoreksi peninjau' }
