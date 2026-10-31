import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Strata, Fault, type Community } from './store.ts'

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new Fault(415, 'JSON required')
  const chunks: Buffer[] = []; let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 1500000) throw new Fault(413, 'Request too large')
    chunks.push(Buffer.from(chunk))
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error()
    return value
  } catch { throw new Fault(400, 'Invalid JSON') }
}
const string = (v: unknown) => { if (typeof v !== 'string') throw new Fault(400, 'String required'); return v }
function respond(res: ServerResponse, code: number, data: unknown) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' })
  res.end(JSON.stringify(data))
}
export function server(store: Strata, options: { custodyFixture?: boolean } = {}) {
  return createServer(async (req,res) => {
    try {
      if (!req.url || req.headers.host !== new URL(store.base).host) throw new Fault(400, 'Unexpected host')
      const origin = req.headers.origin
      if (origin && origin !== store.base) throw new Fault(403, 'Origin not allowed')
      const path = new URL(req.url, store.base).pathname
      const auth = req.headers.authorization
      const actor = auth ? store.authenticate(auth.startsWith('Bearer ') ? auth.slice(7) : '') : undefined
      const authenticated = () => { if (!actor) throw new Fault(401, 'Authentication required'); return actor.id }
      const parts = path.split('/').filter(Boolean)
      if (path !== '/health' && parts[0] !== 'v1') throw new Fault(404, 'Not found')
      if (['sources','releases'].includes(parts[1]) && !options.custodyFixture) throw new Fault(501,'Custody fixture disabled; Aksara adapter is not connected')
      let result: unknown
      if (req.method === 'GET') {
        if (path === '/health') result = { status:'ok', version:'0.1.0-alpha.0', auth:'local-provisioned-credentials', atproto:'draft-schema-and-sandbox-adapter', liveFederation:false }
        else if (path === '/v1/me') result = store.actor(authenticated())
        else if (path === '/v1/communities') result = store.listCommunities(actor?.id)
        else if (parts.length === 3 && parts[1] === 'communities') {
          const c = store.community(parts[2])
          if (c.visibility === 'hidden-private' && !store.canRead(actor?.id,c)) throw new Fault(404,'Not found')
          result = c // Listed-private metadata is intentionally public; no membership or counts.
        }
        else if (path === '/v1/feed') result = store.feed(actor?.id, new URL(req.url,store.base).searchParams.get('q') ?? '')
        else if (parts.length === 3 && parts[1] === 'posts') result = store.getPost(actor?.id,parts[2])
        else if (parts.length === 3 && parts[1] === 'sources') {
          const s = store.source(authenticated(),parts[2]); result = { ...s, bytes: Buffer.from(s.bytes).toString('base64') }
        }
        else if (parts.length === 3 && parts[1] === 'releases') result = store.release(authenticated(),parts[2])
        else if (path === '/v1/outbox') result = store.jobs(authenticated()).map(({id,state,operation,post_id,cid})=>({id,state,operation,post_id,cid}))
        else throw new Fault(404, 'Not found')
        respond(res,200,result)
        return
      }
      if (req.method !== 'POST') throw new Fault(405, 'Method not allowed')
      const caller = authenticated(), b = await body(req)
      store.authenticate(auth!.slice(7)) // Recheck after awaiting an untrusted body.
      if (path === '/v1/communities') result = store.createCommunity(caller,string(b.title),string(b.description),string(b.visibility) as Community['visibility'],b.automation === true)
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'join') result = store.join(caller,parts[2])
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'members') {
        if (typeof b.active !== 'boolean') throw new Fault(400,'Boolean required')
        result = store.setMember(caller,parts[2],string(b.actorId),b.active,b.role === undefined ? 'member' : string(b.role) as 'member'|'moderator')
      }
      else if (path === '/v1/posts') result = store.createPost(caller,string(b.communityId),string(b.text),b.parentId === undefined ? undefined : string(b.parentId),b.mandateId === undefined ? undefined : string(b.mandateId))
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
      respond(res,200,result ?? { ok:true })
    } catch (error) {
      if (res.headersSent) { res.destroy(); return }
      respond(res,error instanceof Fault ? error.status : 500,{ error:error instanceof Fault ? error.message : 'Internal error' })
    }
  })
}
