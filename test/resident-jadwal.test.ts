import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Etnos} from '../src/store.ts'
import {Discovery,sourceFetcher} from '../src/discovery.ts'
import {Resident} from '../src/resident.ts'
import {AgentAccess} from '../src/agent-access.ts'
import {Wiki} from '../src/wiki.ts'
import {api} from '../src/api.ts'
import {parseJadwal,defaultJadwal,localTime,localInstant,jadwalSkills,type Jadwal} from '../src/jadwal.ts'
import shipped from '../seed/jadwal-aksara.json' with {type:'json'}

const feed=`<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title><item><title>Public source title</title><link>https://news.example.org/story</link><description><![CDATA[<p>A permitted excerpt.</p>]]></description><pubDate>Wed, 11 Nov 2026 01:00:00 GMT</pubDate></item></channel></rss>`
/** Local Asia/Jayapura time (UTC+9) as an instant. */
const jayapura=(date:string,at:string)=>Date.parse(`${date}T${at}:00+09:00`)
const slot=(patch:Record<string,unknown>={})=>({id:'a-slot',at:'08:00',skill:'source-digest',label:'Satu',...patch})
const file=(patch:Record<string,unknown>={},slots:unknown[]=[slot()])=>({version:1,timezone:'Asia/Jayapura',slots,...patch})

function fixture(options:{evidence?:boolean;jadwal?:Jadwal;dailyLimit?:number;start?:number;private?:boolean}={}){
 let now=options.start??jayapura('2026-11-19','05:00')
 const s=new Etnos(':memory:','https://jadwal.example.org',()=>now),owner=s.provision('did:web:jadwal-owner.example','Synthetic operator')
 const room=s.createCommunity(owner.actor.id,'Ruang jadwal','Synthetic','public',true,'open'),access=new AgentAccess(s),a=access.enroll(owner.actor.id,{communityId:room.id,name:'Synthetic Aksara',role:'steward',family:'aksara'});access.admit(owner.actor.id,a.agent_id)
  const d=new Discovery(s,sourceFetcher(['https://news.example.org'],async()=>new Response(feed,{headers:{'content-type':'application/rss+xml'}}))),r=new Resident(s,access,undefined,options.jadwal??defaultJadwal)
 const source=d.add(owner.actor.id,{communityId:room.id,title:'Public reference',url:'https://news.example.org/rss',rights:'excerpt-permitted',mode:'review',requestKey:randomUUID()})
 /** Mandates last at most a day, so a test that spans days issues new ones. */
 const configure=()=>{const post=s.mandate(owner.actor.id,a.agent_id,room.id,'Public source digest',now+86400000-1000,20),editorial=new Wiki(s).grant(owner.actor.id,a.agent_id,room.id,'Working knowledge',now+86400000-1000)
  r.configure(owner.actor.id,{communityId:room.id,agentId:a.agent_id,postingMandateId:post,editorialMandateId:editorial.id,enabled:true,dailyLimit:options.dailyLimit??8,intervalMinutes:10080,revision:s.get<{revision:number}>('SELECT revision FROM resident_configs WHERE community_id=?',room.id)?.revision??0,requestKey:randomUUID()})}
 configure()
 if(options.private)s.run("UPDATE communities SET visibility='hidden-private',admission='invite' WHERE id=?",room.id)
 const ready=async()=>{await d.refresh(owner.actor.id,source.id);const item=d.items(owner.actor.id,room.id,true)[0];d.decide(owner.actor.id,item.id,{revision:item.revision,state:'published',requestKey:randomUUID()})}
 const jobs=()=>s.all<{skill:string;state:string;request_key:string;result_kind:string|null;result_id:string|null}>('SELECT skill,state,request_key,result_kind,result_id FROM resident_jobs ORDER BY rowid')
 return {s,owner,room,r,a,ready,jobs,renew:configure,setNow:(n:number)=>{now=n},api:api(s,{agentAccess:access})}
}

test('the shipped Jadwal Aksara file is valid, in Asia/Jayapura, and only names skills that exist',()=>{
 assert.equal(defaultJadwal.version,1);assert.equal(defaultJadwal.timezone,'Asia/Jayapura')
 assert.deepEqual(parseJadwal(shipped),defaultJadwal)
 for(const x of defaultJadwal.slots){assert.ok(jadwalSkills.includes(x.skill));assert.match(x.at,/^\d\d:\d\d$/);assert.ok(x.label.length>0)}
 assert.deepEqual(defaultJadwal.slots.map(x=>x.label),['Kabar pagi','Pertanyaan hari ini','Hari ini di Wiki'])
})

