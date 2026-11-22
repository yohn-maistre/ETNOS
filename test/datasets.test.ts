import test from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Groups} from '../src/groups.ts'
import {KnowledgeModel,type KnowledgeSeed} from '../src/knowledge-model.ts'
import {Datasets,datasetInput,datasetId,type DatasetSeed} from '../src/datasets.ts'
import {api} from '../src/api.ts'
import shippedDatasets from '../src/catalogues/tanah-papua-datasets.json' with {type:'json'}
import shippedKnowledge from '../src/catalogues/tanah-papua-knowledge-seed.json' with {type:'json'}

// Synthetic records and things: invented names, never real datasets, people or places.
const seed:KnowledgeSeed={version:1,
 entities:[
  {slug:'lembah-uji',class:'tempat',title:'Lembah Uji',description:'Synthetic',aliases:[],context:'lembah-uji',origin:'catalogue'},
  {slug:'bahasa-uji',class:'bahasa',title:'Bahasa Uji',description:'Synthetic',aliases:[],context:null,origin:'catalogue'},
 ],witnesses:[],mentions:[],assertions:[]}
const record=(key:string,about:string[],extra:Record<string,unknown>={})=>({key,title:'Tabel '+key,description:'Synthetic table.',kind:'table',publisher:'Penerbit Uji',landingPage:'https://data.uji.id/'+key,licence:'CC BY 4.0',distributions:[{title:'CSV',url:'https://data.uji.id/'+key+'.csv',mediaType:'text/csv',byteSize:120,checksum:{algorithm:'sha256',value:'ab'.repeat(32)}}],structure:[{name:'tahun',dataType:'sc:Integer',description:'Tahun'}],about,accessTier:'open',...extra})
const shipped:DatasetSeed={version:1,datasets:[record('seed-a',['lembah-uji']),record('seed-b',['danau-uji-katalog'])]}

let n=0
const rk=()=>'request-'+(++n).toString().padStart(6,'0')
function world(){
 const s=new Etnos(':memory:','https://ds.example.org')
 const steward=s.provision('did:web:steward.example','Node steward'),host=s.provision('did:web:host.example','Host'),member=s.provision('did:web:member.example','Member'),outsider=s.provision('did:web:outsider.example','Outsider')
 const agent=s.provision('did:web:agent.example','Agent',host.actor.id)
 const g=new Groups(s,{stewardDid:steward.actor.did}),m=new KnowledgeModel(s,g)
 // The shipped catalogue knows one thing that the model has not imported.
 const d=new Datasets(s,g,{datasets:shipped,things:[{slug:'danau-uji-katalog',class:'tempat',title:'Danau Uji',context:'danau-uji'}]})
 const open=s.createCommunity(host.actor.id,'Open room','Synthetic','public'),closed=s.createCommunity(host.actor.id,'Closed room','Synthetic','hidden-private')
 s.setMember(host.actor.id,open.id,member.actor.id,true);s.setMember(host.actor.id,closed.id,member.actor.id,true)
 m.importSeed(steward.actor.id,seed)
 return {s,g,m,d,steward:steward.actor.id,host:host.actor.id,member:member.actor.id,outsider:outsider.actor.id,agent:agent.actor.id,open:open.id,closed:closed.id}
}
const titles=(rows:{title:string}[])=>rows.map(r=>r.title).sort()

