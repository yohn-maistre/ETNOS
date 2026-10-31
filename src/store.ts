import { DatabaseSync } from 'node:sqlite'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { schema } from './schema.ts'
import { validateRecord, canonical, COLLECTION, type PublicRecord, type Publisher } from './transport.ts'

export class Fault extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status=status }
}
export type Actor = { id: string; did: string; name: string; kind: 'human' | 'agent'; operator_id: string | null }
export type Community = { id: string; title: string; description: string; visibility: 'public' | 'listed-private' | 'hidden-private'; automation: number }
type Membership = { role: 'owner' | 'moderator' | 'member'; active: number }
type Source = { id: string; owner_id: string; bytes: Uint8Array; revision: number; withdrawn: number; digest: string }
type Release = { id: string; source_id: string; source_revision: number; community_id: string; publisher_id: string; text: string; digest: string; approved: number; revoked: number; post_id: string | null }
type Mandate = { id: string; agent_id: string; community_id: string; expires: number; revoked: number; hourly_limit: number }
export type Post = { id: string; author_id: string; community_id: string; parent_id: string | null; text: string; created: number; hidden: number; mandate_id: string | null; release_id: string | null; uri: string | null }
type Job = { id: string; post_id: string; operation: 'put' | 'delete'; state: string; repo: string; rkey: string; record: string; cid: string | null }
const digest = (input: string | Uint8Array) => createHash('sha256').update(input).digest('hex')
const id = () => randomUUID()
const input = (s: string, max = 6000) => {
  if (typeof s !== 'string' || !s.trim() || s.length > max) throw new Fault(400, 'Invalid input')
  return s.trim()
}
const missing = () => { throw new Fault(404, 'Not found') }

