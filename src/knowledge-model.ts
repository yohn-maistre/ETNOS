/**
 * The knowledge model, first slice (research/epistemic-multiplex-2026-11-19.md §4 and §15,
 * research/knowledge-ontology-2026-11-18.md §4–5): entities (Hal), assertions (Pernyataan)
 * and witnesses (Saksi).
 *
 * Rules carried from AGENTS.md and the two notes:
 * - Every assertion rests on at least one excerpt of a witness. No basis, no statement.
 * - Nothing becomes accepted without a person: seeded catalogue membership is the one exception,
 *   and it rests on the catalogue entry's own text.
 * - What anyone may see is decided when they read: the community must still be public (or the
 *   reader a member), the witness still active, a cited post still present and unchanged. A
 *   withdrawn witness takes every statement that rests only on it out of every view and export.
 * - An assertion may only cite witnesses from its own community or from the node-level commons,
 *   so nothing from one private community can surface through another.
 * - No inference about people: agents may not propose persons or statements about persons, and
 *   kinship and membership predicates only connect groups (and, for kinship, living kinds).
 */
import {randomUUID} from 'node:crypto'
import {EtnosCore,Fault,type Community} from './core.ts'
import {Groups} from './groups.ts'
import {Wiki} from './wiki.ts'
import {hash,text,expected,transition} from './commons.ts'
import {hill} from './knowledge-graph.ts'
import {worldByRule,depthByRule,checkRange,depths,ilcClasses,bandOf,type World,type Depth,type CoordinateBasis} from './world-model.ts'

export const classes=['tempat','makhluk','kelompok','lembaga','orang','benda','bahasa','gagasan','praktik','peristiwa','musim','cerita'] as const
export type EntityClass=typeof classes[number]
/** Who is speaking. The multiplex note's voices, plus encyclopaedia, which is most of today's seed. */
export const voices=['ensiklopedia','pemerintah','akademik','misi','kolonial','penulis-papua','penutur','lainnya'] as const
export const layers=['jejak','tuturan','tafsir'] as const
export const witnessKinds=['document','recording','tuturan','measurement','paper','post','derived'] as const
const logicals=['undisputed','disputed','settled','superseded'] as const
const ranks=['preferred','normal','variant','deprecated'] as const

type Predicate={family:string;subject?:readonly EntityClass[];object?:readonly EntityClass[];literal?:boolean;added?:true}
const groupish=['kelompok','lembaga'] as const
/** The ontology note's starter set (§5.3), as slugs. `added` marks the three this slice needed that the note does not list. */
export const predicates:Record<string,Predicate>={
 'berada-di':{family:'ruang'},'bagian-dari':{family:'ruang'},'berbatasan-dengan':{family:'ruang'},
 'di-hulu-dari':{family:'ruang'},'di-hilir-dari':{family:'ruang'},'di-atas-dari':{family:'ruang'},'di-bawah-dari':{family:'ruang'},
 'anggota-dari':{family:'kelompok',subject:groupish,object:groupish},'bertetangga-dengan':{family:'kelompok',subject:groupish,object:groupish},
 'berkerabat-dengan':{family:'kelompok',subject:['kelompok','makhluk'],object:['kelompok','makhluk']},
 'mendiami':{family:'kelompok',subject:groupish,object:['tempat'],added:true},
 'hidup-di':{family:'hidup',subject:['makhluk']},'dipakai-oleh':{family:'hidup'},'muncul-pada-musim':{family:'hidup',object:['musim']},
 'dibuat-dari':{family:'buat'},'digunakan-untuk':{family:'buat'},'dibuat-oleh':{family:'buat'},
 'melibatkan':{family:'praktik'},'memakai':{family:'praktik'},'dilakukan-saat':{family:'praktik'},'dilakukan-oleh':{family:'praktik',object:[...groupish,'praktik']},'diajarkan-melalui':{family:'praktik'},
 'disebut':{family:'kata',literal:true},'berarti':{family:'kata',literal:true},'nama-lain-dari':{family:'kata'},
 'dituturkan-di':{family:'kata',subject:['bahasa'],object:['tempat'],added:true},'dituturkan-oleh':{family:'kata',subject:['bahasa'],object:groupish,added:true},
 'diceritakan-dalam':{family:'cerita'},'menjelaskan-asal':{family:'cerita'},'terjadi-di':{family:'cerita'},'terjadi-pada':{family:'cerita'},'mengubah':{family:'cerita'},
 'dijaga-oleh':{family:'penjagaan'},'dipegang-oleh':{family:'penjagaan',object:groupish},'hanya-untuk':{family:'penjagaan'},
 'menurut':{family:'pengetahuan'},'dibantah-oleh':{family:'pengetahuan'},'sama-dengan':{family:'pengetahuan'},
}

type EntityRow={slug:string;class:EntityClass;title:string;description:string;aliases:string;context_slug:string|null;community_id:string|null;state:'proposed'|'accepted'|'rejected'|'merged';merged_into:string|null;origin:string;proposer_id:string|null;reviewer_id:string|null;revision:number;created:number;updated:number}
type WitnessRow={id:string;key:string;kind:string;title:string;url:string|null;publisher:string;licence:string|null;year:number|null;language:string|null;voice:string;community_id:string|null;post_id:string|null;post_revision:number|null;state:'active'|'withdrawn';withdrawn_reason:string|null;created:number;updated:number}
type AssertionRow={id:string;subject:string;predicate:string;object:string|null;value:string|null;qualifiers:string;layer:string;status:'proposed'|'accepted'|'rejected'|'withdrawn';logical:string;rank:string;visibility:'public'|'community';train:number;community_id:string|null;origin:string;proposer_id:string|null;reviewer_id:string|null;review_note:string|null;digest:string;revision:number;created:number;updated:number}
type CoordinateRow={slug:string;size_lo:number|null;size_hi:number|null;size_basis:string|null;size_note:string|null;pace_lo:number|null;pace_hi:number|null;pace_basis:string|null;pace_note:string|null;level:string|null;level_basis:string|null;level_note:string|null;actor_id:string|null;revision:number;updated:number}
type ExcerptView={id:string;digest:string;text:string;section:string;witness:{id:string;key:string;kind:string;title:string;url:string|null;publisher:string;licence:string|null;year:number|null;voice:string;communityId:string|null}}
export type KnowledgeSeed={version:number;entities:{slug:string;class:string;title:string;description:string;aliases:string[];context:string|null;origin:string;previous?:string[]}[];witnesses:{key:string;kind:string;title:string;url:string;publisher:string;licence:string|null;year:number|null;language:string|null;voice:string;excerpts:{digest:string;text:string;section:string}[]}[];mentions:{entity:string;witness:string;excerpt:string;surface:string}[];assertions:{subject:string;predicate:string;object:string;status:'accepted'|'proposed';origin:string;support:{witness:string;excerpt:string}[]}[]}

