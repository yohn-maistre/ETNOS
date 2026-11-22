import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Kamus,type KamusLexicon} from '../src/kamus.ts'
import {KamusAsk,type ConceptList} from '../src/kamus-ask.ts'
import {Periksa} from '../src/periksa.ts'
import {Forum} from '../src/forum.ts'
import {kamusCsv,kamusCldf} from '../src/kamus-export.ts'
import {api} from '../src/api.ts'
import type {ViewerRecord} from '../src/entri.ts'

// Local fixtures only. The seed words and sentences are written for these tests and are not dictionary data.
const lexicon:KamusLexicon={
 contact:new Set(['kami','pergi','ke','di','dan','ini','itu','rumah','besar','kebun','sudah','dari','mereka','lagi','yang','tadi','pagi']),
 seeds:{ekar1243:{language:{name:'Mee',glottocode:'ekar1243'},sources:{uji:{licence:'CC BY-NC 3.0',citation:'Daftar uji'}},entries:[
  {lemma:'ibo',gloss_id:'besar',source:'uji',page:4},{lemma:'owa',gloss_id:'rumah',source:'uji',page:9},
  {lemma:'ugee',gloss_id:'ubi jalar',source:'uji'},{lemma:'yame',gloss_id:'laki-laki',source:'uji',variants:[{form:'jame',dialect:['Kamu']}]},
  {lemma:'mere',gloss_id:'tanda',source:'uji'},
 ]}},
}
const concepts:ConceptList={list:'Tadmor-2009-100',title:'Leipzig-Jakarta',source:'Concepticon',url:'',licence:'CC BY 4.0',concepts:[{n:1,concepticon:221,gloss:'FIRE',english:'fire',id:'api',class:'benda'},{n:13,concepticon:658,gloss:'RAIN (PRECIPITATION)',english:'rain',id:'hujan',class:'benda'}]}
const species:ViewerRecord[]=[{id:'burung-uji',kind:'species',title:'Burung uji',subtitle:'Avis probata',summary:'',thumb:'/x.jpg',entry:{slug:'burung-uji'},taxonomy:[{rank:'class',name:'Aves'}],facts:[]}]

function fixture(visibility:'public'|'hidden-private'='public'){
 let opId=''
 const s=new Etnos(':memory:','https://forum.example'),k=new Kamus(s,lexicon,{operator:id=>id===opId}),ask=new KamusAsk(s,k,lexicon,concepts,species),p=new Periksa(s),forum=new Forum(s)
 const a=s.provision('did:web:owner.example','Owner');opId=a.actor.id
 const b=s.provision('did:web:b.example','Budi'),c=s.provision('did:web:c.example','Citra'),d=s.provision('did:web:d.example','Dewi'),o=s.provision('did:web:o.example','Outside')
 const room=s.createCommunity(a.actor.id,'Mee uji','Ruang bahasa (fixture)',visibility,true)
 for(const m of [b,c,d])s.setMember(a.actor.id,room.id,m.actor.id,true)
 const plain=s.createCommunity(a.actor.id,'Ruang biasa','Tanpa kamus',visibility,true)
 k.setSettings(a.actor.id,room.id,{language:'ekar1243'});k.importSeed(a.actor.id,room.id)
 return {s,k,ask,p,forum,a:a.actor.id,b:b.actor.id,c:c.actor.id,d:d.actor.id,o:o.actor.id,room:room.id,plain:plain.id}
}
type F=ReturnType<typeof fixture>
const read=(f:F)=>f.k.setSettings(f.a,f.room,{machineReading:true})
const words=(f:F,_text:string,id:string,who?:string)=>f.ask.annotate(who,[id])[id]?.u.map(([word,key,kind])=>[word,kind,key.split(':')[0]]) ?? null

