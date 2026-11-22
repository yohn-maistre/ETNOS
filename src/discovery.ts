import {randomUUID} from 'node:crypto'
import {SaxesParser} from 'saxes'
import {EtnosCore,Fault} from './core.ts'
import {text,publicURL,publicSteward,transition,expected,emit,hash,invalidateContext} from './commons.ts'

export type SourceRow={id:string;community_id:string;owner_id:string;title:string;url:string;kind:'news'|'reference';language:string;mode:'index'|'review'|'news';rights:'link-only'|'excerpt-permitted'|'open';terms_url:string;state:'active'|'paused'|'withdrawn';revision:number;created:number;updated:number;last_attempt:number|null;last_success:number|null;last_error:string|null}
export type ItemRow={id:string;community_id:string;url:string;title:string;summary:string;published:number|null;language:string;state:'candidate'|'published'|'withdrawn';revision:number;created:number;updated:number;reviewer_id:string|null}
export type FeedEntry={url:string;title:string;summary:string;published:number|null}
export type SourceFetcher=(url:string,signal:AbortSignal)=>Promise<Response>
const plain=(v:string,max:number)=>v.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,max)
const date=(value:string)=>{const n=Date.parse(value);return Number.isFinite(n)&&n>0?n:null}
/** Strict bounded RSS/Atom/JSON Feed reader. No HTML execution, DTD or entity fetching. */
export function parseFeed(raw:string):FeedEntry[]{
 if(new TextEncoder().encode(raw).byteLength>524288)throw new Fault(413,'Feed is too large')
 const entries:FeedEntry[]=[]
 const add=(candidate:{url?:string;title?:string;summary?:string;published?:string})=>{
  if(entries.length>=50)return
  try{const title=plain(candidate.title??'',240);if(!title)return;entries.push({url:publicURL(candidate.url),title,summary:plain(candidate.summary??'',600),published:date(candidate.published??'')})}catch{/* Invalid entries are excluded; their URLs are never fetched. */}
 }
 if(raw.trimStart().startsWith('{')){
  const feed=JSON.parse(raw) as {version?:string;items?:unknown[]}
  if(!feed.version?.startsWith('https://jsonfeed.org/version/')||!Array.isArray(feed.items)||feed.items.length>1000)throw new Fault(400,'Unsupported feed')
  for(const value of feed.items.slice(0,100)){if(!value||typeof value!=='object')continue;const e=value as Record<string,unknown>;add({url:typeof e.url==='string'?e.url:undefined,title:typeof e.title==='string'?e.title:undefined,summary:typeof e.summary==='string'?e.summary:typeof e.content_text==='string'?e.content_text:undefined,published:typeof e.date_published==='string'?e.date_published:undefined})}
  return entries
 }
 let depth=0,entryDepth=0,field='',fieldDepth=0,root='';let current:Record<string,string>|null=null
 const parser=new SaxesParser({xmlns:true})
 parser.on('doctype',()=>{throw new Fault(400,'Feed DTDs are not permitted')})
 parser.on('opentag',tag=>{
  depth++;if(depth>32)throw new Fault(400,'Feed nesting is too deep')
  if(depth===1)root=tag.local
  if((tag.local==='item'||tag.local==='entry')&&!current){current={};entryDepth=depth;return}
  if(!current)return
  const name=tag.local.toLowerCase()
  if(depth===entryDepth+1&&['title','link','description','summary','content','pubdate','published','date'].includes(name)){
   field=name;fieldDepth=depth
   if(name==='link'){
    const a=Object.values(tag.attributes),href=a.find(x=>x.local==='href')?.value,rel=a.find(x=>x.local==='rel')?.value
    if(href&&(!rel||rel==='alternate'))current.url=href
   }
  }
 })
 const append=(value:string)=>{if(current&&field)current[field]=((current[field]??'')+value).slice(0,8000)}
 parser.on('text',append);parser.on('cdata',append)
 parser.on('closetag',()=>{
  if(current&&depth===entryDepth){add({url:current.url||current.link,title:current.title,summary:current.summary||current.description||current.content,published:current.published||current.pubdate||current.date});current=null;field=''}
  if(depth===fieldDepth)field='';depth--
 })
 try{parser.write(raw).close()}catch(error){if(error instanceof Fault)throw error;throw new Fault(400,'Feed XML is malformed')}
 if(!['rss','feed','RDF'].includes(root))throw new Fault(400,'An RSS, Atom or JSON feed is required')
 return entries
}
/** Deployment-approved exact origins only. Operator source input cannot widen egress.
 * Unknown hosts need explicit deployment approval; redirects are deliberately refused.
 * DNS safety for an approved host remains part of deployment approval, not a regex claim. */