const slugOf=(v:unknown)=>{const s=text(v,80);if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))throw new Fault(400,'Invalid entity slug');return s}
const oneOf=<T extends string>(v:unknown,list:readonly T[],what:string):T=>{if(!list.includes(v as T))throw new Fault(400,`Invalid ${what}`);return v as T}
const assertionDigest=(subject:string,predicate:string,object:string|null,value:string|null,communityId:string|null)=>hash({subject,predicate,object,value,communityId})

export class KnowledgeModel{
 readonly store:EtnosCore
 readonly groups:Groups
 constructor(store:EtnosCore,groups:Groups){this.store=store;this.groups=groups}

 // ---------- access, checked at every read ----------
 /** Returns a check for one reader. Agents only ever see public scopes. */
 private reader(actorId?:string){
  const s=this.store,human=!!actorId&&s.actor(actorId).kind==='human',cache=new Map<string,Community|null>()
  const community=(id:string)=>{if(!cache.has(id))cache.set(id,s.get<Community>('SELECT * FROM communities WHERE id=?',id)??null);return cache.get(id)!}
  const member=(id:string)=>human&&!!s.membership(actorId,id)
  return {
   /** Scope readable: the node commons, a public community, or a community the human reader belongs to. */
   scope:(id:string|null)=>id===null||community(id)?.visibility==='public'||(!!community(id)&&member(id)),
   membersOnly:(id:string|null)=>id!==null&&!!community(id)&&member(id),
   publicScope:(id:string|null)=>id===null||community(id)?.visibility==='public',
  }
 }
 private canonical(slug:string){
  let row=this.store.get<EntityRow>('SELECT * FROM km_entities WHERE slug=?',slug)
  for(let i=0;row&&row.state==='merged'&&row.merged_into&&i<8;i++)row=this.store.get<EntityRow>('SELECT * FROM km_entities WHERE slug=?',row.merged_into)
  return row
 }
 // ---------- world model: coordinates and depth, stored with their basis ----------
 /** Stored coordinates, or the rule's when none are stored yet. Rules are deterministic, so both give the same answer for a seeded thing. */
 private worldMap(){
  const stored=new Map(this.store.all<CoordinateRow>('SELECT * FROM km_coordinates').map(r=>[r.slug,r]))
  return (e:Pick<EntityRow,'slug'|'class'|'title'|'context_slug'>):World=>{
   const r=stored.get(e.slug)
   if(!r)return worldByRule(e)
   const range=(lo:number|null,hi:number|null,basis:string|null,note:string|null)=>lo===null||hi===null?null:{lo,hi,basis:(basis??'rule') as CoordinateBasis,note:note??''}
   return {size:range(r.size_lo,r.size_hi,r.size_basis,r.size_note),pace:range(r.pace_lo,r.pace_hi,r.pace_basis,r.pace_note),level:r.level?{code:r.level,band:bandOf(r.level)!,basis:(r.level_basis??'rule') as CoordinateBasis,note:r.level_note??''}:null}
  }
 }
 private depthMap(){
  const stored=new Map(this.store.all<{assertion_id:string;depth:string|null;basis:string}>('SELECT assertion_id,depth,basis FROM km_depth').map(r=>[r.assertion_id,r]))
  return (a:{id:string;predicate:string}):{depth:Depth|null;depthBasis:string}=>{const r=stored.get(a.id);return r?{depth:r.depth as Depth|null,depthBasis:r.basis}:{depth:depthByRule(a.predicate),depthBasis:'rule'}}
 }
 private storeWorld(slug:string,w:World,actorId:string|null,now:number){
  this.store.run('INSERT INTO km_coordinates VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,?) ON CONFLICT(slug) DO NOTHING',slug,w.size?.lo??null,w.size?.hi??null,w.size?.basis??null,w.size?.note??null,w.pace?.lo??null,w.pace?.hi??null,w.pace?.basis??null,w.pace?.note??null,w.level?.code??null,w.level?.basis??null,w.level?.note??null,actorId,now)
 }
 /** Stores the rule's coordinates and depth for every thing and statement that has none yet. Idempotent; values set by a person stay. */
 private fillWorld(actorId:string){
  const s=this.store,now=s.clock();let filled=0
  for(const e of s.all<EntityRow>('SELECT * FROM km_entities WHERE slug NOT IN (SELECT slug FROM km_coordinates) ORDER BY slug')){this.storeWorld(e.slug,worldByRule(e),actorId,now);filled++}
  for(const a of s.all<{id:string;predicate:string}>('SELECT id,predicate FROM km_assertions WHERE id NOT IN (SELECT assertion_id FROM km_depth) ORDER BY id'))s.run("INSERT INTO km_depth VALUES(?,?,'rule',NULL,?)",a.id,depthByRule(a.predicate),now)
  return filled
 }
 /** Depth counts for one thing: how many of its visible statements say what it is, how it is done, the rules, and what it means. */
 private static profile(list:{depth:Depth|null}[]){const out:Record<Depth,number>={apa:0,cara:0,aturan:0,makna:0};for(const x of list)if(x.depth)out[x.depth]++;return out}

