import backend,{StrataNode,ResidentAuthority,ModelGateway} from './worker.ts'
import {json} from './api.ts'
import {publicNews,publicStory,publicNewsImage,newsQuery} from './news.ts'
import {publicQuakes} from './ambient.ts'
import {publicLiterature,literatureQuery} from './literature.ts'
import {catalogue} from './catalogue.ts'
import {publicVideo} from './video.ts'
import {publicLinkPreview,previewURL} from './link-preview.ts'
import {resolveShare,shareTags,articleHTML,articleLD,escapeMeta} from './share.ts'
export {StrataNode,ResidentAuthority,ModelGateway}
type WebEnv=Cloudflare.Env & {ASSETS:Fetcher;WATCH_NEWS?:Fetcher}
const legacyOrigin='https://strata-preview.giyaibo.workers.dev'
const edgeCache=()=> (caches as unknown as {default:Cache}).default
async function boundedJSON(response:Response){
  if(!response.ok||!response.body)throw Error('Unavailable public preview')
  const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2097152)throw Error('Preview too large');parts.push(part.value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}return JSON.parse(new TextDecoder().decode(bytes))
}
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
    if(['/mcp','/auth.md','/llms.txt','/agents/token','/.well-known/oauth-protected-resource/mcp','/.well-known/oauth-authorization-server/agents'].includes(url.pathname))return backend.fetch(request,env)
    if(['/v1/link-preview','/v1/link-preview/image'].includes(url.pathname)){
      if(request.method!=='GET')return json(405,{error:'Method not allowed'})
      let target:string;try{target=previewURL(url.searchParams.get('url')??'')}catch{return json(404,{error:'Preview unavailable'})}
      const key=new Request(url.origin+url.pathname+'?url='+encodeURIComponent(target)),cached=await edgeCache().match(key)
      if(cached)return cached
      const response=await publicLinkPreview(target,url.pathname.endsWith('/image'))
      if(response.ok)await edgeCache().put(key,response.clone())
      return response
    }
    const videoRoute=url.pathname.match(/^\/v1\/video-preview\/(youtube|vimeo)\/([A-Za-z0-9_-]{6,12})(\/image)?$/)
    if(videoRoute){
      if(request.method!=='GET')return json(405,{error:'Method not allowed'})
      const key=new Request(url.origin+url.pathname),cached=await edgeCache().match(key)
      if(cached)return cached
      const response=await publicVideo(videoRoute[1],videoRoute[2],Boolean(videoRoute[3]))
      if(response.ok)await edgeCache().put(key,response.clone())
      return response
    }
    if(url.pathname==='/v1/ambient/quakes'){
      if(request.method!=='GET')return json(405,{error:'Method not allowed'})
      const bounds=catalogue((env as {STRATA_CATALOGUE?:string}).STRATA_CATALOGUE).catalogue.bounds
      if(!bounds)return json(404,{error:'Not found'})
      const key=new Request(url.origin+url.pathname),cached=await edgeCache().match(key)
      if(cached)return cached
      const response=await publicQuakes(bounds)
      if(response.ok)await edgeCache().put(key,response.clone())
      return response
    }
    const literatureRoute=url.pathname.match(/^\/v1\/literature\/([-a-z0-9]{1,100})$/)
    if(literatureRoute){
      if(request.method!=='GET')return json(405,{error:'Method not allowed'})
      const key=new Request(url.origin+url.pathname+'?v=2'),cached=await edgeCache().match(key)
      if(cached)return cached
      // An anonymous read: only a label the public can see gets a search.
      let label:{slug:string;title:string;kind:string;facet?:string}
      try{label=await boundedJSON(await backend.fetch(new Request(env.STRATA_ORIGIN+'/v1/contexts/'+literatureRoute[1]),env))}catch{return json(404,{error:'Not found'})}
      const query=literatureQuery(label,catalogue((env as {STRATA_CATALOGUE?:string}).STRATA_CATALOGUE).catalogue)
      if(!query)return json(404,{error:'Not found'})
      const apiKey=await env.STRATA.getByName(env.STRATA_NODE).serviceKey('openalex').catch(()=>(env as {OPENALEX_API_KEY?:string}).OPENALEX_API_KEY)
      const response=await publicLiterature(query,apiKey)
      if(response.ok)await edgeCache().put(key,response.clone())
      return response
    }
    const newsRoute=url.pathname.match(/^\/v1\/news(?:\/(\d{1,12})(\/image)?)?$/)
    if(newsRoute){
      if(request.method!=='GET')return json(405,{error:'Method not allowed'})
      let query=''
      if(!newsRoute[1]){try{query='?'+newsQuery(url.searchParams)}catch{return json(400,{error:'Invalid news filters'})}}
      else if(newsRoute[2]&&url.searchParams.has('asset')){const asset=url.searchParams.get('asset')!;if(!/^[a-f0-9]{24}$/.test(asset))return json(404,{error:'Image unavailable'});query='?asset='+asset}
      const key=new Request(url.origin+url.pathname+query),cached=await edgeCache().match(key)
      if(cached)return cached
      const upstream:typeof fetch=async(input,options)=>{
        if(!env.WATCH_NEWS)return fetch(input,options)
        const target=new URL(String(input))
        try { const response=await env.WATCH_NEWS.fetch(new Request('https://watch.internal'+target.pathname.replace(/^\/api/,'')+target.search,{headers:{accept:'application/json'},signal:options?.signal}));if(response.ok)return response } catch { /* fixed public read fallback */ }
        return fetch(input,options)
      }
      const response=newsRoute[2]?await publicNewsImage(newsRoute[1],upstream,fetch,url.searchParams.get('asset')):newsRoute[1]?await publicStory(newsRoute[1],upstream):await publicNews(upstream,url.searchParams)
      if(response.ok)await edgeCache().put(key,response.clone())
      return response
    }
    if(url.pathname==='/sitemap.xml'){
      // Public pages only: the fixed sections and every public wiki page.
      const key=new Request(url.origin+'/sitemap.xml'),cached=await edgeCache().match(key)
      if(cached)return cached
      let wiki:{id:string;revision_id:string|null;draft?:number}[]=[]
      try{wiki=await boundedJSON(await backend.fetch(new Request(env.STRATA_ORIGIN+'/v1/wiki'),env))}catch{wiki=[]}
      const paths=['/','/explore','/wiki','/news','/communities','/lini-masa',...wiki.filter(w=>w.revision_id&&!w.draft).map(w=>'/wiki/'+w.id)]
      const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>`<url><loc>${escapeMeta(new URL(p,env.STRATA_ORIGIN).href)}</loc></url>`).join('')+'</urlset>'
      const response=new Response(xml,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}})
      await edgeCache().put(key,response.clone())
      return response
    }
    if(url.pathname==='/health'||/^\/(v1|auth|oauth)(\/|$)/.test(url.pathname))return backend.fetch(request,env)
    if(request.method!=='GET'&&request.method!=='HEAD')return json(405,{error:'Method not allowed'})
    const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers)
    headers.set('x-content-type-options','nosniff');headers.set('referrer-policy','no-referrer')
    headers.set('permissions-policy','camera=(), microphone=(), geolocation=()')
    if(headers.get('content-type')?.includes('text/html')){
      headers.set('cache-control','no-store')
      headers.set('content-security-policy',"default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tiles.maps.eox.at https://elevation-tiles-prod.s3.amazonaws.com; font-src 'self' data:; connect-src 'self' https://cloudflareinsights.com https://tiles.maps.eox.at https://elevation-tiles-prod.s3.amazonaws.com; worker-src 'self' blob:; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; media-src https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")
      if(request.method==='GET'&&response.ok){
        // Deliberately construct new anonymous requests: even signed-in readers
        // receive the same public-only sharing projection as an external crawler.
        // Keep local DO RPC requests free of AbortSignal: this compatibility
        // date cannot serialize signals across RPC. These reads only query local SQL.
        const read=async(path:string)=>boundedJSON(await backend.fetch(new Request(env.STRATA_ORIGIN+path),env))
        const newsRead:typeof fetch=async(input,options)=>{const target=new URL(String(input));if(env.WATCH_NEWS){try{const r=await env.WATCH_NEWS.fetch(new Request('https://watch.internal'+target.pathname.replace(/^\/api/,'')+target.search,{signal:options?.signal,headers:{accept:'application/json'}}));if(r.ok)return r}catch{ /* public fallback */ }}return fetch(input,options)}
        const meta=await resolveShare(url.pathname,read,async id=>boundedJSON(await publicStory(id,newsRead)))
        headers.delete('etag');headers.delete('last-modified');headers.delete('content-length')
        if(!meta.index)headers.set('x-robots-tag','noindex, nofollow')
        const article=meta.article
        return new HTMLRewriter().on('#app',{element(e){if(article)e.append(articleHTML(article),{html:true})}}).on('title',{element(e){e.setInnerContent(meta.title==='ETNOS'||meta.title.endsWith(' · ETNOS')?meta.title:meta.title+' · ETNOS')}}).on('meta[name="description"],meta[property^="og:"],meta[name^="twitter:"],meta[name="robots"],link[rel="canonical"]',{element(e){e.remove()}}).on('head',{element(e){e.append(shareTags(meta,env.STRATA_ORIGIN)+(article?articleLD(article,new URL(meta.path,env.STRATA_ORIGIN).href):''),{html:true})}}).transform(new Response(response.body,{status:response.status,headers}))
      }
    }
    return new Response(response.body,{status:response.status,headers})
  },
} satisfies ExportedHandler<WebEnv>
