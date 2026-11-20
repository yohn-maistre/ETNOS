import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Strata} from '../src/store.ts'
import {Kamus,trigramScore,parseGlosses,glossPrompt,type KamusLexicon} from '../src/kamus.ts'
import {Periksa} from '../src/periksa.ts'
import {api} from '../src/api.ts'
import {kamusLexicon} from '../src/kamus-data.ts'

// A synthetic lexicon: a few contact-language words and a tiny seed. Not real dictionary data.
const lexicon:KamusLexicon={
 contact:new Set(['kami','pergi','tadi','pagi','dan','ini','yang','sudah','dari','untuk','dengan','sa','ko','mau','ke','di','ada']),
 seeds:{test:{language:{name:'Uji',glottocode:'test'},sources:{list:{licence:'CC BY 4.0'}},entries:[{lemma:'ugee',gloss_id:'ubi jalar',source:'list',page:3},{lemma:'jamoo',modern:'yamoo',gloss_id:'rumah',source:'list'}]}},
}
function fixture(visibility:'public'|'hidden-private'='public'){
 const s=new Strata(':memory:','https://forum.example'),k=new Kamus(s,lexicon),p=new Periksa(s)
 const a=s.provision('did:web:owner.example','Owner'),b=s.provision('did:web:b.example','Budi'),c=s.provision('did:web:c.example','Citra'),o=s.provision('did:web:o.example','Outside')
 const room=s.createCommunity(a.actor.id,'Mee','Ruang bahasa',visibility,true)
 for(const m of [b,c])s.setMember(a.actor.id,room.id,m.actor.id,true)
 const ag=s.provision('did:web:aksara.example','Aksara',a.actor.id);s.setMember(a.actor.id,room.id,ag.actor.id,true)
 return {s,k,p,a:a.actor.id,b:b.actor.id,c:c.actor.id,o:o.actor.id,agent:ag.actor.id,room:room.id}
}
const turnOn=(f:ReturnType<typeof fixture>)=>{f.k.setSettings(f.a,f.room,{machineReading:true,language:'test'});f.s.setSwitch(f.a,f.agent,f.room,{posts:true,wiki:false,dailyLimit:10,enabled:true})}

test('machine reading is off by default; only a human steward turns it on',()=>{
 const f=fixture();try{
  assert.equal(f.k.settings(f.room).machineReading,false)
  assert.throws(()=>f.k.scan(f.a,f.room),/Machine reading is off/)
  assert.throws(()=>f.k.setSettings(f.b,f.room,{machineReading:true}))
  assert.throws(()=>f.k.setSettings(f.agent,f.room,{machineReading:true}))
  assert.throws(()=>f.k.setSettings(f.a,f.room,{language:'nope'}),/Unknown language/)
  assert.equal(f.k.setSettings(f.a,f.room,{machineReading:true,language:'test'}).machineReading,true)
 }finally{f.s.close()}
})

test('seed import keeps source, page and licence and can run twice',()=>{
 const f=fixture();try{
  f.k.setSettings(f.a,f.room,{language:'test'})
  assert.deepEqual(f.k.importSeed(f.a,f.room),{added:2,total:2})
  assert.deepEqual(f.k.importSeed(f.a,f.room),{added:0,total:2})
  const ugee=f.k.list(undefined,f.room).entries.find(e=>e.lemma==='ugee')!
  assert.equal(ugee.source,'seed:list');assert.equal(ugee.licence,'CC BY 4.0');assert.equal(ugee.page,3);assert.equal(ugee.state,'seed')
  assert.ok(f.k.list(undefined,f.room).entries.some(e=>e.lemma==='yamoo'),'the modern spelling is the headword')
 }finally{f.s.close()}
})

