import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { Media, type MediaView } from './media.ts'
import {contentInput,contentOf} from './post-content.ts'
import { migrate } from './schema.ts'
import type { Database, Binding } from './database.ts'
import { PostContract, canonical, COLLECTION, type PublicRecord, type Publisher } from './transport.ts'

export class Fault extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status=status }
}
export type Actor = { id: string; did: string; name: string; kind: 'human' | 'agent'; operator_id: string | null }
export type Community = { id: string; title: string; description: string; visibility: 'public' | 'listed-private' | 'hidden-private'; automation: number; admission: 'open' | 'approval' | 'invite'; publication:'local'|'atproto' }
type Membership = { role: 'owner' | 'moderator' | 'member'; active: number }
type Source = { id: string; owner_id: string; bytes: Uint8Array; revision: number; withdrawn: number; digest: string }
type Release = { id: string; source_id: string; source_revision: number; community_id: string; publisher_id: string; text: string; digest: string; approved: number; revoked: number; post_id: string | null }
type Mandate = { id: string; agent_id: string; community_id: string; expires: number; revoked: number; hourly_limit: number }
export type Post = { id: string; author_id: string; community_id: string; parent_id: string | null; text: string; created: number; hidden: number; mandate_id: string | null; release_id: string | null; uri: string | null;root_id:string;content:string;revision:number;updated:number|null;deleted:number;locked:number;pinned:number }
type Job = { id: string; post_id: string; operation: 'put' | 'delete'; state: string; repo: string; rkey: string; record: string; cid: string | null }
const digest = (input: string | Uint8Array) => createHash('sha256').update(input).digest('hex')
const id = () => randomUUID()
const input = (s: string, max = 6000) => {
  if (typeof s !== 'string' || !s.trim() || s.length > max) throw new Fault(400, 'Invalid input')
  return s.trim()
}
function missing(): never { throw new Fault(404, 'Not found') }

