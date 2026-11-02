/** Optional, bounded public-news port. Forum credentials and queries never cross it. */
export type NewsPlace={name:string;slug:string;latitude:number|null;longitude:number|null}
export type NewsItem={id:string;title:string;url:string;publishedAt:string|null;sourceCount:number;summary:string;image:string|null;imageCredit:string;places:NewsPlace[]}
export type NewsFeed={source:{name:string;url:string};items:NewsItem[];available:boolean}
export type NewsStory=NewsItem & {keyPoints:string[];sources:{title:string;url:string;publisher:string;summary:string}[]}
const source={name:'West Papua Watch',url:'https://westpapua.watch/news/'}
const headers={'cache-control':'public, max-age=60, s-maxage=300','x-content-type-options':'nosniff'}
const unavailable=(state='unavailable',status=503)=>Response.json({source,items:[],available:false},{status,headers:{...headers,'cache-control':'no-store','x-etnos-news-state':state}})
const text=(x:unknown,max=300)=>typeof x==='string'?x.trim().slice(0,max):''
const date=(x:unknown)=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null
const idOK=(id:string)=>/^\d{1,12}$/.test(id)
function https(x:unknown){try{const u=new URL(String(x));return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:null}catch{return null}}
// Fixed publisher CDNs, not a general URL proxy. No cookies, redirects, SVG or HTML.
const imageHosts=new Set(['img.antaranews.com','cdn.antaranews.com','video.antaranews.com','jubi.id','westpapua.watch'])
function imageURL(x:unknown){const url=https(x);return url&&imageHosts.has(new URL(url).hostname)?url:null}
function places(x:unknown):NewsPlace[]{return Array.isArray(x)?x.slice(0,12).flatMap(p=>p&&typeof p==='object'&&text(p.name)?[{name:text(p.name,100),slug:text(p.slug,100),latitude:typeof p.latitude==='number'&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90?p.latitude:null,longitude:typeof p.longitude==='number'&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180?p.longitude:null}]:[]):[]}
async function bounded(response:Response,limit:number){
 if(!response.body)throw Error('empty')
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();throw Error('size')}chunks.push(part.value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return bytes
}
async function read(path:string,fetcher:typeof fetch){
 const response=await fetcher('https://westpapua.watch/api/'+path,{headers:{accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)})
 if(!response.ok)throw Error(response.status===404?'missing':'upstream')
 if(!response.headers.get('content-type')?.includes('json'))throw Error('format')
 return JSON.parse(new TextDecoder().decode(await bounded(response,524288)))
}
export async function publicNews(fetcher:typeof fetch=fetch){
 try{
  const data=await read('current?limit=12',fetcher)
  if(!Array.isArray(data.items))return unavailable('shape')
  const items:NewsItem[]=[],seen=new Set<string>()
  for(const r of data.items.slice(0,24)){
   const id=String(r?.id??''),title=text(r?.title?.id||r?.title?.en)
   if(!idOK(id)||!title||seen.has(id))continue
   seen.add(id)
   const image=['approved','attributed_external'].includes(r.image?.rights_status)&&imageURL(r.image?.url)
   items.push({id,title,url:'https://westpapua.watch/story/?id='+id,publishedAt:date(r.latest_report_at),sourceCount:Number.isSafeInteger(r.source_count)&&r.source_count>0?Math.min(r.source_count,10000):0,summary:text(r.summary?.id||r.summary?.en,2400),image:image?'/v1/news/'+id+'/image':null,imageCredit:image?text(r.image?.credit,150):'',places:places(r.places)})
   if(items.length===12)break
  }
  return Response.json({source,items,available:true} satisfies NewsFeed,{headers})
 }catch{return unavailable()}
}
export async function publicStory(id:string,fetcher:typeof fetch=fetch){
 if(!idOK(id))return unavailable('invalid',404)
 try{
  const data=await read('development/'+id,fetcher),d=data.development
  if(!d||String(d.id)!==id||d.status!=='published')return unavailable('missing',404)
  const articles=Array.isArray(data.articles)?data.articles.slice(0,24):[]
  const sources:NewsStory['sources']=articles.flatMap((a:Record<string,unknown>)=>{const url=https(a.canonical_url);return url?[{title:text(a.title),url,publisher:text(a.publisher,120),summary:text(a.packet_summary||a.summary,1000)}]:[]})
  const image=articles.find((a:Record<string,unknown>)=>imageURL(a.image_url))
  const points=data.synthesis?.key_points?.id||data.synthesis?.key_points?.en
  const story:NewsStory={id,title:text(d.title_id||d.title_en),summary:text(d.summary_id||d.summary_en,12000),url:'https://westpapua.watch/story/?id='+id,publishedAt:date(articles[0]?.published_at)||date(d.updated_at),sourceCount:new Set(sources.map(s=>s.publisher)).size,image:image?'/v1/news/'+id+'/image':null,imageCredit:image?text(image.image_credit,150):'',places:places(data.places),keyPoints:Array.isArray(points)?points.slice(0,8).map(p=>text(p,800)).filter(Boolean):[],sources}
  return Response.json(story,{headers})
 }catch{return unavailable()}
}
export async function publicNewsImage(id:string,fetcher:typeof fetch=fetch,imageFetcher:typeof fetch=fetch){
 if(!idOK(id))return unavailable('invalid',404)
 try{
  const data=await read('development/'+id,fetcher)
  if(String(data.development?.id)!==id||data.development?.status!=='published')return unavailable('missing',404)
  const articles=Array.isArray(data.articles)?data.articles.slice(0,24):[]
  const url=articles.map((a:Record<string,unknown>)=>imageURL(a.image_url)).find(Boolean)
  if(!url)return unavailable('image',404)
  const response=await imageFetcher(url,{redirect:'error',credentials:'omit',headers:{accept:'image/jpeg,image/png,image/webp'},signal:AbortSignal.timeout(8000)})
  const type=response.headers.get('content-type')?.split(';')[0].trim()
  if(!response.ok||!['image/jpeg','image/png','image/webp'].includes(type??''))return unavailable('image',404)
  const bytes=await bounded(response,2097152)
  const valid=type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/png'?bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'
  if(!valid)return unavailable('image',404)
  return new Response(bytes,{headers:{...headers,'content-type':type!,'cache-control':'public, max-age=3600, s-maxage=86400','content-security-policy':"default-src 'none'",'referrer-policy':'no-referrer'}})
 }catch{return unavailable('image',404)}
}
