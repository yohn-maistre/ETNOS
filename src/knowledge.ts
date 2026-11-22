import {randomUUID} from 'node:crypto'
import {EtnosCore,Fault} from './core.ts'
import {Wiki} from './wiki.ts'
import {text,citations,readScope,transition,expected,emit,invalidateContext} from './commons.ts'
import {Discovery} from './discovery.ts'
export type KnowledgeNote={id:string;community_id:string;author_id:string;title:string;text:string;kind:'note'|'question'|'memory'|'source-comparison';citations:string;language:string;state:'working'|'promoted'|'withdrawn';revision:number;created:number;updated:number;editorial_mandate_id:string|null;wiki_page_id:string|null}
export class Knowledge{
 readonly store:EtnosCore
 constructor(store:EtnosCore){this.store=store}
 private scope(communityId:string,actorId?:string){const c=readScope(this.store,communityId,actorId);if(c.visibility!=='public'&&actorId&&this.store.actor(actorId).kind!=='human')throw new Fault(404,'Not found');return c}
 private row(id:string,actorId?:string){const r=this.store.get<KnowledgeNote>('SELECT * FROM knowledge_notes WHERE id=?',id);if(!r||r.state==='withdrawn')throw new Fault(404,'Not found');this.scope(r.community_id,actorId);return r}
 private author(actorId:string,communityId:string,mandateId?:string){
  const s=this.store,c=this.scope(communityId,actorId);s.requireMember(actorId,communityId)
  if(s.actor(actorId).kind==='agent'){
   if(c.visibility!=='public'||!mandateId)throw new Fault(403,'Editorial proposal mandate required')
   new Wiki(s).checkProposalAuthority(actorId,communityId,mandateId)
   if(s.get<{n:number}>('SELECT count(*) n FROM knowledge_notes WHERE author_id=? AND created>?',actorId,s.clock()-3600000)!.n>=5)throw new Fault(429,'Working knowledge agent budget reached')
  }
 }
 private view(r:KnowledgeNote){
  const author=this.store.actor(r.author_id)
  const evidence=this.store.all<{id:string;title:string;url:string;state:string;revision:number;expectedRevision:number;current:number}>(`SELECT i.id,i.title,i.url,i.state,i.revision,e.item_revision expectedRevision,
   EXISTS(SELECT 1 FROM discovery_evidence de JOIN discovery_sources ds ON ds.id=de.source_id WHERE de.item_id=i.id AND ds.state='active' AND ds.revision=de.source_revision) current FROM knowledge_evidence e JOIN discovery_items i ON i.id=e.item_id WHERE e.note_id=?`,r.id)
  return {...r,citations:JSON.parse(r.citations) as string[],author:{id:author.id,name:author.name,kind:author.kind},evidence,evidenceStatus:evidence.some(e=>e.state!=='published'||e.revision!==e.expectedRevision||!e.current)?'needs-review' as const:'current' as const,artifact:{kind:'knowledge' as const,id:r.id,revision:r.revision,communityId:r.community_id},availableActions:{edit: false,promote:false}}
 }
 read(id:string,actorId?:string){const r=this.row(id,actorId),human=actorId&&this.store.actor(actorId).kind==='human',member=actorId&&this.store.membership(actorId,r.community_id),edit=!!human&&!!member&&(r.author_id===actorId||['owner','moderator'].includes(member.role)),promote=!!human&&!!member&&['owner','moderator'].includes(member.role)&&this.store.community(r.community_id).visibility==='public'&&r.state==='working';return {...this.view(r),availableActions:{edit:edit&&r.state==='working',promote}}}
 list(actorId?:string,communityId?:string){
  if(communityId)this.scope(communityId,actorId)
  return this.store.all<KnowledgeNote>(`SELECT n.* FROM knowledge_notes n JOIN communities c ON c.id=n.community_id WHERE n.state!='withdrawn' AND (? IS NULL OR n.community_id=?) AND (c.visibility='public' OR (EXISTS(SELECT 1 FROM actors a WHERE a.id=? AND a.kind='human') AND EXISTS(SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.actor_id=? AND m.active=1))) ORDER BY n.updated DESC,n.id DESC LIMIT 100`,communityId??null,communityId??null,actorId??null,actorId??null).map(n=>this.read(n.id,actorId))
 }
 /** Public provisional reading is a deliberate projection, never the proposal queue. */
 discoverPublic(){
  return this.store.all<KnowledgeNote>("SELECT n.* FROM knowledge_notes n JOIN communities c ON c.id=n.community_id WHERE c.visibility='public' AND n.state='working' ORDER BY n.updated DESC,n.id DESC LIMIT 40").map(n=>{const view=this.read(n.id);return {id:n.id,community_id:n.community_id,title:n.title,excerpt:n.text.replace(/<[^>]*>/g,' ').replace(/[#*_`>\[\]]/g,'').replace(/\s+/g,' ').trim().slice(0,240),updated:n.updated,language:n.language,citationCount:view.citations.length,author:view.author,evidenceStatus:view.evidenceStatus,review:'provisional' as const}})
 }
 create(actorId:string,b:Record<string,unknown>){
  const input={communityId:text(b.communityId,100),title:text(b.title,160),text:text(b.text,20000),kind:b.kind??'note',citations:citations(b.citations??[]),language:text(b.language??'id',40),evidenceIds:b.evidenceIds??[],editorialMandateId:b.editorialMandateId===undefined?undefined:text(b.editorialMandateId,100)}
  if(!['note','question','memory','source-comparison'].includes(String(input.kind)))throw new Fault(400,'Invalid working knowledge kind')
  if(!Array.isArray(input.evidenceIds)||input.evidenceIds.length>20||input.evidenceIds.some(id=>typeof id!=='string'))throw new Fault(400,'At most 20 evidence items')
  return transition(this.store,actorId,b.requestKey,'knowledge.create',input,()=>this.author(actorId,input.communityId,input.editorialMandateId),()=>{
   const s=this.store,evidence=(input.evidenceIds as string[]).map(id=>new Discovery(s).item(id))
   if(evidence.some(e=>e.community_id!==input.communityId||!e.evidence.some(x=>x.state==='active'&&x.sourceRevision===x.currentRevision)))throw new Fault(409,'Evidence scope or current source policy does not match')
   const id=randomUUID(),now=s.clock();s.run("INSERT INTO knowledge_notes VALUES(?,?,?,?,?,?,?,?,'working',1,?,?,?,NULL)",id,input.communityId,actorId,input.title,input.text,String(input.kind),JSON.stringify(input.citations),input.language,now,now,input.editorialMandateId??null)
   for(const item of evidence)s.run('INSERT OR IGNORE INTO knowledge_evidence VALUES(?,?,?)',id,item.id,item.revision)
   this.snapshot(actorId,id);emit(s,actorId,'knowledge.create',{kind:'knowledge',id,revision:1,communityId:input.communityId});return this.read(id,actorId)
  })
 }
 private snapshot(actorId:string,id:string){const n=this.store.get<KnowledgeNote>('SELECT * FROM knowledge_notes WHERE id=?',id)!;this.store.run('INSERT INTO knowledge_history VALUES(?,?,?,?,?,?,?,?,?,?,?)',randomUUID(),id,n.revision,actorId,n.title,n.text,n.citations,n.kind,n.language,n.state,this.store.clock())}
 private editAuthority(actorId:string,id:string){const n=this.row(id,actorId),s=this.store;if(s.actor(actorId).kind!=='human')throw new Fault(403,'Human contributor required');s.requireMember(actorId,n.community_id);if(n.author_id!==actorId)s.requireSteward(actorId,n.community_id);return n}
 update(actorId:string,id:string,b:Record<string,unknown>){
  const input={id,revision:b.revision,title:text(b.title,160),text:text(b.text,20000),citations:citations(b.citations??[])}
  return transition(this.store,actorId,b.requestKey,'knowledge.edit',input,()=>{this.editAuthority(actorId,id)},()=>{
   const s=this.store,n=this.row(id,actorId);expected(input.revision,n.revision);if(n.state!=='working')throw new Fault(409,'This note was promoted; propose a Wiki revision instead')
   invalidateContext(s,n.community_id);s.run('UPDATE knowledge_notes SET title=?,text=?,citations=?,revision=revision+1,updated=? WHERE id=?',input.title,input.text,JSON.stringify(input.citations),s.clock(),id);this.snapshot(actorId,id);emit(s,actorId,'knowledge.edit',{kind:'knowledge',id,revision:n.revision+1,communityId:n.community_id});return this.read(id,actorId)
  })
 }
 withdraw(actorId:string,id:string,b:Record<string,unknown>){
  return transition(this.store,actorId,b.requestKey,'knowledge.withdraw',{id,revision:b.revision},()=>{this.editAuthority(actorId,id)},()=>{
   const s=this.store,n=this.row(id,actorId);expected(b.revision,n.revision);invalidateContext(s,n.community_id);s.run("UPDATE knowledge_notes SET title='',text='',citations='[]',state='withdrawn',revision=revision+1,updated=? WHERE id=?",s.clock(),id);s.run("UPDATE knowledge_history SET title='',text='',citations='[]' WHERE note_id=?",id);emit(s,actorId,'knowledge.withdraw',{kind:'knowledge',id,revision:n.revision+1,communityId:n.community_id});return {id,state:'withdrawn'}
  })
 }
 promote(actorId:string,id:string,b:Record<string,unknown>){
  return transition(this.store,actorId,b.requestKey,'knowledge.promote',{id,revision:b.revision},()=>{const n=this.row(id,actorId);this.store.requireSteward(actorId,n.community_id);if(this.store.community(n.community_id).visibility!=='public')throw new Fault(403,'Protected notes cannot be promoted into the public Wiki')},()=>{
   const s=this.store,n=this.read(id,actorId);expected(b.revision,n.revision)
   if(n.state!=='working'||n.evidenceStatus!=='current')throw new Fault(409,'Review this note and its current evidence before promotion')
   if(s.actor(n.author_id).kind==='agent')new Wiki(s).checkProposalAuthority(n.author_id,n.community_id,n.editorial_mandate_id??'')
   const page=new Wiki(s).createDraft(actorId,n.community_id,n.title,{text:n.text,citations:n.citations,language:n.language,perspective:'Working contribution by '+n.author.name})
   s.run("UPDATE knowledge_notes SET state='promoted',wiki_page_id=?,revision=revision+1,updated=? WHERE id=?",page.id,s.clock(),id);this.snapshot(actorId,id);emit(s,actorId,'knowledge.promote',{kind:'knowledge',id,revision:n.revision+1,communityId:n.community_id});return {noteId:id,pageId:page.id,state:'pending-review'}
  })
 }
 history(id:string,actorId?:string){this.row(id,actorId);return this.store.all<{id:string;revision:number;title:string;text:string;citations:string;kind:string;language:string;state:string;created:number}>('SELECT id,revision,title,text,citations,kind,language,state,created FROM knowledge_history WHERE note_id=? ORDER BY revision DESC LIMIT 100',id).map(n=>({...n,citations:JSON.parse(n.citations) as string[]}))}
}
