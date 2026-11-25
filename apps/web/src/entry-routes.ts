// Addresses of entry pages (docs/plan/one-page-system-2026-11-21.md §3). Every entry lives at /wiki/<slug>; the
// older /contexts/<slug> addresses, with any ?tab=, open the same entry with the matching tab. Kept free of Svelte so
// the web tests can run it directly.

export type EntryTab = 'tentang' | 'percakapan' | 'riset' | 'riwayat'
export const ENTRY_TABS: [EntryTab, string][] = [
  ['tentang', 'Tentang'],
  ['percakapan', 'Percakapan'],
  ['riset', 'Riset dan data'],
  ['riwayat', 'Riwayat'],
]
/** Second segments under /wiki that are routes of their own, never entries. */
export const RESERVED = new Set(['notes', 'data', 'peta', 'peta-kata', 'lihat', 'jenis'])

/** The old tabs of a context page and where their content lives now. */
const OLD_TAB: Record<string, EntryTab | ''> = {
  tentang: '',
  percakapan: 'percakapan',
  sumber: 'riset',
  data: 'riset',
  riset: 'riset',
  perkembangan: 'riwayat',
  kabar: 'riwayat',
  lapisan: 'riwayat',
  riwayat: 'riwayat',
  // Communities moved to the Letak rail, which shows beside every tab.
  komunitas: '',
}

/** The entry address for an old context address, or null when the path is not one. */
export function contextRedirect(pathname: string, search: string): string | null {
  const m = pathname.match(/^\/contexts\/([^/]+)(?:\/(lapisan))?\/?$/)
  if (!m) return null
  const params = new URLSearchParams(search)
  if (params.has('create')) return null
  const tab = OLD_TAB[m[2] ?? params.get('tab') ?? ''] ?? ''
  params.delete('tab')
  if (tab) params.set('tab', tab)
  const query = params.toString()
  return '/wiki/' + m[1] + (query ? '?' + query : '')
}

/** The tab an entry address asks for. */
export function entryTab(search: string): EntryTab {
  const raw = new URLSearchParams(search).get('tab') ?? ''
  return (OLD_TAB[raw] || 'tentang') as EntryTab
}

/** The address of one tab of an entry, keeping any other query. */
export function tabHref(slug: string, tab: EntryTab, search = ''): string {
  const params = new URLSearchParams(search)
  if (tab === 'tentang') params.delete('tab')
  else params.set('tab', tab)
  const query = params.toString()
  return '/wiki/' + encodeURIComponent(slug) + (query ? '?' + query : '')
}

/** True when /wiki/<segment> is an entry page rather than a route of the Ensiklopedia. */
export const isEntrySegment = (segment: string | undefined) => !!segment && !RESERVED.has(segment)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** A wiki page id: its history and review still open in the article reader with ?view=riwayat. */
export const isPageId = (segment: string | undefined) => !!segment && UUID.test(segment)