 /** Excerpts a reader can rely on now: witness active, scope readable, cited post present and unchanged. */
 private liveExcerpts(see:ReturnType<KnowledgeModel['reader']>,publicOnly=false){
  const rows=this.store.all<{id:string;digest:string;text:string;section:string;wid:string}&WitnessRow&{deleted:number|null;hidden:number|null;prev:number|null;pcommunity:string|null}>(`SELECT x.id,x.digest,x.text,x.section,w.id wid,w.key,w.kind,w.title,w.url,w.publisher,w.licence,w.year,w.voice,w.community_id,w.post_id,w.post_revision,w.state,p.deleted,p.hidden,p.revision prev,p.community_id pcommunity
   FROM km_excerpts x JOIN km_witnesses w ON w.id=x.witness_id LEFT JOIN posts p ON p.id=w.post_id WHERE w.state='active'`)
  const out=new Map<string,ExcerptView>()
  for(const r of rows){
   if(!(publicOnly?see.publicScope(r.community_id):see.scope(r.community_id)))continue
   if(r.post_id&&(r.deleted!==0||r.hidden!==0||r.prev!==r.post_revision||r.pcommunity!==r.community_id))continue
   out.set(r.id,{id:r.id,digest:r.digest,text:r.text,section:r.section,witness:{id:r.wid,key:r.key,kind:r.kind,title:r.title,url:r.url,publisher:r.publisher,licence:r.licence,year:r.year,voice:r.voice,communityId:r.community_id}})
  }
  return out
 }
 private visibleEntity(see:ReturnType<KnowledgeModel['reader']>,row:EntityRow|undefined,publicOnly=false){
  return !!row&&row.state==='accepted'&&(publicOnly?see.publicScope(row.community_id):see.scope(row.community_id))
 }
 /** The graph a reader may see: accepted entities, accepted assertions with a live basis, co-mentions. */
 private world(actorId?:string,publicOnly=false){
  const s=this.store,see=this.reader(publicOnly?undefined:actorId),live=this.liveExcerpts(see,publicOnly)
  const all=new Map(s.all<EntityRow>('SELECT * FROM km_entities ORDER BY slug').map(e=>[e.slug,e]))
  const canonical=(slug:string)=>{let row=all.get(slug);for(let i=0;row&&row.state==='merged'&&row.merged_into&&i<8;i++)row=all.get(row.merged_into);return row}
  const entities=new Map<string,EntityRow>()
  for(const e of all.values()){const c=canonical(e.slug);if(c&&this.visibleEntity(see,c,publicOnly))entities.set(c.slug,c)}
  const support=new Map<string,ExcerptView[]>()
  for(const r of s.all<{assertion_id:string;excerpt_id:string}>('SELECT assertion_id,excerpt_id FROM km_support ORDER BY assertion_id,excerpt_id')){const x=live.get(r.excerpt_id);if(x)support.set(r.assertion_id,[...(support.get(r.assertion_id)??[]),x])}
  const assertions:(AssertionRow&{subjectSlug:string;objectSlug:string|null;support:ExcerptView[]})[]=[]
  for(const a of s.all<AssertionRow>("SELECT * FROM km_assertions WHERE status='accepted' ORDER BY id")){
   const scopeOk=a.visibility==='community'?(!publicOnly&&see.membersOnly(a.community_id)):publicOnly?see.publicScope(a.community_id):see.scope(a.community_id)
   if(!scopeOk)continue
   const sub=canonical(a.subject),obj=a.object?canonical(a.object):null
   if(!sub||!entities.has(sub.slug)||(a.object&&(!obj||!entities.has(obj.slug))))continue
   const basis=support.get(a.id)??[]
   if(!basis.length)continue
   assertions.push({...a,subjectSlug:sub.slug,objectSlug:obj?.slug??null,support:basis})
  }
  const mentions=new Map<string,Set<string>>()
  for(const m of s.all<{entity:string;excerpt_id:string}>('SELECT entity,excerpt_id FROM km_mentions ORDER BY excerpt_id,entity')){
   if(!live.has(m.excerpt_id))continue
   const e=canonical(m.entity);if(!e||!entities.has(e.slug))continue
   mentions.set(m.excerpt_id,(mentions.get(m.excerpt_id)??new Set()).add(e.slug))
  }
  return {entities,assertions,mentions,live,see}
 }

 // ---------- authority, checked at every write ----------
 private reviewer(actorId:string,communityId:string|null){
  if(communityId===null)return this.groups.nodeSteward(actorId)
  this.store.requireSteward(actorId,communityId)
 }
 private proposer(actorId:string,communityId:string|null,mandateId?:string){
  const s=this.store,actor=s.actor(actorId)
  if(communityId===null){if(actor.kind!=='human')throw new Fault(403,'Human proposer required');return}
  const c=s.community(communityId)
  if(!s.canRead(actorId,c))throw new Fault(404,'Not found')
  s.requireMember(actorId,communityId)
  if(actor.kind==='agent'){
   if(c.visibility!=='public'||!mandateId)throw new Fault(403,'Editorial proposal mandate required')
   new Wiki(s).checkProposalAuthority(actorId,communityId,mandateId)
   const n=s.get<{n:number}>('SELECT (SELECT count(*) FROM km_assertions WHERE proposer_id=? AND created>?)+(SELECT count(*) FROM km_entities WHERE proposer_id=? AND created>?) n',actorId,s.clock()-3600000,actorId,s.clock()-3600000)!.n
   if(n>=20)throw new Fault(429,'Knowledge proposal budget reached')
  }
 }
 private scopeOf(v:unknown){return v===undefined||v===null?null:text(v,100)}

