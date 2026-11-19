import test from 'node:test'
import assert from 'node:assert/strict'
import {Strata} from '../src/store.ts'
import {Groups} from '../src/groups.ts'
import {Forum} from '../src/forum.ts'
import {KnowledgeModel,type KnowledgeSeed} from '../src/knowledge-model.ts'
import {api} from '../src/api.ts'
import shipped from '../src/catalogues/tanah-papua-knowledge-seed.json' with {type:'json'}

// Synthetic seed: invented names and sentences, never real people or places.
const seed:KnowledgeSeed={version:1,
 entities:[
  {slug:'lembah-uji',class:'tempat',title:'Lembah Uji',description:'Synthetic',aliases:[],context:null,origin:'page'},
  {slug:'provinsi-uji',class:'tempat',title:'Provinsi Uji',description:'Synthetic',aliases:[],context:null,origin:'catalogue'},
  {slug:'suku-uji',class:'kelompok',title:'Suku Uji',description:'Synthetic',aliases:[],context:null,origin:'page'},
  {slug:'bahasa-uji',class:'bahasa',title:'Bahasa Uji',description:'Synthetic',aliases:[],context:null,origin:'catalogue'},
 ],
 witnesses:[
  {key:'url:https://example.org/a',kind:'document',title:'Fixture A',url:'https://example.org/a',publisher:'example.org',licence:'CC BY-SA 4.0',year:null,language:'id',voice:'ensiklopedia',excerpts:[{digest:'d1',text:'Lembah Uji berada di Provinsi Uji.',section:'geografi'},{digest:'d2',text:'Suku Uji mendiami Lembah Uji.',section:'suku'}]},
  {key:'url:https://example.org/b',kind:'document',title:'Fixture B',url:'https://example.org/b',publisher:'example.go.id',licence:null,year:2020,language:'id',voice:'pemerintah',excerpts:[{digest:'d3',text:'Bahasa Uji dituturkan di Lembah Uji.',section:'bahasa'}]},
 ],
 mentions:[
  {entity:'lembah-uji',witness:'url:https://example.org/a',excerpt:'d1',surface:'Lembah Uji'},{entity:'provinsi-uji',witness:'url:https://example.org/a',excerpt:'d1',surface:'Provinsi Uji'},
  {entity:'suku-uji',witness:'url:https://example.org/a',excerpt:'d2',surface:'Suku Uji'},{entity:'lembah-uji',witness:'url:https://example.org/a',excerpt:'d2',surface:'Lembah Uji'},
  {entity:'bahasa-uji',witness:'url:https://example.org/b',excerpt:'d3',surface:'Bahasa Uji'},{entity:'lembah-uji',witness:'url:https://example.org/b',excerpt:'d3',surface:'Lembah Uji'},
 ],
 assertions:[
  {subject:'lembah-uji',predicate:'bagian-dari',object:'provinsi-uji',status:'accepted',origin:'catalogue',support:[{witness:'url:https://example.org/a',excerpt:'d1'}]},
  {subject:'suku-uji',predicate:'mendiami',object:'lembah-uji',status:'proposed',origin:'cue:mendiami',support:[{witness:'url:https://example.org/a',excerpt:'d2'}]},
  {subject:'bahasa-uji',predicate:'dituturkan-di',object:'lembah-uji',status:'proposed',origin:'cue:dituturkan',support:[{witness:'url:https://example.org/b',excerpt:'d3'}]},
 ]}

