import backend,{StrataNode} from './worker.ts'
import {json} from './api.ts'
import {publicNews} from './news.ts'
export {StrataNode}
type WebEnv=Cloudflare.Env & {ASSETS:Fetcher}
const legacyOrigin='https://strata-preview.giyaibo.workers.dev'
const edgeCache=()=> (caches as unknown as {default:Cache}).default
export default {
  async fetch(request:Request,env:WebEnv):Promise<Response>{
    const url=new URL(request.url)
    if(url.origin!==env.STRATA_ORIGIN){
      // The old origin remains a browser-local vault recovery surface only.
      // Never redirect writes or OAuth callbacks with transient credentials.
      if(url.origin!==legacyOrigin || env.STRATA_ORIGIN!=='https://etnos.space')return json(400,{error:'Unexpected host'})
      if(request.method!=='GET' && request.method!=='HEAD')return json(405,{error:'Use the canonical origin'})
      const recovery=url.pathname==='/recover-messages' || /^\/assets\/[A-Za-z0-9_.-]+$/.test(url.pathname)
      if(!recovery){
        const location=/^\/(auth|oauth)(\/|$)/.test(url.pathname)?env.STRATA_ORIGIN+'/login':env.STRATA_ORIGIN+url.pathname+url.search
        return new Response(null,{status:302,headers:{location,'cache-control':'no-store','referrer-policy':'no-referrer'}})
      }
      const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers)
      headers.set('cache-control','no-store');headers.set('referrer-policy','no-referrer');headers.set('x-content-type-options','nosniff')
      headers.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'")
      return new Response(response.body,{status:response.status,headers})
    }
    if(url.pathname==='/v1/news'){
      if(request.method!=='GET')return json(405,{error:'Method not allowed'})
      const key=new Request(url.origin+'/v1/news'),cached=await edgeCache().match(key)
      if(cached)return cached
      const response=await publicNews()
      if(response.ok)await edgeCache().put(key,response.clone())
      return response
    }
    if(url.pathname==='/health'||/^\/(v1|auth|oauth)(\/|$)/.test(url.pathname))return backend.fetch(request,env)
    if(request.method!=='GET'&&request.method!=='HEAD')return json(405,{error:'Method not allowed'})
    const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers)
    headers.set('x-content-type-options','nosniff');headers.set('referrer-policy','no-referrer')
    headers.set('permissions-policy','camera=(), microphone=(), geolocation=()')
    if(headers.get('content-type')?.includes('text/html')){
      headers.set('cache-control','no-store')
      headers.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")
    }
    return new Response(response.body,{status:response.status,headers})
  },
} satisfies ExportedHandler<WebEnv>