 // ---------- seed ----------
 /** Node steward only. Idempotent: existing rows keep their reviewed state, withdrawn witnesses stay withdrawn. */
 importSeed(actorId:string,seed:KnowledgeSeed){
  const s=this.store
  return s.tx(()=>{
   this.groups.nodeSteward(actorId)
   if(!seed||seed.version!==1||!Array.isArray(seed.entities)||!Array.isArray(seed.witnesses)||!Array.isArray(seed.assertions)||!Array.isArray(seed.mentions))throw new Fault(400,'Invalid knowledge seed')
   const now=s.clock(),count={entities:0,witnesses:0,excerpts:0,mentions:0,assertions:0,present:0,skipped:0}
   for(const e of seed.entities){
    const slug=slugOf(e.slug),cls=oneOf(e.class,classes,'entity class')
    const had=s.get<{description:string}>('SELECT description FROM km_entities WHERE slug=?',slug)
    if(had){
     // A data fix replaces a description only while the row still holds one that the seed shipped earlier.
     if(Array.isArray(e.previous)&&e.previous.includes(had.description)&&had.description!==e.description)s.run('UPDATE km_entities SET description=?,updated=? WHERE slug=? AND description=?',text(e.description??'',1000,true),now,slug,had.description)
     count.present++;continue
    }
    s.run("INSERT INTO km_entities VALUES(?,?,?,?,?,?,NULL,'accepted',NULL,?,NULL,?,1,?,?)",slug,cls,text(e.title,200),text(e.description??'',1000,true),JSON.stringify((e.aliases??[]).slice(0,20).map(a=>text(a,200))),e.context?slugOf(e.context):null,'seed:'+text(e.origin,40),actorId,now,now)
    count.entities++
   }
   const excerptId=new Map<string,string>()
   for(const w of seed.witnesses){
    const key=text(w.key,600)
    let row=s.get<WitnessRow>('SELECT * FROM km_witnesses WHERE key=?',key)
    if(!row){
     const id=randomUUID()
     s.run("INSERT INTO km_witnesses VALUES(?,?,?,?,?,?,?,?,?,?,NULL,NULL,NULL,'active',NULL,?,?)",id,key,oneOf(w.kind,witnessKinds,'witness kind'),text(w.title,300),w.url?text(w.url,600):null,text(w.publisher,300),w.licence?text(w.licence,300):null,Number.isSafeInteger(w.year)?w.year:null,w.language?text(w.language,20):null,oneOf(w.voice,voices,'voice'),now,now)
     row=s.get<WitnessRow>('SELECT * FROM km_witnesses WHERE id=?',id)!;count.witnesses++
    }else count.present++
    for(const x of w.excerpts){
     const prior=s.get<{id:string}>('SELECT id FROM km_excerpts WHERE witness_id=? AND digest=?',row.id,x.digest)
     if(prior){excerptId.set(key+'|'+x.digest,prior.id);continue}
     if(row.state!=='active'){count.skipped++;continue}
     const id=randomUUID();s.run('INSERT INTO km_excerpts VALUES(?,?,?,?,?)',id,row.id,text(x.digest,64),text(x.text,4000),text(x.section,60));excerptId.set(key+'|'+x.digest,id);count.excerpts++
    }
   }
   for(const m of seed.mentions){
    const ex=excerptId.get(m.witness+'|'+m.excerpt)
    if(!ex||!s.get('SELECT 1 FROM km_entities WHERE slug=?',m.entity)){count.skipped++;continue}
    if(s.get('SELECT 1 FROM km_mentions WHERE entity=? AND excerpt_id=?',m.entity,ex))continue
    s.run('INSERT INTO km_mentions VALUES(?,?,?)',m.entity,ex,text(m.surface,200));count.mentions++
   }
   for(const a of seed.assertions){
    if(!predicates[a.predicate]){count.skipped++;continue}
    const digest=assertionDigest(a.subject,a.predicate,a.object,null,null)
    const support=a.support.map(x=>excerptId.get(x.witness+'|'+x.excerpt)).filter((x):x is string=>!!x)
    if(!support.length||!s.get('SELECT 1 FROM km_entities WHERE slug=?',a.subject)||!s.get('SELECT 1 FROM km_entities WHERE slug=?',a.object)){count.skipped++;continue}
    let id=s.get<{id:string}>('SELECT id FROM km_assertions WHERE digest=?',digest)?.id
    if(id)count.present++
    else{
     id=randomUUID()
     s.run("INSERT INTO km_assertions VALUES(?,?,?,?,NULL,'{}','jejak',?,'undisputed','normal','public',0,NULL,?,?,?,NULL,?,1,?,?)",id,a.subject,a.predicate,a.object,a.status==='accepted'?'accepted':'proposed','seed:'+text(a.origin,40),actorId,a.status==='accepted'?actorId:null,digest,now,now)
     count.assertions++
    }
    for(const x of support)s.run('INSERT OR IGNORE INTO km_support VALUES(?,?)',id,x)
   }
   const world=this.fillWorld(actorId)
   s.audit(actorId,'knowledge-model.seed',`${count.entities}/${count.assertions}`)
   return {...count,world}
  })
 }