let n=0
const rk=()=>'request-'+(++n).toString().padStart(6,'0')
function world(){
 const s=new Strata(':memory:','https://km.example.org')
 const steward=s.provision('did:web:steward.example','Node steward'),host=s.provision('did:web:host.example','Host'),member=s.provision('did:web:member.example','Member'),outsider=s.provision('did:web:outsider.example','Outsider')
 const agent=s.provision('did:web:agent.example','Agent',host.actor.id)
 const g=new Groups(s,{stewardDid:steward.actor.did}),m=new KnowledgeModel(s,g)
 const open=s.createCommunity(host.actor.id,'Open room','Synthetic','public'),closed=s.createCommunity(host.actor.id,'Closed room','Synthetic','hidden-private')
 s.setMember(host.actor.id,open.id,member.actor.id,true);s.setMember(host.actor.id,closed.id,member.actor.id,true);s.setMember(host.actor.id,open.id,agent.actor.id,true)
 return {s,g,m,steward:steward.actor.id,host:host.actor.id,member:member.actor.id,outsider:outsider.actor.id,agent:agent.actor.id,open:open.id,closed:closed.id}
}
const excerptOf=(x:ReturnType<typeof world>,digest:string)=>x.s.get<{id:string}>('SELECT id FROM km_excerpts WHERE digest=?',digest)!.id
const edges=(g:{statements:{source:string;predicate:string;target:string|null}[]})=>g.statements.map(e=>`${e.source} ${e.predicate} ${e.target}`).sort()

test('the seed imports once, by the node steward only, and proposals wait for review',()=>{
 const x=world()
 try{
  assert.throws(()=>x.m.importSeed(x.host,seed),/Node steward/)
  const first=x.m.importSeed(x.steward,seed)
  assert.deepEqual([first.entities,first.witnesses,first.excerpts,first.mentions,first.assertions],[4,2,3,6,3])
  const again=x.m.importSeed(x.steward,seed)
  assert.deepEqual([again.entities,again.witnesses,again.excerpts,again.mentions,again.assertions],[0,0,0,0,0])
  // Only the accepted catalogue membership is a public statement; the cue-phrase proposals are not.
  assert.deepEqual(edges(x.m.graph(undefined,{publicOnly:true})),['lembah-uji bagian-dari provinsi-uji'])
  const queue=x.m.queue(x.steward)
  assert.equal(queue.assertions.length,2)
  assert.equal(x.m.queue(x.host).assertions.length,0)
  const profile=x.m.entity(undefined,'lembah-uji')
  assert.deepEqual(profile.voices,{ensiklopedia:2,pemerintah:1})
  assert.equal(profile.gaps.noTellers,true)
  assert.equal(profile.diversity.q0,2)
  // Co-mentions are typed separately from statements.
  assert.ok(x.m.graph(undefined,{publicOnly:true}).comentions.some(c=>c.a==='bahasa-uji'&&c.b==='lembah-uji'&&c.voices.pemerintah===1))
 }finally{x.s.close()}
})

test('the shipped seed is well formed and imports cleanly',()=>{
 const x=world()
 try{
  const out=x.m.importSeed(x.steward,shipped as KnowledgeSeed)
  assert.equal(out.skipped,0)
  assert.ok(out.entities>50&&out.excerpts>500&&out.assertions>50)
  const g=x.m.graph(undefined,{publicOnly:true})
  assert.ok(g.statements.every(e=>e.origin==='seed:catalogue'&&e.support.length>0))
  // Every excerpt is a verified quote or the catalogue's own text; none is empty.
  assert.equal(x.s.get<{n:number}>("SELECT count(*) n FROM km_excerpts WHERE text=''")!.n,0)
 }finally{x.s.close()}
})

test('review uses revisions and request keys: one winner, replays are stable, revoked stewards cannot replay',()=>{
 const x=world()
 try{
  x.m.importSeed(x.steward,seed)
  const p=x.m.queue(x.steward).assertions.find(a=>a.predicate==='mendiami')!
  const key=rk()
  const accepted=x.m.reviewAssertion(x.steward,p.id,{decision:'accept',revision:p.revision,requestKey:key})
  assert.equal(accepted.status,'accepted')
  // Same key, same body: the same answer, no second change.
  assert.deepEqual(x.m.reviewAssertion(x.steward,p.id,{decision:'accept',revision:p.revision,requestKey:key}),accepted)
  assert.throws(()=>x.m.reviewAssertion(x.steward,p.id,{decision:'reject',revision:p.revision,requestKey:key}),/already used/)
  // A second reviewer working from the old revision loses.
  assert.throws(()=>x.m.reviewAssertion(x.steward,p.id,{decision:'reject',revision:p.revision,requestKey:rk()}),/changed/)
  assert.ok(edges(x.m.graph(undefined,{publicOnly:true})).includes('suku-uji mendiami lembah-uji'))
  // Community stewardship is checked at use time, also on replay.
  const e=x.m.proposeEntity(x.member,{communityId:x.open,slug:'kebun-uji',class:'tempat',title:'Kebun Uji',requestKey:rk()})
  const reviewKey=rk()
  x.m.reviewEntity(x.host,'kebun-uji',{decision:'accept',revision:e.revision,requestKey:reviewKey})
  x.s.run('UPDATE memberships SET role=? WHERE actor_id=? AND community_id=?','member',x.host,x.open)
  assert.throws(()=>x.m.reviewEntity(x.host,'kebun-uji',{decision:'accept',revision:e.revision,requestKey:reviewKey}),/steward/)
  // Seed import racing itself is still one set of rows.
  x.m.importSeed(x.steward,seed)
  assert.equal(x.s.get<{n:number}>('SELECT count(*) n FROM km_assertions')!.n,3)
 }finally{x.s.close()}
})

