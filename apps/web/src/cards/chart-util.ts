// Shared by the chart cards: colours from the theme, number formatting, and the text that makes a chart readable
// without seeing it.
/** First series follows the reader's chosen accent (--brand); the second is the "Tanah" palette accent from appearance.svelte.ts. */
export const chartColors = ['var(--brand)', '#b7775c'] as const

const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
export const fmt = (n: number) => nf.format(n)
export const withUnit = (n: number, unit: string) => (unit ? `${fmt(n)} ${unit}` : fmt(n))