export class StrataCore {
  db: Database
  base: string
  clock: () => number
  readonly contract:PostContract
  constructor(database: Database, base = 'http://127.0.0.1:7342', clock = () => Date.now(),options:{collection?:string}={}) {
    this.clock=clock
    const url = new URL(base)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Expected an origin URL')
    this.base = url.origin
    this.db = database
    this.contract=new PostContract(options.collection??COLLECTION)
    migrate(database)
  }
  close() { this.db.close() }
  get<T>(sql: string, ...args: Binding[]) { return this.db.get<T>(sql,...args) }
  all<T>(sql: string, ...args: Binding[]) { return this.db.all<T>(sql,...args) }
  run(sql: string, ...args: Binding[]) { this.db.run(sql,...args) }
  tx<T>(fn: () => T): T { return this.db.transaction(fn) }
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
  createCommunity(actorId: string, title: string, description: string, visibility: Community['visibility'], automation = false, admission: Community['admission'] = visibility === 'public' ? 'approval' : 'invite', publication:Community['publication']='local') {
    if (this.actor(actorId).kind !== 'human') throw new Fault(403, 'Human owner required')
    if (!['public','listed-private','hidden-private'].includes(visibility)) throw new Fault(400, 'Invalid visibility')
    if (!['open','approval','invite'].includes(admission) || (visibility !== 'public' && admission === 'open') || (visibility === 'hidden-private' && admission !== 'invite')) throw new Fault(400,'Invalid admission policy')
    if(!['local','atproto'].includes(publication) || (visibility!=='public' && publication!=='local')) throw new Fault(400,'Private communities cannot publish to AT')
    return this.tx(() => {
      const cid = id()
      this.run('INSERT INTO communities(id,title,description,visibility,automation,admission,publication) VALUES(?,?,?,?,?,?,?)', cid, input(title, 100), input(description, 2000), visibility, Number(automation), admission,publication)
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
      if(!active) this.run('UPDATE invitations SET revoked=1 WHERE community_id=? AND recipient_id=?',communityId,target)
      if(!active || role==='member') this.run('UPDATE invitations SET revoked=1 WHERE community_id=? AND issuer_id=?',communityId,target)
      this.audit(actorId, active ? 'membership.admit' : 'membership.revoke', communityId)
    })
  }
  join(actorId: string, communityId: string) {
    return this.tx(() => {
      this.actor(actorId)
      if (this.community(communityId).visibility !== 'public') missing()
      if (this.community(communityId).admission !== 'open') throw new Fault(403,'Admission requires approval or invitation')
      if (this.actor(actorId).kind !== 'human') throw new Fault(403,'Agents require steward admission')
      // Revoked membership cannot be bypassed with a self-join.
      if (this.get('SELECT 1 FROM memberships WHERE actor_id=? AND community_id=?', actorId, communityId)) throw new Fault(409, 'Membership already exists; contact a steward')
      this.run("INSERT INTO memberships VALUES(?,?,'member',1)", communityId, actorId)
    })
  }
  requestJoin(actorId: string, communityId: string, message: string) {
    return this.tx(()=>{
      const c=this.community(communityId)
      if(c.visibility==='hidden-private') missing()
      if(c.admission!=='approval') throw new Fault(403,'Applications are not enabled')
      if(this.actor(actorId).kind!=='human') throw new Fault(403,'Agents require steward admission')
      if(this.get('SELECT 1 FROM memberships WHERE community_id=? AND actor_id=?',communityId,actorId)) throw new Fault(409,'Contact a steward about existing membership')
      if(this.get('SELECT 1 FROM join_requests WHERE community_id=? AND actor_id=?',communityId,actorId)) throw new Fault(409,'Application already exists')
      this.run("INSERT INTO join_requests(community_id,actor_id,message,state,created) VALUES(?,?,?,'pending',?)",communityId,actorId,input(message,500),this.clock())
      this.audit(actorId,'membership.request',communityId)
      return {state:'pending'}
    })
  }
  joinRequests(actorId: string, communityId: string) {
    this.requireSteward(actorId,communityId)
    return this.all<{actor_id:string;message:string;state:string;created:number}>('SELECT actor_id,message,state,created FROM join_requests WHERE community_id=? ORDER BY created LIMIT 100',communityId)
  }
  decideJoin(actorId: string, communityId: string, target: string, approve: boolean) {
    this.tx(()=>{
      this.requireSteward(actorId,communityId)
      if(!this.get("SELECT 1 FROM join_requests WHERE community_id=? AND actor_id=? AND state='pending'",communityId,target)) missing()
      if(this.get('SELECT 1 FROM memberships WHERE community_id=? AND actor_id=?',communityId,target)) throw new Fault(409,'Membership changed; review separately')
      if(approve) this.run("INSERT INTO memberships VALUES(?,?,'member',1)",communityId,target)
      this.run('UPDATE join_requests SET state=?,decided=? WHERE community_id=? AND actor_id=?',approve?'approved':'declined',this.clock(),communityId,target)
      this.audit(actorId,approve?'membership.approve':'membership.decline',communityId)
    })
  }
  inviteMember(actorId: string, communityId: string, target: string, expires: number) {
    return this.tx(()=>{
      this.requireSteward(actorId,communityId)
      if(this.actor(target).kind!=='human') throw new Fault(403,'Agents require explicit steward admission')
      if(!Number.isSafeInteger(expires) || expires<=this.clock() || expires>this.clock()+86400000) throw new Fault(400,'Invitation expires within 24 hours')
      if(this.membership(target,communityId)) throw new Fault(409,'Already a member')
      const token=randomBytes(32).toString('base64url')
      this.run('INSERT INTO invitations(hash,community_id,issuer_id,recipient_id,expires) VALUES(?,?,?,?,?)',digest(token),communityId,actorId,target,expires)
      this.audit(actorId,'invitation.create',communityId)
      return {token,expires}
    })
  }
  acceptInvitation(actorId: string, token: string) {
    return this.tx(()=>{
      if(typeof token!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) missing()
      const invitation=this.get<{community_id:string;issuer_id:string;recipient_id:string;expires:number;used:number;revoked:number}>('SELECT * FROM invitations WHERE hash=?',digest(token))
      if(!invitation || invitation.recipient_id!==actorId || invitation.used || invitation.revoked || invitation.expires<=this.clock()) missing()
      this.requireSteward(invitation.issuer_id,invitation.community_id)
      if(this.membership(actorId,invitation.community_id)) throw new Fault(409,'Already a member')
      this.run("INSERT INTO memberships VALUES(?,?,'member',1) ON CONFLICT(community_id,actor_id) DO UPDATE SET role='member',active=1",invitation.community_id,actorId)
      this.run('UPDATE invitations SET used=1 WHERE hash=?',digest(token))
      this.audit(actorId,'invitation.accept',invitation.community_id)
      return this.community(invitation.community_id)
    })
  }
  revokeInvitations(actorId: string, communityId: string, target: string) {
    this.tx(()=>{
      this.requireSteward(actorId,communityId)
      this.run('UPDATE invitations SET revoked=1 WHERE community_id=? AND recipient_id=?',communityId,target)
      this.audit(actorId,'invitation.revoke',communityId)
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
  createPost(actorId: string, communityId: string, text: string, parentId?: string, mandateId?: string,options:{content?:unknown;mediaIds?:string[]}={}) {
    return this.tx(() => {const p=this.insertPost(actorId, communityId, text, parentId, mandateId,undefined,options);new Media(this).attach(actorId,p.id,options.mediaIds??[]);return this.view(p,actorId)})
  }
  private insertPost(actorId: string, communityId: string, text: string, parentId?: string, mandateId?: string, releaseId?: string,options:{content?:unknown;mediaIds?:string[]}={}) {
    this.checkWrite(actorId, communityId, mandateId)
    const c = this.community(communityId),content=contentInput(options.content,this.clock())
    const parent = parentId ? this.get<Post>('SELECT * FROM posts WHERE id=? AND hidden=0', parentId) : undefined
    if (parentId && (!parent || parent.community_id !== communityId || parent.deleted)) missing()
    if(parent && this.get<Post>('SELECT * FROM posts WHERE id=?',parent.root_id)?.locked)throw new Fault(409,'This conversation is locked')
    if(parent && (content.poll||content.event))throw new Fault(400,'Polls and events belong in an opening post')
    const pid = id(), actor = this.actor(actorId), created = this.clock()
    const uri = c.visibility === 'public' && c.publication==='atproto' ? `at://${actor.did}/${this.contract.collection}/${pid}` : null
    if(uri&&(Object.keys(content).some(k=>k!=='format')||(options.mediaIds?.length??0)>0||content.format==='markdown'))throw new Fault(409,'Rich AT publishing is not enabled')
    if(typeof text!=='string'||text.length>(uri?6000:20000))throw new Fault(400,'Post text is too long')
    if(!text.trim()&&!content.title&&!content.url&&!content.poll&&!content.event&&!options.mediaIds?.length)throw new Fault(400,'Add text, a link or media')
    this.run('INSERT INTO posts(id,author_id,community_id,parent_id,text,created,hidden,mandate_id,release_id,uri,root_id,content) VALUES(?,?,?,?,?,?,0,?,?,?,?,?)', pid, actorId, communityId, parentId ?? null, text.trim(), created, mandateId ?? null, releaseId ?? null, uri,parent?.root_id??pid,JSON.stringify(content))
    if (uri) {
      const record: PublicRecord = { $type: this.contract.collection, text: text.trim(), community: `${this.base}/v1/communities/${communityId}`, createdAt: new Date(created).toISOString(), actorKind:actor.kind, ...(parent?.uri ? { replyTo: parent.uri } : {}) }
      this.contract.validate(record)
      this.run("INSERT INTO outbox(id,post_id,operation,state,repo,rkey,record) VALUES(?,?,'put','pending',?,?,?)", id(), pid, actor.did, pid, JSON.stringify(record))
    }
    this.audit(actorId, 'post.create', pid)
    return this.get<Post>('SELECT * FROM posts WHERE id=?', pid)!
  }
  private view(p: Post, viewer?: string) {return this.views([p],viewer)[0]}
  private views(posts:Post[],viewer?:string){
    if(!posts.length)return[]
    const ids=JSON.stringify(posts.map(p=>p.id)),roots=JSON.stringify([...new Set(posts.map(p=>p.root_id))]),communities=JSON.stringify([...new Set(posts.map(p=>p.community_id))])
    const authors=new Map(this.all<Actor>('SELECT * FROM actors WHERE id IN(SELECT value FROM json_each(?))',JSON.stringify([...new Set(posts.map(p=>p.author_id))])).map(a=>[a.id,a]))
    const policy=new Map(this.all<Community>('SELECT * FROM communities WHERE id IN(SELECT value FROM json_each(?))',communities).map(c=>[c.id,c]))
    const roles=new Map(viewer?this.all<{community_id:string;role:string}>('SELECT community_id,role FROM memberships WHERE actor_id=? AND active=1 AND community_id IN(SELECT value FROM json_each(?))',viewer,communities).map(m=>[m.community_id,m.role]):[])
    const human=!!viewer&&this.actor(viewer).kind==='human'
    const scores=new Map(this.all<{post_id:string;score:number;mine:number}>('SELECT post_id,SUM(value) score,SUM(CASE WHEN actor_id=? THEN value ELSE 0 END) mine FROM votes WHERE post_id IN(SELECT value FROM json_each(?)) GROUP BY post_id',viewer??null,ids).map(v=>[v.post_id,v]))
    const bookmarks=new Set(viewer?this.all<{post_id:string}>('SELECT post_id FROM bookmarks WHERE actor_id=? AND post_id IN(SELECT value FROM json_each(?))',viewer,ids).map(b=>b.post_id):[])
    const counts=this.all<{id:string;kind:string;n:number}>("SELECT root_id id,'root' kind,COUNT(*) n FROM posts WHERE root_id IN(SELECT value FROM json_each(?)) AND id!=root_id AND hidden=0 GROUP BY root_id UNION ALL SELECT parent_id id,'direct' kind,COUNT(*) n FROM posts WHERE parent_id IN(SELECT value FROM json_each(?)) AND hidden=0 GROUP BY parent_id",roots,ids)
    const rootCounts=new Map(counts.filter(c=>c.kind==='root').map(c=>[c.id,c.n])),directCounts=new Map(counts.filter(c=>c.kind==='direct').map(c=>[c.id,c.n]))
    const contexts=this.all<{post_id:string;id:string;slug:string;title:string;kind:string}>("SELECT * FROM(SELECT l.record_id post_id,c.id,c.slug,c.title,c.kind,ROW_NUMBER() OVER(PARTITION BY l.record_id ORDER BY c.title) rank FROM record_contexts l JOIN contexts c ON c.id=l.context_id WHERE l.record_kind='post' AND l.record_id IN(SELECT value FROM json_each(?)) AND c.active=1) WHERE rank<=10",ids)
    const media=this.all<MediaView&{post_id:string}>('SELECT id,post_id,alt,width,height FROM media WHERE post_id IN(SELECT value FROM json_each(?)) ORDER BY position',ids)
    const jobs=new Map(this.all<{post_id:string;state:string}>("SELECT post_id,state FROM outbox WHERE operation='put' AND post_id IN(SELECT value FROM json_each(?))",ids).map(j=>[j.post_id,j.state]))
    const pollVotes=this.all<{post_id:string;choice:number;n:number;mine:number}>('SELECT post_id,choice,COUNT(*) n,MAX(CASE WHEN actor_id=? THEN 1 ELSE 0 END) mine FROM poll_votes WHERE post_id IN(SELECT value FROM json_each(?)) GROUP BY post_id,choice',viewer??null,ids)
    const responses=this.all<{post_id:string;response:string;n:number;mine:number}>('SELECT post_id,response,COUNT(*) n,MAX(CASE WHEN actor_id=? THEN 1 ELSE 0 END) mine FROM event_responses WHERE post_id IN(SELECT value FROM json_each(?)) GROUP BY post_id,response',viewer??null,ids)
    return posts.map(p=>{
      const author=authors.get(p.author_id)!,content=p.deleted?{}:contentOf(p.content),votes=pollVotes.filter(v=>v.post_id===p.id),rsvp=responses.filter(v=>v.post_id===p.id)
      return{id:p.id,author_id:p.author_id,community_id:p.community_id,parent_id:p.parent_id,text:p.deleted?'':p.text,created:p.created,uri:p.uri,actorKind:author.kind,author:{id:author.id,did:author.did,name:author.name,kind:author.kind},rootId:p.root_id,
        content,revision:p.revision,updated:p.updated,deleted:!!p.deleted,locked:!!p.locked,pinned:!!p.pinned,
        permissions:{edit:human&&viewer===p.author_id&&roles.has(p.community_id)&&!p.uri&&!p.deleted&&!p.release_id,moderate:human&&['owner','moderator'].includes(roles.get(p.community_id)??'')},
        contexts:p.deleted?[]:contexts.filter(c=>c.post_id===p.id).map(({id,slug,title,kind})=>({id,slug,title,kind})),
        replies:rootCounts.get(p.root_id)??0,directReplies:directCounts.get(p.id)??0,
        media:p.deleted?[]:media.filter(m=>m.post_id===p.id).map(({id,alt,width,height})=>({id,alt,width,height,url:'/v1/media/'+id})),
        publicationState:p.uri?jobs.get(p.id)??'unknown':policy.get(p.community_id)?.visibility==='public'?'local':'private',
        score:p.deleted?0:scores.get(p.id)?.score??0,myVote:p.deleted?0:scores.get(p.id)?.mine??0,bookmarked:!p.deleted&&bookmarks.has(p.id),
        poll:content.poll?{options:content.poll.options.map((label,i)=>({label,votes:votes.find(v=>v.choice===i)?.n??0})),closesAt:content.poll.closesAt,closed:this.clock()>=content.poll.closesAt||!!p.locked,total:votes.reduce((n,v)=>n+v.n,0),myVote:votes.find(v=>v.mine)?.choice??null}:null,
        event:content.event?{...content.event,going:rsvp.find(v=>v.response==='going')?.n??0,interested:rsvp.find(v=>v.response==='interested')?.n??0,myResponse:rsvp.find(v=>v.mine)?.response??null}:null}
    })
  }
  getPost(actorId: string | undefined, postId: string) {
    const p = this.get<Post>('SELECT * FROM posts WHERE id=? AND hidden=0', postId) ?? missing()
    if (!this.canRead(actorId, this.community(p.community_id))) missing()
    return this.view(p,actorId)
  }
  feed(actorId?: string, query = '') {
    const rows=this.all<Post>(`SELECT p.* FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.hidden=0 AND (p.deleted=0 OR p.parent_id IS NOT NULL)
      AND (c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1))
      AND instr(lower(p.text||' '||COALESCE(json_extract(p.content,'$.title'),'')),lower(?))>0 ORDER BY p.created DESC,p.id DESC LIMIT 100`, actorId ?? null, query.slice(0,200));return this.views(rows,actorId)
  }
  feedPage(actorId?: string, options: {query?:string;communityId?:string;topicId?:string;cursor?:string;limit?:number;rootsOnly?:boolean;rootId?:string;contextId?:string} = {}) {
    const limit=options.limit ?? 30
    if(!Number.isInteger(limit) || limit<1 || limit>100) throw new Fault(400,'Limit must be between 1 and 100')
    if(options.communityId && !this.canRead(actorId,this.community(options.communityId))) missing()
    if(options.rootId)this.getPost(actorId,options.rootId)
    let before: [number,string] | undefined
    if(options.cursor) {
      try {
        if(options.cursor.length>300 || !/^[A-Za-z0-9_-]+$/.test(options.cursor)) throw Error()
        const decoded:unknown=JSON.parse(Buffer.from(options.cursor,'base64url').toString('utf8'))
        if(!Array.isArray(decoded) || decoded.length!==2 || !Number.isSafeInteger(decoded[0]) || typeof decoded[1]!=='string' || !/^[a-f0-9-]{36}$/.test(decoded[1])) throw Error()
        before=[decoded[0],decoded[1]]
      } catch { throw new Fault(400,'Invalid cursor') }
    }
    const rows=this.all<Post>(`SELECT p.* FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.hidden=0 AND (p.deleted=0 OR p.parent_id IS NOT NULL)
      AND (c.visibility='public' OR EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1))
      AND instr(lower(p.text||' '||COALESCE(json_extract(p.content,'$.title'),'')),lower(?))>0
      AND (? IS NULL OR p.community_id=?)
      AND (? IS NULL OR EXISTS(SELECT 1 FROM community_topics ct WHERE ct.community_id=c.id AND ct.topic_id=?))
      AND (? IS NULL OR EXISTS(SELECT 1 FROM record_contexts rc JOIN contexts cx ON cx.id=rc.context_id WHERE rc.record_kind='post' AND rc.record_id=p.id AND rc.context_id=? AND cx.active=1))
      AND (?=0 OR p.parent_id IS NULL)
      AND (? IS NULL OR (p.root_id=? AND p.id!=?))
      AND (? IS NULL OR p.created<? OR (p.created=? AND p.id<?))
      ORDER BY p.created DESC,p.id DESC LIMIT ?`,actorId??null,(options.query??'').slice(0,200),options.communityId??null,options.communityId??null,
      options.topicId??null,options.topicId??null,options.contextId??null,options.contextId??null,options.rootsOnly?1:0,options.rootId??null,options.rootId??null,options.rootId??null,before?.[0]??null,before?.[0]??null,before?.[0]??null,before?.[1]??null,limit+1)
    const selected=rows.slice(0,limit),last=selected.at(-1)
    const pinned=options.communityId&&!options.cursor&&!options.query&&!options.rootId&&!options.topicId&&!options.contextId?this.views(this.all<Post>('SELECT * FROM posts WHERE community_id=? AND pinned=1 AND hidden=0 AND deleted=0 ORDER BY created DESC,id DESC LIMIT 3',options.communityId),actorId):[]
    return {pinned,items:this.views(selected,actorId),nextCursor:rows.length>limit && last ? Buffer.from(JSON.stringify([last.created,last.id])).toString('base64url') : null}
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
    const community=this.community(p.community_id)
    if (p.hidden || p.deleted || community.visibility !== 'public' || community.publication !== 'atproto') throw new Fault(409, 'Post unavailable for AT publication')
    this.checkWrite(p.author_id, p.community_id, p.mandate_id, false)
    if (p.release_id) this.checkRelease(p.release_id)
    if (p.parent_id) {
      const parent=this.get<Post>('SELECT * FROM posts WHERE id=?', p.parent_id)
      if (!parent || parent.hidden || parent.deleted) throw new Fault(409, 'Parent unavailable')
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
