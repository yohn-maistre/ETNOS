/**
 * AT Protocol Spaces bridge for private ETNOS communities (W3).
 *
 * Implements the community-side control plane for proposal 0016 permissioned
 * spaces on the ETNOS identity host. ETNOS membership remains strictly
 * authoritative: AT records never grant community membership, and removing a
 * member in ETNOS immediately marks their space membership revoked inside the
 * same transaction.
 *
 * Spaces give access control, not end-to-end encryption: the host operator can
 * still read space data.
 */
import { createHash } from 'node:crypto'
import { Fault, type EtnosCore } from './core.ts'

export type AtSpaceState = 'active' | 'paused' | 'revoked'

export type AtSpaceRow = {
  community_id: string
  space_uri: string
  authority_did: string
  host_origin: string
  state: AtSpaceState
  created_by: string
  created: number
  updated: number
}

export type AtSpaceMemberRow = {
  community_id: string
  actor_id: string
  member_did: string
  role: string
  synced: number
  revoked: number | null
}

export type AtSpaceView = {
  enabled: boolean
  state: AtSpaceState | null
  spaceUri: string | null
  authorityDid: string | null
  hostOrigin: string | null
  activeMembers: number
  revokedMembers: number
  updated: number | null
  notice: string
  canManage: boolean
}

const HONEST_NOTICE =
  'Ruang AT mengatur izin akses lintas server (tahap uji coba). Pengelola server masih dapat membaca isi ruang ini; gunakan Pesan langsung untuk percakapan terenkripsi ujung ke ujung.'

function safeHost(raw: unknown, fallback: string): string {
  const value = typeof raw === 'string' && raw.trim() ? raw.trim() : fallback
  try {
    const u = new URL(value)
    if (u.protocol !== 'https:') throw new Error()
    return u.origin
  } catch {
    throw new Fault(400, 'Alamat server akun AT harus berupa HTTPS yang valid')
  }
}

function deterministicSkey(communityId: string): string {
  return 'etnos-' + createHash('sha256').update('space:' + communityId).digest('hex').slice(0, 20)
}

export class AtSpaces {
  private s: EtnosCore
  private defaultHost: string

  constructor(store: EtnosCore, defaultHost = 'https://etnos-identity-host.giyaibo.workers.dev') {
    this.s = store
    this.defaultHost = defaultHost
  }

  private assertPrivate(communityId: string) {
    const c = this.s.community(communityId)
    if (c.visibility === 'public') {
      throw new Fault(409, 'Ruang AT hanya untuk komunitas privat')
    }
    return c
  }

  private assertHumanSteward(actorId: string, communityId: string) {
    this.s.requireSteward(actorId, communityId)
    if (this.s.actor(actorId).kind !== 'human') {
      throw new Fault(403, 'Hanya pengurus manusia yang dapat mengatur Ruang AT')
    }
  }

  /** Returns the AT Space status of a private community. Always 404 to non-members. */
  view(actorId: string | undefined, communityId: string): AtSpaceView {
    const c = this.s.community(communityId)
    if (!this.s.canRead(actorId, c)) throw new Fault(404, 'Not found')
    const member = actorId ? this.s.membership(actorId, communityId) : null
    if (!member) throw new Fault(404, 'Not found')
    const canManage =
      this.s.actor(actorId!).kind === 'human' && (member.role === 'owner' || member.role === 'moderator')
    const row = this.s.get<AtSpaceRow>('SELECT * FROM community_at_spaces WHERE community_id=?', communityId)
    if (!row) {
      return {
        enabled: false,
        state: null,
        spaceUri: null,
        authorityDid: null,
        hostOrigin: this.defaultHost,
        activeMembers: 0,
        revokedMembers: 0,
        updated: null,
        notice: HONEST_NOTICE,
        canManage,
      }
    }
    const counts = this.s.get<{ active: number; revoked: number }>(
      'SELECT COALESCE(SUM(CASE WHEN revoked IS NULL THEN 1 ELSE 0 END),0) active, COALESCE(SUM(CASE WHEN revoked IS NOT NULL THEN 1 ELSE 0 END),0) revoked FROM community_at_space_members WHERE community_id=?',
      communityId,
    )!
    return {
      enabled: row.state === 'active',
      state: row.state,
      spaceUri: row.space_uri,
      authorityDid: row.authority_did,
      hostOrigin: row.host_origin,
      activeMembers: counts.active,
      revokedMembers: counts.revoked,
      updated: row.updated,
      notice: HONEST_NOTICE,
      canManage,
    }
  }

