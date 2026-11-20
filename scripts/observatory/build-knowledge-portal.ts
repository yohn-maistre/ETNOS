// Builds the observatory's static files from the knowledge model's public view.
//
//   node scripts/observatory/build-knowledge-portal.ts [--from export.json|https://…/v1/knowledge-model/export]
//        [--vectors vectors.json] [--out apps/web/public/observatory/knowledge] [--export-only file]
//
// Without --from, the shipped seed is imported into an in-memory store and its public view is
// used: the same thing /v1/knowledge-model/export returns after a fresh seed import.
// Only commons witnesses (documents and the catalogue) go into static files. Statements resting
// on community posts are left to the live API, where withdrawal and visibility are checked on
// every read; a static file cannot take back what it already holds.
//
// Output (all JSON, all public, all reproducible from a fixed seed):
//   graph.json     entities with layout, cluster, role, voices and gaps; typed statements;
//                  co-mentions; clusters; null model; questions; coverage
//   excerpts.json  the excerpts behind every node and statement, with their witnesses
//   similar.json   (with --vectors) nearest entities and excerpts by embedding, merge candidates
//   index.json     (with --vectors) the int8 IVF index over entity and excerpt vectors
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {leiden,modularity,nullModel,strategicRoles,hill,predictLinks,layout,type WeightedEdge} from '../../src/knowledge-graph.ts'
import {buildIndex,search,storeIndex,vectorOf} from '../../src/vector-index.ts'
import {worldByRule,type World} from '../../src/world-model.ts'

type Export={nodes:{id:string;class:string;title:string;context:string|null;world?:World;statements:number;excerpts:number;voices:Record<string,number>}[];statements:{source:string;target:string|null;value:string|null;predicate:string;family:string;layer:string;logical:string;rank:string;origin:string;voices:string[];support:{digest:string;witness:string}[]}[];comentions:{a:string;b:string;weight:number;voices:Record<string,number>}[];witnesses:{key:string;kind:string;title:string;url:string|null;publisher:string;licence:string|null;voice:string;scope:'commons'|'community'}[];excerpts?:{digest:string;witness:string;section:string;text:string;mentions:string[]}[]}
const root=new URL('../../',import.meta.url).pathname
const arg=(name:string)=>{const i=process.argv.indexOf(name);return i>0?process.argv[i+1]:undefined}
const SEED=20261119

async function load():Promise<Export>{
 const from=arg('--from')
 if(from?.startsWith('https://'))return await (await fetch(from)).json() as Export
 if(from)return JSON.parse(readFileSync(from,'utf8')) as Export
 const {Strata}=await import('../../src/store.ts'),{Groups}=await import('../../src/groups.ts'),{KnowledgeModel}=await import('../../src/knowledge-model.ts')
 const seed=JSON.parse(readFileSync(root+'src/catalogues/tanah-papua-knowledge-seed.json','utf8'))
 const s=new Strata(':memory:','https://observatory.invalid'),steward=s.provision('did:web:observatory.invalid','Build')
 const model=new KnowledgeModel(s,new Groups(s,{stewardDid:steward.actor.did}))
 model.importSeed(steward.actor.id,seed)
 const out=model.graph(undefined,{publicOnly:true,excerpts:true}) as unknown as Export
 s.close()
 return out
}

const raw=await load()
if(arg('--export-only')){writeFileSync(arg('--export-only')!,JSON.stringify(raw));console.log('export written');process.exit(0)}
// ---------- keep only commons witnesses ----------
const commons=new Set(raw.witnesses.filter(w=>w.scope==='commons').map(w=>w.key))
// Sorted by content, not by database id, so two imports of the same seed give the same files.
const statements=raw.statements.map(s=>({...s,support:s.support.filter(x=>commons.has(x.witness)).sort((a,b)=>a.digest.localeCompare(b.digest))})).filter(s=>s.support.length&&s.target).sort((a,b)=>`${a.source}|${a.predicate}|${a.target}`.localeCompare(`${b.source}|${b.predicate}|${b.target}`))
const excerpts=(raw.excerpts??[]).filter(x=>commons.has(x.witness)).sort((a,b)=>a.digest.localeCompare(b.digest))
const live=new Set(excerpts.map(x=>x.digest))
const nodes=raw.nodes
const ids=nodes.map(n=>n.id).sort()
const byId=new Map(nodes.map(n=>[n.id,n]))
// Co-mentions are recomputed from the kept excerpts so no community excerpt can leave a trace.
const co=new Map<string,{a:string;b:string;weight:number;voices:Record<string,number>}>()
const voiceOf=new Map(raw.witnesses.map(w=>[w.key,w.voice]))
for(const x of excerpts){
 const list=[...new Set(x.mentions)].filter(m=>byId.has(m)).sort(),voice=voiceOf.get(x.witness)!
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const k=list[i]+'|'+list[j],e=co.get(k)??{a:list[i]!,b:list[j]!,weight:0,voices:{}};e.weight++;e.voices[voice]=(e.voices[voice]??0)+1;co.set(k,e)}
}
const comentions=[...co.values()].sort((x,y)=>x.a.localeCompare(y.a)||x.b.localeCompare(y.b))

