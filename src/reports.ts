/**
 * The node operator's report queue (W1). Posts are reported to their community's moderators as before (social.ts,
 * `reports`); those reports also show here. Profiles and communities are reported here only (`operator_reports`).
 * Only the node steward reads this queue. A report names its target by id; nothing is copied from it.
 */
import { randomUUID } from 'node:crypto'
import { Fault, type EtnosCore } from './core.ts'
import type { Groups } from './groups.ts'

const OPEN_PER_REPORTER = 30
const reason = (v: unknown) => {
  if (typeof v !== 'string' || !v.trim()) throw new Fault(400, 'Tulis alasan laporan.')
  return v.trim().slice(0, 2000)
}

export type QueueItem = { id: string; source: 'post' | 'operator'; kind: 'post' | 'profile' | 'community'; target: string; label: string; href: string; reason: string; state: string; created: number; decision: string | null }

export class OperatorReports {
  private s: EtnosCore
  private groups: Groups
  constructor(s: EtnosCore, groups: Groups) { this.s = s; this.groups = groups }

  /** A signed-in person reports a profile or a community they can see. */
  report(actorId: string, kind: unknown, target: unknown, text: unknown) {
    const s = this.s
    if (s.actor(actorId).kind !== 'human') throw new Fault(403, 'Human reporter required')
    if (kind !== 'profile' && kind !== 'community') throw new Fault(400, 'Jenis laporan tidak dikenal.')
    if (typeof target !== 'string' || target.length > 200) throw new Fault(400, 'Target tidak valid.')
    if (kind === 'profile') {
      if (target === actorId) throw new Fault(400, 'Kamu tidak dapat melaporkan profilmu sendiri.')
      s.actor(target)
    } else {
      const c = s.community(target)
      // A hidden community is only visible to its members, so only they can report it.
      if (c.visibility === 'hidden-private' && !s.membership(actorId, c.id)) throw new Fault(404, 'Not found')
    }
    const why = reason(text)
    return s.tx(() => {
      if (s.get('SELECT 1 FROM operator_reports WHERE kind=? AND target_id=? AND reporter_id=?', kind, target, actorId)) throw new Fault(409, 'Kamu sudah melaporkan ini.')
      if (s.get<{ n: number }>("SELECT count(*) n FROM operator_reports WHERE reporter_id=? AND state='open'", actorId)!.n >= OPEN_PER_REPORTER) throw new Fault(429, 'Terlalu banyak laporan yang masih terbuka.')
      const id = randomUUID()
      s.run("INSERT INTO operator_reports(id,kind,target_id,reporter_id,reason,state,created) VALUES(?,?,?,?,?,'open',?)", id, kind, target, actorId, why, s.clock())
      s.audit(actorId, 'report.' + kind, target)
      return { id, state: 'open' }
    })
  }

  /** The node steward's queue: open reports first, both kinds together. Reporters are not named. */
  queue(actorId: string): QueueItem[] {
    this.groups.nodeSteward(actorId)
    const s = this.s
    const posts = s.all<{ id: string; post_id: string; root_id: string | null; title: string; reason: string; state: string; created: number; decision: string | null }>(
      "SELECT r.id,r.post_id,p.root_id,c.title,r.reason,r.state,r.created,r.decision FROM reports r JOIN posts p ON p.id=r.post_id JOIN communities c ON c.id=p.community_id ORDER BY r.state='open' DESC,r.created DESC LIMIT 200",
    ).map((r): QueueItem => ({ id: r.id, source: 'post', kind: 'post', target: r.post_id, label: 'Posting di ' + r.title, href: '/square/' + (r.root_id ?? r.post_id), reason: r.reason, state: r.state, created: r.created, decision: r.decision }))
    const others = s.all<{ id: string; kind: 'profile' | 'community'; target_id: string; reason: string; state: string; created: number; decision: string | null }>(
      "SELECT id,kind,target_id,reason,state,created,decision FROM operator_reports ORDER BY state='open' DESC,created DESC LIMIT 200",
    ).map((r): QueueItem => {
      const name = r.kind === 'profile'
        ? s.get<{ name: string }>('SELECT name FROM actors WHERE id=?', r.target_id)?.name
        : s.get<{ title: string }>('SELECT title FROM communities WHERE id=?', r.target_id)?.title
      return { id: r.id, source: 'operator', kind: r.kind, target: r.target_id, label: (r.kind === 'profile' ? 'Profil ' : 'Komunitas ') + (name ?? ''), href: (r.kind === 'profile' ? '/people/' : '/communities/') + r.target_id, reason: r.reason, state: r.state, created: r.created, decision: r.decision }
    })
    return [...posts, ...others].sort((a, b) => Number(b.state === 'open') - Number(a.state === 'open') || b.created - a.created).slice(0, 200)
  }

  /** The node steward closes a report: resolved after acting on it, or dismissed. */
  decide(actorId: string, id: string, source: unknown, state: unknown, decision: unknown) {
    this.groups.nodeSteward(actorId)
    if (state !== 'resolved' && state !== 'dismissed') throw new Fault(400, 'Invalid decision')
    const note = typeof decision === 'string' ? decision.trim().slice(0, 2000) : ''
    const table = source === 'post' ? 'reports' : source === 'operator' ? 'operator_reports' : null
    if (!table) throw new Fault(400, 'Invalid report source')
    const s = this.s
    s.tx(() => {
      const row = s.get<{ state: string }>('SELECT state FROM ' + table + ' WHERE id=?', id)
      if (!row) throw new Fault(404, 'Not found')
      if (row.state !== 'open') throw new Fault(409, 'Report already decided')
      s.run('UPDATE ' + table + ' SET state=?,decision=?,reviewer_id=? WHERE id=?', state, note, actorId, id)
      s.audit(actorId, 'report.operator.' + state, id)
    })
    return { id, state }
  }
}