test('shipped records show at once, labelled as not yet checked, and keep one address after review',()=>{
 const x=world()
 try{
  const list=x.d.list()
  assert.deepEqual(titles(list),['Tabel seed-a','Tabel seed-b'])
  assert.ok(list.every(r=>r.state==='proposed'&&r.origin==='seed'&&!r.checkedBySteward))
  // A thing known only from the shipped catalogue still answers for the link.
  assert.deepEqual(x.d.list(undefined,{context:'danau-uji'}).map(r=>r.key),['seed-b'])
  assert.deepEqual(x.d.list(undefined,{thing:'lembah-uji'}).map(r=>r.key),['seed-a'])
  const id=datasetId('seed-a')
  assert.equal(x.d.read(undefined,id).id,id)
  assert.throws(()=>x.d.review(x.member,id,{decision:'accept',revision:1,requestKey:rk()}),/Node steward/)
  const accepted=x.d.review(x.steward,id,{decision:'accept',revision:1,requestKey:rk()})
  assert.equal(accepted.state,'accepted');assert.equal(accepted.id,id);assert.equal(accepted.checkedBySteward,true)
  // The stored row wins over the shipped one; nothing is listed twice.
  assert.equal(x.d.list().filter(r=>r.key==='seed-a').length,1)
  // A record whose thing has no model row yet cannot be accepted until the knowledge seed is imported.
  assert.throws(()=>x.d.review(x.steward,datasetId('seed-b'),{decision:'accept',revision:1,requestKey:rk()}),/knowledge seed/)
  const rejected=x.d.review(x.steward,datasetId('seed-b'),{decision:'reject',revision:1,requestKey:rk()})
  assert.equal(rejected.state,'rejected')
  assert.deepEqual(titles(x.d.list()),['Tabel seed-a'])
  assert.throws(()=>x.d.read(undefined,datasetId('seed-b')),/Not found/)
 }finally{x.s.close()}
})

test('a member proposal stays with its proposer and the stewards until accepted',()=>{
 const x=world()
 try{
  const p=x.d.propose(x.member,{...record('member-1',['bahasa-uji']),requestKey:rk()})
  assert.equal(p.state,'proposed')
  for(const reader of [undefined,x.outsider,x.host])assert.ok(!x.d.list(reader).some(r=>r.key==='member-1'))
  assert.throws(()=>x.d.read(x.outsider,p.id),/Not found/)
  assert.ok(x.d.list(x.member).some(r=>r.key==='member-1'))
  assert.ok(x.d.queue(x.steward).some(r=>r.key==='member-1'))
  assert.throws(()=>x.d.queue(x.member),/Node steward/)
  x.d.review(x.steward,p.id,{decision:'accept',revision:p.revision,requestKey:rk()})
  assert.ok(x.d.list().some(r=>r.key==='member-1'))
  // Two stewards from one revision: one wins.
  assert.throws(()=>x.d.review(x.steward,p.id,{decision:'withdraw',revision:p.revision,requestKey:rk()}),/changed/)
  assert.throws(()=>x.d.propose(x.member,{...record('member-1',['bahasa-uji']),requestKey:rk()}),/already/)
  assert.throws(()=>x.d.propose(x.member,{...record('seed-a',['bahasa-uji']),requestKey:rk()}),/already/)
 }finally{x.s.close()}
})

