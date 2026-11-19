import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Strata} from '../src/store.ts'
import {Discovery,parseFeed,sourceFetcher} from '../src/discovery.ts'
import {Knowledge} from '../src/knowledge.ts'
import {Resident,type ResidentProvider} from '../src/resident.ts'
import {AgentAccess} from '../src/agent-access.ts'
import {Wiki} from '../src/wiki.ts'
import {api} from '../src/api.ts'
const feed=(title='Public source title')=>`<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title><item><title>${title}</title><link>https://news.example.org/story?utm_source=test</link><description><![CDATA[<p>A permitted excerpt.</p>]]></description><pubDate>Wed, 11 Nov 2026 01:00:00 GMT</pubDate></item></channel></rss>`
function fixture(provider?:ResidentProvider){let now=Date.now();const s=new Strata(':memory:','https://commons.example.org',()=>now),owner=s.provision('did:web:owner.example','Human operator'),outside=s.provision('did:web:outsider.example','Outside'),c=s.createCommunity(owner.actor.id,'Source room','Public commons','public',true,'open'),access=new AgentAccess(s),agent=access.enroll(owner.actor.id,{name:'Test Aksara',communityId:c.id,role:'steward',family:'aksara'});access.admit(owner.actor.id,agent.agent_id);const postGrant=s.mandate(owner.actor.id,agent.agent_id,c.id,'Public source digest',now+86400000),editorial=new Wiki(s).grant(owner.actor.id,agent.agent_id,c.id,'Working knowledge',now+86400000);let xml=feed();const d=new Discovery(s,sourceFetcher(['https://news.example.org'],async()=>new Response(xml,{headers:{'content-type':'application/rss+xml'}}))),k=new Knowledge(s),r=new Resident(s,access,provider);const source=d.add(owner.actor.id,{communityId:c.id,title:'Public reference',url:'https://news.example.org/rss',rights:'excerpt-permitted',mode:'review',requestKey:randomUUID()});return {s,owner,outside,c,agent,access,d,k,r,source,advance:(n=61000)=>{now+=n},setFeed:(v:string)=>xml=v,configure:()=>r.configure(owner.actor.id,{communityId:c.id,agentId:agent.agent_id,postingMandateId:postGrant,editorialMandateId:editorial.id,enabled:true,dailyLimit:5,intervalMinutes:360,requestKey:randomUUID()}),postGrant}}
async function publish(f:ReturnType<typeof fixture>){await f.d.refresh(f.owner.actor.id,f.source.id);const item=f.d.items(f.owner.actor.id,f.c.id,true)[0];return f.d.decide(f.owner.actor.id,item.id,{revision:item.revision,state:'published',requestKey:randomUUID()})}
test('feed acquisition refuses unapproved hosts, redirects, malformed XML, DTD and oversized bodies without forwarding credentials',async()=>{
 let calls=0;const fetcher=sourceFetcher(['https://news.example.org'],async(_url,init)=>{calls++;assert.equal(init?.credentials,'omit');assert.equal(init?.redirect,'manual');assert.equal(new Headers(init?.headers).has('authorization'),false);return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})})
 await assert.rejects(fetcher('https://127.0.0.1/private',AbortSignal.timeout(1000)));assert.equal(calls,0)
 await assert.rejects(fetcher('https://unapproved.example.org/feed',AbortSignal.timeout(1000)));assert.equal(calls,0)
 await assert.rejects(fetcher('https://news.example.org/rss',AbortSignal.timeout(1000)),/redirects/);assert.equal(calls,1)
 assert.throws(()=>parseFeed('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>'),/DTD/)
 assert.throws(()=>parseFeed('<rss><item></rss>'),/malformed/)
 assert.throws(()=>parseFeed('x'.repeat(524289)),/large/)
 assert.equal(parseFeed(feed())[0].url,'https://news.example.org/story')
 assert.equal(parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom title</title><link href="https://news.example.org/atom"/><summary>Plain</summary></entry></feed>')[0].title,'Atom title')
})
test('source registry and review are scoped, acquisition rechecks authority after await, and news stays model-free',async()=>{
 const f=fixture();try{
  const handler=api(f.s,{sourceFetcher:f.d.fetcher}),request=()=>new Request(f.s.base+'/v1/discovery/sources?community='+f.c.id,{headers:{authorization:'Bearer '+f.outside.token}})
  assert.equal((await handler(request())).status,404)
  await f.d.refresh(f.owner.actor.id,f.source.id);assert.equal(f.d.items().length,0)
  const first=f.d.items(f.owner.actor.id,f.c.id,true)[0];f.d.decide(f.owner.actor.id,first.id,{revision:1,state:'published',requestKey:randomUUID()});assert.equal(f.d.items()[0].evidence[0].rights,'excerpt-permitted')
  f.advance();await f.d.refresh(f.owner.actor.id,f.source.id);assert.equal(f.d.items().length,1);assert.equal(f.d.items()[0].revision,2)
  f.advance();f.setFeed(feed('Corrected public title'));await f.d.refresh(f.owner.actor.id,f.source.id);assert.equal(f.d.items().length,0);assert.equal(f.d.items(f.owner.actor.id,f.c.id,true).length,1)
 }finally{f.s.close()}
})
test('current source withdrawal invalidates a promoted Wiki draft and blocks acceptance',async()=>{
 const f=fixture();try{
  const item=await publish(f),note=f.k.create(f.owner.actor.id,{communityId:f.c.id,title:'Working source note',text:'Unresolved working knowledge',citations:[item.url],evidenceIds:[item.id],requestKey:randomUUID()}),promotion=f.k.promote(f.owner.actor.id,note.id,{revision:note.revision,requestKey:randomUUID()}),w=new Wiki(f.s),proposal=w.proposals(f.owner.actor.id,promotion.pageId)[0]
  f.d.state(f.owner.actor.id,f.source.id,{revision:f.source.revision,state:'withdrawn',requestKey:randomUUID()})
  assert.equal(f.k.read(note.id).evidenceStatus,'needs-review');assert.equal(f.d.items().length,0)
  assert.throws(()=>w.decide(f.owner.actor.id,proposal.id,proposal.digest,true),/evidence changed/)
  assert.equal(w.all().length,0)
 }finally{f.s.close()}
})
test('private working knowledge filters title, body, history and receipt replay after membership revocation',async()=>{
 const f=fixture();try{
  const room=f.s.createCommunity(f.owner.actor.id,'Private language','Private','hidden-private'),key=randomUUID(),input={communityId:room.id,title:'PRIVATE_TITLE',text:'PRIVATE_LANGUAGE_BYTES',requestKey:key};f.s.setMember(f.owner.actor.id,room.id,f.outside.actor.id,true)
  const note=f.k.create(f.outside.actor.id,input);assert.equal(f.k.list().length,0);assert.equal(f.k.list(f.outside.actor.id)[0].id,note.id)
  assert.throws(()=>f.k.promote(f.owner.actor.id,note.id,{revision:1,requestKey:randomUUID()}),/Protected notes/)
  f.s.setMember(f.owner.actor.id,room.id,f.outside.actor.id,false)
  for(const action of [()=>f.k.read(note.id),()=>f.k.history(note.id,f.outside.actor.id),()=>f.k.create(f.outside.actor.id,input)])assert.throws(action,/Not found/)
  const handler=api(f.s);for(const suffix of ['', '/history'])assert.equal((await handler(new Request(f.s.base+'/v1/knowledge/'+note.id+suffix))).status,404)
 }finally{f.s.close()}
})
test('knowledge transitions bind exact request bodies and revisions and preserve accepted social contributions',()=>{
 const f=fixture();try{
  const input={communityId:f.c.id,title:'Ordinary memory',text:'A remembered account, still open to corrections',kind:'memory',requestKey:randomUUID()},note=f.k.create(f.owner.actor.id,input)
  assert.equal(f.k.create(f.owner.actor.id,input).id,note.id)
  assert.throws(()=>f.k.create(f.owner.actor.id,{...input,text:'Different'}),/already used/)
  f.k.update(f.owner.actor.id,note.id,{revision:1,title:note.title,text:'Correction with uncertainty',requestKey:randomUUID()})
  assert.throws(()=>f.k.update(f.owner.actor.id,note.id,{revision:1,title:note.title,text:'Stale',requestKey:randomUUID()}),/changed/)
  assert.equal(f.k.history(note.id).length,2);assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM wiki_revisions')!.n,0)
 }finally{f.s.close()}
})
test('resident uses actual posting and editorial pipelines, with atomic results and no duplicate run',async()=>{
 const f=fixture();try{
  await publish(f);f.configure();const j=f.r.enqueue(f.owner.actor.id,f.c.id,'source-digest',randomUUID()),result=await f.r.run(j.id)
  assert.equal(result.state,'succeeded');assert.equal(f.s.feed().length,1);assert.equal(f.s.feed()[0].author.kind,'agent');assert.match(f.s.feed()[0].text,/https:\/\/news.example.org\/story/)
  await assert.rejects(f.r.run(j.id),/not queued/);assert.equal(f.s.feed().length,1)
  const next=f.r.enqueue(f.owner.actor.id,f.c.id,'knowledge-draft',randomUUID());assert.equal((await f.r.run(next.id)).state,'succeeded');assert.equal(f.k.list()[0].author.kind,'agent');assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM wiki_revisions')!.n,0)
 }finally{f.s.close()}
})
test('kill switch and stale generation fence a model result after inference without publication',async()=>{
 let resolve!:(value:{text:string;model:string})=>void;const provider:ResidentProvider={label:'test:bounded',draft:async()=>new Promise(r=>resolve=r)},f=fixture(provider)
 try{
  await publish(f);f.configure();const j=f.r.enqueue(f.owner.actor.id,f.c.id,'source-digest',randomUUID()),run=f.r.run(j.id);await new Promise(r=>setTimeout(r,0))
  f.r.cancel(f.owner.actor.id,j.id);resolve({text:'Late result',model:'test:bounded'});await run
  assert.equal(f.r.job(f.owner.actor.id,j.id).state,'cancelled');assert.equal(f.s.feed().length,0)
 }finally{f.s.close()}
})
test('resident rechecks source changes and operator revocation after model work, and missing evidence abstains',async()=>{
 let resolve!:(value:{text:string;model:string})=>void;const f=fixture({label:'test:bounded',draft:async()=>new Promise(r=>resolve=r)})
 try{
  await publish(f);f.configure();const j=f.r.enqueue(f.owner.actor.id,f.c.id,'knowledge-draft',randomUUID()),run=f.r.run(j.id);await new Promise(r=>setTimeout(r,0));f.d.state(f.owner.actor.id,f.source.id,{revision:1,state:'withdrawn',requestKey:randomUUID()});resolve({text:'Uses stale evidence',model:'test:bounded'});assert.equal((await run).state,'abstained');assert.equal(f.k.list().length,0)
  const next=f.r.enqueue(f.owner.actor.id,f.c.id,'source-digest',randomUUID());assert.equal((await f.r.run(next.id)).state,'abstained');assert.equal(f.s.feed().length,0)
 }finally{f.s.close()}
})