// ---------- graph measures ----------
// A reviewed statement counts as much as three shared sentences; administrative membership
// (bagian-dari) is down-weighted so the state's hierarchy does not decide every cluster.
const weight=new Map<string,number>()
const add=(a:string,b:string,w:number)=>{const [x,y]=a<b?[a,b]:[b,a],k=x+'|'+y;weight.set(k,(weight.get(k)??0)+w)}
for(const s of statements)add(s.source,s.target!,s.predicate==='bagian-dari'?1:3)
for(const c of comentions)add(c.a,c.b,c.weight)
const edges:WeightedEdge[]=[...weight].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,w])=>{const [a,b]=k.split('|');return [a!,b!,w]})
const clusters=leiden(ids,edges,{seed:SEED})
const q=modularity(ids,edges,clusters)
const nm=nullModel(ids,edges,{samples:50,seed:SEED})
const roles=strategicRoles(edges,clusters)
const pos=layout(ids,edges,{seed:SEED,iterations:300})
const degree=new Map<string,number>()
for(const [a,b,w] of edges){degree.set(a,(degree.get(a)??0)+w);degree.set(b,(degree.get(b)??0)+w)}

// ---------- coverage and gaps ----------
const catalogue=JSON.parse(readFileSync(root+'src/catalogues/tanah-papua.json','utf8')) as {entries:{slug:string;title:string;kind:string;facet?:string;parents:string[]}[]}
const labels=JSON.parse(readFileSync(root+'src/catalogues/tanah-papua-seed-labels.json','utf8')) as {pages:{title:string;contexts:string[]}[]}
const pageTitles=new Map<string,string[]>()
for(const region of ['meepago','saireri','la-pago'])for(const p of JSON.parse(readFileSync(root+`seed/wiki/pages/${region}.json`,'utf8')) as {title:string;kind:string}[]){const l=labels.pages.find(x=>x.title===p.title);for(const c of l?.contexts??[])pageTitles.set(c,[...(pageTitles.get(c)??[]),p.title])}
const contextEntity=new Map(nodes.filter(n=>n.context).map(n=>[n.context!,n.id]))
const witnessesOf=(id:string)=>{const keys=new Set<string>();for(const x of excerpts)if(x.mentions.includes(id))keys.add(x.witness);for(const s of statements)if(s.source===id||s.target===id)for(const x of s.support)keys.add(x.witness);return keys}
// Region: follow reviewed spatial and dwelling statements up to a customary region.
const regions=catalogue.entries.filter(e=>e.kind==='region'&&e.facet==='customary-region')
const regionEntity=new Map(regions.map(r=>[contextEntity.get(r.slug),r.slug]))
const up=new Map<string,string[]>()
for(const s of statements)if(['bagian-dari','berada-di','mendiami','dituturkan-di'].includes(s.predicate))up.set(s.source,[...(up.get(s.source)??[]),s.target!])
const regionOf=(id:string)=>{const seen=new Set<string>(),out=new Set<string>(),stack=[id];while(stack.length){const x=stack.pop()!;if(seen.has(x))continue;seen.add(x);const r=regionEntity.get(x);if(r)out.add(r);stack.push(...(up.get(x)??[]))}return [...out].sort()}

