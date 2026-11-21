/**
 * Kios (docs/plan/one-page-system-2026-11-21.md §7): a person or a lembaga switches it on, and their open offers
 * show as a small shop on their profile or lembaga page and on the place entries they sell in ("Kios di Wamena").
 * A Kios is only a view of `offerings`. It lists; it never takes payment or holds money (Permendag 31/2023 Pasal
 * 21(3)), and people make contact by Pesan or by a WhatsApp link the seller sets.
 *
 * Everything shown is public at read time: offers in public communities, not hidden, deleted or content-warned,
 * open and not expired, read as an anonymous reader. An offer in a private community never appears in a Kios, and
 * neither does its count. A lembaga's Kios holds the offers its members post in its public communities.
 */
import { Fault, type StrataCore } from './core.ts'
import { Offerings } from './offerings.ts'
import type { Groups } from './groups.ts'
import { KIOS_RULES, kiosRules } from './kios-rules.ts'

export type KiosOwner = { kind: 'actor' | 'group'; id: string }
type Row = { owner_kind: 'actor' | 'group'; owner_id: string; open: number; whatsapp: string; rules: string; updated: number }
const LIMIT = 12
/** The rule set a seller agreed to; a changed list asks again. */
export const rulesVersion = () => KIOS_RULES.map((r) => r.key).join(',')
const visible = `c.visibility='public' AND p.hidden=0 AND p.deleted=0 AND o.kind='offer' AND o.status='open' AND (o.expires IS NULL OR o.expires>?) AND COALESCE(json_extract(p.content,'$.warning'),'')=''`

/** A WhatsApp number as wa.me wants it: digits with the country code, from 08…, +62… or 62…. */
export function whatsappNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return ''
  if (typeof value !== 'string') throw new Fault(400, 'Invalid WhatsApp number')
  let d = value.replace(/[\s().-]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  else if (d.startsWith('0')) d = '62' + d.slice(1)
  if (!/^[1-9][0-9]{8,14}$/.test(d)) throw new Fault(400, 'Invalid WhatsApp number')
  return d
}