test('the finder counts people, matches the seed, and ignores agents and contact-language words',()=>{
 const f=fixture();try{
  turnOn(f);f.k.importSeed(f.a,f.room)
  f.s.createPost(f.b,f.room,'Kami pergi ke kebun tadi pagi. Ugee sudah ada.')
  f.s.createPost(f.c,f.room,'Sa mau tanam ugee dan tugi di kebun.')
  f.s.createPost(f.c,f.room,'Tugi ini dari kebun.')
  f.s.createPost(f.agent,f.room,'Tugi tugi tugi zzkora zzkora.')
  const r=f.k.scan(f.a,f.room)
  assert.equal(r.posts,3,'agent posts are not read')
  const list=f.k.list(undefined,f.room).entries
  const ugee=list.find(e=>e.lemma==='ugee')!;assert.equal(ugee.uses,2);assert.equal(ugee.speakers,2);assert.equal(ugee.examples.length,2)
  assert.ok(list.some(e=>e.lemma==='tugi'&&e.state==='candidate'),'a word used twice becomes a candidate')
  assert.ok(!list.some(e=>e.lemma==='zzkora'),'words only an agent used never count')
  assert.ok(!list.some(e=>['kami','pergi','kebun'].includes(e.lemma)&&e.state==='candidate'&&e.lemma!=='kebun'),'contact words are skipped')
 }finally{f.s.close()}
})

test('a deleted or hidden post stops counting at once, and the next scan forgets it',()=>{
 const f=fixture();try{
  turnOn(f)
  const p1=f.s.createPost(f.b,f.room,'Tugi enaa.'),p2=f.s.createPost(f.c,f.room,'Tugi enaa lagi.')
  f.k.scan(f.a,f.room)
  assert.equal(f.k.list(undefined,f.room).entries.find(e=>e.lemma==='tugi')!.examples.length,2)
  f.s.hidePost(f.a,p1.id)
  assert.equal(f.k.list(undefined,f.room).entries.find(e=>e.lemma==='tugi')!.examples.length,1,'hidden at read time')
  f.s.hidePost(f.a,p2.id);f.k.scan(f.a,f.room)
  assert.ok(!f.k.list(undefined,f.room).entries.some(e=>e.lemma==='tugi'),'an unused candidate is removed')
 }finally{f.s.close()}
})

test('a private dictionary stays with members; outsiders and visitors see nothing',()=>{
 const f=fixture('hidden-private');try{
  turnOn(f);f.s.createPost(f.b,f.room,'Tugi enaa. Tugi lagi.');f.k.scan(f.a,f.room)
  assert.throws(()=>f.k.list(undefined,f.room),/Not found/);assert.throws(()=>f.k.list(f.o,f.room),/Not found/)
  assert.ok(f.k.list(f.b,f.room).entries.length>0)
  assert.throws(()=>f.k.scan(f.o,f.room))
 }finally{f.s.close()}
})

test('no hosted model describes words in a private community',()=>{
 const f=fixture('hidden-private');try{
  turnOn(f);f.s.createPost(f.b,f.room,'Tugi enaa. Tugi lagi.');f.k.scan(f.a,f.room)
  const c=f.k.candidatesForGloss(f.room)[0]
  assert.throws(()=>f.k.applyGlosses(f.a,f.room,[{id:c.id,gloss:'jagung',pos:'kata benda',context:'Kebun'}]),/private community/)
 }finally{f.s.close()}
})

test('Aksara turns descriptions into cards; members decide and the entry follows the card',()=>{
 const f=fixture();try{
  turnOn(f);f.s.createPost(f.b,f.room,'Tugi enaa.');f.s.createPost(f.c,f.room,'Tugi lagi.');f.k.scan(f.a,f.room)
  const c=f.k.candidatesForGloss(f.room)[0]
  assert.throws(()=>f.k.applyGlosses(f.b,f.room,[{id:c.id,gloss:'jagung',pos:'kata benda',context:'Kebun'}]),'only stewards ask')
  assert.equal(f.k.applyGlosses(f.a,f.room,[{id:c.id,gloss:'jagung',pos:'kata benda',context:'Kebun'}]).proposed,1)
  let e=f.k.list(undefined,f.room).entries.find(x=>x.lemma==='tugi')!
  assert.equal(e.state,'proposed');assert.equal(e.context,'Kebun')
  const card=f.p.list(undefined,f.room)[0];assert.equal(card.proposer.kind,'agent');assert.match(card.statement,/jagung/)
  assert.throws(()=>f.p.answer(f.agent,card.id,{answer:'yes'}),'agents never answer')
  f.p.answer(f.b,card.id,{answer:'yes'});f.p.answer(f.c,card.id,{answer:'yes'})
  e=f.k.list(undefined,f.room).entries.find(x=>x.lemma==='tugi')!;assert.equal(e.state,'checked')
 }finally{f.s.close()}
})