 // ---------- proposals and review ----------
 proposeEntity(actorId:string,b:Record<string,unknown>){
  const communityId=this.scopeOf(b.communityId),input={communityId,slug:slugOf(b.slug),class:oneOf(b.class,classes,'entity class'),title:text(b.title,200),description:text(b.description??'',1000,true),aliases:Array.isArray(b.aliases)?b.aliases.slice(0,20).map(a=>text(a,200)):[],mandateId:b.mandateId===undefined?undefined:text(b.mandateId,100)}
  return transition(this.store,actorId,b.requestKey,'knowledge-model.entity',input,()=>{
   this.proposer(actorId,communityId,input.mandateId)
   if(input.class==='orang'&&this.store.actor(actorId).kind!=='human')throw new Fault(403,'Only people may propose a person')
  },()=>{
   const s=this.store,now=s.clock()
   if(s.get('SELECT 1 FROM km_entities WHERE slug=?',input.slug))throw new Fault(409,'This entity already exists')
   s.run("INSERT INTO km_entities VALUES(?,?,?,?,?,NULL,?,'proposed',NULL,'proposal',?,NULL,1,?,?)",input.slug,input.class,input.title,input.description,JSON.stringify(input.aliases),communityId,actorId,now,now)
   this.storeWorld(input.slug,worldByRule({slug:input.slug,class:input.class,title:input.title,context_slug:null}),null,now)
   return this.entityRow(input.slug)
  })
 }
 reviewEntity(actorId:string,slug:string,b:Record<string,unknown>){
  const decision=oneOf(b.decision,['accept','reject'] as const,'decision')
  return transition(this.store,actorId,b.requestKey,'knowledge-model.entity.review',{slug,decision,revision:b.revision},()=>{
   const row=this.store.get<EntityRow>('SELECT * FROM km_entities WHERE slug=?',slug)
   if(!row||!this.reader(actorId).scope(row.community_id))throw new Fault(404,'Not found')
   this.reviewer(actorId,row.community_id)
  },()=>{
   const s=this.store,row=s.get<EntityRow>('SELECT * FROM km_entities WHERE slug=?',slug)!
   expected(b.revision,row.revision)
   if(row.state!=='proposed')throw new Fault(409,'This entity was already reviewed')
   s.run('UPDATE km_entities SET state=?,reviewer_id=?,revision=revision+1,updated=? WHERE slug=? AND revision=?',decision==='accept'?'accepted':'rejected',actorId,s.clock(),slug,row.revision)
   return this.entityRow(slug)
  })
 }
 /** Same thing under two names. Statements and mentions follow the survivor at read time. */
 mergeEntity(actorId:string,slug:string,b:Record<string,unknown>){
  const into=slugOf(b.into)
  return transition(this.store,actorId,b.requestKey,'knowledge-model.entity.merge',{slug,into,revision:b.revision},()=>{
   const row=this.store.get<EntityRow>('SELECT * FROM km_entities WHERE slug=?',slug),target=this.store.get<EntityRow>('SELECT * FROM km_entities WHERE slug=?',into)
   if(!row||!target||!this.reader(actorId).scope(row.community_id)||!this.reader(actorId).scope(target.community_id))throw new Fault(404,'Not found')
   this.reviewer(actorId,row.community_id);this.reviewer(actorId,target.community_id)
   if(row.community_id!==target.community_id&&target.community_id!==null)throw new Fault(400,'Merge into the commons or within one community')
  },()=>{
   const s=this.store,row=s.get<EntityRow>('SELECT * FROM km_entities WHERE slug=?',slug)!,target=this.canonical(into)!
   expected(b.revision,row.revision)
   if(target.slug===slug||row.state==='merged'||target.state!=='accepted')throw new Fault(409,'Merge needs two different, accepted entities')
   s.run("UPDATE km_entities SET state='merged',merged_into=?,reviewer_id=?,revision=revision+1,updated=? WHERE slug=?",target.slug,actorId,s.clock(),slug)
   const aliases=[...new Set([...JSON.parse(target.aliases) as string[],row.title,...JSON.parse(row.aliases) as string[]])].slice(0,40)
   s.run('UPDATE km_entities SET aliases=?,revision=revision+1,updated=? WHERE slug=?',JSON.stringify(aliases),s.clock(),target.slug)
   return {merged:slug,into:this.entityRow(target.slug)}
  })
 }
 private entityRow(slug:string){const r=this.store.get<EntityRow>('SELECT * FROM km_entities WHERE slug=?',slug)!;return {...r,aliases:JSON.parse(r.aliases) as string[],world:this.worldMap()(r)}}
 /**
  * A reviewer corrects a thing's coordinates. Each value given is stored as the reviewer's (basis person),
  * with a note; values not given keep their earlier basis. Ranges are log10 metres and log10 seconds.
  */
 setCoordinates(actorId:string,slug:string,b:Record<string,unknown>){
  const size=checkRange(b.size,-36,27),pace=checkRange(b.pace,-44,18)
  const levelCode=b.level===undefined||b.level===null?null:text(b.level,1)
  if(levelCode!==null&&!ilcClasses.includes(levelCode))throw new Fault(400,'Invalid level')
  if(!size&&!pace&&levelCode===null)throw new Fault(400,'Give a size, a pace or a level')
  const note=text(b.note??'',300,true)
  return transition(this.store,actorId,b.requestKey,'knowledge-model.entity.coordinates',{slug,size,pace,level:levelCode,note,revision:b.revision},()=>{
   const row=this.store.get<EntityRow>('SELECT * FROM km_entities WHERE slug=?',slug)
   if(!row||row.state==='rejected'||row.state==='merged'||!this.reader(actorId).scope(row.community_id))throw new Fault(404,'Not found')
   this.reviewer(actorId,row.community_id)
  },()=>{
   const s=this.store,now=s.clock(),row=s.get<EntityRow>('SELECT * FROM km_entities WHERE slug=?',slug)!
   if(!s.get('SELECT 1 FROM km_coordinates WHERE slug=?',slug))this.storeWorld(slug,worldByRule(row),null,now)
   const current=s.get<CoordinateRow>('SELECT * FROM km_coordinates WHERE slug=?',slug)!
   expected(b.revision,current.revision)
   const by=note||'Dikoreksi oleh peninjau.'
   s.run(`UPDATE km_coordinates SET size_lo=?,size_hi=?,size_basis=?,size_note=?,pace_lo=?,pace_hi=?,pace_basis=?,pace_note=?,level=?,level_basis=?,level_note=?,actor_id=?,revision=revision+1,updated=? WHERE slug=? AND revision=?`,
    size?size[0]:current.size_lo,size?size[1]:current.size_hi,size?'person':current.size_basis,size?by:current.size_note,
    pace?pace[0]:current.pace_lo,pace?pace[1]:current.pace_hi,pace?'person':current.pace_basis,pace?by:current.pace_note,
    levelCode??current.level,levelCode?'person':current.level_basis,levelCode?by:current.level_note,actorId,now,slug,current.revision)
   s.audit(actorId,'knowledge-model.coordinates',slug)
   return {slug,revision:current.revision+1,world:this.worldMap()(row)}
  })
 }

