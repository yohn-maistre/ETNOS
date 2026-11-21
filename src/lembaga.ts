/**
 * Lembaga (docs/plan/one-page-system-2026-11-21.md §5): a group of kind `institution` or `collective`, with its own
 * part of its page ("Dari lembaga ini"), its jenis, and at most one claimed encyclopedia entry.
 *
 * Two voices on one page. What the lembaga says about itself (about, contacts, website, logo, sourced recognition)
 * is edited by its stewards. The entry it claims ("Di ensiklopedia") is edited only through the normal review; a
 * claim only links the two, after the node operator approves it. An entry is claimed by at most one lembaga, and a
 * lembaga claims at most one entry; both are enforced by unique indexes on approved claims.
 *
 * A lembaga with no entry yet asks for an unclaimed listing (strata-model step 4): a minimal entry of kind lembaga
 * with a title, a description, its jenis and its place, created by the operator's approval and then claimed by it.
 * Listings are read by the entry adapter beside the knowledge model; they never write `km_entities`.
 */
import { randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { Fault, type StrataCore } from './core.ts'
import { text, type Groups } from './groups.ts'
import { inspectWebP } from './media.ts'

export type Contact = { label: string; value: string }
export type Recognition = { by: string; source: string }
type Profile = { group_id: string; about: string; contacts: string; website: string; recognition: string; hide_count: number; logo: Uint8Array | null; updated: number }
type Claim = { id: string; group_id: string; entry_slug: string | null; proposal: string | null; state: 'pending' | 'approved' | 'declined' | 'withdrawn' | 'released'; requested_by: string; decided_by: string | null; created: number; decided: number | null }
export type Listing = { slug: string; title: string; description: string; jenis_context_id: string | null; place_context_id: string | null; created: number }
export type Proposal = { title: string; description: string; placeId: string | null }
const LOGO_MAX = 128 * 1024
const missing = (): never => {
  throw new Fault(404, 'Not found')
}
const https = (v: string) => {
  let u: URL
  try {
    u = new URL(v)
  } catch {
    throw new Fault(400, 'A complete HTTPS address is required')
  }
  if (u.protocol !== 'https:' || u.username || u.password) throw new Fault(400, 'A complete HTTPS address is required')
  return u.href
}
export const listingSlug = (title: string) =>
  'lembaga-' + title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50).replace(/-$/, '')

