// The customary region(s) behind the place chosen in the switcher. A region is its own; a kabupaten or a
// language gives the region it sits in; a province gives the regions its kabupaten fall in. Maps and lists that
// are drawn by region use this, so choosing Nabire focuses Mee Pago instead of showing nothing.
import { placeScope } from './place-scope.svelte'
import { loadAtlasLangs, loadContexts, regionsOf } from './explore-data'

/** Call during component setup. Returns a live view of the scope's regions (empty for all of Tanah Papua). */
export function scopeRegions() {
  let list = $state<string[]>([])
  $effect(() => {
    const slug = placeScope.slug
    if (!slug) {
      list = []
      return
    }
    let live = true
    void Promise.all([loadContexts(), loadAtlasLangs()])
      .then(([all, langs]) => {
        if (live) list = regionsOf(slug, all, langs)
      })
      .catch(() => {
        if (live) list = [slug]
      })
    return () => {
      live = false
    }
  })
  return {
    get list() {
      return list
    },
    /** True for every region when no place is chosen. */
    has(region: string | undefined | null) {
      return !placeScope.slug || (!!region && list.includes(region))
    },
  }
}
