/**
 * Percakapan: how posts reach an entry (docs/plan/one-page-system-2026-11-21.md §4), without any model.
 *
 * Storage of *tentang* (a post is about an entry):
 * - An entry that is a context (a place, a region, a language, a topic) keeps the relation it already had,
 *   `record_contexts` with record kind `post`. The ranking of what is talked about and the older readers keep working.
 * - Any other entry (a lake or a mountain of the knowledge model, a species, an object, a page) is a row of
 *   `post_entries`, keyed by the entry's address, because `record_contexts` can only point at a context. The row keeps
 *   the title and kind word it had when it was tagged, so a post can show its chips without building the catalogue.
 * One post carries at most five tags across both. Only the author of a root post in a public community tags it.
 *
 * What a Percakapan tab shows is decided when it is read, never when the tag was made: a public community now, a post
 * that is not hidden or deleted now, and a context that is still active. A post reaches an entry when its author
 * tagged it, when its community carries the entry as an `about` label (never a `language` label), or when it links
 * to the entry's address. Everything here reads as an anonymous reader, whoever asks.
 */
import { Buffer } from 'node:buffer'
import { Fault, type Post, type EtnosCore } from './core.ts'
import { FACET_PREFIX, KIND_LABEL, resolve, type Catalogue } from './entri.ts'
import { MAX_TENTANG, nameIndex, normName, suggestions, type NameEntry } from '../apps/web/src/tentang-match.ts'

type Node = Catalogue['nodes'] extends Map<string, infer N> ? N : never
export type Tag = { slug: string; title: string; label: string }
export type Via = { source: 'author' | 'community' | 'link'; entry: { slug: string; title: string } | null; community?: { id: string; title: string } }

/** One-word names that are everyday words in Tanah Papua: they match only with their kind word in front. */
const EVERYDAY = new Set(['papua', 'puncak'])
const labelOf = (n: Node) => (n.kind !== 'bahasa' && n.sub?.label) || KIND_LABEL[n.kind]

/**
 * The names the matcher looks for, entry by entry. A topic's or a loose page's title is an everyday word
 * (Kesehatan, Sejarah), so it has no names and is only offered in the picker. A language matches with the word
 * *bahasa* in front, because many short language names are also Indonesian words or the names of peoples and places.
 * A place matches by its name and with its kind word in front (Kabupaten Paniai), and a one-word name shorter than
 * four letters, or one in EVERYDAY, only in that longer form.
 */
export function entryNames(cat: Catalogue): NameEntry[] {
  const thing = new Map(cat.commons.entities.map((e) => [e.slug, e.title]))
  const out: NameEntry[] = []
  for (const n of cat.nodes.values()) {
    const aliases = n.aliases.filter((a) => !a.includes(':')), things = n.things.map((t) => thing.get(t) ?? '').filter(Boolean)
    const search = [...new Set([n.title, ...aliases, ...things])]
    let names: string[] = []
    if (n.kind === 'bahasa') names = search.map((x) => (/^bahasa\s/i.test(x) ? x : 'Bahasa ' + x))
    else if (n.kind !== 'topik' && n.kind !== 'halaman') {
      const prefix = n.ctx ? FACET_PREFIX[n.ctx.facet ?? ''] ?? '' : ''
      const bare = [n.title, ...aliases].filter((x) => { const k = normName(x); return k.includes(' ') || (k.length >= 4 && !EVERYDAY.has(k)) })
      const long = prefix && !normName(n.title).startsWith(normName(prefix)) ? [prefix + ' ' + n.title] : []
      names = [...bare, ...long, ...things]
    }
    out.push({ slug: n.slug, title: n.title, kind: n.kind, label: labelOf(n), names: [...new Set(names)], search })
  }
  return out.sort((a, b) => a.title.localeCompare(b.title, 'id') || a.slug.localeCompare(b.slug))
}