export class Lembaga {
  private s: StrataCore
  readonly groups: Groups
  constructor(store: StrataCore, groups: Groups) {
    this.s = store
    this.groups = groups
  }
  private profileRow(groupId: string) {
    return this.s.get<Profile>('SELECT * FROM lembaga_profiles WHERE group_id=?', groupId)
  }
  /** The jenis lembaga: the group's label with facet `institution-kind`, below the root `lembaga`. */
  jenis(groupId: string) {
    return this.s.get<{ id: string; slug: string; title: string }>(
      "SELECT c.id,c.slug,c.title FROM record_contexts l JOIN contexts c ON c.id=l.context_id WHERE l.record_kind='group' AND l.record_id=? AND c.facet='institution-kind' AND c.active=1 AND c.slug<>'lembaga' ORDER BY l.created LIMIT 1",
      groupId,
    ) ?? null
  }
  /** Stewards set the jenis; it replaces the earlier one. Null clears it. */
  setJenis(actorId: string, groupId: string, contextId: string | null) {
    return this.s.tx(() => {
      this.groups.requireSteward(actorId, groupId)
      if (this.groups.group(groupId).visibility !== 'public') throw new Fault(400, 'Public group profile required')
      const next = contextId === null ? null : this.groups.context(contextId)
      if (next && (next.facet !== 'institution-kind' || next.slug === 'lembaga')) throw new Fault(400, 'Choose a jenis lembaga')
      this.s.run("DELETE FROM record_contexts WHERE record_kind='group' AND record_id=? AND context_id IN (SELECT id FROM contexts WHERE facet='institution-kind')", groupId)
      if (next) this.s.run("INSERT INTO record_contexts VALUES('group',?,?,?,?)", groupId, next.id, actorId, this.s.clock())
      this.s.audit(actorId, 'lembaga.jenis', groupId)
      return this.jenis(groupId)
    })
  }
  /** "Dari lembaga ini": the lembaga's own words. Public for a public lembaga, members only otherwise. */
  profile(groupId: string) {
    const p = this.profileRow(groupId)
    return {
      about: p?.about ?? '',
      contacts: JSON.parse(p?.contacts ?? '[]') as Contact[],
      website: p?.website ?? '',
      recognition: JSON.parse(p?.recognition ?? '[]') as Recognition[],
      hideCount: !!p?.hide_count,
      logo: p?.logo ? '/v1/groups/' + groupId + '/logo?v=' + p.updated : null,
    }
  }
  /** Stewards edit their own part. Recognition by a customary body is only ever a claim with its source. */
  setProfile(actorId: string, groupId: string, b: Record<string, unknown>) {
    if (Object.keys(b).some((k) => !['about', 'contacts', 'website', 'recognition', 'hideCount'].includes(k))) throw new Fault(400, 'Unknown lembaga field')
    return this.s.tx(() => {
      this.groups.requireSteward(actorId, groupId)
      const now = this.profile(groupId)
      const about = b.about === undefined ? now.about : typeof b.about === 'string' && b.about.length <= 4000 ? b.about.trim() : (() => { throw new Fault(400, 'Invalid about text') })()
      const contacts = b.contacts === undefined ? now.contacts : this.contacts(b.contacts)
      const website = b.website === undefined ? now.website : b.website === '' ? '' : https(text(String(b.website), 2048))
      const recognition = b.recognition === undefined ? now.recognition : this.recognition(b.recognition)
      if (b.hideCount !== undefined && typeof b.hideCount !== 'boolean') throw new Fault(400, 'Boolean required')
      const hide = b.hideCount === undefined ? now.hideCount : b.hideCount
      this.s.run(
        'INSERT INTO lembaga_profiles(group_id,about,contacts,website,recognition,hide_count,updated,updated_by) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(group_id) DO UPDATE SET about=excluded.about,contacts=excluded.contacts,website=excluded.website,recognition=excluded.recognition,hide_count=excluded.hide_count,updated=excluded.updated,updated_by=excluded.updated_by',
        groupId, about, JSON.stringify(contacts), website, JSON.stringify(recognition), Number(hide), this.s.clock(), actorId,
      )
      this.s.audit(actorId, 'lembaga.profile', groupId)
      return this.profile(groupId)
    })
  }
  private contacts(v: unknown): Contact[] {
    if (!Array.isArray(v) || v.length > 6) throw new Fault(400, 'At most 6 contacts')
    return v.map((c) => {
      if (!c || typeof c !== 'object') throw new Fault(400, 'Invalid contact')
      const { label, value } = c as Record<string, unknown>
      return { label: text(String(label ?? ''), 40), value: text(String(value ?? ''), 200) }
    })
  }
  private recognition(v: unknown): Recognition[] {
    if (!Array.isArray(v) || v.length > 5) throw new Fault(400, 'At most 5 recognitions')
    return v.map((c) => {
      if (!c || typeof c !== 'object') throw new Fault(400, 'Invalid recognition')
      const { by, source } = c as Record<string, unknown>
      // A recognition without a source is not stored: it would read as a badge the site grants.
      return { by: text(String(by ?? ''), 120), source: https(text(String(source ?? ''), 2048)) }
    })
  }
  /** A small static WebP logo, base64. Empty removes it. */
  setLogo(actorId: string, groupId: string, encoded: unknown) {
    return this.s.tx(() => {
      this.groups.requireSteward(actorId, groupId)
      if (typeof encoded !== 'string') throw new Fault(400, 'Invalid image encoding')
      let bytes: Buffer | null = null
      if (encoded) {
        if (encoded.length > Math.ceil(LOGO_MAX / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Fault(400, 'Invalid image encoding')
        const raw = Buffer.from(encoded, 'base64')
        if (raw.length > LOGO_MAX) throw new Fault(413, 'Logo too large')
        inspectWebP(raw)
        bytes = raw
      }
      this.s.run(
        "INSERT INTO lembaga_profiles(group_id,logo,updated,updated_by) VALUES(?,?,?,?) ON CONFLICT(group_id) DO UPDATE SET logo=excluded.logo,updated=excluded.updated,updated_by=excluded.updated_by",
        groupId, bytes, this.s.clock(), actorId,
      )
      this.s.audit(actorId, 'lembaga.logo', groupId)
      return this.profile(groupId)
    })
  }
  logo(actorId: string | undefined, groupId: string) {
    const g = this.groups.group(groupId)
    if (g.visibility !== 'public' && !this.groups.role(actorId, groupId)) missing()
    const p = this.profileRow(groupId)
    if (!p?.logo) missing()
    return new Response(new Uint8Array(p!.logo!), { headers: { 'content-type': 'image/webp', 'cache-control': g.visibility === 'public' ? 'public, max-age=86400' : 'private, no-store', 'x-content-type-options': 'nosniff' } })
  }

  // Claims

  /** The entry a lembaga has claimed, if any. */
  claimedEntry(groupId: string) {
    return this.s.get<{ entry_slug: string }>("SELECT entry_slug FROM entry_claims WHERE group_id=? AND state='approved'", groupId)?.entry_slug ?? null
  }
  /** The public lembaga that manages one of these entry addresses, for "Dikelola oleh" in the rail. */
  managedBy(slugs: string[]) {
    if (!slugs.length) return null
    return this.s.get<{ id: string; title: string }>(
      "SELECT g.id,g.title FROM entry_claims e JOIN groups g ON g.id=e.group_id WHERE e.state='approved' AND g.visibility='public' AND e.entry_slug IN (SELECT value FROM json_each(?)) LIMIT 1",
      JSON.stringify(slugs),
    ) ?? null
  }
  private view(c: Claim) {
    const g = this.groups.group(c.group_id)
    return { id: c.id, group: { id: g.id, title: g.title }, entry: c.entry_slug, proposal: c.proposal ? (JSON.parse(c.proposal) as Proposal) : null, state: c.state, created: c.created, decided: c.decided }
  }
  private claim(id: string) {
    return this.s.get<Claim>('SELECT * FROM entry_claims WHERE id=?', id) ?? missing()
  }
  /**
   * A steward asks to link the lembaga to an entry. `entry` is an existing entry's address with its kind, as the
   * entry adapter resolved it; `listing` asks for a new unclaimed listing instead. One request waits at a time.
   */
  request(actorId: string, groupId: string, b: { entry?: { slug: string; kind: string }; listing?: Record<string, unknown> }) {
    return this.s.tx(() => {
      this.groups.requireSteward(actorId, groupId)
      if (this.groups.group(groupId).visibility !== 'public') throw new Fault(400, 'Only a public lembaga can claim an entry')
      if (this.claimedEntry(groupId)) throw new Fault(409, 'This lembaga already manages an entry')
      if (this.s.get("SELECT 1 FROM entry_claims WHERE group_id=? AND state='pending'", groupId)) throw new Fault(409, 'A request is already waiting')
      let slug: string | null = null,
        proposal: Proposal | null = null
      if (b.entry) {
        if (b.entry.kind !== 'lembaga') throw new Fault(400, 'Only an entry of kind lembaga can be claimed')
        slug = b.entry.slug
        if (this.s.get("SELECT 1 FROM entry_claims WHERE entry_slug=? AND state='approved'", slug)) throw new Fault(409, 'This entry is already managed by a lembaga')
      } else if (b.listing) {
        const l = b.listing,
          placeId = l.placeId === undefined || l.placeId === null || l.placeId === '' ? null : String(l.placeId)
        if (placeId && !this.s.get("SELECT 1 FROM contexts WHERE id=? AND active=1 AND kind IN ('place','region')", placeId)) throw new Fault(400, 'Choose a current public place or region')
        proposal = { title: text(String(l.title ?? ''), 100), description: text(String(l.description ?? ''), 600), placeId }
        if (!listingSlug(proposal.title).slice(8)) throw new Fault(400, 'Invalid title')
      } else throw new Fault(400, 'Choose an entry or describe a new one')
      const id = randomUUID()
      this.s.run("INSERT INTO entry_claims(id,group_id,entry_slug,proposal,state,requested_by,created) VALUES(?,?,?,?,'pending',?,?)", id, groupId, slug, proposal && JSON.stringify(proposal), actorId, this.s.clock())
      this.s.audit(actorId, 'lembaga.claim.request', groupId)
      return this.view(this.claim(id))
    })
  }
  /** The latest claims of a lembaga, for its stewards. */
  claims(actorId: string, groupId: string) {
    this.groups.requireSteward(actorId, groupId)
    return this.s.all<Claim>('SELECT * FROM entry_claims WHERE group_id=? ORDER BY created DESC LIMIT 10', groupId).map((c) => this.view(c))
  }
  /** The operator's queue. */
  queue(actorId: string) {
    this.groups.nodeSteward(actorId)
    return this.s.all<Claim>("SELECT * FROM entry_claims WHERE state='pending' ORDER BY created LIMIT 100").map((c) => this.view(c))
  }
  /**
   * The node operator approves or declines. Approval checks again, at decision time, that the lembaga is public
   * and its requester still a steward, and that nobody else holds the entry. A listing gets an address that no
   * context, model thing or other listing holds (`taken` checks the entry catalogue).
   */
  decide(actorId: string, claimId: string, approve: boolean, taken: (slug: string) => boolean = () => false) {
    return this.s.tx(() => {
      this.groups.nodeSteward(actorId)
      const c = this.claim(claimId)
      if (c.state !== 'pending') throw new Fault(409, 'This request is already decided')
      const now = this.s.clock()
      if (!approve) {
        this.s.run("UPDATE entry_claims SET state='declined',decided_by=?,decided=? WHERE id=?", actorId, now, c.id)
        this.s.audit(actorId, 'lembaga.claim.decline', c.group_id)
        return this.view(this.claim(c.id))
      }
      if (this.groups.group(c.group_id).visibility !== 'public' || !this.groups.allows(c.requested_by, c.group_id, 'manage')) throw new Fault(409, 'The lembaga or its steward has changed')
      let slug = c.entry_slug
      if (!slug) {
        const p = JSON.parse(c.proposal!) as Proposal,
          base = listingSlug(p.title)
        const used = (x: string) => taken(x) || !!this.s.get('SELECT 1 FROM entry_listings WHERE slug=? UNION SELECT 1 FROM contexts WHERE slug=? UNION SELECT 1 FROM km_entities WHERE slug=?', x, x, x)
        slug = base
        for (let i = 2; used(slug); i++) slug = base + '-' + i
        const jenis = this.s.get<{ id: string }>(
          "SELECT c.id FROM record_contexts l JOIN contexts c ON c.id=l.context_id WHERE l.record_kind='group' AND l.record_id=? AND c.facet='institution-kind' AND c.slug<>'lembaga' LIMIT 1",
          c.group_id,
        )
        this.s.run('INSERT INTO entry_listings(slug,title,description,jenis_context_id,place_context_id,created_by,created) VALUES(?,?,?,?,?,?,?)', slug, p.title, p.description, jenis?.id ?? null, p.placeId, actorId, now)
      }
      if (this.s.get("SELECT 1 FROM entry_claims WHERE entry_slug=? AND state='approved'", slug)) throw new Fault(409, 'This entry is already managed by a lembaga')
      if (this.claimedEntry(c.group_id)) throw new Fault(409, 'This lembaga already manages an entry')
      this.s.run("UPDATE entry_claims SET state='approved',entry_slug=?,decided_by=?,decided=? WHERE id=?", slug, actorId, now, c.id)
      this.s.audit(actorId, 'lembaga.claim.approve', c.group_id)
      return this.view(this.claim(c.id))
    })
  }
  /** A steward withdraws a waiting request, or lets go of a claimed entry; the operator may also release one. */
  release(actorId: string, groupId: string) {
    return this.s.tx(() => {
      const operator = (() => {
        try {
          this.groups.nodeSteward(actorId)
          return true
        } catch {
          return false
        }
      })()
      if (!operator) this.groups.requireSteward(actorId, groupId)
      const now = this.s.clock()
      this.s.run("UPDATE entry_claims SET state='withdrawn',decided_by=?,decided=? WHERE group_id=? AND state='pending'", actorId, now, groupId)
      this.s.run("UPDATE entry_claims SET state='released',decided_by=?,decided=? WHERE group_id=? AND state='approved'", actorId, now, groupId)
      this.s.audit(actorId, 'lembaga.claim.release', groupId)
      return { ok: true }
    })
  }
  /** Listings for the entry adapter, with their jenis and place. Listings stay entries even when released. */
  listings() {
    return this.s.all<Listing & { jenis_slug: string | null; jenis_title: string | null; place_slug: string | null }>(
      `SELECT l.*,j.slug jenis_slug,j.title jenis_title,p.slug place_slug FROM entry_listings l
       LEFT JOIN contexts j ON j.id=l.jenis_context_id AND j.active=1 LEFT JOIN contexts p ON p.id=l.place_context_id AND p.active=1 ORDER BY l.slug LIMIT 2000`,
    )
  }
  /** The page of a lembaga: the group as today, plus its own part, its jenis and its claimed entry. */
  page(actorId: string | undefined, groupId: string) {
    const g = this.groups.read(actorId, groupId)
    return { ...g, profile: this.profile(groupId), jenis: this.jenis(groupId), entry: this.claimedEntry(groupId), canManage: !!actorId && this.groups.allows(actorId, groupId, 'manage') }
  }
}
