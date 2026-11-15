import { DurableObject,WorkerEntrypoint } from 'cloudflare:workers'
import { CloudflareDatabase } from './cloudflare-database.ts'
import { StrataCore, Fault } from './core.ts'
import { api, json,body } from './api.ts'
import {workerDecisions} from './worker-decisions.ts'
import {AgentAccess} from './agent-access.ts'
import {agentRoutes} from './agent-mcp.ts'
import {BrowserAuth} from './oauth.ts'
import {Discovery,sourceFetcher} from './discovery.ts'
import {Resident,parseResidentWork,type ResidentWork} from './resident.ts'
import {piResidentProvider} from './resident-provider.ts'

export class StrataNode extends DurableObject<Cloudflare.Env> {
  private handle!: (request: Request) => Promise<Response>
  private resident?:Resident
  private discovery?:Discovery
  private sourceOperatorAllowed:(id:string)=>boolean=()=>false
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx,env)
    ctx.blockConcurrencyWhile(async()=>{
      const core=new StrataCore(new CloudflareDatabase(ctx.storage),env.STRATA_ORIGIN,()=>Date.now(),{collection:env.STRATA_COLLECTION})
      const sourceOrigins=(env.STRATA_SOURCE_ORIGINS??'').split(',').map(x=>x.trim()).filter(Boolean)
      const acquire=sourceOrigins.length?sourceFetcher(sourceOrigins):undefined
      const residentProvider=env.RESIDENT_PI?piResidentProvider(env.RESIDENT_PI,env.STRATA_RESIDENT_RESEARCH==='on'):undefined
      core.recoverInterrupted()
      if(env.STRATA_AUTH_MODE==='atproto'){
        if(!env.STRATA_OAUTH_JWK || !env.STRATA_AUTH_SEAL_KEY){
          const publicApi=api(core,{runtime:'cloudflare-durable-object',catalogue:env.STRATA_CATALOGUE,principal:()=>undefined,writeGuard:()=>{throw new Fault(503,'Enrollment unavailable')}})
          const routes=agentRoutes(core,new AgentAccess(core,{operatorAllowed:()=>false}))
          this.handle=async request=>(await routes(request))??(new URL(request.url).pathname.startsWith('/auth/')?json(503,{error:'Sign-in is being configured'}):publicApi(request))
        }else{
          const enrollmentMode=env.STRATA_ENROLLMENT_MODE==='open'?'open':env.STRATA_ENROLLMENT_MODE==='closed'?'closed':'invite'
          const auth=await BrowserAuth.create(core,{origin:env.STRATA_ORIGIN,privateJwk:env.STRATA_OAUTH_JWK,sealKey:env.STRATA_AUTH_SEAL_KEY,
            stewardDid:env.STRATA_STEWARD_DID,allowedHosts:env.STRATA_OAUTH_HOSTS.split(',').map(x=>x.trim()).filter(Boolean),
            collection:env.STRATA_COLLECTION,publishingEnabled:env.STRATA_PUBLISHING_ENABLED==='true',
            enrollmentMode,clientName:env.STRATA_CLIENT_NAME})
          const access=new AgentAccess(core,{stewardDid:env.STRATA_STEWARD_DID,operatorAllowed:id=>auth.operatorAllowed(id)}),routes=agentRoutes(core,access)
          this.resident=new Resident(core,access,residentProvider)
          this.discovery=acquire?new Discovery(core,acquire):undefined
          this.sourceOperatorAllowed=id=>auth.operatorAllowed(id)
          const handler=api(core,{sourceFetcher:acquire,residentProvider,agentAccess:access,decisions:workerDecisions(env),runtime:'cloudflare-durable-object',catalogue:env.STRATA_CATALOGUE,authMode:'atproto',enrollmentMode,stewardDid:env.STRATA_STEWARD_DID,principal:r=>auth.principal(r),writeGuard:r=>auth.writeGuard(r)})
          this.handle=async request=>(await routes(request))??(await auth.route(request))??handler(request)
        }
      }else {const access=new AgentAccess(core),routes=agentRoutes(core,access),handler=api(core,{sourceFetcher:acquire,residentProvider,agentAccess:access,runtime:'cloudflare-durable-object',catalogue:env.STRATA_CATALOGUE});this.resident=new Resident(core,access,residentProvider);this.discovery=acquire?new Discovery(core,acquire):undefined;this.sourceOperatorAllowed=()=>true;this.handle=async r=>(await routes(r))??handler(r)}
    })
  }
  private alarmUpdates:Promise<void>=Promise.resolve()
  private arm(){
    const update=this.alarmUpdates.then(async()=>{
      const candidates=[this.resident?.nextWake(),this.discovery?.nextWake()].filter((n):n is number=>typeof n==='number')
      if(!candidates.length){await this.ctx.storage.deleteAlarm();return}
      await this.ctx.storage.setAlarm(Math.max(Date.now()+1000,Math.min(...candidates)))
    })
    this.alarmUpdates=update.catch(()=>{})
    return update
  }
  async request(request: Request): Promise<Response> { const response=await this.handle(request);await this.arm();return response }
  async residentAuthority(work:ResidentWork,operation:string,input:Record<string,unknown>={}){
    if(!this.resident)throw new Fault(503,'Resident authority is unavailable')
    return this.resident.authority(operation,work,input)
  }
  async alarm(){
    // Persist a recovery wake before network work; an exception cannot strand jobs.
    await this.ctx.storage.setAlarm(Date.now()+60000)
    try{await this.discovery?.tick(this.sourceOperatorAllowed);await this.resident?.tick()}finally{await this.arm()}
  }
}

/** Named binding-only authority for the optional runtime. No public route. */
export class ResidentAuthority extends WorkerEntrypoint<Cloudflare.Env>{
 async fetch(request:Request){
  try{
   const path=new URL(request.url).pathname
   if(request.method!=='POST'||!['/work','/context','/inference','/wiki-search','/web-call','/web-read'].includes(path))return json(404,{error:'Not found'})
   const input=await body(request,8192),work=parseResidentWork(input.work)
   // Only these bounded fields cross the binding; the work capability is re-validated by the node.
   const fields={requestKey:input.requestKey,query:input.query,tool:input.tool,page:input.page}
   return json(200,await this.env.STRATA.getByName(this.env.STRATA_NODE).residentAuthority(work,path.slice(1),fields))
  }catch(error){return json(error instanceof Fault?error.status:503,{error:error instanceof Fault?error.message:'Resident authority unavailable'})}
 }
}

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    try {
      const expected=new URL(env.STRATA_ORIGIN)
      if(new URL(request.url).origin!==expected.origin || expected.href!==expected.origin+'/') return json(400,{error:'Unexpected host'})
      // Fixed deployment-controlled node: untrusted host/path/query cannot select
      // another authority. A separate deployment has a separate DO namespace.
      return await env.STRATA.getByName(env.STRATA_NODE).request(request)
    } catch { return json(503,{error:'Node unavailable'}) }
  },
} satisfies ExportedHandler<Cloudflare.Env>
