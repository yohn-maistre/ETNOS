/**
 * The dataset record (docs/observatory/data-observatory-2026-11-20.md §5): a catalogue entry for a table, a
 * map layer, a word list, an image collection or any other body of data about a place and its world.
 *
 * Fields follow DCAT 3 (title, description, publisher, landing page, licence, dates, languages, keywords,
 * temporal and spatial coverage, distributions with format, size and checksum) and the Croissant core
 * (fields with their types). Each record links to things in the knowledge model (*Hal*); a record about
 * nothing in the deployment does not belong in it.
 *
 * Rules for this first slice:
 * - Only the open tier is accepted. Community and controlled tiers exist in the schema and are refused
 *   until the request flow exists, so no record can promise access that ETNOS cannot yet check.
 * - Records hold metadata and links only. ETNOS stores no dataset bytes here.
 * - Records are node-level commons and link only to commons things. Links are checked again at every
 *   read: a thing that is no longer public drops out of the record's links.
 * - A member's proposal is seen by its proposer and the node stewards until a steward accepts it.
 * - The shipped seed (src/catalogues/tanah-papua-datasets.json) is read directly: its records show
 *   publicly as `proposed`, labelled as not yet checked by a steward, without an import step. A steward's
 *   review stores the record, and the stored row then wins over the shipped one.
 * - Links point to things in the knowledge model. Where the model holds no row for a thing yet, the
 *   shipped knowledge seed (the public catalogue that the static map is built from) answers instead.
 */
import {randomUUID} from 'node:crypto'
import {EtnosCore,Fault} from './core.ts'
import {Groups} from './groups.ts'
import {text,publicURL,transition,expected,hash} from './commons.ts'

export const datasetKinds=['table','map-vector','map-raster','wordlist','images','documents','audio','video','graph','other'] as const
export const accessTiers=['open','community','controlled'] as const
/** The tiers that can be used now. The others wait for the request flow (data observatory doc §14, step 2). */
export const activeTiers=['open'] as const

type Distribution={title:string;url:string;mediaType:string|null;format:string|null;byteSize:number|null;checksum:{algorithm:'sha256'|'md5';value:string}|null}
type Field={name:string;dataType:string;description:string}
type Row={id:string;key:string;title:string;description:string;kind:string;publisher:string;publisher_url:string|null;landing_page:string;licence:string;licence_url:string|null;issued:string|null;modified:string|null;version:string|null;languages:string;keywords:string;temporal:string|null;spatial:string|null;distributions:string;structure:string;citation:string|null;access_tier:string;state:'proposed'|'accepted'|'rejected'|'withdrawn';origin:string;checked:string|null;proposer_id:string;reviewer_id:string|null;revision:number;created:number;updated:number}
export type DatasetSeed={version:1;datasets:Record<string,unknown>[]}
type ShippedThing={slug:string;class:string;title:string;context:string|null}
/** A record's identifier follows from its key, so a shipped record keeps one address before and after it is stored. */
export const datasetId=(key:string)=>'ds-'+hash('dataset:'+key).slice(0,20)

const date=(v:unknown)=>{if(v===undefined||v===null||v==='')return null;const s=text(v,10);if(!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(s))throw new Fault(400,'Invalid date');return s}
const list=(v:unknown,max:number,len:number)=>{if(v===undefined||v===null)return [];if(!Array.isArray(v)||v.length>max)throw new Fault(400,'Invalid list');return [...new Set(v.map(x=>text(x,len)))]}
const oneOf=<T extends string>(v:unknown,options:readonly T[],what:string):T=>{if(!options.includes(v as T))throw new Fault(400,`Invalid ${what}`);return v as T}
const slug=(v:unknown)=>{const s=text(v,80);if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))throw new Fault(400,'Invalid entity slug');return s}

