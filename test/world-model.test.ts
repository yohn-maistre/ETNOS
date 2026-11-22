import test from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Groups} from '../src/groups.ts'
import {KnowledgeModel,type KnowledgeSeed} from '../src/knowledge-model.ts'
import {worldByRule,depthByRule,bandOf,bands,placeOf} from '../src/world-model.ts'
import {api} from '../src/api.ts'
import shipped from '../src/catalogues/tanah-papua-knowledge-seed.json' with {type:'json'}
import places from '../src/catalogues/tanah-papua-places.json' with {type:'json'}

// Synthetic seed: invented names and sentences, never real people or places.
const seed:KnowledgeSeed={version:1,
 entities:[
  {slug:'lembah-uji',class:'tempat',title:'Lembah Uji',description:'Synthetic',aliases:[],context:null,origin:'page'},
  {slug:'provinsi-uji',class:'tempat',title:'Provinsi Uji',description:'Synthetic',aliases:[],context:null,origin:'catalogue'},
  {slug:'bahasa-uji',class:'bahasa',title:'Bahasa Uji',description:'Synthetic',aliases:[],context:null,origin:'catalogue'},
 ],
 witnesses:[{key:'url:https://example.org/a',kind:'document',title:'Fixture A',url:'https://example.org/a',publisher:'example.org',licence:'CC BY-SA 4.0',year:null,language:'id',voice:'ensiklopedia',excerpts:[{digest:'d1',text:'Lembah Uji berada di Provinsi Uji.',section:'geografi'},{digest:'d2',text:'Bahasa Uji dituturkan di Lembah Uji.',section:'bahasa'}]}],
 mentions:[
  {entity:'lembah-uji',witness:'url:https://example.org/a',excerpt:'d1',surface:'Lembah Uji'},{entity:'provinsi-uji',witness:'url:https://example.org/a',excerpt:'d1',surface:'Provinsi Uji'},
  {entity:'bahasa-uji',witness:'url:https://example.org/a',excerpt:'d2',surface:'Bahasa Uji'},{entity:'lembah-uji',witness:'url:https://example.org/a',excerpt:'d2',surface:'Lembah Uji'},
 ],
 assertions:[{subject:'lembah-uji',predicate:'bagian-dari',object:'provinsi-uji',status:'accepted',origin:'catalogue',support:[{witness:'url:https://example.org/a',excerpt:'d1'}]}]}

let n=0
const rk=()=>'request-'+(++n).toString().padStart(6,'0')
function world(){
 const s=new Etnos(':memory:','https://km.example.org')
 const steward=s.provision('did:web:steward.example','Node steward'),host=s.provision('did:web:host.example','Host'),member=s.provision('did:web:member.example','Member'),outsider=s.provision('did:web:outsider.example','Outsider')
 const g=new Groups(s,{stewardDid:steward.actor.did}),m=new KnowledgeModel(s,g)
 const open=s.createCommunity(host.actor.id,'Open room','Synthetic','public'),closed=s.createCommunity(host.actor.id,'Closed room','Synthetic','hidden-private')
 s.setMember(host.actor.id,open.id,member.actor.id,true);s.setMember(host.actor.id,closed.id,member.actor.id,true)
 return {s,g,m,steward:steward.actor.id,host:host.actor.id,member:member.actor.id,outsider:outsider.actor.id,open:open.id,closed:closed.id}
}

test('rules give ranges with a basis: places from their outline, languages and peoples by class, persons nothing',()=>{
 const paniai=placeOf('paniai')!
 assert.ok(paniai.areaKm2>1000&&paniai.latitude<0&&paniai.longitude>130)
 const regency=worldByRule({slug:'kabupaten-paniai',class:'tempat',title:'Kabupaten Paniai',context_slug:'paniai'})
 const side=Math.log10(Math.sqrt(paniai.areaKm2*1e6))
 assert.ok(regency.size!.lo<side&&side<regency.size!.hi)
 assert.equal(regency.level!.code,'t');assert.equal(regency.level!.band,'masyarakat-aturan')
 assert.equal(regency.size!.basis,'rule');assert.match(regency.size!.note,/km²/)
 assert.equal(worldByRule({slug:'mee-pago',class:'tempat',title:'Wilayah adat Mee Pago',context_slug:'meepago'}).level!.code,'s')
 const lake=worldByRule({slug:'danau-uji',class:'tempat',title:'Danau Uji',context_slug:null})
 assert.equal(lake.level!.band,'batuan-bumi');assert.ok(lake.pace!.lo>10)
 assert.equal(worldByRule({slug:'bahasa-uji',class:'bahasa',title:'Bahasa Uji'}).level!.band,'bahasa-ritus')
 assert.deepEqual(worldByRule({slug:'orang-uji',class:'orang',title:'Orang Uji'}),{size:null,pace:null,level:null})
 for(const c of ['tempat','makhluk','kelompok','lembaga','benda','bahasa','gagasan','praktik','peristiwa','musim','cerita']){
  const w=worldByRule({slug:'x',class:c,title:'X'})
  for(const r of [w.size,w.pace])if(r)assert.ok(r.lo<=r.hi&&r.note.length>0)
  assert.ok(w.level&&bandOf(w.level.code)===w.level.band)
 }
 assert.equal(depthByRule('bagian-dari'),'apa');assert.equal(depthByRule('dilakukan-oleh'),'cara')
 assert.equal(depthByRule('dijaga-oleh'),'aturan');assert.equal(depthByRule('diceritakan-dalam'),'makna');assert.equal(depthByRule('menurut'),null)
 assert.equal(bands.map(b=>b.classes).join(''),'abcdefghijklmnopqrstuvwxy')
 // Every catalogue place has a point inside Tanah Papua and an area.
 for(const p of Object.values((places as {places:Record<string,{areaKm2:number;latitude:number;longitude:number}>}).places))assert.ok(p.areaKm2>100&&p.latitude>-10&&p.latitude<1&&p.longitude>129&&p.longitude<142)
})

