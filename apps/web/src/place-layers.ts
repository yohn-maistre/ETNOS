// Shared data for a place's cross-section (PlaceStrata) and its full core
// sample (CoreSample). One bounded public request per declared news place,
// merged newest first. Credentials never cross the news port.
import type { NewsItem } from './news.svelte'

export type PlaceNews = { items: NewsItem[]; failed: boolean }

export async function placeNews(places: string[], signal: AbortSignal, limit = 6): Promise<PlaceNews> {
  const slugs = places.slice(0, 8)
  if (!slugs.length) return { items: [], failed: false }
  const results = await Promise.allSettled(
    slugs.map((slug) =>
      fetch('/v1/news?limit=6&place=' + encodeURIComponent(slug), { credentials: 'omit', signal }).then((r) =>
        r.ok ? (r.json() as Promise<{ items: NewsItem[] }>) : Promise.reject(new Error('news ' + r.status)),
      ),
    ),
  )
  const seen = new Set<string>(),
    merged: NewsItem[] = []
  for (const result of results)
    if (result.status === 'fulfilled')
      for (const item of result.value.items ?? [])
        if (!seen.has(item.id)) {
          seen.add(item.id)
          merged.push(item)
        }
  merged.sort((a, b) => Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? ''))
  return { items: merged.slice(0, limit), failed: results.every((r) => r.status === 'rejected') }
}

/** Public work that is still open to be done. Completed or withdrawn work is history, not "in progress". */
export const openWorkStates = new Set(['proposed', 'adopted', 'active', 'blocked'])

export const corePath = (slug: string) => '/contexts/' + encodeURIComponent(slug) + '/lapisan'