/** Checks and normalises one record as a proposer or the seed gives it. */
export function datasetInput(b:Record<string,unknown>){
 const tier=oneOf(b.accessTier??'open',accessTiers,'access tier')
 if(!(activeTiers as readonly string[]).includes(tier))throw new Fault(400,'Only open datasets can be listed for now')
 const distributions=(Array.isArray(b.distributions)?b.distributions:[]).slice(0,20).map((d:Record<string,unknown>):Distribution=>{
  const size=d.byteSize===undefined||d.byteSize===null?null:Number(d.byteSize)
  if(size!==null&&(!Number.isSafeInteger(size)||size<0))throw new Fault(400,'Invalid byte size')
  const c=d.checksum as Record<string,unknown>|undefined|null
  const checksum=c?{algorithm:oneOf(c.algorithm,['sha256','md5'] as const,'checksum algorithm'),value:text(c.value,128)}:null
  if(checksum&&!/^[a-f0-9]+$/i.test(checksum.value))throw new Fault(400,'Invalid checksum')
  return {title:text(d.title,200),url:publicURL(d.url),mediaType:d.mediaType?text(d.mediaType,100):null,format:d.format?text(d.format,40):null,byteSize:size,checksum}
 })
 if(!distributions.length)throw new Fault(400,'A dataset needs at least one distribution')
 const structure=(Array.isArray(b.structure)?b.structure:[]).slice(0,60).map((f:Record<string,unknown>):Field=>({name:text(f.name,120),dataType:text(f.dataType,60),description:text(f.description??'',300,true)}))
 const about=list(b.about,80,80).map(slug)
 if(!about.length)throw new Fault(400,'A dataset must be about at least one thing in the knowledge model')
 const t=b.temporal as Record<string,unknown>|undefined|null
 return {
  key:text(b.key,200),title:text(b.title,300),description:text(b.description,2000),kind:oneOf(b.kind,datasetKinds,'dataset kind'),
  publisher:text(b.publisher,200),publisherUrl:b.publisherUrl?publicURL(b.publisherUrl):null,landingPage:publicURL(b.landingPage),
  licence:text(b.licence,100),licenceUrl:b.licenceUrl?publicURL(b.licenceUrl):null,
  issued:date(b.issued),modified:date(b.modified),version:b.version?text(b.version,60):null,
  languages:list(b.languages,12,20),keywords:list(b.keywords,30,60),
  temporal:t?{start:date(t.start),end:date(t.end)}:null,spatial:b.spatial?text(b.spatial,300):null,
  distributions,structure,citation:b.citation?text(b.citation,1000):null,accessTier:tier,about,checked:date(b.checked),
 }
}

export class Datasets{
 readonly store:EtnosCore
 readonly groups:Groups
 readonly shipped:Map<string,ReturnType<typeof datasetInput>>
 readonly things:Map<string,ShippedThing>
 constructor(store:EtnosCore,groups:Groups,shipped:{datasets?:DatasetSeed;things?:ShippedThing[]}={}){
  this.store=store;this.groups=groups
  this.shipped=new Map((shipped.datasets?.datasets??[]).map(d=>{const x=datasetInput(d);return [datasetId(x.key),x]}))
  this.things=new Map((shipped.things??[]).map(t=>[t.slug,t]))
 }
 /** A shipped record as a row, before any steward has stored it. */
 private shippedRow(id:string,x:ReturnType<typeof datasetInput>):Row{
  return {id,key:x.key,title:x.title,description:x.description,kind:x.kind,publisher:x.publisher,publisher_url:x.publisherUrl,landing_page:x.landingPage,licence:x.licence,licence_url:x.licenceUrl,issued:x.issued,modified:x.modified,version:x.version,languages:JSON.stringify(x.languages),keywords:JSON.stringify(x.keywords),temporal:x.temporal?JSON.stringify(x.temporal):null,spatial:x.spatial,distributions:JSON.stringify(x.distributions),structure:JSON.stringify(x.structure),citation:x.citation,access_tier:x.accessTier,state:'proposed',origin:'seed',checked:x.checked,proposer_id:'',reviewer_id:null,revision:1,created:0,updated:0}
 }
 private aboutOf(r:Row){const x=r.origin==='seed'&&!this.stored(r.id)?this.shipped.get(r.id):undefined;return x?x.about:this.store.all<{entity:string}>('SELECT entity FROM dataset_about WHERE dataset_id=? ORDER BY entity',r.id).map(e=>e.entity)}
 private stored(id:string){return !!this.store.get('SELECT 1 FROM datasets WHERE id=?',id)}
 private rows(){
  const stored=this.store.all<Row>('SELECT * FROM datasets'),keys=new Set(stored.map(r=>r.key))
  return [...stored,...[...this.shipped].filter(([,x])=>!keys.has(x.key)).map(([id,x])=>this.shippedRow(id,x))].sort((a,b)=>a.title.localeCompare(b.title,'id')||a.id.localeCompare(b.id))
 }
 private row(id:string){return this.store.get<Row>('SELECT * FROM datasets WHERE id=?',id)??(this.shipped.has(id)&&!this.store.get('SELECT 1 FROM datasets WHERE key=?',this.shipped.get(id)!.key)?this.shippedRow(id,this.shipped.get(id)!):undefined)}

