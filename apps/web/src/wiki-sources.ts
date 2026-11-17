// Presentation helpers for a wiki page's cited sources and voices. Every value
// comes from the accepted revision, its public history or proposals the
// server already decided the viewer may see.
import type { Proposal } from './api'

/** A citation that names a news-desk story (mirrors src/wiki.ts newsStoryId). */
export function newsStoryId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.origin === location.origin) return u.pathname.match(/^\/news\/(\d{1,12})\/?$/)?.[1] ?? null
    if (u.hostname === 'westpapua.watch' && /^\/story\/?$/.test(u.pathname)) {
      const id = u.searchParams.get('id') ?? ''
      return /^\d{1,12}$/.test(id) ? id : null
    }
  } catch {
    /* Not a URL we can describe. */
  }
  return null
}

export type NewsHeadline = { title: string; publishedAt: string | null }
const headlines = new Map<string, Promise<NewsHeadline | null>>()
/** One cached public read per story; failures resolve to null and are retried on the next page load. */
export function newsHeadline(id: string): Promise<NewsHeadline | null> {
  let pending = headlines.get(id)
  if (!pending) {
    pending = fetch('/v1/news/' + id, { credentials: 'omit' })
      .then((r) => (r.ok ? (r.json() as Promise<NewsHeadline>) : null))
      .then((s) => (s && typeof s.title === 'string' ? { title: s.title, publishedAt: s.publishedAt ?? null } : null))
      .catch(() => null)
    headlines.set(id, pending)
    void pending.then((v) => {
      if (!v) headlines.delete(id)
    })
  }
  return pending
}

export function sourceLabel(url: string) {
  try {
    const u = new URL(url)
    const path = decodeURIComponent(u.pathname).replace(/\/$/, '')
    return u.hostname.replace(/^www\./, '') + (path && path !== '/' ? path : '')
  } catch {
    return url
  }
}

type Person = { id: string; name: string; kind: string }
export type Voices = {
  sources: number
  people: number
  agentRevisions: number
  unreviewedAgent: number
  pendingAgent: number
}
/** Page-level voices: cited sources, distinct human authors of accepted
 * revisions, accepted revisions written by agents, and pending agent proposals
 * the viewer is already allowed to see. Nothing is estimated. */
export function voices(
  citations: string[],
  history: { author?: Person; review?: string }[],
  current: Person | undefined,
  proposals: Proposal[],
): Voices {
  // Reverted revisions are not part of the page any more; live ones not yet reviewed are counted apart.
  const kept = history.length ? history.filter((h) => h.review !== 'reverted') : current ? [{ author: current, review: undefined }] : []
  const authors = kept.map((h) => h.author).filter((a): a is Person => !!a)
  const agent = kept.filter((h) => h.author?.kind === 'agent')
  return {
    sources: citations.length,
    people: new Set(authors.filter((a) => a.kind === 'human').map((a) => a.id)).size,
    agentRevisions: agent.filter((h) => h.review !== 'unreviewed').length,
    unreviewedAgent: agent.filter((h) => h.review === 'unreviewed').length,
    pendingAgent: proposals.filter(
      (p) => p.state === 'pending' && ((p as Proposal & { authorKind?: string }).authorKind ?? p.author?.kind) === 'agent',
    ).length,
  }
}