 proposeAssertion(actorId:string,b:Record<string,unknown>){
  const communityId=this.scopeOf(b.communityId),predicate=text(b.predicate,60),p=predicates[predicate]
  if(!p)throw new Fault(400,'Unknown predicate')
  const subject=slugOf(b.subject),object=b.object===undefined||b.object===null?null:slugOf(b.object),value=b.value===undefined||b.value===null?null:text(b.value,500)
  if(p.literal?(!value||object!==null):(!object||value!==null))throw new Fault(400,p.literal?'This predicate takes a value':'This predicate takes an entity')
  const support=Array.isArray(b.support)?b.support.slice(0,10).map(x=>text(x,100)):[]
  if(!support.length)throw new Fault(400,'An assertion needs at least one excerpt it rests on')
  const qualifiers=b.qualifiers&&typeof b.qualifiers==='object'&&!Array.isArray(b.qualifiers)?Object.fromEntries(Object.entries(b.qualifiers as Record<string,unknown>).slice(0,8).map(([k,v])=>[text(k,40),text(v,200)])):{}
  const depth=b.depth===undefined||b.depth===null?undefined:oneOf(b.depth,depths,'depth')
  const input={communityId,subject,predicate,object,value,qualifiers,depth,support:[...new Set(support)].sort(),layer:oneOf(b.layer??'jejak',layers,'layer'),visibility:oneOf(b.visibility??'public',['public','community'] as const,'visibility'),train:b.train===true,mandateId:b.mandateId===undefined?undefined:text(b.mandateId,100)}
  return transition(this.store,actorId,b.requestKey,'knowledge-model.assertion',input,()=>{
   const s=this.store,agent=s.actor(actorId).kind!=='human'
   this.proposer(actorId,communityId,input.mandateId)
   if(input.visibility==='public'&&communityId&&s.community(communityId).visibility!=='public')throw new Fault(400,'A private community keeps its statements to members')
   if(input.visibility==='community'&&!communityId)throw new Fault(400,'Community visibility needs a community')
   if(agent&&(input.layer!=='tafsir'||input.train))throw new Fault(403,'Agents propose interpretation only, without training permission')
   const see=this.reader(actorId)
   for(const slug of [subject,object].filter((x):x is string=>!!x)){
    const e=this.canonical(slug)
    if(!e||!['accepted','proposed'].includes(e.state)||!see.scope(e.community_id)||(e.community_id!==null&&e.community_id!==communityId))throw new Fault(404,'Entity not found')
    if(agent&&e.class==='orang')throw new Fault(403,'Agents may not make statements about persons')
   }
   const sub=this.canonical(subject)!,obj=object?this.canonical(object)!:null
   if(p.subject&&!p.subject.includes(sub.class))throw new Fault(400,`This predicate does not apply to ${sub.class}`)
   if(obj&&p.object&&!p.object.includes(obj.class))throw new Fault(400,`This predicate does not point to ${obj.class}`)
   const live=this.liveExcerpts(see)
   for(const id of input.support){
    const x=live.get(id)
    if(!x)throw new Fault(404,'Excerpt not found')
    if(x.witness.communityId!==null&&x.witness.communityId!==communityId)throw new Fault(403,'An assertion may only rest on witnesses from its own community or the commons')
   }
  },()=>{
   const s=this.store,now=s.clock(),sub=this.canonical(subject)!,obj=object?this.canonical(object)!:null
   const digest=assertionDigest(sub.slug,predicate,obj?.slug??null,value,communityId)
   const prior=s.get<AssertionRow>("SELECT * FROM km_assertions WHERE digest=?",digest)
   if(prior&&prior.status!=='rejected'&&prior.status!=='withdrawn'){
    for(const x of input.support)s.run('INSERT OR IGNORE INTO km_support VALUES(?,?)',prior.id,x)
    return this.assertionView(prior.id,actorId)
   }
   const id=randomUUID()
   if(prior)s.run('UPDATE km_assertions SET digest=? WHERE id=?',prior.digest+':'+prior.id,prior.id)
   s.run("INSERT INTO km_assertions VALUES(?,?,?,?,?,?,?,'proposed','undisputed','normal',?,?,?,'proposal',?,NULL,NULL,?,1,?,?)",id,sub.slug,predicate,obj?.slug??null,value,JSON.stringify(input.qualifiers),input.layer,input.visibility,input.train?1:0,communityId,actorId,digest,now,now)
   for(const x of input.support)s.run('INSERT INTO km_support VALUES(?,?)',id,x)
   // The proposer's depth is a person's (or, for an agent, a model's) reading; without one the predicate's rule applies.
   s.run('INSERT INTO km_depth VALUES(?,?,?,?,?)',id,input.depth??depthByRule(predicate),input.depth?(s.actor(actorId).kind==='human'?'person':'model'):'rule',input.depth?actorId:null,now)
   return this.assertionView(id,actorId)
  })
 }
 /** A reviewer accepts or rejects; the proposer may withdraw their own proposal. Revisions guard against two reviewers at once. */
 reviewAssertion(actorId:string,id:string,b:Record<string,unknown>){
  const decision=oneOf(b.decision,['accept','reject','withdraw','update'] as const,'decision')
  const note=b.note===undefined?null:text(b.note,500,true),logical=b.logical===undefined?undefined:oneOf(b.logical,logicals,'logical status'),rank=b.rank===undefined?undefined:oneOf(b.rank,ranks,'rank')
  const depth=b.depth===undefined?undefined:oneOf(b.depth,depths,'depth')
  if(depth&&decision!=='accept'&&decision!=='update')throw new Fault(400,'Depth is set when accepting or updating a statement')
  return transition(this.store,actorId,b.requestKey,'knowledge-model.assertion.review',{id,decision,note,logical,rank,depth,revision:b.revision},()=>{
   const row=this.store.get<AssertionRow>('SELECT * FROM km_assertions WHERE id=?',id)
   if(!row||!this.reader(actorId).scope(row.community_id)||(row.visibility==='community'&&!this.reader(actorId).membersOnly(row.community_id)))throw new Fault(404,'Not found')
   if(decision==='withdraw'){if(row.proposer_id!==actorId)throw new Fault(403,'Only the proposer may withdraw a proposal');return}
   this.reviewer(actorId,row.community_id)
  },()=>{
   const s=this.store,row=s.get<AssertionRow>('SELECT * FROM km_assertions WHERE id=?',id)!
   expected(b.revision,row.revision)
   if(decision==='update'){
    if(row.status!=='accepted')throw new Fault(409,'Only an accepted statement takes a logical status or rank')
    s.run('UPDATE km_assertions SET logical=?,rank=?,review_note=COALESCE(?,review_note),reviewer_id=?,revision=revision+1,updated=? WHERE id=? AND revision=?',logical??row.logical,rank??row.rank,note,actorId,s.clock(),id,row.revision)
   }else{
    if(row.status!=='proposed')throw new Fault(409,'This statement was already reviewed')
    const sub=this.canonical(row.subject),obj=row.object?this.canonical(row.object):null
    if(decision==='accept'&&(sub?.state!=='accepted'||(row.object&&obj?.state!=='accepted')))throw new Fault(409,'Accept the entities first')
    if(decision==='accept'&&!this.liveSupport(row.id,actorId).length)throw new Fault(409,'This statement no longer has a basis')
    s.run('UPDATE km_assertions SET status=?,logical=?,rank=?,review_note=?,reviewer_id=?,revision=revision+1,updated=? WHERE id=? AND revision=?',{accept:'accepted',reject:'rejected',withdraw:'withdrawn'}[decision],logical??row.logical,rank??row.rank,note,decision==='withdraw'?row.reviewer_id:actorId,s.clock(),id,row.revision)
   }
   if(depth)s.run("INSERT INTO km_depth VALUES(?,?,'person',?,?) ON CONFLICT(assertion_id) DO UPDATE SET depth=excluded.depth,basis='person',actor_id=excluded.actor_id,updated=excluded.updated",id,depth,actorId,s.clock())
   return this.assertionView(id,actorId)
  })
 }
 private liveSupport(assertionId:string,actorId?:string){
  const live=this.liveExcerpts(this.reader(actorId))
  return this.store.all<{excerpt_id:string}>('SELECT excerpt_id FROM km_support WHERE assertion_id=? ORDER BY excerpt_id',assertionId).map(r=>live.get(r.excerpt_id)).filter((x):x is ExcerptView=>!!x)
 }
 private assertionView(id:string,actorId?:string){
  const a=this.store.get<AssertionRow>('SELECT * FROM km_assertions WHERE id=?',id)!
  const {digest:_d,...rest}=a
  return {...rest,...this.depthMap()(a),qualifiers:JSON.parse(a.qualifiers) as Record<string,string>,train:a.train===1,support:this.liveSupport(id,actorId)}
 }