 private isSteward(actorId?:string){if(!actorId)return false;try{this.groups.nodeSteward(actorId);return true}catch{return false}}
 /** Seen by everyone when accepted or seeded; a member's proposal only by its proposer and the node stewards. */
 private visible(r:Row,actorId?:string){
  if(r.state==='accepted')return true
  if(r.state==='proposed')return r.origin==='seed'||(!!actorId&&(r.proposer_id===actorId||this.isSteward(actorId)))
  return this.isSteward(actorId)
 }
 /** A thing a dataset may point to: accepted, in the node commons or a public community, following merges. */
 private publicThing(slug:string){
  let row=this.store.get<{slug:string;class:string;title:string;context_slug:string|null;community_id:string|null;state:string;merged_into:string|null}>('SELECT slug,class,title,context_slug,community_id,state,merged_into FROM km_entities WHERE slug=?',slug)
  for(let i=0;row&&row.state==='merged'&&row.merged_into&&i<8;i++)row=this.store.get('SELECT slug,class,title,context_slug,community_id,state,merged_into FROM km_entities WHERE slug=?',row.merged_into)
  if(!row){const t=this.things.get(slug);return t?{slug:t.slug,class:t.class,title:t.title,context:t.context}:null}
  if(row.state!=='accepted')return null
  if(row.community_id!==null&&this.store.get<{visibility:string}>('SELECT visibility FROM communities WHERE id=?',row.community_id)?.visibility!=='public')return null
  return {slug:row.slug,class:row.class,title:row.title,context:row.context_slug}
 }
 private about(id:string){
  const seen=new Map<string,{slug:string;class:string;title:string;context:string|null}>()
  const r0=this.row(id)
  for(const e of r0?this.aboutOf(r0):[]){const t=this.publicThing(e);if(t)seen.set(t.slug,t)}
  return [...seen.values()]
 }
 private view(r:Row){
  return {
   id:r.id,key:r.key,title:r.title,description:r.description,kind:r.kind,publisher:r.publisher,publisherUrl:r.publisher_url,landingPage:r.landing_page,
   licence:r.licence,licenceUrl:r.licence_url,issued:r.issued,modified:r.modified,version:r.version,languages:JSON.parse(r.languages) as string[],keywords:JSON.parse(r.keywords) as string[],
   temporal:r.temporal?JSON.parse(r.temporal) as {start:string|null;end:string|null}:null,spatial:r.spatial,distributions:JSON.parse(r.distributions) as Distribution[],structure:JSON.parse(r.structure) as Field[],
   citation:r.citation,accessTier:r.access_tier,state:r.state,origin:r.origin,checked:r.checked,revision:r.revision,created:r.created,updated:r.updated,
   checkedBySteward:r.state==='accepted',about:this.about(r.id),
  }
 }
 private insert(actorId:string,input:ReturnType<typeof datasetInput>,origin:string){
  const s=this.store,now=s.clock(),id=origin==='seed'?datasetId(input.key):randomUUID()
  s.run("INSERT INTO datasets VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'proposed',?,?,?,NULL,1,?,?)",id,input.key,input.title,input.description,input.kind,input.publisher,input.publisherUrl,input.landingPage,input.licence,input.licenceUrl,input.issued,input.modified,input.version,JSON.stringify(input.languages),JSON.stringify(input.keywords),input.temporal?JSON.stringify(input.temporal):null,input.spatial,JSON.stringify(input.distributions),JSON.stringify(input.structure),input.citation,input.accessTier,origin,input.checked,actorId,now,now)
  // A link needs a model row; links to things known only from the shipped catalogue wait until it is imported.
  for(const e of input.about)if(s.get('SELECT 1 FROM km_entities WHERE slug=?',e))s.run('INSERT OR IGNORE INTO dataset_about VALUES(?,?)',id,e)
  return id
 }
 private requireThings(about:string[]){for(const e of about){const row=this.store.get<{community_id:string|null}>('SELECT community_id FROM km_entities WHERE slug=?',e);if(!row||row.community_id!==null||!this.publicThing(e))throw new Fault(400,'A dataset may only point to public things in the commons')}}