// Size, pace and level (world model §5.2), as the export gives them or by rule for an older export. A rule's note is
// fixed text and goes into the file; a note a reviewer wrote stays in the live API, which can still change it.
const worldOut=(n:Export['nodes'][number])=>{
 const w=n.world??worldByRule({slug:n.id,class:n.class,title:n.title,context_slug:n.context})
 const range=(r:World['size'])=>r?{lo:r.lo,hi:r.hi,basis:r.basis,...(r.basis==='rule'?{note:r.note}:{})}:null
 return {size:range(w.size),pace:range(w.pace),level:w.level?{code:w.level.code,band:w.level.band,basis:w.level.basis,...(w.level.basis==='rule'?{note:w.level.note}:{})}:null}
}
const nodeOut=ids.map(id=>{
 const n=byId.get(id)!,basis=new Map<string,string>()
 for(const x of excerpts)if(x.mentions.includes(id))basis.set(x.digest,x.witness)
 for(const s of statements)if(s.source===id||s.target===id)for(const x of s.support)basis.set(x.digest,x.witness)
 const voices:Record<string,number>={}
 for(const w of basis.values()){const v=voiceOf.get(w)!;voices[v]=(voices[v]??0)+1}
 const witnesses=witnessesOf(id),h=hill(voices),gaps:string[]=[]
 if(witnesses.size<3)gaps.push('sedikit-saksi')
 if(h.q0<=1)gaps.push('satu-suara')
 if(!voices.penutur)gaps.push('belum-ada-penutur')
 if(!statements.some(s=>s.source===id||s.target===id))gaps.push('belum-ada-pernyataan')
 if(n.context&&!pageTitles.has(n.context))gaps.push('belum-ada-halaman')
 const [x,y]=pos.get(id)!
 return {id,class:n.class,title:n.title,context:n.context,regions:regionOf(id),world:worldOut(n),x,y,cluster:clusters.get(id)!,degree:Math.round((degree.get(id)??0)*100)/100,witnesses:witnesses.size,excerpts:excerpts.filter(e=>e.mentions.includes(id)).length,statements:statements.filter(s=>s.source===id||s.target===id).length,voices,diversity:h,gaps,pages:n.context?pageTitles.get(n.context)??[]:[]}
})
const clusterOut=roles.map(r=>{
 const members=nodeOut.filter(n=>n.cluster===r.cluster).sort((a,b)=>b.degree-a.degree||a.id.localeCompare(b.id))
 const byClass:Record<string,number>={},voices:Record<string,number>={}
 for(const m of members){byClass[m.class]=(byClass[m.class]??0)+1;for(const [v,c] of Object.entries(m.voices))voices[v]=(voices[v]??0)+c}
 // The label is the two best-connected names, a description and not an interpretation.
 return {...r,label:members.slice(0,2).map(m=>m.title).join(' · '),top:members.slice(0,8).map(m=>m.id),byClass,voices,diversity:hill(voices)}
}).sort((a,b)=>a.cluster-b.cluster)
// Two administrative units sharing regencies is not a question worth asking; keep pairs where at least one side is not a catalogue unit.
const adminUnit=(id:string)=>!!byId.get(id)!.context&&byId.get(id)!.class==='tempat'
const questions=predictLinks(ids,edges,200).filter(p=>!(adminUnit(p.a)&&adminUnit(p.b))).filter(p=>!statements.some(s=>(s.source===p.a&&s.target===p.b)||(s.source===p.b&&s.target===p.a))).slice(0,40).map(p=>({...p,kind:'hubungan',question:`Apa hubungan ${byId.get(p.a)!.title} dengan ${byId.get(p.b)!.title}?`,status:'saran'}))
const coverage=regions.map(r=>{
 const members=nodeOut.filter(n=>n.regions.includes(r.slug)),voices:Record<string,number>={}
 for(const m of members)for(const [v,c] of Object.entries(m.voices))voices[v]=(voices[v]??0)+c
 const contexts=catalogue.entries.filter(e=>e.parents.includes(r.slug)&&e.kind!=='topic')
 return {region:r.slug,title:r.title,entities:members.length,byClass:members.reduce<Record<string,number>>((a,m)=>(a[m.class]=(a[m.class]??0)+1,a),{}),voices,contexts:contexts.length,contextsWithPage:contexts.filter(c=>pageTitles.has(c.slug)).length,contextsWithoutPage:contexts.filter(c=>!pageTitles.has(c.slug)).map(c=>({slug:c.slug,title:c.title,kind:c.facet??c.kind}))}
})
const languages=catalogue.entries.filter(e=>e.kind==='language')
const witnessOut=raw.witnesses.filter(w=>w.scope==='commons').map(({scope:_s,...w})=>w)
const singleSource=statements.filter(s=>new Set(s.support.map(x=>x.witness)).size===1).length
const graph={
 version:1,
 about:'Peta pengetahuan dari pernyataan dan kutipan publik yang sudah diperiksa. Klaster, peran, dan saran hubungan dihitung ulang dari data yang sama dengan seed tetap.',
 method:{clustering:'Leiden (Traag dkk. 2019), modularitas, resolusi 1',seed:SEED,weights:'pernyataan 3, bagian-dari 1, sebut bersama per kalimat 1',nullModel:'tukar sisi dengan derajat tetap, 50 sampel',roles:'Callon: sentralitas dan kerapatan dibanding median',layout:'Fruchterman–Reingold, 300 iterasi',linkPrediction:'Adamic–Adar; saran, bukan pernyataan'},
 counts:{entities:nodeOut.length,statements:statements.length,comentions:comentions.length,excerpts:excerpts.length,witnesses:witnessOut.length,clusters:clusterOut.length},
 modularity:Math.round(q*1000)/1000,nullModel:nm,
 nodes:nodeOut,
 statements:statements.map(s=>({id:createHash('sha256').update(`${s.source}|${s.predicate}|${s.target}`).digest('hex').slice(0,16),source:s.source,target:s.target,predicate:s.predicate,family:s.family,layer:s.layer,logical:s.logical,rank:s.rank,origin:s.origin,voices:[...new Set(s.support.map(x=>voiceOf.get(x.witness)!))].sort(),support:s.support.map(x=>x.digest)})),
 comentions,clusters:clusterOut,questions,
 gaps:{
  coverage,
  singleSourceStatements:singleSource,
  languagesWithoutEntity:languages.filter(l=>!contextEntity.has(l.slug)).length,
  languagesTotal:languages.length,
  voices:Object.fromEntries(Object.entries(excerpts.reduce<Record<string,number>>((a,x)=>{const v=voiceOf.get(x.witness)!;a[v]=(a[v]??0)+1;return a},{})).sort()),
 },
}
const excerptOut={version:1,witnesses:witnessOut,excerpts:excerpts.map(x=>({digest:x.digest,witness:x.witness,section:x.section,text:x.text,mentions:x.mentions.filter(m=>byId.has(m)).sort()})).sort((a,b)=>a.digest.localeCompare(b.digest))}