export class Tentang {
  private s: EtnosCore
  constructor(s: EtnosCore) { this.s = s }

  /** The entries behind a list of addresses (a slug, an older slug, a context id), each once, at most five. */
  resolve(cat: Catalogue, asked: unknown): Node[] {
    if (!Array.isArray(asked) || asked.some((x) => typeof x !== 'string' || x.length > 200)) throw new Fault(400, 'Entries must be a list of addresses')
    const out = new Map<string, Node>()
    for (const a of asked as string[]) {
      const hit = resolve(cat, a)
      if (!hit) throw new Fault(404, 'Entry not found')
      out.set(hit.slug, cat.nodes.get(hit.slug)!)
    }
    if (out.size > MAX_TENTANG) throw new Fault(400, `At most ${MAX_TENTANG} entries per post`)
    return [...out.values()]
  }

  /** The post as its author may tag it: a root post, not hidden or deleted, in a public community, by this person. */
  private ownPost(actorId: string, postId: string) {
    const p = this.s.get<Post>('SELECT * FROM posts WHERE id=? AND hidden=0', postId)
    if (!p || p.deleted) throw new Fault(404, 'Not found')
    if (p.author_id !== actorId) {
      // Someone else's post: no hint whether it exists when they cannot read it.
      if (!this.s.canRead(actorId, this.s.community(p.community_id))) throw new Fault(404, 'Not found')
      throw new Fault(403, 'Only the author tags a post')
    }
    if (this.s.actor(actorId).kind !== 'human') throw new Fault(403, 'Only the author tags a post')
    return p
  }

  /** The post's tags: contexts first, then other entries, as the post shows them. */
  tags(postId: string): Tag[] {
    const ctx = this.s.all<Tag>("SELECT c.slug,c.title,CASE c.kind WHEN 'language' THEN 'Bahasa' WHEN 'topic' THEN 'Topik' ELSE 'Tempat' END label FROM record_contexts l JOIN contexts c ON c.id=l.context_id WHERE l.record_kind='post' AND l.record_id=? AND c.active=1 ORDER BY l.created,c.slug", postId)
    return [...ctx, ...this.s.all<Tag>('SELECT slug,title,label FROM post_entries WHERE post_id=? ORDER BY created,slug', postId)]
  }

  /** Replace the post's tags with these entries (already resolved). An empty list removes them all. */
  set(actorId: string, postId: string, entries: Node[]) {
    return this.s.tx(() => {
      const p = this.ownPost(actorId, postId)
      if (p.parent_id) throw new Fault(400, 'Tag the opening post')
      if (entries.length && this.s.community(p.community_id).visibility !== 'public') throw new Fault(400, 'Only public posts can be tagged')
      if (entries.length > MAX_TENTANG) throw new Fault(400, `At most ${MAX_TENTANG} entries per post`)
      const now = this.s.clock()
      const ctxIds = entries.filter((n) => n.ctx).map((n) => n.ctx!.id), slugs = entries.filter((n) => !n.ctx).map((n) => n.slug)
      this.s.run("DELETE FROM record_contexts WHERE record_kind='post' AND record_id=? AND context_id NOT IN (SELECT value FROM json_each(?))", postId, JSON.stringify(ctxIds))
      this.s.run('DELETE FROM post_entries WHERE post_id=? AND slug NOT IN (SELECT value FROM json_each(?))', postId, JSON.stringify(slugs))
      for (const n of entries) {
        if (n.ctx) this.s.run("INSERT OR IGNORE INTO record_contexts VALUES('post',?,?,?,?)", postId, n.ctx.id, actorId, now)
        else this.s.run('INSERT INTO post_entries VALUES(?,?,?,?,?,?) ON CONFLICT(post_id,slug) DO UPDATE SET title=excluded.title,label=excluded.label', postId, n.slug, n.title, labelOf(n), actorId, now)
      }
      this.s.invalidatePublicContext(p.community_id)
      this.s.audit(actorId, 'post.tentang', postId)
      return { tags: this.tags(postId) }
    })
  }