 // ---------- witnesses ----------
 /** A community steward accepts a post as a witness (a teller's account). Its text is kept as the excerpt for the revision cited. */
 citePost(actorId:string,b:Record<string,unknown>){
  const postId=text(b.postId,100),section=text(b.section??'tuturan',60)
  return transition(this.store,actorId,b.requestKey,'knowledge-model.cite-post',{postId,section},()=>{
   const p=this.store.get<{community_id:string;deleted:number;hidden:number}>('SELECT community_id,deleted,hidden FROM posts WHERE id=?',postId)
   if(!p||p.deleted||p.hidden||!this.store.canRead(actorId,this.store.community(p.community_id)))throw new Fault(404,'Not found')
   this.store.requireSteward(actorId,p.community_id)
  },()=>{
   const s=this.store,p=s.get<{id:string;community_id:string;author_id:string;text:string;revision:number}>('SELECT id,community_id,author_id,text,revision FROM posts WHERE id=?',postId)!
   if(!p.text.trim())throw new Fault(400,'This post has no text to cite')
   const key=`post:${p.id}@${p.revision}`,now=s.clock()
   let w=s.get<WitnessRow>('SELECT * FROM km_witnesses WHERE key=?',key)
   if(!w){
    const id=randomUUID(),author=s.actor(p.author_id)
    s.run("INSERT INTO km_witnesses VALUES(?,?,'post',?,NULL,?,NULL,NULL,NULL,'penutur',?,?,?,'active',NULL,?,?)",id,key,`Kiriman ${author.name}`,author.name,p.community_id,p.id,p.revision,now,now)
    s.run('INSERT INTO km_excerpts VALUES(?,?,?,?,?)',randomUUID(),id,hash(p.text).slice(0,32),p.text.slice(0,4000),section)
    w=s.get<WitnessRow>('SELECT * FROM km_witnesses WHERE id=?',id)!
   }
   return this.witnessView(w.id,actorId)
  })
 }
 /** Withdrawal blanks the excerpts and drops mentions; statements resting only on this witness leave every view at once. */
 withdrawWitness(actorId:string,id:string,b:Record<string,unknown>){
  const reason=text(b.reason??'',500,true)
  return transition(this.store,actorId,b.requestKey,'knowledge-model.withdraw',{id,reason},()=>{
   const s=this.store,w=s.get<WitnessRow>('SELECT * FROM km_witnesses WHERE id=?',id)
   if(!w||!this.reader(actorId).scope(w.community_id))throw new Fault(404,'Not found')
   const author=w.post_id?s.get<{author_id:string}>('SELECT author_id FROM posts WHERE id=?',w.post_id)?.author_id:undefined
   if(author&&author===actorId)return
   this.reviewer(actorId,w.community_id)
  },()=>{
   const s=this.store,now=s.clock()
   s.run("UPDATE km_witnesses SET state='withdrawn',withdrawn_reason=?,updated=? WHERE id=?",reason||null,now,id)
   s.run('DELETE FROM km_mentions WHERE excerpt_id IN (SELECT id FROM km_excerpts WHERE witness_id=?)',id)
   s.run("UPDATE km_excerpts SET text='' WHERE witness_id=?",id)
   s.audit(actorId,'knowledge-model.withdraw',id)
   const affected=s.get<{n:number}>("SELECT count(DISTINCT su.assertion_id) n FROM km_support su JOIN km_excerpts x ON x.id=su.excerpt_id WHERE x.witness_id=?",id)!.n
   return {id,state:'withdrawn' as const,affectedAssertions:affected}
  })
 }
 private witnessView(id:string,actorId?:string){
  const w=this.store.get<WitnessRow>('SELECT * FROM km_witnesses WHERE id=?',id)!,live=this.liveExcerpts(this.reader(actorId))
  return {...w,excerpts:this.store.all<{id:string}>('SELECT id FROM km_excerpts WHERE witness_id=? ORDER BY id',id).map(r=>live.get(r.id)).filter(Boolean).map(x=>({id:x!.id,digest:x!.digest,text:x!.text,section:x!.section}))}
 }

