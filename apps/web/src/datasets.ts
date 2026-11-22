// Dataset records as the API returns them (src/datasets.ts at the root: DCAT 3 and Croissant core fields, open tier
// only). ETNOS keeps metadata and links here, never the dataset's own files.
import { request } from './api'

export type DatasetThing = { slug: string; class: string; title: string; context: string | null }
export type Distribution = { title: string; url: string; mediaType: string | null; format: string | null; byteSize: number | null; checksum: { algorithm: 'sha256' | 'md5'; value: string } | null }
export type Dataset = {
  id: string
  key: string
  title: string
  description: string
  kind: string
  publisher: string
  publisherUrl: string | null
  landingPage: string
  licence: string
  licenceUrl: string | null
  issued: string | null
  modified: string | null
  version: string | null
  languages: string[]
  keywords: string[]
  temporal: { start: string | null; end: string | null } | null
  spatial: string | null
  distributions: Distribution[]
  structure: { name: string; dataType: string; description: string }[]
  citation: string | null
  accessTier: string
  state: 'proposed' | 'accepted' | 'rejected' | 'withdrawn'
  origin: string
  checked: string | null
  checkedBySteward: boolean
  about: DatasetThing[]
  jsonld?: unknown
}

export const KIND: Record<string, string> = {
  table: 'Tabel',
  'map-vector': 'Peta vektor',
  'map-raster': 'Citra dan peta raster',
  wordlist: 'Daftar kata',
  images: 'Gambar',
  documents: 'Dokumen',
  audio: 'Rekaman suara',
  video: 'Video',
  graph: 'Jaringan',
  other: 'Lainnya',
}

export function bytes(n: number | null): string {
  if (n === null) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = n, u = 0
  while (v >= 1000 && u < units.length - 1) { v /= 1000; u++ }
  return (u ? (+v.toPrecision(v >= 100 ? 3 : 2)).toLocaleString('id-ID') : String(v)) + ' ' + units[u]
}

const languageNames = (() => { try { return new Intl.DisplayNames(['id'], { type: 'language' }) } catch { return null } })()
export const languageName = (code: string) => languageNames?.of(code) ?? code

export function period(t: Dataset['temporal']): string {
  if (!t || (!t.start && !t.end)) return ''
  const a = t.start?.slice(0, 4), b = t.end?.slice(0, 4)
  return a && b ? (a === b ? a : a + '–' + b) : a ? 'sejak ' + a : 'sampai ' + b
}

/** A date such as 2026-11-20 as "20 November 2026"; a year alone stays a year. */
export function day(d: string | null): string {
  if (!d) return ''
  if (d.length === 4) return d
  const [y, m, dd] = d.split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, dd || 1)).toLocaleDateString('id-ID', dd ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export const listDatasets = (filter: { thing?: string; context?: string; kind?: string; q?: string } = {}, signal?: AbortSignal) => {
  const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][])
  return request<Dataset[]>('/v1/datasets' + (q.size ? '?' + q : ''), undefined, signal, true)
}
export const readDataset = (id: string, signal?: AbortSignal) => request<Dataset>('/v1/datasets/' + encodeURIComponent(id), undefined, signal, true)

/** Where a thing a dataset is about has its own page: a catalogue context, or a search in the wiki. */
export const thingHref = (t: DatasetThing) => '/wiki/' + encodeURIComponent(t.context ?? t.slug)