  /**
   * "Tandai …?" after posting: names in the author's own public post that it is not yet tagged with and that its
   * community does not already give it. Deterministic, with no model. Anyone else gets nothing, and a post in a
   * private community gets no suggestions.
   */
  suggest(actorId: string, postId: string, cat: Catalogue) {
    const p = this.ownPost(actorId, postId)
    if (p.parent_id || this.s.community(p.community_id).visibility !== 'public') return { suggestions: [] }
    const taken = new Set(this.tags(postId).map((t) => resolve(cat, t.slug)?.slug ?? t.slug))
    for (const r of this.s.all<{ slug: string }>("SELECT c.slug FROM community_contexts l JOIN contexts c ON c.id=l.context_id WHERE l.community_id=? AND l.role='about' AND c.active=1", p.community_id)) taken.add(resolve(cat, r.slug)?.slug ?? r.slug)
    let title = ''
    try { title = String((JSON.parse(p.content || '{}') as { title?: unknown }).title ?? '') } catch { /* no title */ }
    const room = MAX_TENTANG - this.tags(postId).length
    if (room <= 0) return { suggestions: [] }
    return {
      tags: this.tags(postId).map((t) => t.slug),
      suggestions: suggestions(title + '\n' + p.text, nameIndex(entryNames(cat)), taken, Math.min(3, room)).map((m) => ({
        text: m.text,
        entries: m.entries.map((e) => ({ slug: e.slug, title: e.title, label: e.label, kind: e.kind })),
      })),
    }
  }