test('underlines ask only open questions: seed matches, stems, never names or Indonesian words',()=>{
 const f=fixture();try{
  const text='Owaya ibo. Kami pergi ke Owa tadi. Mereka bilang jame enaa.'
  const post=f.s.createPost(f.b,f.room,text)
  assert.deepEqual(words(f,text,post.id,f.c),[['owaya','stem','stem'],['jame','entry','entry']],'"Owa" mid-sentence is a name; "mereka" is not a form of "mere"')
  assert.deepEqual(words(f,text,post.id,undefined),[],'visitors of a public community see no questions')
  const other=f.s.createPost(f.a,f.plain,text)
  assert.equal(f.ask.annotate(f.a,[other.id])[other.id],undefined,'a community without a Kamus is left alone')
  const md=f.s.createPost(f.b,f.room,'**Ibo** [owa](https://contoh.id/jame) lihat.',undefined,undefined,{content:{format:'markdown'}})
  assert.deepEqual(words(f,'',md.id,f.c),[['ibo','entry','entry']],'markdown posts are read without link targets')
  const long='Ibo owa. Ugee yame. Owa ibo. Ugee ibo.'
  const p2=f.s.createPost(f.b,f.room,long)
  assert.equal(f.ask.annotate(f.c,[p2.id])[p2.id].u.length,3,'at most three per post, one per sentence')
 }finally{f.s.close()}
})

test('frequent unknown words become questions only with counting allowed, at three uses by two people',()=>{
 const f=fixture();try{
  const t1=f.s.createPost(f.b,f.room,'Agiyo tai.'),t2=f.s.createPost(f.b,f.room,'Agiyo lagi.');f.s.createPost(f.c,f.room,'Mogo agiyo.')
  assert.deepEqual(words(f,'Agiyo tai.',t1.id,f.d),[],'counting across posts is off by default')
  read(f)
  assert.deepEqual(words(f,'Agiyo tai.',t1.id,f.d),[['agiyo','frequent','frequent']])
  f.forum.delete(f.b,t2.id,1)
  assert.deepEqual(words(f,'Agiyo tai.',t1.id,f.d),[],'a deleted post stops counting at once')
  const q=f.ask.word(f.d,f.room,'agiyo');assert.equal(q.state,'new');assert.equal(q.question,null)
 }finally{f.s.close()}
})

test('a seed meaning needs the quorum; two members answering the same question meet one claim, settled once',()=>{
 const f=fixture();try{
  const post=f.s.createPost(f.d,f.room,'Ibo enaa.')
  const cardB=f.ask.word(f.b,f.room,'ibo',post.id),cardC=f.ask.word(f.c,f.room,'ibo',post.id)
  assert.equal(cardB.question!.text,'Artinya besar?');assert.equal(cardB.question!.claimId,null);assert.equal(cardC.question!.claimId,null,'both saw the question before anyone answered')
  const r1=f.ask.answer(f.b,f.room,{key:cardB.question!.key,answer:'yes',form:'ibo',postId:post.id})
  assert.equal(r1.word.question!.claim!.state,'open','one answer decides nothing')
  assert.equal(r1.word.question!.claim!.yes,1,'the member who opened a source question may answer it')
  f.ask.answer(f.c,f.room,{key:cardC.question!.key,answer:'yes',form:'ibo'})
  const claims=f.s.all<{id:string;state:string;settled:number}>("SELECT id,state,settled FROM claims WHERE subject='ibo'")
  assert.equal(claims.length,1,'one claim for one question');assert.equal(claims[0].state,'checked')
  f.ask.answer(f.d,f.room,{key:cardB.question!.key,answer:'yes',form:'ibo'})
  const after=f.s.get<{state:string;settled:number}>('SELECT state,settled FROM claims WHERE id=?',claims[0].id)!
  assert.deepEqual({...after},{state:'checked',settled:claims[0].settled},'a later answer does not settle it again')
 }finally{f.s.close()}
})

