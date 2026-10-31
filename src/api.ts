import { Buffer } from 'node:buffer'
import { StrataCore, Fault, type Community } from './core.ts'
import { Social } from './social.ts'
import { Wiki } from './wiki.ts'
import { capabilities } from './capabilities.ts'

const MAX_BODY = 1500000
async function body(req: Request): Promise<Record<string, unknown>> {
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Fault(415, 'JSON required')
  const reader = req.body?.getReader()
  if (!reader) throw new Fault(400, 'Invalid JSON')
  const chunks: Uint8Array[] = []; let size=0
  try {
    while (true) {
      const {done,value}=await reader.read()
      if (done) break
      size+=value.byteLength
      if(size>MAX_BODY) { await reader.cancel(); throw new Fault(413,'Request too large') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  try {
    const value=JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error()
    return value
  } catch { throw new Fault(400,'Invalid JSON') }
}
const string = (v: unknown) => { if (typeof v !== 'string') throw new Fault(400, 'String required'); return v }
export function json(code: number, data: unknown) {
  return Response.json(data,{status:code,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})
}
export function api(store: StrataCore, options: { custodyFixture?: boolean; runtime?: string } = {}) {
  const social=new Social(store)
  const wiki=new Wiki(store)
  return async (req: Request): Promise<Response> => {
    try {
      const url=new URL(req.url)
      // The Fetch URL is authoritative at the edge. The Node adapter separately
      // validates raw Host before constructing it; proxy transport Host can differ.
      if (url.origin !== store.base) throw new Fault(400,'Unexpected host')
      const origin = req.headers.get('origin')
      if (origin && origin !== store.base) throw new Fault(403,'Origin not allowed')
      const path = url.pathname
      const auth = req.headers.get('authorization')
      const actor = auth ? store.authenticate(auth.startsWith('Bearer ') ? auth.slice(7) : '') : undefined
      const authenticated = () => { if (!actor) throw new Fault(401,'Authentication required'); return actor.id }
      const parts = path.split('/').filter(Boolean)
      if (path !== '/health' && parts[0] !== 'v1') throw new Fault(404, 'Not found')
      if (['sources','releases'].includes(parts[1]) && !options.custodyFixture) throw new Fault(501,'Custody fixture disabled; Aksara adapter is not connected')
      let result: unknown
      if (req.method === 'GET') {
        if (path === '/health') result = { status:'ok', version:'0.1.0-alpha.0', auth:'local-provisioned-credentials', atproto:'draft-schema-and-sandbox-adapter', liveFederation:false, runtime:options.runtime ?? 'node', custodyFixture:options.custodyFixture === true }
        else if (path === '/v1/me') result = store.actor(authenticated())
        else if (path === '/v1/capabilities') result=capabilities
        else if (path === '/v1/communities') result = store.listCommunities(actor?.id)
        else if (path === '/v1/topics') result=social.topics()
        else if (path === '/v1/bookmarks') result=social.bookmarks(authenticated())
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki') result=wiki.list(parts[2])
        else if (parts.length === 3 && parts[1] === 'wiki') result=wiki.read(parts[2])
        else if (parts.length === 4 && parts[1] === 'wiki' && parts[3] === 'history') result=wiki.history(parts[2])
        else if (parts.length === 3 && parts[1] === 'wiki-proposals') result=wiki.proposal(authenticated(),parts[2])
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'reports') result=social.reports(authenticated(),parts[2])
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'requests') result = store.joinRequests(authenticated(),parts[2])
        else if (parts.length === 3 && parts[1] === 'communities') {
          const c = store.community(parts[2])
          if (c.visibility === 'hidden-private' && !store.canRead(actor?.id,c)) throw new Fault(404,'Not found')
          result = c // Listed-private metadata is intentionally public; no membership or counts.
        }
        else if (path === '/v1/feed') result = store.feed(actor?.id, url.searchParams.get('q') ?? '')
        else if (path === '/v1/feed/page') result=store.feedPage(actor?.id,{
          query:url.searchParams.get('q')??undefined,communityId:url.searchParams.get('community')??undefined,
          topicId:url.searchParams.get('topic')??undefined,cursor:url.searchParams.get('cursor')??undefined,
          limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):undefined,
        })
        else if (parts.length === 3 && parts[1] === 'posts') result = store.getPost(actor?.id,parts[2])
        else if (parts.length === 3 && parts[1] === 'sources') {
          const s = store.source(authenticated(),parts[2]); result = { ...s, bytes: Buffer.from(s.bytes).toString('base64') }
        }
        else if (parts.length === 3 && parts[1] === 'releases') result = store.release(authenticated(),parts[2])
        else if (path === '/v1/outbox') result = store.jobs(authenticated()).map(({id,state,operation,post_id,cid})=>({id,state,operation,post_id,cid}))
        else throw new Fault(404, 'Not found')
        return json(200,result)
      }
      if (req.method !== 'POST') throw new Fault(405, 'Method not allowed')
      const caller = authenticated(), b = await body(req)
      store.authenticate(auth!.slice(7)) // Recheck after awaiting an untrusted body.
      if (path === '/v1/communities') result = store.createCommunity(caller,string(b.title),string(b.description),string(b.visibility) as Community['visibility'],b.automation === true,b.admission === undefined ? undefined : string(b.admission) as Community['admission'],b.publication===undefined?'local':string(b.publication) as Community['publication'])
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'join') result = store.join(caller,parts[2])
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'requests') result = store.requestJoin(caller,parts[2],string(b.message))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'decide') {
        if(typeof b.approve!=='boolean') throw new Fault(400,'Boolean required')
        result=store.decideJoin(caller,parts[2],string(b.actorId),b.approve)
      }
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'invitations') result=store.inviteMember(caller,parts[2],string(b.actorId),Number(b.expires))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'revoke-invitations') result=store.revokeInvitations(caller,parts[2],string(b.actorId))
      else if (path === '/v1/invitations/accept') result=store.acceptInvitation(caller,string(b.token))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'members') {
        if (typeof b.active !== 'boolean') throw new Fault(400,'Boolean required')
        result = store.setMember(caller,parts[2],string(b.actorId),b.active,b.role === undefined ? 'member' : string(b.role) as 'member'|'moderator')
      }
      else if (path === '/v1/posts') result = store.createPost(caller,string(b.communityId),string(b.text),b.parentId === undefined ? undefined : string(b.parentId),b.mandateId === undefined ? undefined : string(b.mandateId))
      else if (parts.length === 4 && parts[1] === 'posts' && parts[3] === 'vote') {
        if(typeof b.value!=='number') throw new Fault(400,'Numeric vote required')
        result=social.vote(caller,parts[2],b.value)
      }
      else if (parts.length === 4 && parts[1] === 'posts' && parts[3] === 'bookmark') {
        if(typeof b.save!=='boolean') throw new Fault(400,'Boolean required')
        result=social.bookmark(caller,parts[2],b.save)
      }
      else if (parts.length === 4 && parts[1] === 'posts' && parts[3] === 'report') result=social.report(caller,parts[2],string(b.reason))
      else if (parts.length === 4 && parts[1] === 'reports' && parts[3] === 'decide') result=social.decideReport(caller,parts[2],string(b.state) as 'resolved'|'dismissed',string(b.decision))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'topics') result=social.addTopic(caller,parts[2],string(b.title))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki') result=wiki.create(caller,parts[2],string(b.title))
      else if (parts.length === 4 && parts[1] === 'wiki' && parts[3] === 'proposals') {
        if(!Array.isArray(b.citations) || b.citations.some(c=>typeof c!=='string')) throw new Fault(400,'Citation URLs required')
        result=wiki.propose(caller,parts[2],b.baseRevision===null?null:string(b.baseRevision),string(b.text),b.citations as string[],string(b.language),string(b.perspective))
      }
      else if (parts.length === 4 && parts[1] === 'wiki-proposals' && parts[3] === 'decide') {
        if(typeof b.accept!=='boolean')throw new Fault(400,'Boolean required')
        result=wiki.decide(caller,parts[2],string(b.digest),b.accept)
      }
      else if (parts.length === 4 && parts[1] === 'posts' && parts[3] === 'hide') result = store.hidePost(caller,parts[2])
      else if (path === '/v1/mandates') result = { id:store.mandate(caller,string(b.agentId),string(b.communityId),string(b.purpose),Number(b.expires),b.hourlyLimit === undefined ? 5 : Number(b.hourlyLimit)) }
      else if (parts.length === 4 && parts[1] === 'mandates' && parts[3] === 'revoke') result = store.revokeMandate(caller,parts[2])
      else if (path === '/v1/sources') {
        const encoded = string(b.bytes)
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw new Fault(400,'Canonical base64 required')
        const bytes = Buffer.from(encoded,'base64')
        if (bytes.toString('base64') !== encoded) throw new Fault(400,'Canonical base64 required')
        result = { id:store.createSource(caller,bytes) }
      }
      else if (parts.length === 4 && parts[1] === 'sources' && parts[3] === 'withdraw') result = store.withdrawSource(caller,parts[2])
      else if (path === '/v1/releases') result = { id:store.draftRelease(caller,string(b.sourceId),string(b.communityId),string(b.publisherId),string(b.text)) }
      else if (parts.length === 4 && parts[1] === 'releases' && parts[3] === 'approve') result = store.approveRelease(caller,parts[2],string(b.digest))
      else if (parts.length === 4 && parts[1] === 'releases' && parts[3] === 'publish') result = store.publishRelease(caller,parts[2],b.mandateId === undefined ? undefined : string(b.mandateId))
      else throw new Fault(404,'Not found')
      return json(200,result ?? { ok:true })
    } catch (error) {
      return json(error instanceof Fault ? error.status : 500,{ error:error instanceof Fault ? error.message : 'Internal error' })
    }
  }
}