  /**
   * The Percakapan tab: public opening posts about this entry, newest first, each with how it got here. With
   * `inside`, the posts about the places and things inside it are included too ("Termasuk tempat di dalamnya").
   */
  percakapan(viewer: string | undefined, cat: Catalogue, slug: string, o: { inside?: boolean; cursor?: string; limit?: number } = {}) {
    const found = resolve(cat, slug)
    if (!found) throw new Fault(404, 'Not found')
    const me = cat.nodes.get(found.slug)!
    const limit = o.limit ?? 20
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Fault(400, 'Limit must be between 1 and 50')
    let before: [number, string] | null = null
    if (o.cursor) {
      try {
        if (o.cursor.length > 300 || !/^[A-Za-z0-9_-]+$/.test(o.cursor)) throw Error()
        const d: unknown = JSON.parse(Buffer.from(o.cursor, 'base64url').toString('utf8'))
        if (!Array.isArray(d) || d.length !== 2 || !Number.isSafeInteger(d[0]) || typeof d[1] !== 'string' || !/^[a-f0-9-]{36}$/.test(d[1])) throw Error()
        before = [d[0], d[1]]
      } catch { throw new Fault(400, 'Invalid cursor') }
    }
    const inside = [...cat.nodes.values()].filter((n) => n.slug !== me.slug && cat.within(n).includes(me.slug))
    const nodes = [me, ...(o.inside ? inside : [])]
    const byAddress = new Map<string, Node>()
    for (const n of nodes) byAddress.set(n.slug, n)
    for (const [from, to] of cat.alias) { const n = byAddress.get(to); if (n && !n.ctx) byAddress.set(from, n) }
    const slugs = [...byAddress.keys()], ctxIds = nodes.filter((n) => n.ctx).map((n) => n.ctx!.id)
    const links = [this.s.base + '/wiki/' + me.slug, ...(me.page ? [this.s.base + '/wiki/' + me.page.id] : [])]
    const reaches = `p.parent_id IS NULL AND p.hidden=0 AND p.deleted=0 AND c.visibility='public' AND (
      EXISTS(SELECT 1 FROM post_entries e WHERE e.post_id=p.id AND e.slug IN (SELECT value FROM json_each(?)))
      OR EXISTS(SELECT 1 FROM record_contexts rc JOIN contexts x ON x.id=rc.context_id AND x.active=1 WHERE rc.record_kind='post' AND rc.record_id=p.id AND rc.context_id IN (SELECT value FROM json_each(?)))
      OR EXISTS(SELECT 1 FROM community_contexts cc JOIN contexts x ON x.id=cc.context_id AND x.active=1 WHERE cc.community_id=p.community_id AND cc.role='about' AND cc.context_id IN (SELECT value FROM json_each(?)))
      OR json_extract(p.content,'$.url') IN (SELECT value FROM json_each(?)))`
    const args = [JSON.stringify(slugs), JSON.stringify(ctxIds), JSON.stringify(ctxIds), JSON.stringify(links)]
    const total = this.s.get<{ n: number }>(`SELECT count(*) n FROM posts p JOIN communities c ON c.id=p.community_id WHERE ${reaches}`, ...args)!.n
    const rows = this.s.all<Post>(`SELECT p.* FROM posts p JOIN communities c ON c.id=p.community_id WHERE ${reaches}${before ? ' AND (p.created<? OR (p.created=? AND p.id<?))' : ''} ORDER BY p.created DESC,p.id DESC LIMIT ?`, ...args, ...(before ? [before[0], before[0], before[1]] : []), limit + 1)
    const page = rows.slice(0, limit), last = page.at(-1)
    const ids = JSON.stringify(page.map((p) => p.id))
    const ref = (n: Node | undefined) => (n && n.slug !== me.slug ? { slug: n.slug, title: n.title } : null)
    const ctxNode = new Map(nodes.filter((n) => n.ctx).map((n) => [n.ctx!.id, n]))
    const via = new Map<string, Via[]>()
    const add = (postId: string, v: Via) => via.set(postId, [...(via.get(postId) ?? []), v])
    for (const r of this.s.all<{ post_id: string; slug: string }>('SELECT post_id,slug FROM post_entries WHERE post_id IN (SELECT value FROM json_each(?)) AND slug IN (SELECT value FROM json_each(?))', ids, JSON.stringify(slugs))) add(r.post_id, { source: 'author', entry: ref(byAddress.get(r.slug)) })
    for (const r of this.s.all<{ post_id: string; context_id: string }>("SELECT record_id post_id,context_id FROM record_contexts WHERE record_kind='post' AND record_id IN (SELECT value FROM json_each(?)) AND context_id IN (SELECT value FROM json_each(?))", ids, JSON.stringify(ctxIds))) add(r.post_id, { source: 'author', entry: ref(ctxNode.get(r.context_id)) })
    const labels = this.s.all<{ community_id: string; title: string; context_id: string }>("SELECT cc.community_id,c.title,cc.context_id FROM community_contexts cc JOIN communities c ON c.id=cc.community_id WHERE cc.role='about' AND cc.community_id IN (SELECT community_id FROM posts WHERE id IN (SELECT value FROM json_each(?))) AND cc.context_id IN (SELECT value FROM json_each(?))", ids, JSON.stringify(ctxIds))
    for (const p of page) {
      for (const l of labels.filter((x) => x.community_id === p.community_id)) add(p.id, { source: 'community', entry: ref(ctxNode.get(l.context_id)), community: { id: l.community_id, title: l.title } })
      if (!via.has(p.id)) add(p.id, { source: 'link', entry: null })
    }
    // The entry itself first, then the author's tag before the community's.
    const rank = (v: Via) => (v.entry ? 2 : 0) + (v.source === 'author' ? 0 : 1)
    return {
      items: this.s.postViews(page, viewer).map((p) => ({ ...p, via: [...(via.get(p.id) ?? [])].sort((a, b) => rank(a) - rank(b)) })),
      total,
      inside: inside.length,
      nextCursor: rows.length > limit && last ? Buffer.from(JSON.stringify([last.created, last.id])).toString('base64url') : null,
    }
  }
}