test('Aksara cannot propose once its switch is off',()=>{
 const f=fixture();try{
  turnOn(f);f.s.createPost(f.b,f.room,'Tugi enaa.');f.s.createPost(f.c,f.room,'Tugi lagi.');f.k.scan(f.a,f.room)
  f.s.setSwitch(f.a,f.agent,f.room,{posts:true,wiki:false,dailyLimit:10,enabled:false})
  const c=f.k.candidatesForGloss(f.room)[0]
  assert.throws(()=>f.k.applyGlosses(f.a,f.room,[{id:c.id,gloss:'jagung',pos:'',context:'Kebun'}]),/not active/)
  assert.throws(()=>f.p.proposeAsAgent(f.agent,f.room,{kind:'word',subject:'tugi',statement:'x',evidence:[]}),/mandate/)
 }finally{f.s.close()}
})

test('trigram score leans toward the seed language; model output is read strictly',()=>{
 const seed=new Map([['^ug',5],['uge',5],['gee',5],['ee$',5]]),contact=new Map([['^ka',5],['kam',5],['ami',5],['mi$',5]])
 assert.ok(trigramScore('ugee',seed,contact)>0);assert.ok(trigramScore('kami',seed,contact)<0)
 const ids=new Set(['a'])
 assert.deepEqual(parseGlosses('Here: {"items":[{"id":"a","gloss":"jagung","pos":"kata benda","context":"Kebun"},{"id":"zz","gloss":"x"}]}',ids),[{id:'a',gloss:'jagung',pos:'kata benda',context:'Kebun',isName:false}])
 assert.deepEqual(parseGlosses('not json',ids),[])
 assert.equal(glossPrompt('Ekari',[{id:'a',lemma:'tugi',examples:[]}]).length,2)
})

test('the describe route checks every gate before any text reaches a model',async()=>{
 for(const visibility of ['public','hidden-private'] as const){
  const s=new Strata(':memory:','https://forum.example');try{
   let calls=0
   const handler=api(s,{models:async()=>({chat:async()=>{calls++;return {text:'{"items":[]}',model:'m',route:'keyless',inputTokens:0,outputTokens:0}}})})
   const a=s.provision('did:web:owner.example','Owner'),b=s.provision('did:web:b.example','Budi'),c=s.provision('did:web:c.example','Citra')
   const room=s.createCommunity(a.actor.id,'Mee','Ruang bahasa',visibility,true)
   for(const m of [b,c])s.setMember(a.actor.id,room.id,m.actor.id,true)
   const ag=s.provision('did:web:aksara.example','Aksara',a.actor.id);s.setMember(a.actor.id,room.id,ag.actor.id,true)
   const post=(path:string,token:string,body:unknown={})=>handler(new Request(s.base+'/v1/communities/'+room.id+'/kamus/'+path,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)}))
   assert.equal((await post('settings',a.token,{machineReading:true,language:'ekar1243'})).status,200)
   s.setSwitch(a.actor.id,ag.actor.id,room.id,{posts:true,wiki:false,dailyLimit:10,enabled:true})
   s.createPost(b.actor.id,room.id,'Tugi enaa.');s.createPost(c.actor.id,room.id,'Tugi lagi.')
   assert.equal((await post('scan',a.token)).status,200)
   assert.equal((await post('describe',b.token)).status,403,'members who are not stewards cannot ask')
   const r=await post('describe',a.token)
   if(visibility==='public'){assert.equal(r.status,200);assert.equal(calls,1)}
   else{assert.equal(r.status,409);assert.equal(calls,0,'no model call for a private community')}
  }finally{s.close()}
 }
})

test('the Ekari seed loads with its sources and licences',()=>{
 const lex=kamusLexicon(),set=lex.seeds.ekar1243
 assert.ok(set.entries.length>2000);assert.equal(set.sources.steltenpool1969.licence,'CC BY-NC 3.0');assert.equal(set.sources.tng.licence,'CC BY 4.0')
 assert.ok(lex.contact.has('dan')&&lex.contact.has('pergi'))
})
