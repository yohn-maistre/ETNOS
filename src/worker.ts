import { DurableObject } from 'cloudflare:workers'
import { CloudflareDatabase } from './cloudflare-database.ts'
import { StrataCore, Fault } from './core.ts'
import { api, json } from './api.ts'
import {workerDecisions} from './worker-decisions.ts'
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
          this.handle=async request=>new URL(request.url).pathname.startsWith('/auth/')?json(503,{error:'Sign-in is being configured'}):publicApi(request)
        }else{
          const auth=await BrowserAuth.create(core,{origin:env.STRATA_ORIGIN,privateJwk:env.STRATA_OAUTH_JWK,sealKey:env.STRATA_AUTH_SEAL_KEY,
            stewardDid:env.STRATA_STEWARD_DID,allowedHosts:env.STRATA_OAUTH_HOSTS.split(',').map(x=>x.trim()).filter(Boolean),
            collection:env.STRATA_COLLECTION,publishingEnabled:env.STRATA_PUBLISHING_ENABLED==='true'})
          const handler=api(core,{decisions:workerDecisions(env),runtime:'cloudflare-durable-object',authMode:'atproto',stewardDid:env.STRATA_STEWARD_DID,principal:r=>auth.principal(r),writeGuard:r=>auth.writeGuard(r)})
          this.handle=async request=>(await auth.route(request))??handler(request)
        }
      }else this.handle=api(core,{runtime:'cloudflare-durable-object'})
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