test('only the open tier, only people, only public commons things, and links checked at read time',()=>{
 const x=world()
 try{
  for(const tier of ['community','controlled'])assert.throws(()=>x.d.propose(x.member,{...record('t-'+tier,['bahasa-uji'],{accessTier:tier}),requestKey:rk()}),/Only open datasets/)
  assert.throws(()=>x.d.propose(x.agent,{...record('agent-1',['bahasa-uji']),requestKey:rk()}),/Only people/)
  assert.throws(()=>x.d.propose(x.member,{...record('nothing',[]),requestKey:rk()}),/at least one thing/)
  assert.throws(()=>x.d.propose(x.member,{...record('nodist',['bahasa-uji'],{distributions:[]}),requestKey:rk()}),/distribution/)
  assert.throws(()=>x.d.propose(x.member,{...record('http',['bahasa-uji'],{landingPage:'http://data.uji.id/x'}),requestKey:rk()}),/HTTPS/)
  // A thing that belongs to a private community cannot be named, and a public community thing is not commons.
  const priv=x.m.proposeEntity(x.member,{communityId:x.closed,slug:'kebun-uji',class:'tempat',title:'Kebun Uji',requestKey:rk()})
  x.m.reviewEntity(x.host,'kebun-uji',{decision:'accept',revision:priv.revision,requestKey:rk()})
  assert.throws(()=>x.d.propose(x.member,{...record('priv',['kebun-uji']),requestKey:rk()}),/public things/)
  const pub=x.m.proposeEntity(x.member,{communityId:x.open,slug:'sungai-uji',class:'tempat',title:'Sungai Uji',requestKey:rk()})
  x.m.reviewEntity(x.host,'sungai-uji',{decision:'accept',revision:pub.revision,requestKey:rk()})
  assert.throws(()=>x.d.propose(x.member,{...record('pub',['sungai-uji']),requestKey:rk()}),/public things/)
  // A link drops out when its thing stops being public; a record with no public link leaves public view.
  const p=x.d.propose(x.member,{...record('lembah',['lembah-uji','bahasa-uji']),requestKey:rk()})
  x.d.review(x.steward,p.id,{decision:'accept',revision:p.revision,requestKey:rk()})
  x.s.run("UPDATE km_entities SET state='rejected' WHERE slug='bahasa-uji'")
  assert.deepEqual(x.d.read(undefined,p.id).about.map(t=>t.slug),['lembah-uji'])
  x.s.run("UPDATE km_entities SET state='rejected' WHERE slug='lembah-uji'")
  assert.ok(!x.d.list().some(r=>r.key==='lembah'))
  assert.throws(()=>x.d.read(undefined,p.id),/Not found/)
  assert.ok(x.d.list(x.steward).some(r=>r.key==='lembah'))
 }finally{x.s.close()}
})

test('a record reads as schema.org Dataset with the Croissant core, holding only what the record holds',()=>{
 const x=world()
 try{
  const r=x.d.read(undefined,datasetId('seed-a'))
  const ld=r.jsonld as Record<string,unknown>
  assert.equal(ld.conformsTo,'http://mlcommons.org/croissant/1.0')
  assert.equal(ld.name,'Tabel seed-a')
  const dist=ld.distribution as Record<string,unknown>[]
  assert.equal(dist[0]!.contentUrl,'https://data.uji.id/seed-a.csv');assert.equal(dist[0]!.sha256,'ab'.repeat(32))
  assert.ok(!('version' in ld)&&!('datePublished' in ld))
 }finally{x.s.close()}
})

test('the shipped dataset seed is well formed and points only to things in the shipped knowledge seed',()=>{
 const slugs=new Set((shippedKnowledge as KnowledgeSeed).entities.map(e=>e.slug))
 const list=(shippedDatasets as DatasetSeed).datasets
 assert.ok(list.length>=5)
 const keys=new Set<string>()
 for(const raw of list){
  const r=datasetInput(raw)
  assert.ok(!keys.has(r.key));keys.add(r.key)
  assert.equal(r.accessTier,'open')
  assert.ok(r.checked,'every shipped record says when it was checked')
  assert.ok(r.licence&&r.landingPage.startsWith('https://'))
  for(const e of r.about)assert.ok(slugs.has(e),r.key+' points to '+e)
 }
})

test('the API lists the shipped catalogue without an import and keeps writes behind authentication',async()=>{
 const s=new Etnos(':memory:','https://ds.example.org')
 try{
  const steward=s.provision('did:web:steward.example','Node steward')
  const handle=api(s,{stewardDid:steward.actor.did})
  const call=(path:string,init:RequestInit={})=>handle(new Request('https://ds.example.org'+path,init))
  const list=await (await call('/v1/datasets')).json() as {id:string;about:{slug:string}[]}[]
  assert.equal(list.length,(shippedDatasets as DatasetSeed).datasets.length)
  assert.ok(list.every(r=>r.about.length>0))
  const ekari=await (await call('/v1/datasets?context=bahasa-ekari')).json() as {key:string}[]
  assert.ok(ekari.length>=3)
  assert.equal((await call('/v1/datasets/'+list[0]!.id)).status,200)
  assert.equal((await call('/v1/datasets/tidak-ada')).status,404)
  assert.equal((await call('/v1/datasets',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,401)
  assert.equal((await call('/v1/datasets/queue')).status,401)
 }finally{s.close()}
})
