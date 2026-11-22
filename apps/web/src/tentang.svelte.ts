// Percakapan in the web app (docs/plan/one-page-system-2026-11-21.md §4, src/tentang.ts on the server): the names
// the composer matches against, loaded once per page, and the one "Tandai …?" prompt that follows a public post.
import { request } from './api'
import { nameIndex, type NameEntry, type NameIndex } from './tentang-match.ts'

export type Tag = { slug: string; title: string; label: string }
export type TandaiItem = { text: string; entries: { slug: string; title: string; label: string; kind: string }[] }

let names: Promise<{ list: NameEntry[]; index: NameIndex }> | null = null
export function loadNames() {
  names ??= request<{ entries: NameEntry[] }>('/v1/tentang/names', undefined, undefined, true)
    .then((r) => ({ list: r.entries, index: nameIndex(r.entries) }))
    .catch((e) => {
      names = null
      throw e
    })
  return names
}

/** Replace a post's tags. Returns the tags as saved; open post cards refresh themselves. */
export async function saveTags(postId: string, slugs: string[]) {
  const r = await request<{ tags: Tag[] }>('/v1/posts/' + postId + '/tentang', { entries: slugs })
  window.dispatchEvent(new CustomEvent('etnos:tentang', { detail: { postId } }))
  return r.tags
}

/** The prompt after posting: the post, its tags so far, and the names still to ask about, one at a time. */
export const tandai = $state<{ postId: string; tags: string[]; items: TandaiItem[]; busy: boolean; error: string }>({ postId: '', tags: [], items: [], busy: false, error: '' })

/** Ask the server which names in a just-published public post could be tags. Quietly does nothing on failure. */
export async function askTandai(postId: string) {
  try {
    const r = await request<{ tags: string[]; suggestions: TandaiItem[] }>('/v1/posts/' + postId + '/tandai', undefined, undefined, true)
    if (!r.suggestions.length) return
    Object.assign(tandai, { postId, tags: r.tags, items: r.suggestions, busy: false, error: '' })
  } catch {
    /* A suggestion is optional; the post is already published. */
  }
}

export async function answerTandai(slug: string | null) {
  if (tandai.busy || !tandai.items.length) return
  if (slug) {
    tandai.busy = true
    tandai.error = ''
    try {
      tandai.tags = (await saveTags(tandai.postId, [...tandai.tags, slug])).map((t) => t.slug)
    } catch (e) {
      tandai.error = e instanceof Error ? e.message : 'Belum tersimpan.'
      tandai.busy = false
      return
    }
    tandai.busy = false
  }
  tandai.items = tandai.items.slice(1)
}
export const closeTandai = () => { tandai.items = [] }