test('private communities stay private: members only, at read time, and no cross-community citation',()=>{
 const x=world()
 try{
  x.m.importSeed(x.steward,seed)
  const post=x.s.createPost(x.member,x.closed,'Di Lembah Uji ada kebun tua milik kampung.')
  assert.throws(()=>x.m.citePost(x.member,{postId:post.id,requestKey:rk()}),/steward/)
  const w=x.m.citePost(x.host,{postId:post.id,requestKey:rk()})
  assert.equal(w.voice,'penutur')
  const ent=x.m.proposeEntity(x.member,{communityId:x.closed,slug:'kebun-tua-uji',class:'tempat',title:'Kebun tua',requestKey:rk()})
  assert.throws(()=>x.m.proposeAssertion(x.member,{communityId:x.closed,subject:'kebun-tua-uji',predicate:'berada-di',object:'lembah-uji',support:[w.excerpts[0]!.id],visibility:'public',requestKey:rk()}),/members/)
  const a=x.m.proposeAssertion(x.member,{communityId:x.closed,subject:'kebun-tua-uji',predicate:'berada-di',object:'lembah-uji',support:[w.excerpts[0]!.id],visibility:'community',layer:'tuturan',requestKey:rk()})
  x.m.reviewEntity(x.host,'kebun-tua-uji',{decision:'accept',revision:ent.revision,requestKey:rk()})
  x.m.reviewAssertion(x.host,a.id,{decision:'accept',revision:a.revision,requestKey:rk()})
  const secret='kebun-tua-uji berada-di lembah-uji'
  assert.ok(edges(x.m.graph(x.member)).includes(secret))
  for(const reader of [undefined,x.outsider,x.agent])assert.ok(!edges(x.m.graph(reader)).includes(secret))
  assert.ok(!edges(x.m.graph(x.member,{publicOnly:true})).includes(secret))
  assert.ok(!JSON.stringify(x.m.graph(undefined,{publicOnly:true,train:true})).includes('kebun tua'))
  assert.ok(!JSON.stringify(x.m.entity(undefined,'lembah-uji')).includes('kebun tua'))
  assert.throws(()=>x.m.entity(x.outsider,'kebun-tua-uji'),/Not found/)
  // A statement in the public room may not rest on the closed room's witness, and outsiders cannot even name it.
  assert.throws(()=>x.m.proposeAssertion(x.member,{communityId:x.open,subject:'lembah-uji',predicate:'berada-di',object:'provinsi-uji',support:[w.excerpts[0]!.id],requestKey:rk()}),/own community/)
  assert.throws(()=>x.m.proposeAssertion(x.outsider,{subject:'lembah-uji',predicate:'berada-di',object:'provinsi-uji',support:[w.excerpts[0]!.id],requestKey:rk()}),/Excerpt not found/)
  // A public statement disappears from public views when its community stops being public.
  const openPost=x.s.createPost(x.member,x.open,'Lembah Uji berada di Provinsi Uji, kata orang tua.')
  const ow=x.m.citePost(x.host,{postId:openPost.id,requestKey:rk()})
  const pa=x.m.proposeAssertion(x.member,{communityId:x.open,subject:'lembah-uji',predicate:'berada-di',object:'provinsi-uji',support:[ow.excerpts[0]!.id],layer:'tuturan',requestKey:rk()})
  x.m.reviewAssertion(x.host,pa.id,{decision:'accept',revision:pa.revision,requestKey:rk()})
  assert.ok(edges(x.m.graph(undefined,{publicOnly:true})).includes('lembah-uji berada-di provinsi-uji'))
  x.s.run("UPDATE communities SET visibility='listed-private' WHERE id=?",x.open)
  assert.ok(!edges(x.m.graph(undefined,{publicOnly:true})).includes('lembah-uji berada-di provinsi-uji'))
  assert.ok(edges(x.m.graph(x.member)).includes('lembah-uji berada-di provinsi-uji'))
 }finally{x.s.close()}
})

