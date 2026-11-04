import { DurableObject } from 'cloudflare:workers'
import { CloudflareDatabase } from './cloudflare-database.ts'
import { StrataCore, Fault } from './core.ts'
import { api, json } from './api.ts'
import {workerDecisions} from './worker-decisions.ts'
import {AgentAccess} from './agent-access.ts'
import {agentRoutes} from './agent-mcp.ts'
import {BrowserAuth} from './oauth.ts'

export class StrataNode extends DurableObject<Cloudflare.Env> {
  private handle!: (request: Request) => Promise<Response>
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx,env)
    ctx.blockConcurrencyWhile(async()=>{
      const core=new StrataCore(new CloudflareDatabase(ctx.storage),env.STRATA_ORIGIN,()=>Date.now(),{collection:env.STRATA_COLLECTION})
      core.recoverInterrupted()
      if(env.STRATA_AUTH_MODE==='atproto'){
        if(!env.STRATA_OAUTH_JWK || !env.STRATA_AUTH_SEAL_KEY){
          const publicApi=api(core,{runtime:'cloudflare-durable-object',principal:()=>undefined,writeGuard:()=>{throw new Fault(503,'Enrollment unavailable')}})
          const routes=agentRoutes(core,new AgentAccess(core,{operatorAllowed:()=>false}))
          this.handle=async request=>(await routes(request))??(new URL(request.url).pathname.startsWith('/auth/')?json(503,{error:'Sign-in is being configured'}):publicApi(request))
        }else{
          const enrollmentMode=env.STRATA_ENROLLMENT_MODE==='open'?'open':env.STRATA_ENROLLMENT_MODE==='closed'?'closed':'invite'
          const auth=await BrowserAuth.create(core,{origin:env.STRATA_ORIGIN,privateJwk:env.STRATA_OAUTH_JWK,sealKey:env.STRATA_AUTH_SEAL_KEY,
            stewardDid:env.STRATA_STEWARD_DID,allowedHosts:env.STRATA_OAUTH_HOSTS.split(',').map(x=>x.trim()).filter(Boolean),
            collection:env.STRATA_COLLECTION,publishingEnabled:env.STRATA_PUBLISHING_ENABLED==='true',
            enrollmentMode,clientName:env.STRATA_CLIENT_NAME})
          const access=new AgentAccess(core,{stewardDid:env.STRATA_STEWARD_DID,operatorAllowed:id=>auth.operatorAllowed(id)}),routes=agentRoutes(core,access)
          const handler=api(core,{agentAccess:access,decisions:workerDecisions(env),runtime:'cloudflare-durable-object',authMode:'atproto',enrollmentMode,stewardDid:env.STRATA_STEWARD_DID,principal:r=>auth.principal(r),writeGuard:r=>auth.writeGuard(r)})
          this.handle=async request=>(await routes(request))??(await auth.route(request))??handler(request)
        }
      }else {const access=new AgentAccess(core),routes=agentRoutes(core,access),handler=api(core,{agentAccess:access,runtime:'cloudflare-durable-object'});this.handle=async r=>(await routes(r))??handler(r)}
    })
  }
  async request(request: Request): Promise<Response> { return this.handle(request) }
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