test('seed import stores coordinates and depth; the public graph and the entity carry them',()=>{
 const x=world()
 try{
  const out=x.m.importSeed(x.steward,seed)
  assert.equal(out.world,3)
  assert.equal(x.s.get<{n:number}>('SELECT count(*) n FROM km_coordinates')!.n,3)
  assert.equal(x.m.importSeed(x.steward,seed).world,0)
  const g=x.m.graph(undefined,{publicOnly:true})
  const lembah=g.nodes.find(nd=>nd.id==='lembah-uji')!
  assert.equal(lembah.world.level!.code,'j');assert.equal(lembah.world.size!.basis,'rule')
  assert.equal(g.statements[0]!.depth,'apa');assert.equal(g.statements[0]!.depthBasis,'rule')
  const e=x.m.entity(undefined,'lembah-uji')
  assert.deepEqual(e.depth,{apa:1,cara:0,aturan:0,makna:0})
  assert.equal(e.world.level!.band,'batuan-bumi')
 }finally{x.s.close()}
})

test('a reviewer corrects coordinates: basis person, revisions guard, other values keep their rule',()=>{
 const x=world()
 try{
  x.m.importSeed(x.steward,seed)
  assert.throws(()=>x.m.setCoordinates(x.member,'lembah-uji',{size:[3,4],revision:1,requestKey:rk()}),/Node steward/)
  assert.throws(()=>x.m.setCoordinates(x.steward,'lembah-uji',{size:[5,4],revision:1,requestKey:rk()}),/Invalid range/)
  assert.throws(()=>x.m.setCoordinates(x.steward,'lembah-uji',{level:'z',revision:1,requestKey:rk()}),/Invalid level/)
  assert.throws(()=>x.m.setCoordinates(x.steward,'lembah-uji',{revision:1,requestKey:rk()}),/Give a size/)
  const key=rk()
  const done=x.m.setCoordinates(x.steward,'lembah-uji',{size:[3.6,4.1],note:'Diukur dari peta desa.',revision:1,requestKey:key})
  assert.equal(done.revision,2)
  assert.deepEqual(x.m.setCoordinates(x.steward,'lembah-uji',{size:[3.6,4.1],note:'Diukur dari peta desa.',revision:1,requestKey:key}),done)
  assert.throws(()=>x.m.setCoordinates(x.steward,'lembah-uji',{pace:[11,12],revision:1,requestKey:rk()}),/changed/)
  const w=x.m.entity(undefined,'lembah-uji').world
  assert.deepEqual([w.size!.lo,w.size!.hi,w.size!.basis,w.size!.note],[3.6,4.1,'person','Diukur dari peta desa.'])
  assert.equal(w.pace!.basis,'rule');assert.equal(w.level!.basis,'rule')
  // A later seed import keeps the person's values.
  x.m.importSeed(x.steward,seed)
  assert.equal(x.m.entity(undefined,'lembah-uji').world.size!.basis,'person')
 }finally{x.s.close()}
})

