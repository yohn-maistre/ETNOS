import backend,{StrataNode} from './worker.ts'
import {json} from './api.ts'
export {StrataNode}
type WebEnv=Cloudflare.Env & {ASSETS:Fetcher}
export default {
  async fetch(request:Request,env:WebEnv):Promise<Response>{
    const url=new URL(request.url)
    if(url.origin!==env.STRATA_ORIGIN)return json(400,{error:'Unexpected host'})
    if(url.pathname==='/health'||/^\/(v1|auth|oauth)(\/|$)/.test(url.pathname))return backend.fetch(request,env)
    if(request.method!=='GET'&&request.method!=='HEAD')return json(405,{error:'Method not allowed'})
    const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers)
    headers.set('x-content-type-options','nosniff');headers.set('referrer-policy','no-referrer')
    headers.set('permissions-policy','camera=(), microphone=(), geolocation=()')
    if(headers.get('content-type')?.includes('text/html')){
      headers.set('cache-control','no-store')
      headers.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")
    }
    return new Response(response.body,{status:response.status,headers})
  },
} satisfies ExportedHandler<WebEnv>