 /** Any person with an account may propose a record. Agents may not, in this slice. */
 propose(actorId:string,b:Record<string,unknown>){
  const input=datasetInput(b)
  return transition(this.store,actorId,b.requestKey,'dataset.propose',input,()=>{
   if(this.store.actor(actorId).kind!=='human')throw new Fault(403,'Only people may propose a dataset for now')
   this.requireThings(input.about)
  },()=>{
   if(this.store.get('SELECT 1 FROM datasets WHERE key=?',input.key)||this.shipped.has(datasetId(input.key)))throw new Fault(409,'This dataset is already in the catalogue')
   const id=this.insert(actorId,input,'proposal')
   this.store.audit(actorId,'dataset.propose',id)
   return this.view(this.store.get<Row>('SELECT * FROM datasets WHERE id=?',id)!)
  })
 }
 /** A node steward accepts or rejects a proposal, or withdraws a listed record. */
 review(actorId:string,id:string,b:Record<string,unknown>){
  const decision=oneOf(b.decision,['accept','reject','withdraw'] as const,'decision')
  return transition(this.store,actorId,b.requestKey,'dataset.review',{id,decision,revision:b.revision},()=>{
   const r=this.row(id)
   if(!r||!this.visible(r,actorId))throw new Fault(404,'Not found')
   this.groups.nodeSteward(actorId)
  },()=>{
   const s=this.store
   if(!this.stored(id)&&this.shipped.has(id))this.insert(actorId,this.shipped.get(id)!,'seed')
   const r=s.get<Row>('SELECT * FROM datasets WHERE id=?',id)!
   expected(b.revision,r.revision)
   if(decision==='withdraw'?r.state!=='accepted':r.state!=='proposed')throw new Fault(409,'This record was already reviewed')
   if(decision==='accept'&&!this.store.get('SELECT 1 FROM dataset_about WHERE dataset_id=?',id))throw new Fault(409,'Import the knowledge seed first: this record points to no stored public thing')
   s.run('UPDATE datasets SET state=?,reviewer_id=?,revision=revision+1,updated=? WHERE id=? AND revision=?',{accept:'accepted',reject:'rejected',withdraw:'withdrawn'}[decision],actorId,s.clock(),id,r.revision)
   s.audit(actorId,'dataset.'+decision,id)
   return this.view(s.get<Row>('SELECT * FROM datasets WHERE id=?',id)!)
  })
 }
 /** Node steward only. Idempotent by key; records that point to no known public thing are skipped. */
 importSeed(actorId:string,seed:DatasetSeed){
  return this.store.tx(()=>{
   this.groups.nodeSteward(actorId)
   if(!seed||seed.version!==1||!Array.isArray(seed.datasets))throw new Fault(400,'Invalid dataset seed')
   const count={added:0,present:0,skipped:0}
   for(const raw of seed.datasets){
    const input=datasetInput(raw)
    if(this.store.get('SELECT 1 FROM datasets WHERE key=?',input.key)){count.present++;continue}
    input.about=input.about.filter(e=>this.store.get('SELECT 1 FROM km_entities WHERE slug=?',e)&&this.publicThing(e))
    if(!input.about.length){count.skipped++;continue}
    this.insert(actorId,input,'seed');count.added++
   }
   this.store.audit(actorId,'dataset.seed',`${count.added}/${count.present}/${count.skipped}`)
   return count
  })
 }