test('withdrawal: a withdrawn witness, a deleted, hidden or edited post takes its statements out of every view',()=>{
 const x=world()
 try{
  x.m.importSeed(x.steward,seed)
  const post=x.s.createPost(x.member,x.open,'Suku Uji mendiami Lembah Uji sejak lama.')
  const w=x.m.citePost(x.host,{postId:post.id,requestKey:rk()})
  const a=x.m.proposeAssertion(x.member,{communityId:x.open,subject:'suku-uji',predicate:'mendiami',object:'lembah-uji',support:[w.excerpts[0]!.id],layer:'tuturan',requestKey:rk()})
  x.m.reviewAssertion(x.host,a.id,{decision:'accept',revision:a.revision,requestKey:rk()})
  const told=()=>x.m.graph(undefined,{publicOnly:true}).statements.some(e=>e.id===a.id)
  assert.ok(told())
  assert.equal(x.m.entity(undefined,'suku-uji').gaps.noTellers,false)
  // The teller withdraws their own account; no steward needed.
  assert.throws(()=>x.m.withdrawWitness(x.outsider,w.id,{requestKey:rk()}),/steward|Not found/)
  const out=x.m.withdrawWitness(x.member,w.id,{reason:'Saya menarik kiriman ini.',requestKey:rk()})
  assert.equal(out.affectedAssertions,1)
  assert.ok(!told())
  assert.equal(x.s.get<{text:string}>('SELECT text FROM km_excerpts WHERE witness_id=?',w.id)!.text,'')
  assert.ok(!JSON.stringify(x.m.entity(undefined,'suku-uji')).includes('sejak lama'))
  // A withdrawn seed witness stays withdrawn when the seed is imported again.
  const doc=x.s.get<{id:string}>("SELECT id FROM km_witnesses WHERE key='url:https://example.org/a'")!.id
  x.m.withdrawWitness(x.steward,doc,{requestKey:rk()})
  x.m.importSeed(x.steward,seed)
  assert.equal(x.s.get<{state:string}>('SELECT state FROM km_witnesses WHERE id=?',doc)!.state,'withdrawn')
  assert.deepEqual(edges(x.m.graph(undefined,{publicOnly:true})),[])
  // Post lifecycle is read at use time: edited, hidden or deleted posts stop counting.
  const p2=x.s.createPost(x.member,x.open,'Bahasa Uji dituturkan di Lembah Uji oleh kami.')
  const w2=x.m.citePost(x.host,{postId:p2.id,requestKey:rk()})
  const a2=x.m.proposeAssertion(x.member,{communityId:x.open,subject:'bahasa-uji',predicate:'dituturkan-di',object:'lembah-uji',support:[w2.excerpts[0]!.id],layer:'tuturan',requestKey:rk()})
  x.m.reviewAssertion(x.host,a2.id,{decision:'accept',revision:a2.revision,requestKey:rk()})
  const shown=()=>x.m.graph(x.member).statements.some(e=>e.id===a2.id)
  assert.ok(shown())
  x.s.run('UPDATE posts SET revision=revision+1 WHERE id=?',p2.id);assert.ok(!shown())
  x.s.run('UPDATE posts SET revision=revision-1,hidden=1 WHERE id=?',p2.id);assert.ok(!shown())
  x.s.run('UPDATE posts SET hidden=0 WHERE id=?',p2.id);assert.ok(shown())
  new Forum(x.s).delete(x.member,p2.id,x.s.get<{revision:number}>('SELECT revision FROM posts WHERE id=?',p2.id)!.revision);assert.ok(!shown())
 }finally{x.s.close()}
})

