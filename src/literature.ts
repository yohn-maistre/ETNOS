/** Published research for a label, read from OpenAlex. A search result, not a reviewed reading list. */
import type {Catalogue} from './catalogue.ts'
export type Work={title:string;year:number|null;authors:string[];moreAuthors:number;venue:string;url:string;open:boolean;cited:number}
type Label={slug:string;title:string;kind:string;facet?:string|null}
const source={name:'OpenAlex',url:'https://openalex.org'}
const text=(x:unknown,max:number)=>typeof x==='string'?x.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,max):''
const link=(x:unknown)=>{try{const u=new URL(String(x));return u.protocol==='https:'&&u.href.length<=500?u.href:''}catch{return ''}}

/** The search a label runs, or null when the catalogue gives this label no literature. */
export function literatureQuery(label:Label,c:Catalogue):string|null{
 const rules=c.literature;if(!rules)return null
 const family=label.facet||label.kind
 if(!rules.families.includes(c.familyAliases?.[family]??family)||rules.skip?.includes(label.slug))return null
 const name=label.title.replace(/["()]/g,' ').replace(/\s+/g,' ').trim();if(!name)return null
 const term=rules.terms?.[label.slug]??(label.kind==='language'?`"${name}" AND (language OR bahasa)`:`"${name}"`)
 return /papua/i.test(term)?term:`(${term}) AND ${rules.scope}`
}

function work(row:unknown):Work|null{
 if(!row||typeof row!=='object')return null
 const r=row as Record<string,any>,title=text(r.display_name,300),url=link(r.doi)||link(r.primary_location?.landing_page_url)||link(r.id)
 if(!title||!url)return null
 const names=(Array.isArray(r.authorships)?r.authorships:[]).map((a:any)=>text(a?.author?.display_name,80)).filter(Boolean)
 const year=Number.isInteger(r.publication_year)&&r.publication_year>1500&&r.publication_year<2200?r.publication_year:null
 return {title,year,authors:names.slice(0,3),moreAuthors:Math.max(0,names.length-3),venue:text(r.primary_location?.source?.display_name,160),url,open:r.open_access?.is_oa===true,cited:Number.isSafeInteger(r.cited_by_count)&&r.cited_by_count>0?r.cited_by_count:0}
}

/** The key travels in a header to OpenAlex only. It is never part of a URL or of the answer. */
export async function publicLiterature(query:string,key:string|undefined,fetcher:typeof fetch=fetch):Promise<Response>{
 const more='https://openalex.org/works?search='+encodeURIComponent(query)
 const answer=(status:number,body:object,cache:string)=>Response.json({source,query,more,...body},{status,headers:{'cache-control':cache,'x-content-type-options':'nosniff'}})
 if(!key)return answer(503,{available:false,total:0,items:[]},'no-store')
 try{
  const url='https://api.openalex.org/works?per-page=8&select=id,doi,display_name,publication_year,authorships,primary_location,open_access,cited_by_count&search.title_and_abstract='+encodeURIComponent(query)
  const response=await fetcher(url,{headers:{accept:'application/json',authorization:'Bearer '+key},redirect:'manual',signal:AbortSignal.timeout(8000)})
  if(!response.ok)return answer(503,{available:false,total:0,items:[]},'no-store')
  const body=await response.json() as {meta?:{count?:unknown};results?:unknown}
  if(!Array.isArray(body?.results))return answer(503,{available:false,total:0,items:[]},'no-store')
  const items=body.results.slice(0,8).map(work).filter((w):w is Work=>w!==null),count=Number(body.meta?.count)
  return answer(200,{available:true,total:Number.isSafeInteger(count)&&count>=items.length?count:items.length,items},'public, max-age=3600, s-maxage=86400')
 }catch{return answer(503,{available:false,total:0,items:[]},'no-store')}
}
