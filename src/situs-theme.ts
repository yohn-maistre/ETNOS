/**
 * The fixed choices a Situs can make (docs/plan/one-page-system-2026-11-21.md §8): two templates, a palette of
 * colours that pass contrast in light and dark, and four font pairings that ETNOS serves itself. A lembaga picks
 * from these lists; it never writes a colour, a font name or any CSS of its own. The JSON Schema in
 * `schemas/situs.schema.json` lists the same ids, and a test checks that both agree.
 */
export const TEMPLATES = [
  { id: 'editorial', label: 'Editorial', note: 'Untuk sanggar, yayasan dan lembaga budaya. Gambar besar dan tulisan yang lapang.' },
  { id: 'lembaga', label: 'Lembaga', note: 'Untuk kantor, sekolah, gereja dan lembaga masyarakat adat. Rapi, dengan kontak yang mudah ditemukan.' },
] as const
export type TemplateId = (typeof TEMPLATES)[number]['id']

/** fill: a band of colour; on: text on that band; ink: the colour as text or line on the page surface. */
type Tone = { fill: string; on: string; ink: string }
export const PALETTE: { id: string; label: string; light: Tone; dark: Tone }[] = [
  { id: 'grafit', label: 'Grafit', light: { fill: '#171717', on: '#ffffff', ink: '#171717' }, dark: { fill: '#e8e8e8', on: '#111111', ink: '#f0f0f0' } },
  { id: 'biru', label: 'Biru', light: { fill: '#1f4e8c', on: '#ffffff', ink: '#1f4e8c' }, dark: { fill: '#8fb4ea', on: '#0b1a2e', ink: '#9dbdf0' } },
  { id: 'hutan', label: 'Hijau hutan', light: { fill: '#24613f', on: '#ffffff', ink: '#24613f' }, dark: { fill: '#86c9a1', on: '#0b2016', ink: '#8fd0a9' } },
  { id: 'tanah', label: 'Tanah', light: { fill: '#8a4b24', on: '#ffffff', ink: '#8a4b24' }, dark: { fill: '#e3a47a', on: '#2a1408', ink: '#e8ad86' } },
  { id: 'merah', label: 'Merah', light: { fill: '#9b2c2c', on: '#ffffff', ink: '#9b2c2c' }, dark: { fill: '#f19a9a', on: '#2b0b0b', ink: '#f4a5a5' } },
  { id: 'laut', label: 'Laut', light: { fill: '#0f5f6b', on: '#ffffff', ink: '#0f5f6b' }, dark: { fill: '#7fcdd6', on: '#062226', ink: '#8ad3db' } },
  { id: 'ungu', label: 'Ungu', light: { fill: '#5b3f8c', on: '#ffffff', ink: '#5b3f8c' }, dark: { fill: '#bfa9ea', on: '#1d1233', ink: '#c6b2ee' } },
  { id: 'kunyit', label: 'Kunyit', light: { fill: '#7d5600', on: '#ffffff', ink: '#7d5600' }, dark: { fill: '#e8c35a', on: '#2a1f00', ink: '#ecc965' } },
]
export type ColourId = string

/** Font files are copies of the fontsource packages the web app already ships (OFL-1.1), under /fonts/situs/. */
export const FONTS = [
  { id: 'geist', label: 'Geist', heading: 'Geist', body: 'Geist', files: ['geist'] },
  { id: 'newsreader', label: 'Newsreader dan Geist', heading: 'Newsreader', body: 'Geist', files: ['newsreader', 'geist'] },
  { id: 'source', label: 'Source Serif dan Source Sans', heading: 'Source Serif 4', body: 'Source Sans 3', files: ['source-serif-4', 'source-sans-3'] },
  { id: 'jakarta', label: 'Plus Jakarta Sans', heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans', files: ['plus-jakarta-sans'] },
] as const
export type FontId = (typeof FONTS)[number]['id']

export const BLOCK_TYPES = ['hero', 'tentang', 'kegiatan', 'galeri', 'publikasi', 'komunitas', 'kios', 'kontak'] as const
export type BlockType = (typeof BLOCK_TYPES)[number]
export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Pembuka',
  tentang: 'Tentang',
  kegiatan: 'Kegiatan',
  galeri: 'Galeri',
  publikasi: 'Publikasi',
  komunitas: 'Komunitas',
  kios: 'Kios',
  kontak: 'Kontak',
}