test('post corrections, removal, moderation and accepted Wiki revisions fence retained resident context before publication',async()=>{
 const {Forum}=await import('../src/forum.ts')
 for(const action of ['edit','delete','hide','restore','lock','wiki'] as const){
  let resolve!:(v:{text:string;model:string})=>void,work!:Parameters<ResidentProvider['draft']>[0]['work']
  const f=fixture({label:'test:context',draft:async input=>{work=input.work;return new Promise(r=>resolve=r)}})
  try{
   await publish(f);f.configure();const forum=new Forum(f.s),post=f.s.createPost(f.owner.actor.id,f.c.id,'Original public context')
   if(action==='restore')f.s.hidePost(f.owner.actor.id,post.id)
   const job=f.r.enqueue(f.owner.actor.id,f.c.id,'source-digest',randomUUID()),run=f.r.run(job.id)
   await new Promise(r=>setTimeout(r,0));f.r.validateRuntime(work)
   const epoch=f.s.get<{epoch:number}>('SELECT epoch FROM community_context_epochs WHERE community_id=?',f.c.id)!.epoch
   if(action==='edit')forum.edit(f.owner.actor.id,post.id,{revision:post.revision,text:'Corrected public context'})
   else if(action==='delete')forum.delete(f.owner.actor.id,post.id,post.revision)
   else if(action==='hide')f.s.hidePost(f.owner.actor.id,post.id) // legacy HTTP path must invalidate too
   else if(action==='wiki'){
    const w=new Wiki(f.s),page=w.create(f.owner.actor.id,f.c.id,'Current knowledge'),p=w.propose(f.owner.actor.id,page.id,null,'Reviewed public knowledge',[],'id','Community')
    w.decide(f.owner.actor.id,p.id,p.digest,true)
   }else forum.moderate(f.owner.actor.id,post.id,{action,reason:'Current public policy'})
   assert.equal(f.s.get<{epoch:number}>('SELECT epoch FROM community_context_epochs WHERE community_id=?',f.c.id)!.epoch,epoch+1,action)
   assert.throws(()=>f.r.validateRuntime(work),/context changed/,action)
   resolve({text:'A result from an obsolete retained context',model:'test:context'})
   assert.equal((await run).state,'abstained',action)
   assert.equal(f.s.get<{n:number}>("SELECT count(*) n FROM posts WHERE author_id=?",f.agent.agent_id)!.n,0,action)
  }finally{f.s.close()}
 }
})
test('context invalidation shares mutation rollback and does not affect an unrelated scope',async()=>{
 const {Forum}=await import('../src/forum.ts'),{contextEpoch}=await import('../src/commons.ts'),f=fixture()
 try{
  const forum=new Forum(f.s),other=f.s.createCommunity(f.owner.actor.id,'Separate scope','Public','public'),p=f.s.createPost(f.owner.actor.id,f.c.id,'Original')
  assert.throws(()=>f.s.tx(()=>{forum.edit(f.owner.actor.id,p.id,{revision:p.revision,text:'Rolled back'});throw Error('Rollback')}),/Rollback/)
  assert.equal(contextEpoch(f.s,f.c.id),0);assert.equal(f.s.getPost(f.owner.actor.id,p.id).text,'Original')
  const unrelated=f.s.createPost(f.owner.actor.id,other.id,'Another room')
  forum.edit(f.owner.actor.id,unrelated.id,{revision:unrelated.revision,text:'Changed elsewhere'})
  assert.equal(contextEpoch(f.s,f.c.id),0);assert.equal(contextEpoch(f.s,other.id),1)
 }finally{f.s.close()}
})