test('guardrails: a basis is required, agents only interpret and never about persons, kinship joins groups only',()=>{
 const x=world()
 try{
  x.m.importSeed(x.steward,seed)
  const d2=excerptOf(x,'d2')
  assert.throws(()=>x.m.proposeAssertion(x.member,{subject:'suku-uji',predicate:'mendiami',object:'lembah-uji',support:[],requestKey:rk()}),/at least one excerpt/)
  assert.throws(()=>x.m.proposeAssertion(x.member,{subject:'suku-uji',predicate:'tidak-ada',object:'lembah-uji',support:[d2],requestKey:rk()}),/Unknown predicate/)
  assert.throws(()=>x.m.proposeAssertion(x.member,{subject:'lembah-uji',predicate:'anggota-dari',object:'suku-uji',support:[d2],requestKey:rk()}),/does not apply/)
  assert.throws(()=>x.m.proposeAssertion(x.member,{subject:'suku-uji',predicate:'berkerabat-dengan',object:'lembah-uji',support:[d2],requestKey:rk()}),/does not point/)
  assert.throws(()=>x.m.proposeAssertion(x.member,{subject:'suku-uji',predicate:'disebut',object:'lembah-uji',support:[d2],requestKey:rk()}),/takes a value/)
  // Agents need an editorial mandate, may only write tafsir, never with training permission, never about persons.
  assert.throws(()=>x.m.proposeAssertion(x.agent,{communityId:x.open,subject:'suku-uji',predicate:'mendiami',object:'lembah-uji',support:[d2],layer:'tafsir',requestKey:rk()}),/mandate/)
  assert.throws(()=>x.m.proposeEntity(x.agent,{communityId:x.open,slug:'orang-uji',class:'orang',title:'Orang Uji',mandateId:'m',requestKey:rk()}),/mandate|person/)
  assert.throws(()=>x.m.proposeAssertion(x.agent,{subject:'suku-uji',predicate:'mendiami',object:'lembah-uji',support:[d2],requestKey:rk()}),/Human proposer/)
  // Merge: names follow the survivor; the old slug still resolves.
  const dup=x.m.proposeEntity(x.steward,{slug:'lembah-uji-lama',class:'tempat',title:'Lembah Lama',requestKey:rk()})
  x.m.reviewEntity(x.steward,'lembah-uji-lama',{decision:'accept',revision:dup.revision,requestKey:rk()})
  assert.throws(()=>x.m.mergeEntity(x.member,'lembah-uji-lama',{into:'lembah-uji',revision:2,requestKey:rk()}),/Node steward/)
  x.m.mergeEntity(x.steward,'lembah-uji-lama',{into:'lembah-uji',revision:2,requestKey:rk()})
  const merged=x.m.entity(undefined,'lembah-uji-lama')
  assert.equal(merged.slug,'lembah-uji');assert.equal(merged.mergedFrom,'lembah-uji-lama');assert.ok(merged.aliases.includes('Lembah Lama'))
 }finally{x.s.close()}
})

test('the API serves the public view and keeps writes behind authentication',async()=>{
 const s=new Strata(':memory:','https://km.example.org')
 try{
  const steward=s.provision('did:web:steward.example','Node steward')
  const handle=api(s,{stewardDid:steward.actor.did})
  const call=(path:string,init:RequestInit={})=>handle(new Request('https://km.example.org'+path,init))
  assert.equal((await call('/v1/knowledge-model/seed',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,401)
  const r=await call('/v1/knowledge-model/seed',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+steward.token},body:'{}'})
  assert.equal(r.status,200)
  const g=await (await call('/v1/knowledge-model/graph?public=1')).json() as {nodes:unknown[];statements:unknown[]}
  assert.ok(g.nodes.length>50&&g.statements.length>50)
  const e=await call('/v1/knowledge-model/entities/kabupaten-paniai')
  assert.equal(e.status,200)
  assert.equal((await call('/v1/knowledge-model/entities/tidak-ada')).status,404)
  assert.equal((await call('/v1/knowledge-model/queue')).status,401)
 }finally{s.close()}
})