  /** Creates or re-activates an AT Space for a private community and syncs current active human members. */
  enable(actorId: string, communityId: string, input: { hostOrigin?: unknown } = {}): AtSpaceView {
    const hostOrigin = safeHost(input.hostOrigin, this.defaultHost)
    return this.s.tx(() => {
      this.assertHumanSteward(actorId, communityId)
      this.assertPrivate(communityId)
      const steward = this.s.actor(actorId)
      const now = this.s.clock()
      const existing = this.s.get<AtSpaceRow>('SELECT * FROM community_at_spaces WHERE community_id=?', communityId)
      const spaceUri =
        existing?.space_uri ?? `at://${steward.did}/space/com.atproto.memberspace/${deterministicSkey(communityId)}`
      const authorityDid = existing?.authority_did ?? steward.did
      this.s.run(
        `INSERT INTO community_at_spaces(community_id,space_uri,authority_did,host_origin,state,created_by,created,updated)
         VALUES(?,?,?,?,'active',?,?,?)
         ON CONFLICT(community_id) DO UPDATE SET host_origin=excluded.host_origin,state='active',updated=excluded.updated`,
        communityId,
        spaceUri,
        authorityDid,
        hostOrigin,
        actorId,
        now,
        now,
      )
      this.syncMembersTx(communityId, now)
      this.s.audit(actorId, 'at_space.enable', communityId)
      return this.view(actorId, communityId)
    })
  }

  /** Reconciles the AT Space member list against CURRENT active human community memberships. */
  sync(actorId: string, communityId: string): AtSpaceView & { activeDids: string[]; revokedDids: string[] } {
    return this.s.tx(() => {
      this.assertHumanSteward(actorId, communityId)
      this.assertPrivate(communityId)
      const existing = this.s.get<AtSpaceRow>('SELECT * FROM community_at_spaces WHERE community_id=?', communityId)
      if (!existing || existing.state !== 'active') {
        throw new Fault(409, 'Ruang AT belum aktif untuk komunitas ini')
      }
      const now = this.s.clock()
      const diff = this.syncMembersTx(communityId, now)
      this.s.run('UPDATE community_at_spaces SET updated=? WHERE community_id=?', now, communityId)
      this.s.audit(actorId, 'at_space.sync', communityId)
      return { ...this.view(actorId, communityId), ...diff }
    })
  }

  /** Revokes the AT Space link and marks all synced members revoked immediately. */
  revoke(actorId: string, communityId: string): AtSpaceView {
    return this.s.tx(() => {
      this.assertHumanSteward(actorId, communityId)
      const existing = this.s.get<AtSpaceRow>('SELECT * FROM community_at_spaces WHERE community_id=?', communityId)
      if (!existing) throw new Fault(404, 'Ruang AT belum dibuat untuk komunitas ini')
      const now = this.s.clock()
      this.s.run("UPDATE community_at_spaces SET state='revoked',updated=? WHERE community_id=?", now, communityId)
      this.s.run(
        'UPDATE community_at_space_members SET revoked=? WHERE community_id=? AND revoked IS NULL',
        now,
        communityId,
      )
      this.s.audit(actorId, 'at_space.revoke', communityId)
      return this.view(actorId, communityId)
    })
  }

  /** Must be called inside the same transaction whenever a member is removed from a community. */
  revokeMemberTx(communityId: string, actorId: string) {
    const now = this.s.clock()
    this.s.run(
      'UPDATE community_at_space_members SET revoked=? WHERE community_id=? AND actor_id=? AND revoked IS NULL',
      now,
      communityId,
      actorId,
    )
  }

  private syncMembersTx(communityId: string, now: number): { activeDids: string[]; revokedDids: string[] } {
    const current = this.s.all<{ actor_id: string; did: string; role: string }>(
      `SELECT m.actor_id, a.did, m.role
       FROM memberships m
       JOIN actors a ON a.id=m.actor_id
       WHERE m.community_id=? AND m.active=1 AND a.kind='human'`,
      communityId,
    )
    const activeIds = new Set(current.map((c) => c.actor_id))
    for (const m of current) {
      this.s.run(
        `INSERT INTO community_at_space_members(community_id,actor_id,member_did,role,synced,revoked)
         VALUES(?,?,?,?,?,NULL)
         ON CONFLICT(community_id,actor_id) DO UPDATE SET member_did=excluded.member_did,role=excluded.role,synced=excluded.synced,revoked=NULL`,
        communityId,
        m.actor_id,
        m.did,
        m.role,
        now,
      )
    }
    const prior = this.s.all<AtSpaceMemberRow>(
      'SELECT * FROM community_at_space_members WHERE community_id=? AND revoked IS NULL',
      communityId,
    )
    const revokedDids: string[] = []
    for (const row of prior) {
      if (!activeIds.has(row.actor_id)) {
        this.s.run(
          'UPDATE community_at_space_members SET revoked=? WHERE community_id=? AND actor_id=?',
          now,
          communityId,
          row.actor_id,
        )
        revokedDids.push(row.member_did)
      }
    }
    return { activeDids: current.map((c) => c.did), revokedDids }
  }
}