// ---------- embeddings (optional, built offline by embed-knowledge.mjs) ----------
let similar:unknown,index:unknown
const vectorsFile=arg('--vectors')
if(vectorsFile){
 const v=JSON.parse(readFileSync(vectorsFile,'utf8')) as {model:string;dims:number;items:{id:string;vector:number[]}[]}
 const vec=new Map(v.items.map(i=>[i.id,i.vector]))
 // An entity is placed by its evidence: the mean of the excerpts that mention it. Short names alone
 // embed too close together with this model to say anything; the name is the fallback.
 const profile=(id:string)=>{
  const rows=excerpts.filter(x=>x.mentions.includes(id)).map(x=>vec.get('excerpt:'+x.digest)).filter((r):r is number[]=>!!r)
  if(!rows.length)return vec.get('entity:'+id)
  return Array.from({length:v.dims},(_,d)=>rows.reduce((a,r)=>a+r[d]!,0)/rows.length)
 }
 const items=[...ids.map(id=>({id:'entity:'+id,vector:profile(id)})),...excerpts.map(x=>({id:'excerpt:'+x.digest,vector:vec.get('excerpt:'+x.digest)}))].filter((i):i is {id:string;vector:number[]}=>!!i.vector)
 const idx=buildIndex(items.map(i=>i.id),items.map(i=>i.vector),{seed:SEED})
 const near=Object.fromEntries(ids.filter(id=>vec.has('entity:'+id)).map(id=>{
  const hits=search(idx,vectorOf(idx,'entity:'+id)!,60,idx.lists.length).filter(h=>h.id!=='entity:'+id)
  const mentioned=new Set(excerpts.filter(x=>x.mentions.includes(id)).map(x=>x.digest))
  return [id,{
   entities:hits.filter(h=>h.id.startsWith('entity:')).slice(0,8).map(h=>({id:h.id.slice(7),score:h.score})),
   // Sentences close to this entity's evidence that do not name it: candidates for a reviewer, not links.
   unnamed:hits.filter(h=>h.id.startsWith('excerpt:')&&!mentioned.has(h.id.slice(8))).slice(0,5).map(h=>({digest:h.id.slice(8),score:h.score})),
  }]
 }))
 similar={version:1,model:v.model,dims:v.dims,note:'Kemiripan dari embedding kutipan. Saran untuk ditinjau, bukan pernyataan.',near}
 index={model:v.model,...storeIndex(idx)}
}

const out=arg('--out')??root+'apps/web/public/observatory/knowledge'
mkdirSync(out,{recursive:true})
writeFileSync(out+'/graph.json',JSON.stringify(graph))
writeFileSync(out+'/excerpts.json',JSON.stringify(excerptOut))
if(similar)writeFileSync(out+'/similar.json',JSON.stringify(similar))
if(index)writeFileSync(out+'/index.json',JSON.stringify(index))
console.log(JSON.stringify({...graph.counts,modularity:graph.modularity,nullModel:nm,questions:questions.length,vectors:!!index}))