test('native resident setup uses real registration, admission and bounded grants without deployment keys, and rolls back denial',async()=>{
 const now=Date.now(),s=new Strata(':memory:','https://native-setup.example.org',()=>now),owner=s.provision('did:web:native-operator.example','Synthetic operator'),outsider=s.provision('did:web:native-outsider.example','Outside'),room=s.createCommunity(owner.actor.id,'Native resident fixture','Public','public',true,'open'),access=new AgentAccess(s),r=new Resident(s,access,{label:'pi:test',draft:async()=>({text:'A public source-backed finding.',model:'synthetic-route'})}),requestKey=randomUUID()
 try{
  const first=r.setup(owner.actor.id,{communityId:room.id,consent:true,includeSource:true,requestKey}),again=r.setup(owner.actor.id,{communityId:room.id,consent:true,includeSource:true,requestKey})
  assert.equal(first.agentId,again.agentId);assert.equal(s.actor(first.agentId).kind,'agent');assert.equal(s.actor(first.agentId).operator_id,owner.actor.id)
  assert.equal(s.get<{n:number}>('SELECT count(*) n FROM agent_deployments WHERE agent_id=?',first.agentId)!.n,0)
  assert.equal(first.expires,s.clock()+86400000);assert.equal(s.get<{role:string}>('SELECT role FROM memberships WHERE community_id=? AND actor_id=?',room.id,first.agentId)!.role,'member')
  assert.equal(first.config!.daily_limit,8);assert.equal(first.config!.interval_minutes,120);assert.equal(first.config!.mentions_enabled,1);assert.equal(first.config!.enabled,1)
  assert.equal(new Discovery(s).sources(owner.actor.id,room.id)[0].rights,'link-only')
  assert.throws(()=>r.setup(outsider.actor.id,{communityId:room.id,consent:true,requestKey:randomUUID()}),/permission|member|steward|Not found/i)
  assert.throws(()=>r.setup(owner.actor.id,{communityId:room.id,requestKey:randomUUID()}),/consent/)
  assert.throws(()=>r.setup(owner.actor.id,{communityId:room.id,consent:true,requestKey:randomUUID()}),/already configured/)
  const privateRoom=s.createCommunity(owner.actor.id,'Protected native fixture','Private language data','hidden-private',true),paused=s.createCommunity(owner.actor.id,'No automation','Public','public',false)
  for(const c of [privateRoom,paused])assert.throws(()=>r.setup(owner.actor.id,{communityId:c.id,consent:true,requestKey:randomUUID()}))
  assert.equal(s.get<{n:number}>('SELECT count(*) n FROM agent_registrations')!.n,1)
  assert.equal(s.get<{n:number}>('SELECT count(*) n FROM resident_configs')!.n,1)
  s.run('UPDATE memberships SET active=0 WHERE community_id=? AND actor_id=?',room.id,owner.actor.id)
  assert.throws(()=>r.setup(owner.actor.id,{communityId:room.id,consent:true,includeSource:true,requestKey}))
 }finally{s.close()}
})

 test('native setup changes automation only with explicit owner consent and rolls back failed setup',()=>{
 const s=new Strata(':memory:','https://native-policy.example.org'),owner=s.provision('did:web:policy-owner.example','Owner'),mod=s.provision('did:web:policy-mod.example','Moderator'),room=s.createCommunity(owner.actor.id,'Native policy','Public','public',false),r=new Resident(s,new AgentAccess(s),{label:'Pi Durable test',draft:async()=>({text:'Synthetic',model:'test'})})
 try{
  s.setMember(owner.actor.id,room.id,mod.actor.id,true,'moderator')
  assert.throws(()=>r.setup(mod.actor.id,{communityId:room.id,consent:true,enableAutomation:true,requestKey:randomUUID()}),/owner/)
  assert.throws(()=>r.setup(owner.actor.id,{communityId:room.id,consent:true,requestKey:randomUUID()}),/consent/)
  assert.throws(()=>r.setup(owner.actor.id,{communityId:room.id,consent:true,enableAutomation:true,includeSource:true,requestKey:'bad'}))
  assert.equal(s.community(room.id).automation,0);assert.equal(s.get<{n:number}>('SELECT count(*) n FROM agent_registrations')!.n,0)
  const enroll=r.access.enroll;r.access.enroll=()=>{throw Error('Synthetic registration failure')}
  assert.throws(()=>r.setup(owner.actor.id,{communityId:room.id,consent:true,enableAutomation:true,requestKey:randomUUID()}),/registration failure/)
  assert.equal(s.community(room.id).automation,0);r.access.enroll=enroll
  const result=r.setup(owner.actor.id,{communityId:room.id,consent:true,enableAutomation:true,includeSource:true,requestKey:'a'.repeat(100)})
  assert.equal(s.community(room.id).automation,1);assert.equal(result.ready,true)
 }finally{s.close()}
 })

