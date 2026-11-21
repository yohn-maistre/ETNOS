// Kamus in posts on the client: which words of a post carry a question, which are checked (for Mode belajar), and
// the one word card that is open. The server decides every underline from its own copy of the post
// (GET /v1/kamus/annotate); this module only batches the requests for the posts on screen.
import { request } from './api'
import type { WordClass } from './kamus-text.ts'

/** u: underlined words as [word, question key, kind]; c: checked words as [word, class]; a: number of Artinya. */
export type Annotation = { u: [string, string, string][]; c: [string, string][]; a: number }
type Pending = { ids: Set<string>; timer: ReturnType<typeof setTimeout> | null }

export const kamus = $state({
  annotations: {} as Record<string, Annotation | null>,
  /** Communities whose Kamus is on, learned from annotations and from the community page. */
  on: {} as Record<string, boolean>,
  learn: false,
  viewer: '' as string,
  card: null as null | { communityId: string; form: string; postId: string | null; anchor: DOMRect | null; returnTo: HTMLElement | null },
  /** Bumped after an answer, so open posts ask the server again. */
  tick: 0,
})

const pending: Pending = { ids: new Set(), timer: null }
const requested = new Set<string>()
const LEARN = 'etnos:kamus-belajar:'

export function setKamusViewer(actorId: string) {
  kamus.viewer = actorId
  try { kamus.learn = actorId ? localStorage.getItem(LEARN + actorId) === '1' : false } catch { kamus.learn = false }
}
export function setLearn(on: boolean) {
  kamus.learn = on
  try { if (kamus.viewer) localStorage.setItem(LEARN + kamus.viewer, on ? '1' : '0') } catch { /* private window */ }
}

/** Ask for a post's annotation; posts asked for in the same moment share one request. */
export function want(postId: string) {
  if (requested.has(postId)) return
  requested.add(postId)
  pending.ids.add(postId)
  pending.timer ??= setTimeout(flush, 40)
}
async function flush() {
  const ids = [...pending.ids]
  pending.ids.clear(); pending.timer = null
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    try {
      const r = await request<Record<string, Annotation>>('/v1/kamus/annotate?posts=' + batch.map(encodeURIComponent).join(','), undefined, undefined, true)
      for (const id of batch) if (r[id]) kamus.annotations[id] = r[id]
    } catch { /* the post renders as plain text */ }
  }
}
/** After an answer, posts on screen ask again so an answered question loses its underline. The old marks stay
 * until the new ones arrive. */
export function refreshAnnotations() {
  requested.clear()
  kamus.tick++
}

export function openWord(communityId: string, form: string, postId: string | null, el: HTMLElement | null) {
  kamus.card = { communityId, form, postId, anchor: el?.getBoundingClientRect() ?? null, returnTo: el }
}
export function closeWord() {
  const back = kamus.card?.returnTo
  kamus.card = null
  queueMicrotask(() => back?.focus?.())
}

export const CLASS_LETTER: Record<WordClass, string> = { benda: 'b', kerja: 'k', sifat: 's', lainnya: 'l' }
export const CLASS_NAME: Record<WordClass, string> = { benda: 'Benda', kerja: 'Kerja', sifat: 'Sifat', lainnya: 'Lainnya' }