test('the validator rejects bad times, unknown skills, repeated ids, unknown zones and stray fields',()=>{
 assert.equal(parseJadwal(file({},[slot({days:[5,1]})])).slots[0].days?.join(),'1,5')
 for(const at of ['24:00','7:30','12:60','noon','12:30:00',''])assert.throws(()=>parseJadwal(file({},[slot({at})])),/jam slot/,at)
 for(const skill of ['thread-reply','weekly-summary','','Source-Digest'])assert.throws(()=>parseJadwal(file({},[slot({skill})])),/keterampilan/,skill)
 assert.throws(()=>parseJadwal(file({},[slot(),slot()])),/ganda/)
 assert.throws(()=>parseJadwal(file({timezone:'Mars/Olympus'})),/zona waktu/);assert.throws(()=>parseJadwal(file({version:2})),/versi/)
 assert.deepEqual(parseJadwal(file({},[])).slots,[]);assert.throws(()=>parseJadwal(file({},Array.from({length:25},(_,i)=>slot({id:'s'+i})))),/24 slot/);assert.throws(()=>parseJadwal(file({},[slot({id:'Bad Id'})])),/id slot/)
 assert.throws(()=>parseJadwal(file({},[slot({label:' '})])),/label/);assert.throws(()=>parseJadwal(file({},[slot({prompt:'x'})])),/kolom/)
 for(const days of [[0],[8],[1,1],[],'senin'])assert.throws(()=>parseJadwal(file({},[slot({days})])),/hari slot/,JSON.stringify(days))
})

test('local day and time follow the schedule timezone, not UTC',()=>{
 // 22:30 UTC on the 18th is already 07:30 on the 19th in Jayapura.
 const t=localTime(Date.parse('2026-11-18T22:30:00Z'),'Asia/Jayapura');assert.equal(t.date,'2026-11-19');assert.equal(t.minutes,7*60+30);assert.equal(t.weekday,4)
 assert.equal(localTime(Date.parse('2026-11-19T14:59:00Z'),'Asia/Jayapura').date,'2026-11-19');assert.equal(localTime(Date.parse('2026-11-19T15:00:00Z'),'Asia/Jayapura').date,'2026-11-20')
 assert.equal(localInstant('2026-11-20','06:30','Asia/Jayapura'),Date.parse('2026-11-19T21:30:00Z'))
 assert.equal(localInstant('2026-03-08','12:00','America/New_York'),Date.parse('2026-03-08T16:00:00Z'))
})

test('a due slot starts one job with a per-day request key; repeated and concurrent ticks add none',async()=>{
 const f=fixture();try{
  await f.ready()
  await f.r.tick();assert.equal(f.jobs().length,0,'nothing is due at 05:00')
  f.setNow(jayapura('2026-11-19','06:31'))
  await Promise.all([f.r.tick(),f.r.tick(),f.r.tick()]);await f.r.tick()
  let jobs=f.jobs();assert.equal(jobs.length,1);assert.equal(jobs[0].skill,'source-digest');assert.equal(jobs[0].state,'succeeded');assert.equal(jobs[0].result_kind,'post')
  assert.match(jobs[0].request_key,/:jadwal:kabar-pagi:2026-11-19:[a-f0-9]{16}$/)
  // The same slot's key cannot make a second job even when asked directly.
  const again=f.r.enqueue(f.owner.actor.id,f.room.id,'source-digest',f.s.get<{request_key:string}>('SELECT request_key FROM resident_jobs')!.request_key.slice(f.owner.actor.id.length+1));assert.equal(f.jobs().length,1);assert.equal(again.id,f.s.get<{id:string}>('SELECT id FROM resident_jobs')!.id)
  // Later slots start one at a time, each once.
  f.setNow(jayapura('2026-11-19','18:05'))
  for(let i=0;i<4;i++)await Promise.all([f.r.tick(),f.r.tick()])
  jobs=f.jobs();assert.deepEqual(jobs.map(j=>j.skill),['source-digest','research-question','knowledge-draft'])
  assert.deepEqual(f.s.all<{state:string}>("SELECT state FROM resident_jobs WHERE state IN ('queued','running')"),[])
 }finally{f.s.close()}
})