test('provisional Wiki discovery is public-only and does not expose private notes, pending proposals or withdrawn text',async()=>{
 const f=fixture();try{
  const note=f.k.create(f.owner.actor.id,{communityId:f.c.id,title:'Public provisional page',text:'## Context\nA source-linked starting point.',citations:['https://news.example.org/story'],requestKey:randomUUID()})
  const privateRoom=f.s.createCommunity(f.owner.actor.id,'Hidden language','Private','hidden-private')
  f.k.create(f.owner.actor.id,{communityId:privateRoom.id,title:'Private language title',text:'Private recording summary',requestKey:randomUUID()})
  new Wiki(f.s).createDraft(f.owner.actor.id,f.c.id,'Unaccepted proposal title',{text:'Restricted proposal body',citations:[],language:'id',perspective:'Draft'})
  const handler=api(f.s),res=await handler(new Request(f.s.base+'/v1/wiki/growing',{headers:{authorization:'Bearer '+f.owner.token}})),rows=await res.json() as {id:string;review:string}[]
  assert.equal(res.status,200);assert.equal(rows.length,1);assert.equal(rows[0].id,note.id);assert.equal(rows[0].review,'provisional')
  assert.doesNotMatch(JSON.stringify(rows),/Private language|Private recording|Unaccepted proposal|Restricted proposal|editorial_mandate_id|evidenceIds/)
  f.k.withdraw(f.owner.actor.id,note.id,{revision:note.revision,requestKey:randomUUID()});assert.deepEqual(f.k.discoverPublic(),[])
 }finally{f.s.close()}
})
test('opt-in resident Wiki announcements commit once with the note and require a current posting grant',async()=>{
 const f=fixture();try{
  await publish(f);const current=f.configure().config!
  f.r.configure(f.owner.actor.id,{communityId:f.c.id,agentId:f.agent.agent_id,postingMandateId:f.postGrant,editorialMandateId:current.editorial_mandate_id,enabled:true,announceKnowledge:true,revision:current.revision,requestKey:randomUUID()})
  const job=f.r.enqueue(f.owner.actor.id,f.c.id,'knowledge-draft',randomUUID()),results=await Promise.allSettled([f.r.run(job.id),f.r.run(job.id)])
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM knowledge_announcements')!.n,1)
  const note=f.k.list()[0],posts=f.s.feed();assert.equal(posts.length,1);assert.ok(posts[0].text.includes('/wiki/notes/'+note.id));assert.match(posts[0].text,/belum ditinjau/);assert.equal(f.s.actor(posts[0].author_id).kind,'agent')
  await assert.rejects(f.r.run(job.id));assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM knowledge_announcements')!.n,1)
  const next=f.r.enqueue(f.owner.actor.id,f.c.id,'knowledge-draft',randomUUID());f.s.run('UPDATE mandates SET revoked=1 WHERE id=?',f.postGrant)
  await assert.rejects(f.r.run(next.id));assert.equal(f.k.list().length,1);assert.equal(f.s.feed().length,1)
 }finally{f.s.close()}
})
test('news alone does not start a Wiki page',async()=>{
 const f=fixture();try{
  f.s.run("UPDATE discovery_sources SET mode='news' WHERE id=?",f.source.id)
  await publish(f);f.configure();const job=f.r.enqueue(f.owner.actor.id,f.c.id,'knowledge-draft',randomUUID());const result=await f.r.run(job.id)
  assert.equal(result.state,'abstained');assert.match('error' in result?result.error:'',/News alone/);assert.equal(f.k.list().length,0)
 }finally{f.s.close()}
})
test('unchanged source read-sets do not produce repeated Wiki pages or announcements',async()=>{
 const f=fixture();try{
  await publish(f);f.configure();const first=f.r.enqueue(f.owner.actor.id,f.c.id,'knowledge-draft',randomUUID());assert.equal((await f.r.run(first.id)).state,'succeeded')
  const second=f.r.enqueue(f.owner.actor.id,f.c.id,'knowledge-draft',randomUUID());const result=await f.r.run(second.id);assert.equal(result.state,'abstained');assert.match('error' in result?result.error:'',/already have a Wiki/);assert.equal(f.k.list().length,1)
 }finally{f.s.close()}
})