test('after the check the word is known: no underline, a class letter for Mode belajar once the quorum agrees',()=>{
 const f=fixture();try{
  const text='Ibo enaa.',post=f.s.createPost(f.d,f.room,text),key=f.ask.word(f.b,f.room,'ibo').question!.key
  f.ask.answer(f.b,f.room,{key,answer:'yes',form:'ibo',wordClass:'sifat'})
  assert.deepEqual(f.ask.annotate(f.c,[post.id])[post.id].c,[],'not checked yet')
  f.ask.answer(f.c,f.room,{key,answer:'yes',form:'ibo',wordClass:'sifat'})
  const a=f.ask.annotate(f.c,[post.id])[post.id]
  assert.deepEqual(a.u,[]);assert.deepEqual(a.c,[['ibo','sifat']])
  assert.deepEqual(f.ask.annotate(undefined,[post.id])[post.id].c,[['ibo','sifat']],'checked words of a public community show to visitors')
 }finally{f.s.close()}
})

test('"Bentuk dari" answers teach forms and suffixes; "Bukan" and "Tidak tahu" never publish anything',()=>{
 const f=fixture();try{
  f.ask.setSuffixes(f.a,f.room,{suffixes:['-ka']})
  const post=f.s.createPost(f.d,f.room,'Owaka enaa.')
  const q=f.ask.word(f.b,f.room,'owaka').question!
  assert.equal(q.text,'Bentuk dari owa?')
  f.ask.answer(f.b,f.room,{key:q.key,answer:'yes',form:'owaka'});f.ask.answer(f.c,f.room,{key:q.key,answer:'yes',form:'owaka'})
  assert.equal(f.ask.word(f.d,f.room,'owaka').state,'checked')
  f.ask.setSuffixes(f.a,f.room,{suffixes:['ya']})
  assert.deepEqual(f.ask.suffixes(f.room).learned,[{suffix:'ka',checked:1}],'a checked suffix that is not on the list is offered to stewards')
  assert.throws(()=>f.ask.setSuffixes(f.b,f.room,{suffixes:['x']}),'only stewards edit the list')
  const ugee=f.ask.word(f.b,f.room,'ugee').question!
  f.ask.answer(f.b,f.room,{key:ugee.key,answer:'no',form:'ugee'})
  f.ask.answer(f.c,f.room,{key:ugee.key,answer:'skip',form:'ugee'})
  assert.equal(f.ask.word(f.c,f.room,'ugee').question!.answered,true,'skipping stops the question for that member only')
  assert.equal(f.ask.word(f.d,f.room,'ugee').question!.claim!.no,1)
  assert.ok(!f.k.list(undefined,f.room,{state:'checked'}).entries.some(e=>e.lemma==='ugee'))
 }finally{f.s.close()}
})

test('"Tulis arti" on a new word makes a proposal that others check; Kata saya stays private',()=>{
 const f=fixture();try{
  const post=f.s.createPost(f.d,f.room,'Agiyo tai.')
  f.ask.answer(f.b,f.room,{key:'new:agiyo',answer:'other',text:'hujan',form:'Agiyo',postId:post.id})
  assert.equal(f.ask.word(f.b,f.room,'agiyo').question!.answered,true,'my own proposal is not my question')
  const forC=f.ask.word(f.c,f.room,'agiyo').question!
  assert.equal(forC.text,'Artinya hujan?')
  f.ask.answer(f.c,f.room,{key:forC.key,answer:'yes',form:'agiyo'})
  f.ask.answer(f.d,f.room,{key:forC.key,answer:'yes',form:'agiyo'})
  assert.equal(f.k.list(undefined,f.room,{state:'checked'}).entries.find(e=>e.lemma==='Agiyo')?.gloss,'hujan')
  f.ask.saveMine(f.b,f.room,{form:'Tai',postId:post.id,saved:true,gloss:'mungkin kebun'})
  assert.equal(f.ask.mine(f.b,f.room)[0].gloss,'mungkin kebun')
  assert.deepEqual(f.ask.mine(f.c,f.room),[],'another member never sees it')
  f.s.setMember(f.a,f.room,f.b,false)
  assert.throws(()=>f.ask.mine(f.b,f.room),/Not found/,'a removed member loses it with the community')
  assert.throws(()=>f.ask.answer(f.b,f.room,{key:forC.key,answer:'yes',form:'agiyo'}),'and can no longer answer')
 }finally{f.s.close()}
})

