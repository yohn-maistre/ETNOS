/** The period a page is about. Years are integers; negative is before year 1. */
export type Period = { from: number; to: number; precision: 'year' | 'decade' | 'century' | 'millennium' | 'deep'; note: string }

const n = (v: number) => Math.abs(v).toLocaleString('id-ID')
const year = (y: number) => (y < 1 ? n(y - 1) + ' SM' : String(y))

export function periodLabel(p: Pick<Period, 'from' | 'to' | 'precision'>, now = new Date().getFullYear()) {
  if (p.precision === 'deep') return 'sekitar ' + n(now - p.from) + ' tahun lalu'
  if (p.precision === 'decade' && p.from > 0) return Math.floor(p.from / 10) * 10 + '-an'
  if (p.precision === 'century' && p.from > 0) return 'abad ke-' + (Math.floor((p.from - 1) / 100) + 1)
  return p.from === p.to ? year(p.from) : year(p.from) + '–' + year(p.to)
}

/** Plain date ranges, newest first. No named eras: periodisation is an argument. */
export const bands = [
  { id: 'kini', label: '2000 – sekarang', tick: '2000', from: 2000 },
  { id: 'abad-20', label: '1900 – 1999', tick: '1900', from: 1900 },
  { id: 'sebelum-1900', label: '1500 – 1899', tick: '1500', from: 1500 },
  { id: 'sebelum-1500', label: 'Sebelum 1500', tick: '', from: -10000 },
  { id: 'purba', label: 'Lebih dari 12.000 tahun lalu', tick: '', from: -Infinity },
] as const

export const bandOf = (from: number) => bands.find((b) => from >= b.from)!.id