 list(actorId?:string,filter:{thing?:string;context?:string;q?:string;kind?:string}={}){
  let ids:Set<string>|null=null
  if(filter.thing||filter.context){
   const things=filter.thing?[filter.thing]:[...new Set([...this.store.all<{slug:string}>('SELECT slug FROM km_entities WHERE context_slug=?',filter.context!).map(r=>r.slug),...[...this.things.values()].filter(t=>t.context===filter.context).map(t=>t.slug)])]
   const visible=things.map(t=>this.publicThing(t)?.slug).filter((x):x is string=>!!x)
   ids=new Set(this.rows().filter(r=>this.aboutOf(r).some(e=>visible.includes(e))).map(r=>r.id))
  }
  const q=filter.q?.trim().toLowerCase()
  return this.rows().filter(r=>this.visible(r,actorId)&&(!ids||ids.has(r.id))&&(!filter.kind||r.kind===filter.kind)&&(!q||(r.title+' '+r.publisher+' '+r.keywords).toLowerCase().includes(q))).map(r=>this.view(r)).filter(r=>r.about.length>0||this.isSteward(actorId)).slice(0,500)
 }
 read(actorId:string|undefined,id:string){
  const r=this.row(id)
  if(!r||!this.visible(r,actorId))throw new Fault(404,'Not found')
  const v=this.view(r)
  if(!v.about.length&&!this.isSteward(actorId))throw new Fault(404,'Not found')
  return {...v,jsonld:Datasets.jsonld(v)}
 }
 /**
  * The record as schema.org Dataset JSON-LD with the Croissant 1.0 core: what dataset search engines,
  * DCAT harvesters that read schema.org, and Croissant loaders understand. Only fields that the record
  * holds are written; nothing is filled in.
  */
 static jsonld(v:ReturnType<Datasets['view']>){
  return {
   '@context':{'@vocab':'https://schema.org/',sc:'https://schema.org/',cr:'http://mlcommons.org/croissant/',dct:'http://purl.org/dc/terms/'},
   '@type':'sc:Dataset',conformsTo:'http://mlcommons.org/croissant/1.0',
   name:v.title,description:v.description,url:v.landingPage,license:v.licenceUrl??v.licence,
   publisher:{'@type':'Organization',name:v.publisher,...(v.publisherUrl?{url:v.publisherUrl}:{})},
   ...(v.version?{version:v.version}:{}),...(v.issued?{datePublished:v.issued}:{}),...(v.modified?{dateModified:v.modified}:{}),
   ...(v.languages.length?{inLanguage:v.languages}:{}),...(v.keywords.length?{keywords:v.keywords}:{}),
   ...(v.temporal&&(v.temporal.start||v.temporal.end)?{temporalCoverage:`${v.temporal.start??'..'}/${v.temporal.end??'..'}`}:{}),
   ...(v.spatial?{spatialCoverage:v.spatial}:{}),...(v.citation?{citeAs:v.citation}:{}),
   isAccessibleForFree:true,
   distribution:v.distributions.map((d,i)=>({'@type':'cr:FileObject','@id':'file-'+(i+1),name:d.title,contentUrl:d.url,...(d.format||d.mediaType?{encodingFormat:d.mediaType??d.format}:{}),...(d.byteSize!==null?{contentSize:d.byteSize+' B'}:{}),...(d.checksum?.algorithm==='sha256'?{sha256:d.checksum.value}:d.checksum?{md5:d.checksum.value}:{})})),
   ...(v.structure.length?{recordSet:[{'@type':'cr:RecordSet','@id':'records',field:v.structure.map(f=>({'@type':'cr:Field','@id':'records/'+f.name,name:f.name,description:f.description,dataType:f.dataType}))}]}:{}),
   about:v.about.map(t=>({'@type':'Thing',name:t.title,identifier:t.slug})),
  }
 }
 /** What a node steward can act on: proposals not yet reviewed. */
 queue(actorId:string){
  this.groups.nodeSteward(actorId)
  return this.rows().filter(r=>r.state==='proposed').map(r=>this.view(r))
 }
}
