// Records for the full-screen viewer (Penampil, `/wiki/lihat/:id`): one shell for every kind of record, with a body
// for each media kind. The records are a static file built by scripts/observatory/build-viewer-seed.mjs from open
// sources (GBIF, Wikidata, Wikimedia Commons, Zenodo, The Met, iNaturalist); every record names its sources and their
// licences. A dataset from the catalogue opens in the same viewer through `data-<id>`.

export type Licence = { name: string; url?: string }
export type Source = { title: string; url: string; publisher?: string; licence?: Licence; attribution?: string; note?: string }
export type Fact = { label: string; value: string; source?: { title: string; url: string } }
export type Photo = { src: string; width: number; height: number; alt: string; credit: string; licence: Licence; url: string; note?: string }
export type Kind = 'model' | 'species' | 'landform' | 'images' | 'audio' | 'dataset'

export type ViewerObject = {
  id: string
  kind: Kind
  title: string
  subtitle?: string
  summary: string
  /** Things of the knowledge graph that this record is about. */
  about?: string[]
  /** Other viewer records, for example the 3D specimen of a species. */
  related?: string[]
  datasets?: string[]
  thumb?: string
  facts?: Fact[]
  sources: Source[]
  checked: string
  model?: { src: string; bytes: number; sizeCm?: { label: string; value: number }; note?: string }
  species?: {
    gbif: number
    scientificName: string
    authorship?: string
    taxonomy: { rank: string; name: string }[]
    names: { value: string; source: string }[]
    localNames: string
    occurrences?: { src: string; shown: number; total: number; url: string; rounding: string }
  }
  photos?: Photo[]
  audio?: { src: string; type: string; seconds?: number; transcript: string | null; recorded?: string; place?: string }
  landform?: { center: [number, number]; zoom: number; pitch: number; bearing: number }
  dataset?: { id: string; preview?: string }
}
export type Occurrences = { checked: string; query: string; licences: string[]; rounding: string; points: [number, number, number][] }
export type Preview = { checked: string; source: string; columns: { key: string; label: string }[]; rows: Record<string, string | number | null>[]; total: number }

export const KIND_LABEL: Record<Kind, string> = {
  model: 'Benda 3D',
  species: 'Spesies',
  landform: 'Bentang alam',
  images: 'Gambar',
  audio: 'Rekaman suara',
  dataset: 'Dataset',
}

let cache: Promise<ViewerObject[]> | null = null
/** All viewer records, fetched once per page load. */
export function loadViewerObjects(): Promise<ViewerObject[]> {
  cache ??= fetch('/observatory/viewer/objects.json')
    .then((r) => (r.ok ? r.json() : { objects: [] }))
    .then((d: { objects: ViewerObject[] }) => d.objects ?? [])
    .catch(() => { cache = null; return [] })
  return cache
}

/** The viewer address of a record. */
export const viewerHref = (id: string) => '/wiki/lihat/' + encodeURIComponent(id)
/** The viewer address of a dataset from the catalogue. */
export const datasetViewerHref = (datasetId: string) => viewerHref('data-' + datasetId)

/** Records about a thing of the knowledge graph, in a stable order: species and objects first, then the rest. */
export function objectsAbout(all: ViewerObject[], thing: string): ViewerObject[] {
  const order: Kind[] = ['landform', 'species', 'model', 'images', 'audio', 'dataset']
  return all.filter((o) => o.about?.includes(thing)).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.title.localeCompare(b.title, 'id'))
}

/** A byte count in everyday words: "3,4 MB". */
export function sizeLabel(bytes: number): string {
  if (bytes >= 1e6) return (bytes / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' MB'
  return Math.max(1, Math.round(bytes / 1e3)).toLocaleString('id-ID') + ' kB'
}

/** The order records are shown in when no list is given: objects first, then species, landforms and the rest. */
export const SHOWCASE: Kind[] = ['model', 'species', 'landform', 'images', 'audio', 'dataset']
/** Record kinds for each kind of entry, for lists that come from a kind page. */
export const ENTRY_KIND_RECORDS: Record<string, Kind[]> = { makhluk: ['species', 'audio'], 'bentang-alam': ['landform'], benda: ['model', 'images'], data: ['dataset'] }

/**
 * The records of a list the viewer was opened from (`?daftar=`): `semua` (or none) for every record, `jenis-<kind>` for
 * a kind page, `cari-<words>` for a search, `pilih-<id>.<id>` for a chosen set such as a map selection. An entry's own
 * list (`entri-<slug>`) needs the entry's media ids, which the caller passes as `ids`.
 */
export function viewerList(key: string, all: ViewerObject[], ids: string[] = []): ViewerObject[] {
  const ordered = [...all].sort((a, b) => SHOWCASE.indexOf(a.kind) - SHOWCASE.indexOf(b.kind))
  const [head, ...rest] = key.split('-'), arg = rest.join('-')
  if (head === 'jenis' && ENTRY_KIND_RECORDS[arg]) return ordered.filter((o) => ENTRY_KIND_RECORDS[arg].includes(o.kind))
  if (head === 'cari' && arg.trim()) {
    const q = arg.toLowerCase()
    return ordered.filter((o) => [o.title, o.subtitle ?? '', o.summary].some((t) => t.toLowerCase().includes(q)))
  }
  if (head === 'pilih') return arg.split('.').map((id) => all.find((o) => o.id === id)).filter((o): o is ViewerObject => !!o)
  if (head === 'entri') return ids.map((id) => all.find((o) => o.id === id)).filter((o): o is ViewerObject => !!o)
  return ordered
}
/** The viewer address of a record inside a list, so Back and sharing keep the list. */
export const viewerListHref = (id: string, list: string) => viewerHref(id) + (list && list !== 'semua' ? '?daftar=' + encodeURIComponent(list) : '')
