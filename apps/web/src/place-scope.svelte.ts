// The place the app is looking at: Tanah Papua by default, or a region, regency or kampung.
// Remembered on this device only. Never inferred from location or behaviour.
const KEY = 'etnos.scope.place'
export type PlaceScope = { slug: string; title: string }
function read(): PlaceScope {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (raw && typeof raw.slug === 'string' && typeof raw.title === 'string' && /^[-a-z0-9]{1,100}$/.test(raw.slug)) return raw
  } catch {
    /* Storage can be blocked; the default still works. */
  }
  return { slug: '', title: 'Tanah Papua' }
}
export const placeScope = $state<PlaceScope>(read())
export function setPlaceScope(next: PlaceScope) {
  placeScope.slug = next.slug
  placeScope.title = next.slug ? next.title : 'Tanah Papua'
  try {
    if (next.slug) localStorage.setItem(KEY, JSON.stringify({ slug: next.slug, title: next.title }))
    else localStorage.removeItem(KEY)
  } catch {
    /* Ignore: the choice lasts for this visit. */
  }
}