test('a private Kamus never leaks: no card, no underlines, no questions, no names, no export for outsiders',async()=>{
 const f=fixture('hidden-private');try{
  read(f)
  const post=f.s.createPost(f.b,f.room,'Ibo owa.')
  assert.deepEqual(f.ask.annotate(f.o,[post.id]),{});assert.deepEqual(f.ask.annotate(undefined,[post.id]),{})
  assert.throws(()=>f.ask.word(f.o,f.room,'ibo'),/Not found/);assert.throws(()=>f.ask.word(undefined,f.room,'ibo'),/Not found/)
  assert.throws(()=>f.ask.questions(f.o,f.room));assert.throws(()=>f.ask.today(f.o,f.room));assert.throws(()=>f.ask.artinya(f.o,post.id),/Not found/)
  assert.throws(()=>f.ask.exportRows(f.b,f.room),'members who are not stewards do not export')
  f.ask.answerToday(f.b,f.room,{species:'burung-uji',text:'Kito'});f.ask.answerToday(f.c,f.room,{species:'burung-uji',text:'kito'});f.ask.answerToday(f.d,f.room,{species:'burung-uji',text:'Kito'})
  assert.equal(f.s.get<{state:string}>("SELECT state FROM claims WHERE kind='name'")!.state,'checked','checked inside the community')
  assert.deepEqual(f.ask.localNames('burung-uji'),[],'but never a local name on the public species page')
  const app=api(f.s),res=await app(new Request('https://forum.example/v1/kamus/annotate?posts='+post.id))
  assert.deepEqual(await res.json(),{},'the route reads as the anonymous visitor')
  const ex=await app(new Request('https://forum.example/v1/communities/'+f.room+'/kamus/export'))
  assert.equal(ex.status,401)
 }finally{f.s.close()}
})

test('Kata hari ini and picture questions: the same word from two members agrees; a public check names the species',()=>{
 const f=fixture();try{
  const t=f.ask.today(f.b,f.room)
  assert.ok(t.concept&&t.picture);assert.equal(t.picture!.kind,'burung')
  const n=t.concept!.n
  f.ask.answerToday(f.b,f.room,{concept:n,text:'Uwo'})
  f.ask.answerToday(f.c,f.room,{concept:n,text:'uwo'})
  assert.equal(f.ask.today(f.b,f.room).concept!.answers[0].yes,1,'the second member agreed, the proposer does not count')
  f.ask.answerToday(f.d,f.room,{concept:n,text:'Uwo'})
  assert.notEqual(f.ask.today(f.b,f.room).concept!.n,n,'a checked concept leaves the rotation')
  f.ask.answerToday(f.b,f.room,{species:'burung-uji',text:'Kito'});f.ask.answerToday(f.c,f.room,{species:'burung-uji',text:'Kito'});f.ask.answerToday(f.d,f.room,{species:'burung-uji',text:'Kito'})
  assert.deepEqual(f.ask.localNames('burung-uji'),[{name:'Kito',language:'Mee',community:{id:f.room,title:'Mee uji'}}])
  const entry=f.s.get<{id:string}>("SELECT id FROM kamus_entries WHERE lemma='Kito'")!
  f.ask.setSensitive(f.a,f.room,entry.id,{sensitive:true})
  assert.deepEqual(f.ask.localNames('burung-uji'),[],'an entry marked Jangan disebarkan is not published')
  assert.ok(!f.k.list(undefined,f.room).entries.some(e=>e.lemma==='Kito'),'nor listed to visitors')
  assert.ok(f.k.list(f.b,f.room).entries.some(e=>e.lemma==='Kito'),'members still see it')
 }finally{f.s.close()}
})