test('coordinates of a private community thing stay with its members and stewards',()=>{
 const x=world()
 try{
  x.m.importSeed(x.steward,seed)
  const e=x.m.proposeEntity(x.member,{communityId:x.closed,slug:'kebun-uji',class:'tempat',title:'Kebun Uji',requestKey:rk()})
  assert.equal(e.world.level!.code,'j')
  x.m.reviewEntity(x.host,'kebun-uji',{decision:'accept',revision:e.revision,requestKey:rk()})
  // Outsiders cannot name it, members cannot correct it, the community steward can.
  assert.throws(()=>x.m.setCoordinates(x.outsider,'kebun-uji',{size:[1,2],revision:1,requestKey:rk()}),/Not found/)
  assert.throws(()=>x.m.setCoordinates(x.member,'kebun-uji',{size:[1,2],revision:1,requestKey:rk()}),/steward|Steward/)
  x.m.setCoordinates(x.host,'kebun-uji',{size:[1,2],revision:1,requestKey:rk()})
  assert.ok(!JSON.stringify(x.m.graph(undefined,{publicOnly:true})).includes('kebun-uji'))
  assert.ok(!JSON.stringify(x.m.entities(x.outsider)).includes('kebun-uji'))
  assert.ok(JSON.stringify(x.m.entities(x.member)).includes('kebun-uji'))
 }finally{x.s.close()}
})

test('depth: a person gives it when proposing or reviewing, otherwise the predicate rule applies',()=>{
 const x=world()
 try{
  x.m.importSeed(x.steward,seed)
  const d2=x.s.get<{id:string}>("SELECT id FROM km_excerpts WHERE digest='d2'")!.id
  assert.throws(()=>x.m.proposeAssertion(x.member,{subject:'bahasa-uji',predicate:'dituturkan-di',object:'lembah-uji',support:[d2],depth:'dalam',requestKey:rk()}),/Invalid depth/)
  const a=x.m.proposeAssertion(x.member,{subject:'bahasa-uji',predicate:'dituturkan-di',object:'lembah-uji',support:[d2],depth:'makna',requestKey:rk()})
  assert.equal(a.depth,'makna');assert.equal(a.depthBasis,'person')
  const accepted=x.m.reviewAssertion(x.steward,a.id,{decision:'accept',depth:'apa',revision:a.revision,requestKey:rk()})
  assert.equal(accepted.depth,'apa');assert.equal(accepted.depthBasis,'person')
  assert.throws(()=>x.m.reviewAssertion(x.steward,a.id,{decision:'reject',depth:'apa',revision:accepted.revision,requestKey:rk()}),/Depth is set/)
  assert.deepEqual(x.m.entity(undefined,'bahasa-uji').depth,{apa:1,cara:0,aturan:0,makna:0})
 }finally{x.s.close()}
})

test('the shipped seed: every thing gets a level, size and pace by rule, in the bands it should',()=>{
 const x=world()
 try{
  x.m.importSeed(x.steward,shipped as KnowledgeSeed)
  const nodes=x.m.graph(undefined,{publicOnly:true}).nodes
  assert.equal(nodes.length,(shipped as KnowledgeSeed).entities.length)
  const bandsSeen=new Set<string>()
  for(const nd of nodes){
   assert.ok(nd.world.level&&nd.world.size&&nd.world.pace,nd.id)
   bandsSeen.add(nd.world.level!.band)
  }
  assert.deepEqual([...bandsSeen].sort(),['bahasa-ritus','batuan-bumi','masyarakat-aturan'])
  const paniai=nodes.find(nd=>nd.id==='kabupaten-paniai')!
  assert.match(paniai.world.size!.note,/BIG/)
 }finally{x.s.close()}
})

test('the API returns coordinates and keeps corrections behind authentication',async()=>{
 const s=new Etnos(':memory:','https://km.example.org')
 try{
  const steward=s.provision('did:web:steward.example','Node steward')
  const handle=api(s,{stewardDid:steward.actor.did})
  const call=(path:string,init:RequestInit={})=>handle(new Request('https://km.example.org'+path,init))
  const auth={'content-type':'application/json',authorization:'Bearer '+steward.token}
  assert.equal((await call('/v1/knowledge-model/seed',{method:'POST',headers:auth,body:'{}'})).status,200)
  const e=await (await call('/v1/knowledge-model/entities/danau-paniai')).json() as {world:{level:{band:string};size:{lo:number}}}
  assert.equal(e.world.level.band,'batuan-bumi')
  const body=JSON.stringify({size:[3.8,4.2],revision:1,requestKey:rk()})
  assert.equal((await call('/v1/knowledge-model/entities/danau-paniai/coordinates',{method:'POST',headers:{'content-type':'application/json'},body})).status,401)
  assert.equal((await call('/v1/knowledge-model/entities/danau-paniai/coordinates',{method:'POST',headers:auth,body})).status,200)
  const list=await (await call('/v1/knowledge-model/entities?q=paniai')).json() as {slug:string;world:{size:{basis:string}}}[]
  assert.equal(list.find(r=>r.slug==='danau-paniai')!.world.size.basis,'person')
 }finally{s.close()}
})