export class Strata {
  db: DatabaseSync
  base: string
  clock: () => number
  constructor(path = ':memory:', base = 'http://127.0.0.1:7342', clock = () => Date.now()) {
    this.clock=clock
    const url = new URL(base)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Expected an origin URL')
    this.base = url.origin
    this.db = new DatabaseSync(path)
    const version = this.get<{ user_version: number }>('PRAGMA user_version')!.user_version
    if (version > 1) throw new Error('Database schema is newer than this host')
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;')
    this.db.exec('BEGIN IMMEDIATE;')
    try { this.db.exec(schema); this.db.exec('COMMIT;') } catch (e) { this.db.exec('ROLLBACK;'); throw e }
  }
  close() { this.db.close() }
  get<T>(sql: string, ...args: (string | number | null | Uint8Array)[]) { return this.db.prepare(sql).get(...args) as T | undefined }
  all<T>(sql: string, ...args: (string | number | null)[]) { return this.db.prepare(sql).all(...args) as T[] }
  run(sql: string, ...args: (string | number | null | Uint8Array)[]) { return this.db.prepare(sql).run(...args) }
  tx<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try { const result = fn(); this.db.exec('COMMIT'); return result } catch (e) { this.db.exec('ROLLBACK'); throw e }
  }
  audit(actor: string, action: string, target: string) { this.run('INSERT INTO audit(actor_id,action,target,created) VALUES(?,?,?,?)', actor, action, target, this.clock()) }
  // Trusted local provisioning only. A supplied DID is NOT AT identity verification.
  provision(did: string, name: string, operator?: string) {
    if (!/^did:(web:[A-Za-z0-9._%:-]+|plc:[a-z2-7]{24})$/.test(did)) throw new Fault(400, 'Invalid DID')
    return this.tx(() => {
      if (operator && this.actor(operator).kind !== 'human') throw new Fault(403, 'Human operator required')
      const actorId = id()
      this.run('INSERT INTO actors VALUES(?,?,?,?,?)', actorId, did, input(name, 100), operator ? 'agent' : 'human', operator ?? null)
      const token = randomBytes(32).toString('base64url')
      this.run('INSERT INTO credentials(hash,actor_id) VALUES(?,?)', digest(token), actorId)
      return { actor: this.actor(actorId), token }
    })
  }
  authenticate(token: string) {
    if (!token) throw new Fault(401, 'Authentication required')
    const found = this.get<{ actor_id: string }>('SELECT actor_id FROM credentials WHERE hash=? AND revoked=0', digest(token))
    if (!found) throw new Fault(401, 'Authentication required')
    return this.actor(found.actor_id)
  }
  actor(actorId: string) { return this.get<Actor>('SELECT * FROM actors WHERE id=?', actorId) ?? missing() }
  community(communityId: string) { return this.get<Community>('SELECT * FROM communities WHERE id=?', communityId) ?? missing() }
  membership(actorId: string | undefined, communityId: string) {
    return actorId ? this.get<Membership>('SELECT role,active FROM memberships WHERE actor_id=? AND community_id=? AND active=1', actorId, communityId) : undefined
  }
  requireMember(actorId: string, communityId: string) {
    this.actor(actorId)
    return this.membership(actorId, communityId) ?? missing()
  }
  requireSteward(actorId: string, communityId: string) {
    const member = this.requireMember(actorId, communityId)
    if (this.actor(actorId).kind !== 'human' || !['owner','moderator'].includes(member.role)) throw new Fault(403, 'Community steward required')
    return member
  }
  canRead(actorId: string | undefined, community: Community) { return community.visibility === 'public' || !!this.membership(actorId, community.id) }
  createCommunity(actorId: string, title: string, description: string, visibility: Community['visibility'], automation = false) {
    if (this.actor(actorId).kind !== 'human') throw new Fault(403, 'Human owner required')
    if (!['public','listed-private','hidden-private'].includes(visibility)) throw new Fault(400, 'Invalid visibility')
    return this.tx(() => {
      const cid = id()
      this.run('INSERT INTO communities VALUES(?,?,?,?,?)', cid, input(title, 100), input(description, 2000), visibility, Number(automation))
      this.run('INSERT INTO memberships VALUES(?,?,?,1)', cid, actorId, 'owner')
      this.audit(actorId, 'community.create', cid)
      return this.community(cid)
    })
  }
  listCommunities(actorId?: string) {
    return this.all<Community>(`SELECT c.* FROM communities c WHERE visibility!='hidden-private'
      OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1)`, actorId ?? null)
  }
  setMember(actorId: string, communityId: string, target: string, active: boolean, role: Membership['role'] = 'member') {
    return this.tx(() => {
      const caller = this.requireSteward(actorId, communityId)
      this.actor(target)
      if (!['moderator','member'].includes(role)) throw new Fault(400, 'Owner transfer is not implemented')
      const prior = this.membership(target, communityId)
      if (prior?.role === 'owner' || (caller.role !== 'owner' && (role === 'moderator' || prior?.role === 'moderator'))) throw new Fault(403, 'Owner required')
      if (role === 'moderator' && this.actor(target).kind !== 'human') throw new Fault(403, 'Human moderation required')
      this.run('INSERT INTO memberships VALUES(?,?,?,?) ON CONFLICT(community_id,actor_id) DO UPDATE SET role=excluded.role,active=excluded.active', communityId, target, role, Number(active))
      this.audit(actorId, active ? 'membership.admit' : 'membership.revoke', communityId)
    })
  }
  join(actorId: string, communityId: string) {
    return this.tx(() => {
      this.actor(actorId)
      if (this.community(communityId).visibility !== 'public') missing()
      // Revoked membership cannot be bypassed with a self-join.
      if (this.get('SELECT 1 FROM memberships WHERE actor_id=? AND community_id=?', actorId, communityId)) throw new Fault(409, 'Membership already exists; contact a steward')
      this.run("INSERT INTO memberships VALUES(?,?,'member',1)", communityId, actorId)
    })
  }
  mandate(operator: string, agent: string, communityId: string, purpose: string, expires: number, hourlyLimit = 5) {
    return this.tx(() => {
      const who = this.actor(agent)
      if (who.kind !== 'agent' || who.operator_id !== operator || this.actor(operator).kind !== 'human') throw new Fault(403, 'Agent operator required')
      this.requireMember(agent, communityId)
      if (!Number.isSafeInteger(expires) || expires <= this.clock() || expires > this.clock()+86400000 || !Number.isInteger(hourlyLimit) || hourlyLimit < 1 || hourlyLimit > 20) throw new Fault(400, 'Invalid mandate bounds')
      const mid = id()
      this.run('INSERT INTO mandates VALUES(?,?,?,?,?,0,?)', mid, agent, communityId, input(purpose, 500), expires, hourlyLimit)
      this.audit(operator, 'mandate.issue', mid)
      return mid
    })
  }
  revokeMandate(operator: string, mandateId: string) {
    this.tx(() => {
      const m = this.get<Mandate>('SELECT * FROM mandates WHERE id=?', mandateId) ?? missing()
      if (this.actor(m.agent_id).operator_id !== operator) throw new Fault(403, 'Agent operator required')
      this.run('UPDATE mandates SET revoked=1 WHERE id=?', mandateId)
      this.audit(operator, 'mandate.revoke', mandateId)
    })
  }
  checkWrite(actorId: string, communityId: string, mandateId?: string | null, newPost = true) {
    this.requireMember(actorId, communityId)
    const actor = this.actor(actorId)
    if (actor.kind === 'agent') {
      const c = this.community(communityId)
      const m = this.get<Mandate>('SELECT * FROM mandates WHERE id=?', mandateId ?? '')
      if (!c.automation || !m || m.agent_id !== actorId || m.community_id !== communityId || m.revoked || m.expires <= this.clock()) throw new Fault(403, 'Current agent mandate required')
      const count = this.get<{ n: number }>('SELECT COUNT(*) n FROM posts WHERE author_id=? AND community_id=? AND created>?', actorId, communityId, this.clock()-3600000)!.n
      if (newPost && count >= m.hourly_limit) throw new Fault(429, 'Agent budget exceeded')
    }
  }
  createPost(actorId: string, communityId: string, text: string, parentId?: string, mandateId?: string) {
    return this.tx(() => this.view(this.insertPost(actorId, communityId, text, parentId, mandateId)))
  }
  private insertPost(actorId: string, communityId: string, text: string, parentId?: string, mandateId?: string, releaseId?: string) {
    this.checkWrite(actorId, communityId, mandateId)
    const c = this.community(communityId)
    const parent = parentId ? this.get<Post>('SELECT * FROM posts WHERE id=? AND hidden=0', parentId) : undefined
    if (parentId && (!parent || parent.community_id !== communityId)) missing()
    const pid = id(), actor = this.actor(actorId), created = this.clock()
    const uri = c.visibility === 'public' ? `at://${actor.did}/${COLLECTION}/${pid}` : null
    this.run('INSERT INTO posts VALUES(?,?,?,?,?,?,0,?,?,?)', pid, actorId, communityId, parentId ?? null, input(text), created, mandateId ?? null, releaseId ?? null, uri)
    if (uri) {
      const record: PublicRecord = { $type: COLLECTION, text: text.trim(), community: `${this.base}/v1/communities/${communityId}`, createdAt: new Date(created).toISOString(), actorKind:actor.kind, ...(parent?.uri ? { replyTo: parent.uri } : {}) }
      validateRecord(record)
      this.run("INSERT INTO outbox(id,post_id,operation,state,repo,rkey,record) VALUES(?,?,'put','pending',?,?,?)", id(), pid, actor.did, pid, JSON.stringify(record))
    }
    this.audit(actorId, 'post.create', pid)
    return this.get<Post>('SELECT * FROM posts WHERE id=?', pid)!
  }
  private view(p: Post) {
    // No release/source/mandate foreign keys in either public or private feed views.
    const { id,author_id,community_id,parent_id,text,created,uri } = p
    return { id,author_id,community_id,parent_id,text,created,uri, actorKind:this.actor(author_id).kind,
      publicationState:uri ? this.get<{state:string}>("SELECT state FROM outbox WHERE post_id=? AND operation='put'",id)!.state : 'private' }
  }
  getPost(actorId: string | undefined, postId: string) {
    const p = this.get<Post>('SELECT * FROM posts WHERE id=? AND hidden=0', postId) ?? missing()
    if (!this.canRead(actorId, this.community(p.community_id))) missing()
    return this.view(p)
  }
  feed(actorId?: string, query = '') {
    return this.all<Post>(`SELECT p.* FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.hidden=0
      AND (c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1))
      AND instr(lower(p.text),lower(?))>0 ORDER BY p.created DESC,p.id LIMIT 100`, actorId ?? null, query.slice(0,200)).map(p=>this.view(p))
  }
  source(actorId: string, sourceId: string) {
    const s = this.get<Source>('SELECT * FROM sources WHERE id=? AND owner_id=? AND withdrawn=0', sourceId, actorId) ?? missing()
    return s
  }
  createSource(actorId: string, bytes: Uint8Array) {
    if (this.actor(actorId).kind !== 'human') throw new Fault(403, 'Custodian required')
    if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 1048576) throw new Fault(400, 'Source size out of bounds')
    const sid = id()
    this.tx(() => {
      this.run('INSERT INTO sources(id,owner_id,bytes,digest) VALUES(?,?,?,?)', sid, actorId, bytes, digest(bytes))
      this.audit(actorId, 'source.ingest', sid)
    })
    return sid
  }
  draftRelease(actorId: string, sourceId: string, communityId: string, publisher: string, text: string) {
    return this.tx(() => {
      const s = this.source(actorId, sourceId), c = this.community(communityId)
      if (c.visibility !== 'public') throw new Fault(400, 'Release destination must be public')
      this.requireMember(publisher, communityId)
      const rid = id(), body = input(text)
      this.run('INSERT INTO releases(id,source_id,source_revision,community_id,publisher_id,text,digest) VALUES(?,?,?,?,?,?,?)', rid, sourceId, s.revision, communityId, publisher, body, digest(body))
      this.audit(actorId, 'release.draft', rid)
      return rid
    })
  }
  approveRelease(actorId: string, releaseId: string, expectedDigest: string) {
    this.tx(() => {
      const r = this.get<Release>('SELECT * FROM releases WHERE id=?', releaseId) ?? missing()
      const s = this.source(actorId, r.source_id)
      if (this.actor(actorId).kind !== 'human' || r.revoked || s.revision !== r.source_revision || r.digest !== expectedDigest) throw new Fault(409, 'Review no longer matches')
      this.run('UPDATE releases SET approved=1 WHERE id=?', releaseId)
      this.audit(actorId, 'release.approve', releaseId)
    })
  }
  release(actorId: string, releaseId: string) {
    const r = this.get<Release>('SELECT * FROM releases WHERE id=?', releaseId) ?? missing()
    this.source(actorId, r.source_id)
    return r
  }
  private checkRelease(releaseId: string) {
    const r = this.get<Release>('SELECT * FROM releases WHERE id=?', releaseId) ?? missing()
    const s = this.get<Source>('SELECT * FROM sources WHERE id=?', r.source_id)
    if (!s || s.withdrawn || r.revoked || !r.approved || s.revision !== r.source_revision || digest(r.text) !== r.digest) throw new Fault(409, 'Release is no longer authorized')
    return r
  }
  publishRelease(actorId: string, releaseId: string, mandateId?: string) {
    return this.tx(() => {
      const r = this.checkRelease(releaseId)
      if (r.publisher_id !== actorId) throw new Fault(403, 'Designated publisher required')
      this.checkWrite(actorId, r.community_id, mandateId, false)
      if (r.post_id) return this.view(this.get<Post>('SELECT * FROM posts WHERE id=?', r.post_id)!)
      const p = this.insertPost(actorId, r.community_id, r.text, undefined, mandateId, releaseId)
      this.run('UPDATE releases SET post_id=? WHERE id=?', p.id, releaseId)
      return this.view(p)
    })
  }
  private queueDelete(postId: string) {
    const put = this.get<Job>("SELECT * FROM outbox WHERE post_id=? AND operation='put'", postId)
    if (!put) return
    if (put.state === 'pending') this.run("UPDATE outbox SET state='cancelled' WHERE id=?", put.id)
    else if (['sending','uncertain','delivered'].includes(put.state)) {
      this.run("INSERT OR IGNORE INTO outbox(id,post_id,operation,state,repo,rkey,record) VALUES(?,?,'delete','pending',?,?,?)", id(), postId, put.repo, put.rkey, put.record)
    }
  }
  withdrawSource(actorId: string, sourceId: string) {
    this.tx(() => {
      this.source(actorId, sourceId)
      this.run('UPDATE sources SET withdrawn=1,revision=revision+1 WHERE id=?', sourceId)
      this.run('UPDATE releases SET revoked=1 WHERE source_id=?', sourceId)
      for (const r of this.all<Release>('SELECT * FROM releases WHERE source_id=?', sourceId)) if (r.post_id) {
        this.run('UPDATE posts SET hidden=1 WHERE id=?', r.post_id)
        this.queueDelete(r.post_id)
      }
      this.audit(actorId, 'source.withdraw', sourceId)
    })
  }
  hidePost(actorId: string, postId: string) {
    this.tx(() => {
      const p = this.get<Post>('SELECT * FROM posts WHERE id=?', postId) ?? missing()
      this.requireSteward(actorId, p.community_id)
      this.run('UPDATE posts SET hidden=1 WHERE id=?', postId)
      // Moderation suppresses this application's view; it cannot delete another
      // actor's AT repository. A not-yet-sent intent can still be cancelled.
      this.run("UPDATE outbox SET state='cancelled' WHERE post_id=? AND operation='put' AND state='pending'",postId)
      this.audit(actorId, 'post.hide', postId)
    })
  }
  jobs(actorId: string) {
    return this.all<Job>('SELECT o.* FROM outbox o JOIN posts p ON p.id=o.post_id WHERE p.author_id=? ORDER BY o.rowid', actorId)
  }
  private eligible(job: Job) {
    const p = this.get<Post>('SELECT * FROM posts WHERE id=?', job.post_id) ?? missing()
    if (p.hidden || this.community(p.community_id).visibility !== 'public') throw new Fault(409, 'Post unavailable')
    this.checkWrite(p.author_id, p.community_id, p.mandate_id, false)
    if (p.release_id) this.checkRelease(p.release_id)
    if (p.parent_id) {
      if (this.get<Post>('SELECT * FROM posts WHERE id=?', p.parent_id)?.hidden) throw new Fault(409, 'Parent unavailable')
      if (this.get<Job>("SELECT * FROM outbox WHERE post_id=? AND operation='put'", p.parent_id)?.state !== 'delivered') throw new Fault(409, 'Parent publication must settle first')
    }
  }
  private settlePut(job: Job) {
    const p=this.get<Post>('SELECT * FROM posts WHERE id=?',job.post_id)!
    // Only a custodial release's withdrawal contract schedules retraction.
    // Membership/mandate changes or community moderation do not confer PDS
    // deletion authority over already-published ordinary contributions.
    if (p.release_id) {
      try { this.checkRelease(p.release_id) }
      catch { this.run('UPDATE posts SET hidden=1 WHERE id=?',p.id);this.queueDelete(p.id) }
    }
  }
  recoverInterrupted() {
    // Startup never automatically repeats an outward action.
    this.run("UPDATE outbox SET state='uncertain',error='Host interrupted; reconcile before retry' WHERE state='sending'")
  }
  async deliver(actorId: string, jobId: string, publisher: Publisher) {
    const job = this.tx(() => {
      const j = this.get<Job>('SELECT * FROM outbox WHERE id=?', jobId) ?? missing()
      const p = this.get<Post>('SELECT * FROM posts WHERE id=?', j.post_id)!
      if (p.author_id !== actorId || publisher.did !== j.repo) throw new Fault(403, 'Publisher identity mismatch')
      if (j.state !== 'pending') throw new Fault(409, 'Job requires reconciliation or is settled')
      if (j.operation === 'put') this.eligible(j)
      else if (['sending','uncertain'].includes(this.get<Job>("SELECT * FROM outbox WHERE post_id=? AND operation='put'", j.post_id)!.state)) throw new Fault(409, 'Reconcile original publication before deletion')
      this.run("UPDATE outbox SET state='sending',attempts=attempts+1,error=NULL WHERE id=?", jobId)
      return j
    })
    try {
      if (job.operation === 'delete') {
        const remote = await publisher.read(job.rkey)
        if (remote && digest(canonical(remote.record)) !== digest(canonical(JSON.parse(job.record)))) throw new Error('Remote record changed; manual review required')
        if (remote) await publisher.remove(job.rkey, remote.cid)
        this.run("UPDATE outbox SET state='delivered' WHERE id=?", jobId)
      } else {
        const result = await publisher.put(job.rkey, JSON.parse(job.record))
        this.tx(() => {
          this.run("UPDATE outbox SET state='delivered',cid=? WHERE id=?", result.cid, jobId)
          this.settlePut(job)
        })
      }
    } catch {
      this.run("UPDATE outbox SET state='uncertain',error='Remote outcome unknown; reconciliation required' WHERE id=?", jobId)
    }
    return this.get<Job>('SELECT * FROM outbox WHERE id=?', jobId)!
  }
  async reconcile(actorId: string, jobId: string, publisher: Publisher) {
    const job = this.get<Job>('SELECT * FROM outbox WHERE id=?', jobId) ?? missing()
    const p = this.get<Post>('SELECT * FROM posts WHERE id=?', job.post_id)!
    if (actorId !== p.author_id || publisher.did !== job.repo) throw new Fault(403, 'Publisher identity mismatch')
    if (job.state !== 'uncertain') throw new Fault(409, 'Only uncertain outcomes can be reconciled')
    const remote = await publisher.read(job.rkey) // Network failure is NOT evidence of absence.
    return this.tx(() => {
      // Another worker/operator may have reconciled while the read was in flight.
      if (this.get<Job>('SELECT * FROM outbox WHERE id=?', jobId)!.state !== 'uncertain') throw new Fault(409, 'State changed')
      if (job.operation === 'delete') {
        if (!remote) this.run("UPDATE outbox SET state='delivered',error=NULL WHERE id=?", jobId)
        else if (digest(canonical(remote.record)) === digest(canonical(JSON.parse(job.record)))) this.run("UPDATE outbox SET state='pending' WHERE id=?", jobId)
      } else if (remote) {
        if (digest(canonical(remote.record)) !== digest(canonical(JSON.parse(job.record)))) throw new Fault(409, 'Remote record differs; manual review required')
        this.run("UPDATE outbox SET state='delivered',cid=?,error=NULL WHERE id=?", remote.cid, jobId)
        this.settlePut(job)
      } else {
        try { this.eligible(job); this.run("UPDATE outbox SET state='pending',error=NULL WHERE id=?", jobId) }
        catch { this.run("UPDATE outbox SET error='Absence observed; a late delivery is still possible' WHERE id=?", jobId) }
      }
      return this.get<Job>('SELECT * FROM outbox WHERE id=?', jobId)!
    })
  }
}
