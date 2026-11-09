/** Public metadata from explicitly supported publishers, never an arbitrary URL fetcher. */
const publishers=new Set(['github.com','en.wikipedia.org','id.wikipedia.org','www.antaranews.com','suarapapua.com','jubi.id','westpapua.watch'])
const covers=new Set(['opengraph.githubassets.com','avatars.githubusercontent.com','upload.wikimedia.org','img.antaranews.com','cdn.antaranews.com','jubi.id','suarapapua.com','westpapua.watch'])
const headers={'cache-control':'public, max-age=300, s-maxage=1800','x-content-type-options':'nosniff'}
const failure=()=>Response.json({available:false},{status:404,headers:{...headers,'cache-control':'no-store'}})
export function previewURL(raw:string){
 if(raw.length>2048)throw Error('url')
 const u=new URL(raw)
 if(u.protocol!=='https:'||u.username||u.password||u.port||!publishers.has(u.hostname))throw Error('publisher')
 u.hash='';const id=u.hostname==='westpapua.watch'?u.searchParams.get('id'):null;u.search='';if(id&&/^\d{1,12}$/.test(id))u.searchParams.set('id',id)
 return u.href
}
async function bytes(response:Response,max:number,prefix=false){if(!response.body)throw Error('empty');const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;try{while(true){const next=await reader.read();if(next.done)break;if(size+next.value.length>max){if(!prefix)throw Error('size');chunks.push(next.value.slice(0,max-size));size=max;await reader.cancel();break}chunks.push(next.value);size+=next.value.length}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length}return result}
const plain=(value:string,max:number)=>value.replace(/&(?:amp|quot|apos|lt|gt|#39|#34);/g,x=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'",'&#34;':'"'}[x]!)).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max)
async function metadata(url:string,fetcher:typeof fetch){
 const response=await fetcher(url,{redirect:'manual',headers:{accept:'text/html'},signal:AbortSignal.timeout(6000)})
 if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('html')
 const html=new TextDecoder().decode(await bytes(response,131072,true)),meta=new Map<string,string>()
 for(const tag of html.match(/<meta\b[^>]{1,4096}>/gi)??[]){const attrs=new Map<string,string>();for(const a of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs.set(a[1].toLowerCase(),a[2]??a[3]);const name=attrs.get('property')??attrs.get('name');if(name&&attrs.has('content')&&!meta.has(name.toLowerCase()))meta.set(name.toLowerCase(),attrs.get('content')!)}
 const title=plain(meta.get('og:title')??meta.get('twitter:title')??html.match(/<title[^>]*>([^<]{1,1000})<\/title>/i)?.[1]??'',240)
 if(!title)throw Error('title')
 let image:string|null=null
 try{const cover=new URL(plain(meta.get('og:image')??'',2048),url);if(meta.get('og:image')&&cover.protocol==='https:'&&!cover.username&&!cover.password&&!cover.port&&covers.has(cover.hostname))image=cover.href}catch{}
 return {title,description:plain(meta.get('og:description')??meta.get('description')??'',400),image}
}
export async function publicLinkPreview(raw:string,image=false,fetcher:typeof fetch=fetch){
 try{
  const url=previewURL(raw),meta=await metadata(url,fetcher)
  if(!image)return Response.json({available:true,url,site:new URL(url).hostname,title:meta.title,description:meta.description,image:meta.image?'/v1/link-preview/image?url='+encodeURIComponent(url):null},{headers})
  if(!meta.image)return failure()
  const response=await fetcher(meta.image,{redirect:'manual',headers:{accept:'image/jpeg,image/png,image/webp'},signal:AbortSignal.timeout(6000)}),type=response.headers.get('content-type')?.split(';')[0].trim()
  if(!response.ok||!['image/jpeg','image/png','image/webp'].includes(type??''))return failure()
  const b=await bytes(response,1048576),valid=type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:type==='image/png'?b.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP'
  if(!valid)return failure()
  return new Response(b,{headers:{...headers,'content-type':type!,'content-security-policy':"default-src 'none'",'referrer-policy':'no-referrer'}})
 }catch{return failure()}
}
