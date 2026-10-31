import { DurableObject } from 'cloudflare:workers'
import { CloudflareDatabase } from './cloudflare-database.ts'
import { StrataCore } from './core.ts'
import { api, json } from './api.ts'

export class StrataNode extends DurableObject<Cloudflare.Env> {
  private handle!: (request: Request) => Promise<Response>
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx,env)
    ctx.blockConcurrencyWhile(async()=>{
      const core=new StrataCore(new CloudflareDatabase(ctx.storage),env.STRATA_ORIGIN)
      core.recoverInterrupted()
      // Custody fixtures, principal provisioning and public AT publishing are not
      // exposed on the remote profile. No recovery/admin credential HTTP route.
      this.handle=api(core,{runtime:'cloudflare-durable-object'})
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