test('a pending job makes a due slot wait quietly and it starts on a later tick',async()=>{
 const f=fixture();try{
  await f.ready()
  const manual=f.r.enqueue(f.owner.actor.id,f.room.id,'source-digest',randomUUID())
  f.setNow(jayapura('2026-11-19','06:40'))
  // runSlots goes first: the manual job is pending, so the slot skips without an error, then the manual job runs.
  await f.r.tick();assert.equal(f.jobs().length,1);assert.equal(f.jobs()[0].state,'succeeded');assert.equal(f.r.job(f.owner.actor.id,manual.id).state,'succeeded')
  await f.r.tick();const jobs=f.jobs();assert.equal(jobs.length,2);assert.match(jobs[1].request_key,/jadwal:kabar-pagi:2026-11-19/)
 }finally{f.s.close()}
})

test('a slot with nothing good to say stays silent and still counts as run for that day',async()=>{
 const f=fixture();try{
  // No published source: the existing abstention path applies and no post is made.
  f.setNow(jayapura('2026-11-19','06:40'));await f.r.tick()
  const jobs=f.jobs();assert.equal(jobs.length,1);assert.equal(jobs[0].state,'abstained');assert.equal(f.s.all('SELECT id FROM posts WHERE author_id=?',f.a.agent_id).length,0)
  f.setNow(jayapura('2026-11-19','07:40'));await f.r.tick();await f.r.tick();assert.equal(f.jobs().filter(j=>/kabar-pagi/.test(j.request_key)).length,1)
  const day=f.r.publicJadwal().communities[0].slots;assert.equal(day.find(x=>x.id==='kabar-pagi')!.state,'diam');assert.equal(day.find(x=>x.id==='kabar-pagi')!.post,null)
  // The next local day starts a fresh attempt.
  f.setNow(jayapura('2026-11-20','06:40'));f.renew();await f.r.tick();assert.equal(f.jobs().filter(j=>/kabar-pagi:2026-11-20/.test(j.request_key)).length,1)
 }finally{f.s.close()}
})

test('the day boundary is local: a slot runs once per Jayapura day even when the UTC date differs',async()=>{
 const f=fixture({start:Date.parse('2026-11-18T21:00:00Z')});try{ // 06:00 on the 19th in Jayapura, still the 18th in UTC
  await f.ready();f.setNow(Date.parse('2026-11-18T22:00:00Z'));await f.r.tick()
  assert.match(f.jobs()[0].request_key,/kabar-pagi:2026-11-19:/)
  f.setNow(Date.parse('2026-11-19T14:59:00Z'));f.renew();await f.r.tick();assert.equal(f.jobs().filter(j=>/kabar-pagi/.test(j.request_key)).length,1,'23:59 local is still the 19th')
  f.setNow(Date.parse('2026-11-19T15:01:00Z'));f.renew();await f.r.tick();assert.equal(f.jobs().filter(j=>/kabar-pagi/.test(j.request_key)).length,1,'00:01 local on the 20th is before 06:30')
  f.setNow(Date.parse('2026-11-19T21:31:00Z'));f.renew();await f.r.tick();const keys=f.jobs().filter(j=>/kabar-pagi/.test(j.request_key)).map(j=>j.request_key.match(/\d{4}-\d\d-\d\d/)![0]);assert.deepEqual(keys,['2026-11-19','2026-11-20'])
 }finally{f.s.close()}
})