export class Kios {
  private s: StrataCore
  private groups: Groups
  constructor(store: StrataCore, groups: Groups) {
    this.s = store
    this.groups = groups
  }
  private row(o: KiosOwner) {
    return this.s.get<Row>('SELECT * FROM kios WHERE owner_kind=? AND owner_id=?', o.kind, o.id)
  }
  /** Who may switch a Kios: the person themself, or a steward of a public lembaga. */
  private manage(actorId: string, o: KiosOwner) {
    if (this.s.actor(actorId).kind !== 'human') throw new Fault(403, 'A person must manage a Kios')
    if (o.kind === 'actor') {
      if (o.id !== actorId) throw new Fault(403, 'Only the account owner opens this Kios')
      return
    }
    this.groups.requireSteward(actorId, o.id)
    if (this.groups.group(o.id).visibility !== 'public') throw new Fault(400, 'A Kios needs a public lembaga')
  }
  private canManage(actorId: string | undefined, o: KiosOwner) {
    if (!actorId) return false
    try {
      this.manage(actorId, o)
      return true
    } catch {
      return false
    }
  }
  private title(o: KiosOwner) {
    if (o.kind === 'actor') return this.s.actor(o.id).name
    return this.groups.group(o.id).title
  }
  /** Open, or close, a Kios. Opening needs the house rules accepted; closing keeps the offers where they are. */
  set(actorId: string, o: KiosOwner, b: { open?: unknown; whatsapp?: unknown; acceptRules?: unknown }) {
    if (!o || !['actor', 'group'].includes(o.kind) || typeof o.id !== 'string') throw new Fault(400, 'Invalid Kios owner')
    return this.s.tx(() => {
      this.manage(actorId, o)
      const prior = this.row(o)
      if (b.open !== undefined && typeof b.open !== 'boolean') throw new Fault(400, 'Boolean required')
      const open = b.open === undefined ? !!prior?.open : b.open
      const whatsapp = b.whatsapp === undefined ? prior?.whatsapp ?? '' : whatsappNumber(b.whatsapp)
      const agreed = b.acceptRules === true ? rulesVersion() : prior?.rules ?? ''
      if (open && agreed !== rulesVersion()) throw new Fault(409, 'Accept the Kios house rules first')
      this.s.run(
        'INSERT INTO kios(owner_kind,owner_id,open,whatsapp,rules,updated,updated_by) VALUES(?,?,?,?,?,?,?) ON CONFLICT(owner_kind,owner_id) DO UPDATE SET open=excluded.open,whatsapp=excluded.whatsapp,rules=excluded.rules,updated=excluded.updated,updated_by=excluded.updated_by',
        o.kind, o.id, Number(open), whatsapp, agreed, this.s.clock(), actorId,
      )
      this.s.audit(actorId, open ? 'kios.open' : 'kios.close', o.id)
      return this.view(o, actorId)
    })
  }
  /** Offer post ids of an open Kios, newest first, public only. */
  private ids(o: KiosOwner) {
    const now = this.s.clock()
    if (o.kind === 'actor')
      return this.s.all<{ post_id: string }>(
        `SELECT o.post_id FROM offerings o JOIN posts p ON p.id=o.post_id JOIN communities c ON c.id=p.community_id WHERE p.author_id=? AND ${visible} ORDER BY o.created DESC,o.post_id DESC LIMIT ${LIMIT}`,
        o.id, now,
      )
    return this.s.all<{ post_id: string }>(
      `SELECT o.post_id FROM offerings o JOIN posts p ON p.id=o.post_id JOIN communities c ON c.id=p.community_id
       JOIN spaces s ON s.community_id=c.id AND s.group_id=? JOIN group_members m ON m.group_id=s.group_id AND m.actor_id=p.author_id AND m.active=1
       WHERE ${visible} ORDER BY o.created DESC,o.post_id DESC LIMIT ${LIMIT}`,
      o.id, now,
    )
  }
  /**
   * A Kios as a reader sees it. A closed Kios is null for everyone except whoever may open it, who gets its
   * settings. Offers are read as an anonymous reader, so a member's private rooms never shape a public Kios.
   */
  view(o: KiosOwner, viewer?: string) {
    if (o.kind === 'group') {
      const g = this.groups.group(o.id)
      if (g.visibility !== 'public' && !this.groups.role(viewer, o.id)) throw new Fault(404, 'Not found')
    } else this.s.actor(o.id)
    const r = this.row(o),
      mine = this.canManage(viewer, o),
      open = !!r?.open && (o.kind === 'actor' || this.groups.group(o.id).visibility === 'public')
    if (!open && !mine) return null
    const offerings = new Offerings(this.s)
    return {
      owner: { kind: o.kind, id: o.id, title: this.title(o) },
      open,
      whatsapp: open || mine ? r?.whatsapp ?? '' : '',
      rulesAccepted: (r?.rules ?? '') === rulesVersion(),
      canManage: mine,
      rules: kiosRules(),
      items: open ? this.ids(o).map((x) => offerings.read(x.post_id)) : [],
    }
  }
  /**
   * Open Kios offers placed in this place or anywhere below it, for "Kios di …" on a place entry. Each offer names
   * its seller: the lembaga when it was posted in a community of a lembaga with an open Kios, else the person.
   */
  place(contextId: string) {
    const now = this.s.clock()
    const rows = this.s.all<{ post_id: string; author_id: string; group_id: string | null; group_title: string | null }>(
      `WITH RECURSIVE down(id,depth) AS (SELECT ?,0 UNION SELECT l.context_id,down.depth+1 FROM context_parents l JOIN down ON l.parent_id=down.id WHERE down.depth<8)
       SELECT o.post_id,p.author_id,g.id group_id,g.title group_title FROM offerings o JOIN posts p ON p.id=o.post_id JOIN communities c ON c.id=p.community_id
       LEFT JOIN spaces s ON s.community_id=c.id
       LEFT JOIN groups g ON g.id=s.group_id AND g.visibility='public'
         AND EXISTS(SELECT 1 FROM kios k WHERE k.owner_kind='group' AND k.owner_id=g.id AND k.open=1)
         AND EXISTS(SELECT 1 FROM group_members m WHERE m.group_id=g.id AND m.actor_id=p.author_id AND m.active=1)
       WHERE o.place_context_id IN (SELECT id FROM down) AND ${visible}
         AND (g.id IS NOT NULL OR EXISTS(SELECT 1 FROM kios k WHERE k.owner_kind='actor' AND k.owner_id=p.author_id AND k.open=1))
       ORDER BY o.created DESC,o.post_id DESC LIMIT ${LIMIT}`,
      contextId, now,
    )
    const offerings = new Offerings(this.s)
    return rows.map((r) => {
      const post = offerings.read(r.post_id)
      return {
        post,
        seller: r.group_id ? { kind: 'group' as const, id: r.group_id, title: r.group_title!, href: '/groups/' + r.group_id } : { kind: 'actor' as const, id: r.author_id, title: this.s.actor(r.author_id).name, href: '/people/' + r.author_id },
      }
    })
  }
}
