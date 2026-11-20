// What Beranda lists besides the feed and the place: the kind of post, the program of Aksara and the order.
// The choice is kept on this device only.
export type HomeKind = 'all' | 'aksara' | 'kerja'
export type HomeSort = 'new' | 'discussed'
const key = 'etnos.home-filter.v1'
type Saved = { kind: HomeKind; program: string; sort: HomeSort }
function read(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<Saved>
    return {
      kind: v.kind === 'aksara' || v.kind === 'kerja' ? v.kind : 'all',
      program: typeof v.program === 'string' && /^[a-z0-9-]{0,24}$/.test(v.program) ? v.program : '',
      sort: v.sort === 'discussed' ? 'discussed' : 'new',
    }
  } catch {
    return { kind: 'all', program: '', sort: 'new' }
  }
}
export const homeFilter = $state<Saved>(read())
export function setHomeFilter(patch: Partial<Saved>) {
  Object.assign(homeFilter, patch)
  if (homeFilter.kind !== 'aksara') homeFilter.program = ''
  try {
    localStorage.setItem(key, JSON.stringify({ kind: homeFilter.kind, program: homeFilter.program, sort: homeFilter.sort }))
  } catch {
    /* the choice then lasts until the page closes */
  }
}
/** Query parameters for /v1/feed/page. */
export function homeFilterParams(q: URLSearchParams) {
  if (homeFilter.kind === 'aksara') q.set('aksara', 'true')
  if (homeFilter.kind === 'kerja') q.set('work', 'true')
  if (homeFilter.kind === 'aksara' && homeFilter.program) q.set('program', homeFilter.program)
  if (homeFilter.sort === 'discussed') q.set('sort', 'discussed')
}