export function sourceFetcher(origins:string[],upstream:typeof fetch=fetch):SourceFetcher{
 const allowed=new Set(origins.map(value=>new URL(publicURL(value)).origin))
 return async(url,signal)=>{
  const target=publicURL(url);if(!allowed.has(new URL(target).origin))throw new Fault(503,'This source host needs deployment approval')
  const response=await upstream(target,{method:'GET',headers:{accept:'application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml;q=0.9','user-agent':'ETNOS-Discovery/0.1 (+source-registry)'},redirect:'manual',credentials:'omit',signal})
  if(response.status>=300&&response.status<400){await response.body?.cancel();throw new Fault(502,'Source redirects require an updated approved URL')}
  return response
 }
}
export class Discovery{
 readonly store:EtnosCore
 readonly fetcher?:SourceFetcher
 constructor(store:EtnosCore,fetcher?:SourceFetcher){this.store=store;this.fetcher=fetcher}
 source(actorId:string,id:string){const r=this.store.get<SourceRow>('SELECT * FROM discovery_sources WHERE id=?',id);if(!r)throw new Fault(404,'Not found');publicSteward(this.store,actorId,r.community_id);return r}
 sources(actorId:string,communityId:string){publicSteward(this.store,actorId,communityId);return this.store.all<SourceRow>('SELECT * FROM discovery_sources WHERE community_id=? ORDER BY title LIMIT 100',communityId)}
 add(actorId:string,b:Record<string,unknown>){
  const communityId=text(b.communityId,100),input={communityId,title:text(b.title,120),url:publicURL(b.url),kind:b.kind??'news',language:text(b.language??'id',40),mode:b.mode??'review',rights:b.rights??'link-only',termsUrl:b.termsUrl?publicURL(b.termsUrl):''}
  if(!['news','reference'].includes(String(input.kind))||!['index','review','news'].includes(String(input.mode))||!['link-only','excerpt-permitted','open'].includes(String(input.rights)))throw new Fault(400,'Invalid source policy')
  return transition(this.store,actorId,b.requestKey,'discovery.source.add',input,()=>publicSteward(this.store,actorId,communityId),()=>{
   const s=this.store;if(s.get<{n:number}>('SELECT count(*) n FROM discovery_sources WHERE community_id=?',communityId)!.n>=50)throw new Fault(429,'Community source limit reached')
   if(s.get('SELECT 1 FROM discovery_sources WHERE community_id=? AND url=?',communityId,input.url))throw new Fault(409,'This source is already registered')
   const id=randomUUID(),now=s.clock();s.run("INSERT INTO discovery_sources(id,community_id,owner_id,title,url,kind,language,mode,rights,terms_url,state,revision,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,'active',1,?,?)",id,communityId,actorId,input.title,input.url,String(input.kind),input.language,String(input.mode),String(input.rights),input.termsUrl,now,now)
   emit(s,actorId,'discovery.source.add',{kind:'source',id,revision:1,communityId});return this.source(actorId,id)
  })
 }
 state(actorId:string,id:string,b:Record<string,unknown>){
  if(!['active','paused','withdrawn'].includes(String(b.state)))throw new Fault(400,'Invalid source state')
  return transition(this.store,actorId,b.requestKey,'discovery.source.state',{id,revision:b.revision,state:b.state},()=>{this.source(actorId,id)},()=>{
   const s=this.store,r=this.source(actorId,id);expected(b.revision,r.revision);s.run('UPDATE discovery_sources SET state=?,revision=revision+1,updated=? WHERE id=?',String(b.state),s.clock(),id)
   invalidateContext(s,r.community_id)
   if(b.state==='withdrawn')s.run("UPDATE discovery_items SET state='withdrawn',revision=revision+1,updated=? WHERE id IN(SELECT item_id FROM discovery_evidence WHERE source_id=?)",s.clock(),id)
   emit(s,actorId,'discovery.source.state',{kind:'source',id,revision:r.revision+1,communityId:r.community_id});return this.source(actorId,id)
  })
 }
 async refresh(actorId:string,id:string,recheck:()=>void=()=>{}){
  const s=this.store,source=this.source(actorId,id)
  if(source.state!=='active')throw new Fault(409,'Source is not active')
  if(!this.fetcher)throw new Fault(503,'Source acquisition is not configured')
  const attempt=s.tx(()=>{
   recheck();this.source(actorId,id)
   if(source.last_attempt!==null&&source.last_attempt>s.clock()-60000)throw new Fault(429,'Wait one minute before checking this source again')
   if(s.get<{n:number}>('SELECT count(*) n FROM discovery_attempts WHERE created>?',s.clock()-86400000)!.n>=100)throw new Fault(429,'Daily source acquisition budget reached')
   const key=randomUUID();s.run("INSERT INTO discovery_attempts(id,source_id,source_revision,actor_id,created,state) VALUES(?,?,?,?,?,'running')",key,id,source.revision,actorId,s.clock());s.run('UPDATE discovery_sources SET last_attempt=?,last_error=NULL WHERE id=?',s.clock(),id);return key
  })
  try{
   const response=await this.fetcher(source.url,AbortSignal.timeout(12000))
   if(!response.ok||!response.body){await response.body?.cancel();throw new Fault(502,'Source is unavailable')}
   if(!/^(application\/(rss\+xml|atom\+xml|feed\+json|json|xml)|text\/(xml|plain))(;|$)/i.test(response.headers.get('content-type')??'')){await response.body.cancel();throw new Fault(415,'Source did not return a supported feed')}
   const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>524288)throw new Fault(413,'Feed is too large');parts.push(value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
   const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes),entries=parseFeed(raw),digest=hash(raw)
   return s.tx(()=>{
    recheck();const current=this.source(actorId,id);if(current.revision!==source.revision||current.state!=='active')throw new Fault(409,'Source policy changed during acquisition')
    for(const entry of entries){
     const prior=s.get<ItemRow>('SELECT * FROM discovery_items WHERE community_id=? AND url=?',source.community_id,entry.url),itemId=prior?.id??randomUUID(),summary=source.rights==='link-only'?'':entry.summary,changed=!!prior&&(prior.title!==entry.title||prior.summary!==summary||prior.published!==entry.published)
     if(!prior)s.run("INSERT INTO discovery_items VALUES(?,?,?,?,?,?,?,'candidate',1,?,?,NULL)",itemId,source.community_id,entry.url,entry.title,summary,entry.published,source.language,s.clock(),s.clock())
     else if(changed||prior.state==='withdrawn'){invalidateContext(s,source.community_id);s.run("UPDATE discovery_items SET title=?,summary=?,published=?,revision=revision+1,state='candidate',reviewer_id=NULL,updated=? WHERE id=?",entry.title,summary,entry.published,s.clock(),itemId)}
     s.run('INSERT INTO discovery_evidence VALUES(?,?,?,?,?) ON CONFLICT(item_id,source_id) DO UPDATE SET source_revision=excluded.source_revision,digest=excluded.digest,observed=excluded.observed',itemId,id,source.revision,hash(entry),s.clock())
     // Auto-eligibility is explicit and only applies to current low-risk news policy.
     if(source.mode==='news'&&source.kind==='news')s.run("UPDATE discovery_items SET state='published',updated=? WHERE id=? AND state='candidate'",s.clock(),itemId)
    }
    s.run("UPDATE discovery_attempts SET state='succeeded',digest=?,item_count=? WHERE id=?",digest,entries.length,attempt);s.run('UPDATE discovery_sources SET last_success=?,last_error=NULL WHERE id=?',s.clock(),id)
    emit(s,actorId,'discovery.refresh',{kind:'source',id,revision:source.revision,communityId:source.community_id});return {attemptId:attempt,sourceId:id,count:entries.length,digest}
   })
  }catch(error){
   const message=error instanceof Fault?error.message:'Source acquisition failed; retry is explicit'
   s.tx(()=>{s.run("UPDATE discovery_attempts SET state='failed',error=? WHERE id=?",message,attempt);s.run('UPDATE discovery_sources SET last_error=? WHERE id=?',message,id)})
   throw error instanceof Fault?error:new Fault(502,message)
  }
 }
 items(actorId?:string,communityId?:string,review=false){
  if(review){if(!actorId||!communityId)throw new Fault(401,'Sign in to review sources');publicSteward(this.store,actorId,communityId)}
  return this.store.all<ItemRow>(`SELECT i.* FROM discovery_items i JOIN communities c ON c.id=i.community_id WHERE c.visibility='public' AND (? IS NULL OR i.community_id=?) AND (?=1 OR (i.state='published' AND EXISTS(SELECT 1 FROM discovery_evidence de JOIN discovery_sources ds ON ds.id=de.source_id WHERE de.item_id=i.id AND ds.state='active' AND ds.revision=de.source_revision))) ORDER BY i.updated DESC,i.id DESC LIMIT 100`,communityId??null,communityId??null,Number(review)).map(r=>this.view(r))
 }
 item(id:string,actorId?:string,review=false){
  const row=this.store.get<ItemRow>('SELECT * FROM discovery_items WHERE id=?',id);if(!row||this.store.community(row.community_id).visibility!=='public')throw new Fault(404,'Not found')
  if(row.state!=='published'){if(!actorId||!review)throw new Fault(404,'Not found');publicSteward(this.store,actorId,row.community_id)}
  const result=this.view(row);if(!review&&!result.evidence.some(e=>e.state==='active'&&e.sourceRevision===e.currentRevision))throw new Fault(404,'Not found');return result
 }
 private view(row:ItemRow){return {...row,evidence:this.store.all<{sourceId:string;title:string;url:string;rights:string;sourceRevision:number;currentRevision:number;state:string;observed:number}>('SELECT s.id sourceId,s.title,s.url,s.rights,e.source_revision sourceRevision,s.revision currentRevision,s.state,e.observed FROM discovery_evidence e JOIN discovery_sources s ON s.id=e.source_id WHERE e.item_id=? ORDER BY s.title',row.id),artifact:{kind:'news' as const,id:row.id,revision:row.revision,communityId:row.community_id}}}
 decide(actorId:string,id:string,b:Record<string,unknown>){
  if(!['published','withdrawn'].includes(String(b.state)))throw new Fault(400,'Choose publish or withdraw')
  const r=this.store.get<ItemRow>('SELECT * FROM discovery_items WHERE id=?',id);if(!r)throw new Fault(404,'Not found')
  return transition(this.store,actorId,b.requestKey,'discovery.item.state',{id,revision:b.revision,state:b.state},()=>publicSteward(this.store,actorId,r.community_id),()=>{
   const current=this.item(id,actorId,true);expected(b.revision,current.revision)
   if(b.state==='published'&&!current.evidence.some(e=>e.state==='active'&&e.sourceRevision===e.currentRevision))throw new Fault(409,'No current eligible source; acquire or review again')
   invalidateContext(this.store,r.community_id);this.store.run('UPDATE discovery_items SET state=?,revision=revision+1,reviewer_id=?,updated=? WHERE id=?',String(b.state),actorId,this.store.clock(),id);emit(this.store,actorId,'discovery.item.state',{kind:'news',id,revision:current.revision+1,communityId:r.community_id});return this.item(id,actorId,true)
  })
 }
 async tick(operatorAllowed:(id:string)=>boolean){
  if(!this.fetcher)return
  const s=this.store
  for(const source of s.all<SourceRow>("SELECT * FROM discovery_sources WHERE state='active' AND last_success IS NOT NULL AND (last_attempt IS NULL OR last_attempt<=?) ORDER BY COALESCE(last_attempt,0),created LIMIT 1",s.clock()-3600000)){
   try{if(!operatorAllowed(source.owner_id))throw new Fault(403,'Current source operator required');await this.refresh(source.owner_id,source.id,()=>{if(!operatorAllowed(source.owner_id))throw new Fault(403,'Current source operator required')})}
   catch{ s.run('UPDATE discovery_sources SET last_attempt=?,last_error=? WHERE id=?',s.clock(),'Scheduled refresh unavailable; inspect source authority, host approval or quota',source.id) }
  }
 }
 nextWake(){if(!this.fetcher)return null;const r=this.store.get<{next:number|null}>("SELECT MIN(COALESCE(last_attempt,?)+3600000) next FROM discovery_sources WHERE state='active' AND last_success IS NOT NULL",this.store.clock()-3600000);return r?.next??null}
}