 // ---------- reading ----------
 summary(actorId?:string){
  const w=this.world(actorId),byClass:Record<string,number>={}
  for(const e of w.entities.values())byClass[e.class]=(byClass[e.class]??0)+1
  return {entities:w.entities.size,assertions:w.assertions.length,excerpts:w.live.size,byClass,classes,voices,layers,depths,predicates:Object.entries(predicates).map(([slug,p])=>({slug,family:p.family,literal:!!p.literal,added:!!p.added}))}
 }
 entities(actorId?:string,filter:{class?:string;q?:string}={}){
  const w=this.world(actorId),q=filter.q?.trim().toLowerCase()
  const evidence=this.evidenceCounts(w),world=this.worldMap()
  return [...w.entities.values()].filter(e=>(!filter.class||e.class===filter.class)&&(!q||e.title.toLowerCase().includes(q)||e.aliases.toLowerCase().includes(q))).map(e=>({slug:e.slug,class:e.class,title:e.title,description:e.description,context:e.context_slug,communityId:e.community_id,world:world(e),...evidence.get(e.slug)??{statements:0,excerpts:0,voices:{}}})).slice(0,500)
 }
 private evidenceCounts(w:ReturnType<KnowledgeModel['world']>){
  const out=new Map<string,{statements:number;excerpts:number;voices:Record<string,number>}>()
  const at=(slug:string)=>{let v=out.get(slug);if(!v){v={statements:0,excerpts:0,voices:{}};out.set(slug,v)};return v}
  for(const a of w.assertions)for(const slug of [a.subjectSlug,a.objectSlug].filter((x):x is string=>!!x))at(slug).statements++
  for(const [ex,set] of w.mentions)for(const slug of set){const v=at(slug),voice=w.live.get(ex)!.witness.voice;v.excerpts++;v.voices[voice]=(v.voices[voice]??0)+1}
  return out
 }
 /** One entity with its statements, the excerpts that mention it, and who speaks about it. */
 entity(actorId:string|undefined,slug:string){
  const row=this.store.get<EntityRow>('SELECT * FROM km_entities WHERE slug=?',slug),w=this.world(actorId)
  const target=row?.state==='merged'?this.canonical(slug):row
  if(!target||!w.entities.has(target.slug))throw new Fault(404,'Not found')
  const depthOf=this.depthMap()
  const statements=w.assertions.filter(a=>a.subjectSlug===target.slug||a.objectSlug===target.slug).map(a=>({id:a.id,subject:a.subjectSlug,predicate:a.predicate,object:a.objectSlug,value:a.value,qualifiers:JSON.parse(a.qualifiers) as Record<string,string>,layer:a.layer,...depthOf(a),logical:a.logical,rank:a.rank,origin:a.origin,revision:a.revision,voices:[...new Set(a.support.map(x=>x.witness.voice))],support:a.support}))
  const mentions=[...w.mentions].filter(([,set])=>set.has(target.slug)).map(([id])=>w.live.get(id)!).slice(0,200)
  const voices:Record<string,number>={}
  for(const m of mentions)voices[m.witness.voice]=(voices[m.witness.voice]??0)+1
  for(const st of statements)for(const x of st.support)if(!mentions.some(m=>m.id===x.id))voices[x.witness.voice]=(voices[x.witness.voice]??0)+1
  const diversity=hill(voices),names=new Map([...w.entities.values()].map(e=>[e.slug,{slug:e.slug,title:e.title,class:e.class}]))
  const context=target.context_slug?this.store.get<{id:string;slug:string;title:string}>('SELECT id,slug,title FROM contexts WHERE slug=? AND active=1',target.context_slug)??null:null
  return {
   slug:target.slug,class:target.class,title:target.title,description:target.description,aliases:JSON.parse(target.aliases) as string[],origin:target.origin,revision:target.revision,communityId:target.community_id,context,
   world:this.worldMap()(target),depth:KnowledgeModel.profile(statements),
   mergedFrom:row&&row.slug!==target.slug?row.slug:undefined,
   statements:statements.map(st=>({...st,subject:names.get(st.subject)!,object:st.object?names.get(st.object)!:null})),
   mentions,voices,diversity,
   gaps:{singleVoice:diversity.q0<=1,noTellers:!voices.penutur,fewSources:new Set([...mentions,...statements.flatMap(st=>st.support)].map(x=>x.witness.id)).size<3},
  }
 }
 /** Typed edges for the map: accepted statements and co-mentions in one excerpt. Clustering runs offline from this. */
 graph(actorId?:string,options:{publicOnly?:boolean;train?:boolean;excerpts?:boolean}={}){
  const w=this.world(actorId,options.publicOnly||options.train),evidence=this.evidenceCounts(w),world=this.worldMap(),depthOf=this.depthMap()
  const assertions=options.train?w.assertions.filter(a=>a.train===1):w.assertions
  const co=new Map<string,{a:string;b:string;weight:number;voices:Record<string,number>}>()
  for(const [ex,set] of w.mentions){
   const list=[...set].sort(),voice=w.live.get(ex)!.witness.voice
   for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const k=list[i]+'|'+list[j],e=co.get(k)??{a:list[i]!,b:list[j]!,weight:0,voices:{}};e.weight++;e.voices[voice]=(e.voices[voice]??0)+1;co.set(k,e)}
  }
  return {
   version:1,
   nodes:[...w.entities.values()].map(e=>({id:e.slug,class:e.class,title:e.title,context:e.context_slug,world:world(e),...evidence.get(e.slug)??{statements:0,excerpts:0,voices:{}}})),
   statements:assertions.map(a=>({id:a.id,source:a.subjectSlug,target:a.objectSlug,value:a.value,predicate:a.predicate,family:predicates[a.predicate]?.family??'lain',layer:a.layer,...depthOf(a),logical:a.logical,rank:a.rank,origin:a.origin,voices:[...new Set(a.support.map(x=>x.witness.voice))].sort(),support:a.support.map(x=>({excerpt:x.id,digest:x.digest,witness:x.witness.key,...(options.train?{text:x.text,licence:x.witness.licence}:{})}))})),
   comentions:options.train?[]:[...co.values()].sort((x,y)=>x.a.localeCompare(y.a)||x.b.localeCompare(y.b)),
   witnesses:[...new Map([...w.live.values()].map(x=>[x.witness.key,{key:x.witness.key,kind:x.witness.kind,title:x.witness.title,url:x.witness.url,publisher:x.witness.publisher,licence:x.witness.licence,voice:x.witness.voice,scope:x.witness.communityId===null?'commons' as const:'community' as const}])).values()].sort((a,b)=>a.key.localeCompare(b.key)),
   /** Excerpts in the view, with their text, for an evidence drawer. Only with `excerpts`; each entry lists the entities it mentions. */
   excerpts:options.excerpts?[...w.live.values()].filter(x=>w.mentions.has(x.id)||assertions.some(a=>a.support.some(y=>y.id===x.id))).map(x=>({id:x.id,digest:x.digest,witness:x.witness.key,section:x.section,text:x.text,mentions:[...(w.mentions.get(x.id)??[])].sort()})).sort((a,b)=>a.id.localeCompare(b.id)):undefined,
  }
 }
 /** What a reviewer can act on: proposals in scopes they steward, each with its live basis. */
 queue(actorId:string,communityId?:string){
  const s=this.store,see=this.reader(actorId),scopes:(string|null)[]=[]
  try{this.groups.nodeSteward(actorId);if(!communityId)scopes.push(null)}catch{}
  const stewarded=s.all<{community_id:string}>("SELECT community_id FROM memberships WHERE actor_id=? AND active=1 AND role IN ('owner','moderator')",actorId).map(r=>r.community_id)
  if(s.actor(actorId).kind==='human')for(const c of stewarded)if(!communityId||c===communityId)scopes.push(c)
  const inScope=(id:string|null)=>scopes.includes(id)&&see.scope(id)
  const entities=s.all<EntityRow>("SELECT * FROM km_entities WHERE state='proposed' ORDER BY created,slug").filter(e=>inScope(e.community_id)).map(e=>({...e,aliases:JSON.parse(e.aliases) as string[]}))
  const assertions=s.all<AssertionRow>("SELECT * FROM km_assertions WHERE status='proposed' ORDER BY created,id").filter(a=>inScope(a.community_id)).map(a=>this.assertionView(a.id,actorId)).filter(a=>a.support.length).slice(0,200)
  return {entities,assertions}
 }
}