test('Artinya: attributed, edited by its writer, removed by the post author or a steward; alignment asks, deletion withdraws',async()=>{
 const f=fixture();try{
  read(f)
  const p1=f.s.createPost(f.b,f.room,'Mogo tai.'),p2=f.s.createPost(f.c,f.room,'Mogo enaa.'),p3=f.s.createPost(f.d,f.room,'Agiyo mogo.')
  f.ask.setArtinya(f.b,p1.id,'Kebun jauh.')
  f.ask.setArtinya(f.d,p2.id,'Kebun baru.')
  f.ask.setArtinya(f.c,p3.id,'Hujan di kebun.')
  const list=f.ask.artinya(f.c,p1.id);assert.equal(list[0].byPostAuthor,true);assert.equal(list[0].canRemove,false)
  f.ask.removeArtinya(f.c,p2.id,{authorId:f.d})
  assert.deepEqual(f.ask.artinya(f.c,p2.id),[],'the post author removed a translation of their post')
  f.ask.setArtinya(f.d,p2.id,'Kebun baru.')
  const q=f.ask.word(f.a,f.room,'mogo').question!
  assert.equal(q.kind,'align');assert.equal(q.text,'Artinya kebun? (kata benda)')
  assert.throws(()=>f.ask.removeArtinya(f.b,p2.id,{authorId:f.d}),'a member cannot remove another translation of someone else\'s post')
  f.ask.removeArtinya(f.a,p2.id,{authorId:f.d})
  f.ask.answer(f.a,f.room,{key:q.key,answer:'yes',form:'mogo'})
  const claim=f.s.get<{id:string}>("SELECT id FROM claims WHERE subject='mogo'")!
  assert.ok(f.p.list(f.b,f.room).find(c=>c.id===claim.id)!.evidence.some(e=>e.postId===p3.id))
  f.forum.delete(f.d,p3.id,1)
  assert.ok(!f.p.list(f.b,f.room).find(c=>c.id===claim.id)!.evidence.some(e=>e.postId===p3.id),'evidence from a deleted post is gone')
  assert.equal(f.ask.word(f.a,f.room,'mogo').aligned,null,'and the alignment no longer has enough pairs')
 }finally{f.s.close()}
})

test('the composer sends Artinya with the post in one unit; export keeps source and licence',async()=>{
 const f=fixture();try{
  const app=api(f.s,{principal:req=>{const who=req.headers.get('x-who');return who?f.s.actor(who):undefined}})
  const post=async(body:unknown,who:string)=>app(new Request('https://forum.example/v1/posts',{method:'POST',headers:{'content-type':'application/json','x-who':who},body:JSON.stringify(body)}))
  const r=await post({communityId:f.room,text:'Ibo owa.',artinya:'Rumah besar.'},f.b)
  assert.equal(r.status,200);const id=(await r.json() as {id:string}).id
  assert.equal(f.ask.artinya(f.c,id)[0].text,'Rumah besar.')
  const bad=await post({communityId:f.plain,text:'Halo.',artinya:'Halo.'},f.a)
  assert.equal(bad.status,409,'no Artinya where there is no Kamus');assert.equal(f.s.get<{n:number}>('SELECT COUNT(*) n FROM posts WHERE community_id=?',f.plain)!.n,0,'and the post was not kept either')
  const key=f.ask.word(f.b,f.room,'ibo').question!.key
  f.ask.answer(f.b,f.room,{key,answer:'yes',form:'ibo'});f.ask.answer(f.c,f.room,{key,answer:'yes',form:'ibo'})
  const x=f.ask.exportRows(f.a,f.room)
  assert.deepEqual(x.rows.map(r=>[r.headword,r.gloss,r.source,r.licence]),[['ibo','besar','uji','CC BY-NC 3.0']])
  assert.match(kamusCsv(x,'https://forum.example'),/^kata,tulisan_lain,.*\r\nibo,,,besar,/)
  const zip=kamusCldf(x,'https://forum.example','2026-11-21');assert.equal(String.fromCharCode(zip[0],zip[1]),'PK')
  const res=await app(new Request('https://forum.example/v1/communities/'+f.room+'/kamus/export?format=cldf',{headers:{'x-who':f.a}}))
  assert.equal(res.headers.get('content-type'),'application/zip')
  const no=await app(new Request('https://forum.example/v1/communities/'+f.room+'/kamus/export',{headers:{'x-who':f.b}}))
  assert.equal(no.status,403)
 }finally{f.s.close()}
})
