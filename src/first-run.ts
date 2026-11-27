/**
 * The first-run screen (W1): after a first sign-in a person picks places and languages, and the node suggests
 * public communities labelled with them (community_contexts, a region also covering its regencies). Nothing is
 * stored about the choice on the node; only that the screen was shown (first_run_done).
 */
import type { EtnosCore } from './core.ts'
import type { Groups } from './groups.ts'

type Suggestion = { id: string; title: string; description: string; admission: string; because: string[] }

export function suggestCommunities(store: EtnosCore, groups: Groups, actorId: string | undefined, raw: string | null) {
  const slugs = [...new Set((raw ?? '').split(',').map((s) => s.trim()).filter((s) => /^[-a-z0-9]{1,100}$/.test(s)))].slice(0, 8)
  const joined = new Set(actorId ? store.all<{ community_id: string }>('SELECT community_id FROM memberships WHERE actor_id=? AND active=1', actorId).map((r) => r.community_id) : [])
  const open = (id: string) => !!store.get("SELECT 1 FROM communities WHERE id=? AND visibility='public' AND COALESCE(archived,0)=0 AND forming_until IS NULL", id)
  const matched = new Map<string, Suggestion>()
  for (const slug of slugs) {
    const context = store.get<{ id: string; title: string }>("SELECT id,title FROM contexts WHERE slug=? AND active=1 AND kind IN ('place','region','language')", slug)
    if (!context) continue
    for (const c of groups.communitiesIn(context.id)) {
      if (c.visibility !== 'public' || !open(c.id)) continue
      const known = matched.get(c.id)
      if (known) { if (!known.because.includes(context.title)) known.because.push(context.title) }
      else matched.set(c.id, { id: c.id, title: c.title, description: c.description, admission: c.admission, because: [context.title] })
    }
  }
  // Open public communities for everyone, for when nothing matches yet.
  const general = store.all<Suggestion & { because?: string[] }>(
    "SELECT c.id,c.title,c.description,c.admission FROM communities c WHERE c.visibility='public' AND c.admission='open' AND COALESCE(c.archived,0)=0 AND c.forming_until IS NULL ORDER BY (SELECT count(*) FROM memberships m WHERE m.community_id=c.id AND m.active=1) DESC,c.title LIMIT 12",
  ).filter((c) => !matched.has(c.id)).map((c) => ({ ...c, because: [] }))
  const mark = (c: Suggestion) => ({ ...c, joined: joined.has(c.id) })
  return { matched: [...matched.values()].slice(0, 20).map(mark), general: general.slice(0, 8).map(mark) }
}
