import { Buffer } from 'node:buffer'
import { StrataCore, Fault, type Community, type Actor } from './core.ts'
import { Social } from './social.ts'
import { Search } from './search.ts'
import { Wiki } from './wiki.ts'
import {updateProfile} from './profile.ts'
import {Groups,strings,type Group,type Context} from './groups.ts'
import {DirectMessages} from './dm.ts'
import {Activity} from './activity.ts'
import {PublicWork} from './public-work.ts'
import {Forum} from './forum.ts'
import { Media } from './media.ts'
import {Decisions,type DecisionProvider} from './decisions.ts'
import {AgentAccess} from './agent-access.ts'
import { capabilities } from './capabilities.ts'
import {Discovery,type SourceFetcher} from './discovery.ts'
import {Offerings} from './offerings.ts'
import {Ranking} from './ranking.ts'
import {Clustering} from './clustering.ts'
import {Knowledge} from './knowledge.ts'
import {Resident,type ResidentProvider,type ResidentSkill} from './resident.ts'

const MAX_BODY = 1500000
export async function body(req: Request,maximum=MAX_BODY): Promise<Record<string, unknown>> {
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Fault(415, 'JSON required')
  const reader = req.body?.getReader()
  if (!reader) throw new Fault(400, 'Invalid JSON')
  const chunks: Uint8Array[] = []; let size=0
  try {
    while (true) {
      const {done,value}=await reader.read()
      if (done) break
      size+=value.byteLength
      if(size>maximum) { await reader.cancel(); throw new Fault(413,'Request too large') }
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
export type ApiOptions={sourceFetcher?:SourceFetcher;residentProvider?:ResidentProvider;agentAccess?:AgentAccess;decisions?:DecisionProvider;custodyFixture?:boolean;runtime?:string;stewardDid?:string;authMode?:'atproto'|'local';enrollmentMode?:'open'|'invite'|'closed';principal?:(request:Request)=>Actor|undefined;writeGuard?:(request:Request)=>void}
export function api(store: StrataCore, options: ApiOptions = {}) {
  const agents=options.agentAccess??new AgentAccess(store,{stewardDid:options.stewardDid})
  const forum=new Forum(store)
  const decisions=new Decisions(store,options.decisions)
  const media=new Media(store)
  const dm=new DirectMessages(store)
  const activity=new Activity(store)
  const social=new Social(store),search=new Search(store)
  const wiki=new Wiki(store)
  const groups=new Groups(store,{stewardDid:options.stewardDid}),work=new PublicWork(store,groups)
  const clustering=new Clustering(store),discovery=new Discovery(store,options.sourceFetcher),knowledge=new Knowledge(store),resident=new Resident(store,agents,options.residentProvider)
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
      const principal=()=>options.principal ? options.principal(req) : auth ? store.authenticate(auth.startsWith('Bearer ') ? auth.slice(7) : '') : undefined
      const actor = principal()
      const authenticated = () => { if (!actor) throw new Fault(401,'Authentication required'); return actor.id }
      const parts = path.split('/').filter(Boolean)
      if (path !== '/health' && parts[0] !== 'v1') throw new Fault(404, 'Not found')
      if (['sources','releases'].includes(parts[1]) && !options.custodyFixture) throw new Fault(501,'Custody fixture disabled; Aksara adapter is not connected')
      let result: unknown
      if (req.method === 'GET') {
        if(path==='/v1/studio'){
          const who=authenticated();if(store.actor(who).kind!=='human')throw new Fault(403,'Human steward required')
          result={communities:store.all<Community>("SELECT c.* FROM communities c JOIN memberships m ON m.community_id=c.id WHERE m.actor_id=? AND m.active=1 AND m.role IN ('owner','moderator') ORDER BY c.title",who).map(c=>({...c,sourceCount:store.get<{n:number}>('SELECT count(*) n FROM discovery_sources WHERE community_id=?',c.id)!.n,knowledgeCount:store.get<{n:number}>("SELECT count(*) n FROM knowledge_notes WHERE community_id=? AND state!='withdrawn'",c.id)!.n,pendingJobs:store.get<{n:number}>("SELECT count(*) n FROM resident_jobs WHERE community_id=? AND state IN ('queued','running')",c.id)!.n})),acquisitionConfigured:!!options.sourceFetcher,residentProvider:options.residentProvider?.label??'source-linked, model-free',backupStatus:'unqualified'}
        }
        else if(path==='/v1/discovery/sources')result=discovery.sources(authenticated(),string(url.searchParams.get('community')))
        else if(path==='/v1/discovery/items')result=discovery.items(actor?.id,url.searchParams.get('community')??undefined,url.searchParams.get('review')==='true')
        else if(parts.length===4&&parts[1]==='discovery'&&parts[2]==='items')result=discovery.item(parts[3],actor?.id,url.searchParams.get('review')==='true')
        else if(path==='/v1/offerings')result=new Offerings(store).list(actor?.id,{communityId:url.searchParams.get('community')??undefined,authorId:url.searchParams.get('author')??undefined,kind:url.searchParams.get('kind')??undefined,includeClosed:url.searchParams.get('closed')==='true'})
        else if(parts.length===3&&parts[1]==='offerings')result=new Offerings(store).read(parts[2],actor?.id)
        else if(path==='/v1/discovery/posts')result=new Ranking(store).explore({sort:url.searchParams.get('sort')??undefined,limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):undefined,communityId:url.searchParams.get('community')??undefined})
        else if(path==='/v1/clustering/snapshot')result=clustering.snapshot(authenticated(),string(url.searchParams.get('community')))
        else if(parts.length===4&&parts[1]==='discovery'&&parts[2]==='related')result=clustering.related(parts[3])
        else if(path==='/v1/knowledge')result=knowledge.list(actor?.id,url.searchParams.get('community')??undefined)
        else if(parts.length===3&&parts[1]==='knowledge')result=knowledge.read(parts[2],actor?.id)
        else if(parts.length===4&&parts[1]==='knowledge'&&parts[3]==='history')result=knowledge.history(parts[2],actor?.id)
        else if(path==='/v1/resident/config')result=resident.get(authenticated(),string(url.searchParams.get('community')))
        else if(path==='/v1/resident/choices')result=resident.routing.choices(authenticated(),string(url.searchParams.get('community')))
        else if(path==='/v1/resident/requests')result=resident.questions.statuses(string(url.searchParams.get('post')),actor?.id)
        else if(path==='/v1/resident/sitewide')result=resident.routing.globalInfo(authenticated())
        else if(path==='/v1/resident/destinations')result=resident.routing.participation(authenticated(),string(url.searchParams.get('community')))
        else if(path==='/v1/resident/jobs')result=resident.jobs(authenticated(),string(url.searchParams.get('community')))
        else if(parts.length===4&&parts[1]==='resident'&&parts[2]==='jobs')result=resident.job(authenticated(),parts[3])
        else if(path==='/v1/agents')result=agents.list(authenticated())
        else if(parts.length===3&&parts[1]==='media')return media.response(actor?.id,parts[2])
        else if (path === '/health') result = { status:'ok', version:'0.1.0-alpha.0', auth:options.authMode==='atproto'?'atproto-oauth':'local-provisioned-credentials', enrollment:options.authMode==='atproto'?(options.enrollmentMode??'invite'):null, atproto:'draft-schema-and-sandbox-adapter', liveFederation:false, runtime:options.runtime ?? 'node', custodyFixture:options.custodyFixture === true }
        else if (path === '/v1/search') result=search.query(actor?.id,url.searchParams.get('q')??'')
        else if (path === '/v1/people') result=social.people(authenticated(),url.searchParams.get('q')??'')
        else if (path === '/v1/following') result=social.following(authenticated())
        else if (path === '/v1/me') result = store.actor(authenticated())
        else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='moderation')result=forum.moderation(authenticated(),parts[2])
        else if (path === '/v1/memberships') result=store.all<{community_id:string;role:string}>('SELECT community_id,role FROM memberships WHERE actor_id=? AND active=1',authenticated())
        else if (path === '/v1/capabilities') result={...capabilities,agents:{enrollment:true,publicMcp:true,remoteCredentials:'registered-jwt-bearer',institutionalVerification:false},decisions:{enabled:!!options.decisions},auth:{...capabilities.auth,localCredentials:options.authMode!=='atproto',atOAuth:options.authMode==='atproto',remoteSignup:options.authMode==='atproto'&&options.enrollmentMode==='open',signupProvider:options.authMode==='atproto'?'bluesky':null,hostedAccounts:false}}
        else if(path==='/v1/dm/contacts')result=dm.contacts(authenticated(),url.searchParams.get('q')??'')
        else if(path==='/v1/dm/me')result=dm.me(authenticated())
        else if(path==='/v1/dm/threads')result=dm.list(authenticated())
        else if(parts.length===4&&parts[1]==='dm'&&parts[2]==='threads')result=dm.read(authenticated(),parts[3])
        else if(parts.length===5&&parts[1]==='dm'&&parts[2]==='threads'&&parts[4]==='messages')result=dm.messages(authenticated(),parts[3],Number(url.searchParams.get('after')??0))
        else if(path==='/v1/notifications')result=activity.list(authenticated())
        else if(path==='/v1/groups')result=groups.list(actor?.id)
        else if(path==='/v1/group-memberships')result=groups.memberships(authenticated())
        else if(parts.length===3&&parts[1]==='groups')result=groups.read(actor?.id,parts[2])
        else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='spaces')result=groups.spaces(actor?.id,parts[2])
        else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='members')result=groups.members(authenticated(),parts[2])
        else if(path==='/v1/contexts')result=groups.contexts()
        else if(parts.length===3&&parts[1]==='contexts')result={...groups.contextDetail(parts[2]),work:work.list({contextId:parts[2]})}
        else if(path==='/v1/work')result=work.list({groupId:url.searchParams.get('group')??undefined,contextId:url.searchParams.get('context')??undefined})
        else if(parts.length===3&&parts[1]==='work')result=work.read(parts[2])
        else if(parts.length===4&&parts[1]==='work'&&parts[3]==='proposals')result=work.proposals(authenticated(),parts[2])
        else if(parts.length===3&&parts[1]==='actors'){
          result=search.profile(actor?.id,parts[2])
        }
        else if (path === '/v1/communities') result = store.listCommunities(actor?.id)
        else if (path === '/v1/topics') result=social.topics()
        else if (path === '/v1/wiki') result=wiki.all(actor?.id)
        else if (path === '/v1/wiki/discover') result=wiki.discover()
        else if (path === '/v1/wiki/growing') result=knowledge.discoverPublic()
        else if (path === '/v1/wiki/gaps') result=wiki.gaps()
        else if (parts.length === 4 && parts[1] === 'wiki' && parts[3] === 'trail') result=wiki.trail(parts[2])
        else if (path === '/v1/bookmarks') result=social.bookmarks(authenticated())
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki') result=wiki.list(parts[2],actor?.id)
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki-policy') result=wiki.policy(authenticated(),parts[2])
        else if (parts.length === 3 && parts[1] === 'wiki') result=wiki.read(parts[2],actor?.id)
        else if (parts.length === 4 && parts[1] === 'wiki' && parts[3] === 'history') {wiki.read(parts[2],actor?.id);result=wiki.history(parts[2])}
        else if (parts.length === 4 && parts[1] === 'wiki' && parts[3] === 'proposals') result=wiki.proposals(authenticated(),parts[2])
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
          linkUrls:url.searchParams.has('links')?(()=>{try{return JSON.parse(url.searchParams.get('links')!)}catch{throw new Fault(400,'Invalid related links')}})():undefined,
          followingId:url.searchParams.get('following')==='true'?authenticated():undefined,authorId:url.searchParams.get('author')??undefined,query:url.searchParams.get('q')??undefined,communityId:url.searchParams.get('community')??undefined,
          topicId:url.searchParams.get('topic')??undefined,cursor:url.searchParams.get('cursor')??undefined,
          limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):undefined,
          pollsOnly:url.searchParams.get('polls')==='true',rootsOnly:url.searchParams.get('roots')==='true',contextId:url.searchParams.has('context')?groups.context(url.searchParams.get('context')!).id:undefined,
        })
        else if (parts.length===4 && parts[1]==='posts' && parts[3]==='replies') {
          const target=store.getPost(actor?.id,parts[2])
          result=store.feedPage(actor?.id,{rootId:target.rootId,branchId:target.id===target.rootId?undefined:target.id,limit:100,cursor:url.searchParams.get('cursor')??undefined})
        }
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
      options.writeGuard?.(req)
      const caller = authenticated(), b = await body(req)
      const current=principal() // Recheck after awaiting an untrusted body.
      if(current?.id!==caller)throw new Fault(401,'Authentication required')
      if(path==='/v1/discovery/sources')result=discovery.add(caller,b)
      else if(parts.length===5&&parts[1]==='discovery'&&parts[2]==='sources'&&parts[4]==='state')result=discovery.state(caller,parts[3],b)
      else if(parts.length===5&&parts[1]==='discovery'&&parts[2]==='sources'&&parts[4]==='refresh')result=await discovery.refresh(caller,parts[3],()=>{if(principal()?.id!==caller)throw new Fault(401,'Authentication required');options.writeGuard?.(req)})
      else if(parts.length===5&&parts[1]==='discovery'&&parts[2]==='items'&&parts[4]==='state')result=discovery.decide(caller,parts[3],b)
      else if(path==='/v1/offerings')result=new Offerings(store).create(caller,b)
      else if(parts.length===4&&parts[1]==='offerings'&&parts[3]==='edit')result=new Offerings(store).update(caller,parts[2],b)
      else if(path==='/v1/clustering/runs')result=clustering.accept(caller,b)
      else if(path==='/v1/knowledge')result=knowledge.create(caller,b)
      else if(parts.length===4&&parts[1]==='knowledge'&&parts[3]==='edit')result=knowledge.update(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='knowledge'&&parts[3]==='withdraw')result=knowledge.withdraw(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='knowledge'&&parts[3]==='promote')result=knowledge.promote(caller,parts[2],b)
      else if(path==='/v1/resident/setup')result=resident.setup(caller,b)
      else if(path==='/v1/resident/config')result=resident.configure(caller,b)
      else if(path==='/v1/resident/sitewide')result=resident.routing.setGlobal(caller,b)
      else if(path==='/v1/resident/destinations')result=resident.routing.setDestination(caller,b)
      else if(path==='/v1/resident/jobs')result=resident.enqueue(caller,string(b.communityId),string(b.skill) as ResidentSkill,string(b.requestKey))
      else if(parts.length===5&&parts[1]==='resident'&&parts[2]==='jobs'&&parts[4]==='run'){resident.job(caller,parts[3]);result=await resident.run(parts[3],()=>{if(principal()?.id!==caller)throw new Fault(401,'Authentication required');options.writeGuard?.(req);resident.job(caller,parts[3])})}
      else if(parts.length===5&&parts[1]==='resident'&&parts[2]==='jobs'&&parts[4]==='cancel')result=resident.cancel(caller,parts[3])
      else if(path==='/v1/agents')result=agents.enroll(caller,b)
      else if(parts.length===4&&parts[1]==='agents'&&parts[3]==='deployments')result=agents.addDeployment(caller,parts[2],string(b.label),b.jwk)
      else if(parts.length===4&&parts[1]==='agents'&&parts[3]==='suspend')result=agents.suspend(caller,parts[2])
      else if(parts.length===4&&parts[1]==='agents'&&parts[3]==='resume')result=agents.resume(caller,parts[2])
      else if(parts.length===4&&parts[1]==='agents'&&parts[3]==='admit')result=agents.admit(caller,parts[2])
      else if(parts.length===4&&parts[1]==='agents'&&parts[3]==='grants')result=agents.grant(caller,parts[2],b)
      else if(parts.length===6&&parts[1]==='agents'&&parts[3]==='deployments'&&parts[5]==='revoke')result=agents.revokeDeployment(caller,parts[2],parts[4])
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='suggestions') result=await decisions.suggest(caller,parts[2],string(b.requestKey),()=>{if(principal()?.id!==caller)throw new Fault(401,'Authentication required');options.writeGuard?.(req)})
      else if(path==='/v1/profile')result=updateProfile(store,caller,b)
      else if(path==='/v1/media')result=media.upload(caller,string(b.communityId),string(b.bytes),string(b.alt??''))
      else if (path === '/v1/communities') result = store.createCommunity(caller,string(b.title),string(b.description),string(b.visibility) as Community['visibility'],b.automation === true,b.admission === undefined ? undefined : string(b.admission) as Community['admission'],b.publication===undefined?'local':string(b.publication) as Community['publication'])
      else if(path==='/v1/dm/device'){
        if(!Array.isArray(b.packages)||b.packages.some(p=>!p||typeof p!=='object'||typeof p.id!=='string'||typeof p.data!=='string'))throw new Fault(400,'Key packages required')
        result=dm.register(caller,{deviceId:string(b.deviceId),signatureKey:string(b.signatureKey),packages:b.packages as {id:string;data:string}[]})
      }
      else if(path==='/v1/dm/requests')result=dm.reserve(caller,string(b.recipientId),string(b.deviceId),string(b.requestKey))
      else if(parts.length===5&&parts[1]==='dm'&&parts[2]==='threads'){
        const id=parts[3]
        if(parts[4]==='start')result=dm.start(caller,id,string(b.deviceId),string(b.welcome))
        else if(parts[4]==='decide'){if(typeof b.accept!=='boolean')throw new Fault(400,'Boolean required');result=dm.decide(caller,id,string(b.deviceId),b.accept)}
        else if(parts[4]==='messages')result=dm.send(caller,id,string(b.deviceId),string(b.clientId),string(b.ciphertext))
        else if(parts[4]==='read')result=dm.markRead(caller,id,Number(b.version))
        else if(parts[4]==='close')result=dm.close(caller,id,b.block===true)
        else throw new Fault(404,'Not found')
      }
      else if(path==='/v1/notifications/read')result=activity.markRead(caller,b.ids)
      else if(path==='/v1/groups')result=groups.create(caller,string(b.title),string(b.description),string(b.kind) as Group['kind'],string(b.visibility) as Group['visibility'])
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='members'){
        if(typeof b.active!=='boolean')throw new Fault(400,'Boolean required')
        result=groups.setMember(caller,parts[2],string(b.actorId),b.active,b.role===undefined?'member':string(b.role) as 'member'|'steward')
      }
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='spaces'){
        result=b.communityId===undefined?groups.createSpace(caller,parts[2],{title:string(b.title),description:string(b.description),visibility:string(b.visibility) as Community['visibility'],automation:b.automation===true}):groups.bind(caller,parts[2],string(b.communityId))
      }
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='request-sponsorship')result=groups.requestSponsorship(caller,parts[2])
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='sponsorship'){
        if(typeof b.enabled!=='boolean')throw new Fault(400,'Boolean required')
        result=groups.recognize(caller,parts[2],b.enabled)
      }
      else if(parts.length===4&&parts[1]==='actors'&&parts[3]==='follow'){if(typeof b.following!=='boolean')throw new Fault(400,'Boolean required');result=social.follow(caller,parts[2],b.following)}
      else if(path==='/v1/contexts')result=groups.createContext(caller,{slug:string(b.slug),title:string(b.title),kind:string(b.kind) as Context['kind'],description:string(b.description),language:string(b.language),aliases:strings(b.aliases??[],20)})
      else if(parts.length===4&&parts[1]==='contexts'&&parts[3]==='aliases')result=groups.setContextAliases(caller,parts[2],b.aliases)
      else if(parts.length===4&&['posts','groups','wiki'].includes(parts[1])&&parts[3]==='contexts'){
        const kind=parts[1]==='posts'?'post':parts[1]==='groups'?'group':'wiki'
        result=b.remove===true?groups.detach(caller,kind,parts[2],string(b.contextId)):groups.attach(caller,kind,parts[2],string(b.contextId))
      }
      else if(path==='/v1/work')result=work.create(caller,{groupId:string(b.groupId),communityId:string(b.communityId),title:string(b.title),description:string(b.description),requestKey:string(b.requestKey),originPostId:b.originPostId===undefined?undefined:string(b.originPostId),contextIds:strings(b.contextIds??[]),grantId:b.grantId===undefined?undefined:string(b.grantId)})
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='work-consent')result=b.revoke===true?work.revokeConsent(caller,parts[2],string(b.groupId)):work.consent(caller,parts[2],string(b.groupId),Number(b.expires))
      else if(parts.length===4&&parts[1]==='work'&&parts[3]==='state')result=work.update(caller,parts[2],Number(b.revision),string(b.state) as 'active'|'blocked'|'withdrawn',b.grantId===undefined?undefined:string(b.grantId))
      else if(parts.length===4&&parts[1]==='work'&&parts[3]==='proposals')result=work.proposeResult(caller,parts[2],string(b.text),strings(b.citations??[],20),b.grantId===undefined?undefined:string(b.grantId))
      else if(parts.length===4&&parts[1]==='work-results'&&parts[3]==='reject')result=work.rejectResult(caller,parts[2],string(b.digest))
      else if(parts.length===4&&parts[1]==='work-results'&&parts[3]==='accept')result=work.acceptResult(caller,parts[2],string(b.digest),Number(b.revision))
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='work-grants')result=work.grant(caller,parts[2],string(b.agentId),Number(b.expires),b.hourlyLimit===undefined?5:Number(b.hourlyLimit))
      else if(parts.length===4&&parts[1]==='work-grants'&&parts[3]==='revoke')result=work.revoke(caller,parts[2])
      else if(path==='/v1/editorial-mandates')result=wiki.grant(caller,string(b.agentId),string(b.communityId),string(b.purpose),Number(b.expires),b.hourlyLimit===undefined?3:Number(b.hourlyLimit))
      else if(parts.length===4&&parts[1]==='editorial-mandates'&&parts[3]==='revoke')result=wiki.revoke(caller,parts[2])
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
      else if (path === '/v1/posts') result=b.agentMention===undefined?forum.create(caller,b,groups):resident.createMentionPost(caller,b,groups)
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='edit')result=forum.edit(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='delete')result=forum.delete(caller,parts[2],b.revision)
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='moderate')result=forum.moderate(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='poll')result=forum.poll(caller,parts[2],b.choice)
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='rsvp')result=forum.rsvp(caller,parts[2],b.response)
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
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki-policy') result=wiki.setPolicy(caller,parts[2],b.contributorGroupId===null?null:string(b.contributorGroupId),b.reviewerGroupId===null?null:string(b.reviewerGroupId))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki') {
        if(b.draft!==undefined){const d=b.draft as Record<string,unknown>;if(!d||typeof d!=='object'||!Array.isArray(d.citations)||d.citations.some(c=>typeof c!=='string'))throw new Fault(400,'Draft and citations required');result=wiki.createDraft(caller,parts[2],string(b.title),{text:string(d.text),citations:d.citations as string[],language:string(d.language),perspective:string(d.perspective)},b.requestKey===undefined?undefined:string(b.requestKey))}
        else result=wiki.create(caller,parts[2],string(b.title))
      }
      else if (parts.length === 4 && parts[1] === 'wiki' && parts[3] === 'proposals') {
        if(!Array.isArray(b.citations) || b.citations.some(c=>typeof c!=='string')) throw new Fault(400,'Citation URLs required')
        result=wiki.propose(caller,parts[2],b.baseRevision===null?null:string(b.baseRevision),string(b.text),b.citations as string[],string(b.language),string(b.perspective),b.editorialMandateId===undefined?undefined:string(b.editorialMandateId))
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