test('slots respect the daily limit, weekdays and the current mandates',async()=>{
 const f=fixture({dailyLimit:1});try{
  await f.ready();f.setNow(jayapura('2026-11-19','18:10'))
  for(let i=0;i<4;i++)await f.r.tick()
  assert.equal(f.jobs().length,1,'one job a day was allowed');const slots=f.r.publicJadwal().communities[0].slots
  assert.deepEqual(slots.map(x=>x.state),['selesai','dilewati','dilewati'])
 }finally{f.s.close()}
 const weekday=fixture({jadwal:parseJadwal(file({},[slot({id:'senin',at:'06:00',days:[1]}),slot({id:'kamis',at:'06:00',days:[4]})]))});try{
  await weekday.ready();weekday.setNow(jayapura('2026-11-19','07:00')) // a Thursday
  await weekday.r.tick();await weekday.r.tick();assert.deepEqual(weekday.jobs().map(j=>j.request_key.match(/jadwal:([a-z]+)/)![1]),['kamis'])
  assert.deepEqual(weekday.r.publicJadwal().communities[0].slots.map(x=>x.id),['kamis'])
 }finally{weekday.s.close()}
 const revoked=fixture();try{
  await revoked.ready();revoked.s.revokeMandate(revoked.owner.actor.id,revoked.s.get<{id:string}>('SELECT posting_mandate_id id FROM resident_configs')!.id)
  revoked.setNow(jayapura('2026-11-19','07:00'));await revoked.r.tick();assert.equal(revoked.jobs().length,0)
  assert.equal(revoked.r.slots.skipReason(revoked.s.get('SELECT * FROM resident_configs')!,defaultJadwal.slots[0]),'authority')
  assert.equal(revoked.r.publicJadwal().communities[0].slots[0].state,'dilewati')
 }finally{revoked.s.close()}
})

test('the alarm wakes at the next slot, and not again for a slot that already ran',async()=>{
 const f=fixture();try{
  await f.ready();assert.equal(f.r.nextWake(),jayapura('2026-11-19','06:30'))
  f.setNow(jayapura('2026-11-19','06:31'));await f.r.tick();await f.r.tick()
  assert.equal(f.r.nextWake(),jayapura('2026-11-19','10:00'))
 }finally{f.s.close()}
})

test('GET /v1/aksara/jadwal lists today\'s slots with state and post link, and shows no private community',async()=>{
 const f=fixture();try{
  await f.ready()
  const secret=f.s.createCommunity(f.owner.actor.id,'Ruang rahasia jadwal','Synthetic','public',true,'open'),access=new AgentAccess(f.s),agent=access.enroll(f.owner.actor.id,{communityId:secret.id,name:'Secret Aksara',role:'steward',family:'aksara'});access.admit(f.owner.actor.id,agent.agent_id)
  const grant=f.s.mandate(f.owner.actor.id,agent.agent_id,secret.id,'Private digest',f.s.clock()+86400000);f.r.configure(f.owner.actor.id,{communityId:secret.id,agentId:agent.agent_id,postingMandateId:grant,enabled:true,requestKey:randomUUID()})
  f.s.run("UPDATE communities SET visibility='hidden-private',admission='invite' WHERE id=?",secret.id)
  f.setNow(jayapura('2026-11-19','06:40'));await f.r.tick()
  const res=await f.api(new Request(f.s.base+'/v1/aksara/jadwal'));assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store')
  const body=await res.json() as {timezone:string;date:string;communities:{id:string;title:string;slots:{id:string;label:string;at:string;state:string;post:{id:string;path:string}|null}[]}[]}
  assert.equal(body.timezone,'Asia/Jayapura');assert.equal(body.date,'2026-11-19');assert.deepEqual(body.communities.map(c=>c.id),[f.room.id])
  const [first,second,third]=body.communities[0].slots;assert.deepEqual([first.label,first.at,first.state],['Kabar pagi','06:30','selesai']);assert.equal(first.post!.path,'/square/'+first.post!.id)
  assert.deepEqual([second.label,second.state,second.post],['Pertanyaan hari ini','menunggu',null]);assert.equal(third.state,'menunggu')
  const text=JSON.stringify(body)
  for(const hidden of [secret.id,'Ruang rahasia jadwal','Secret Aksara',f.owner.actor.id,f.a.agent_id,'operator','ticket','evidence','request_key','Public source title'])assert.equal(text.includes(hidden),false,hidden)
  // A community that turns private later disappears too.
  f.s.run("UPDATE communities SET visibility='hidden-private' WHERE id=?",f.room.id)
  assert.deepEqual((await (await f.api(new Request(f.s.base+'/v1/aksara/jadwal'))).json() as {communities:unknown[]}).communities,[])
 }finally{f.s.close()}
})

test('a resident in a private community neither runs visibly nor appears in the schedule',async()=>{
 const f=fixture({private:true});try{
  f.setNow(jayapura('2026-11-19','07:00'));await f.r.tick()
  const body=await (await f.api(new Request(f.s.base+'/v1/aksara/jadwal'))).json() as {communities:unknown[]};assert.deepEqual(body.communities,[])
  assert.equal(f.jobs().length,0)
 }finally{f.s.close()}
})
