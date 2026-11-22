import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Etnos} from '../src/store.ts'
import {Resident,type ResidentInput,type ResidentOutput,type ResidentProvider} from '../src/resident.ts'
import {AgentAccess} from '../src/agent-access.ts'
import {Discovery,sourceFetcher} from '../src/discovery.ts'
import {Wiki} from '../src/wiki.ts'

type Draft=(input:ResidentInput,f:Fixture)=>Promise<ResidentOutput>|ResidentOutput
type Fixture={s:Etnos;owner:{actor:{id:string}};person:{actor:{id:string}};room:{id:string};access:AgentAccess;r:Resident;a:{agent_id:string};grant:string;page:{id:string};draftPage:{id:string};secret:{id:string};ask:(text?:string)=>{post:{id:string};job:string}}
const receipt=(input:ResidentInput)=>input.question?{postId:input.question.postId,revision:input.question.revision}:undefined
async function fixture(draft:Draft):Promise<Fixture>{
 const s=new Etnos(':memory:','https://research.example.org'),owner=s.provision('did:web:research-owner.example','Synthetic operator'),person=s.provision('did:web:research-person.example','Synthetic neighbor'),room=s.createCommunity(owner.actor.id,'Public questions','Synthetic','public',true,'open'),access=new AgentAccess(s,{stewardDid:owner.actor.did})
 let f!:Fixture;const provider:ResidentProvider={label:'synthetic:research',researchTools:true,draft:input=>Promise.resolve(draft(input,f))}
 const r=new Resident(s,access,provider),a=access.enroll(owner.actor.id,{communityId:room.id,name:'Synthetic Aksara',role:'steward',family:'aksara'});access.admit(owner.actor.id,a.agent_id);s.join(person.actor.id,room.id)
 const grant=s.mandate(owner.actor.id,a.agent_id,room.id,'Public conversation',s.clock()+86400000),editorial=new Wiki(s).grant(owner.actor.id,a.agent_id,room.id,'Knowledge',s.clock()+86400000)
 r.configure(owner.actor.id,{communityId:room.id,agentId:a.agent_id,postingMandateId:grant,editorialMandateId:editorial.id,enabled:true,mentionsEnabled:true,dailyLimit:5,requestKey:randomUUID()})
 const d=new Discovery(s,sourceFetcher(['https://source.example.org'],async()=>new Response('<rss><channel><item><title>Public reference</title><link>https://source.example.org/report</link><description>A permitted public excerpt.</description></item></channel></rss>',{headers:{'content-type':'application/rss+xml'}}))),source=d.add(owner.actor.id,{communityId:room.id,title:'Synthetic reference',url:'https://source.example.org/rss',rights:'excerpt-permitted',mode:'news',requestKey:randomUUID()});await d.refresh(owner.actor.id,source.id)
 // Wiki fixture: one accepted public page, one draft, one pending proposal and one protected-room page, all about the river.
 const wiki=new Wiki(s),page=wiki.create(owner.actor.id,room.id,'Sungai Digul'),accepted=wiki.propose(owner.actor.id,page.id,null,'## Sungai\n\nThe Digul river carries **accepted reviewed knowledge** for the community.',['https://example.org/digul'],'id','Community');wiki.decide(owner.actor.id,accepted.id,accepted.digest,true)
 const draftPage=wiki.createDraft(owner.actor.id,room.id,'Draft river title',{text:'Digul river draftsecret wording',citations:[],language:'id',perspective:'Draft'})
 wiki.propose(owner.actor.id,page.id,wiki.read(page.id).revision!.id,'Digul river pendingsecret replacement',[],'id','Pending')
 const hidden=s.createCommunity(owner.actor.id,'Protected fixture','Protected','public'),secret=wiki.create(owner.actor.id,hidden.id,'Protected river title'),p=wiki.propose(owner.actor.id,secret.id,null,'Digul river protectedsecret body',[],'id','Protected');wiki.decide(owner.actor.id,p.id,p.digest,true)
 s.run("UPDATE communities SET visibility='hidden-private' WHERE id=?",hidden.id)
 const choice=r.routing.choices(person.actor.id,room.id)[0]
 const ask=(text='@aksara What do we know about the Digul river?')=>{const post=r.createMentionPost(person.actor.id,{communityId:room.id,text,requestKey:randomUUID(),agentMention:{actorId:choice.actor.id,choiceKey:choice.choiceKey}});return {post,job:s.get<{job_id:string}>('SELECT job_id FROM resident_job_inputs WHERE target_post_id=?',post.id)!.job_id}}
 f={s,owner,person,room,access,r,a,grant,page,draftPage,secret,ask}
 return f
}
const key=()=>'call-'+randomUUID()

test('search_reviewed_wiki returns only accepted public pages, never drafts, pending proposals or protected rooms',async()=>{
 let found:unknown;const f=await fixture((input,f)=>{found=f.r.authority('wiki-search',input.work,{query:'Digul river draftsecret pendingsecret protectedsecret'});return {text:'Noted.',model:'synthetic',questionReceipt:receipt(input)}})
 try{const {job}=f.ask();assert.equal((await f.r.run(job)).state,'succeeded')
  const {results}=found as {results:{pageId:string;title:string;excerpt:string;url:string}[]}
  assert.deepEqual(results.map(r=>r.pageId),[f.page.id]);assert.equal(results[0].title,'Sungai Digul');assert.equal(results[0].url,f.s.base+'/wiki/'+f.page.id);assert.match(results[0].excerpt,/accepted reviewed knowledge/)
  const json=JSON.stringify(found);for(const forbidden of ['draftsecret','pendingsecret','protectedsecret','Draft river title','Protected river title',f.draftPage.id,f.secret.id,'author_id','proposal'])assert.equal(json.includes(forbidden),false,forbidden)
  assert.deepEqual(new Wiki(f.s).searchAccepted('protectedsecret draftsecret pendingsecret'),[])
 }finally{f.s.close()}
})

test('a revoked, expired or finished job cannot search the Wiki or reserve web calls',async()=>{
 for(const change of ['revoke','expire','finished'] as const){
  let work:ResidentInput['work']|undefined;const f=await fixture((input,f)=>{
   work=input.work
   if(change==='revoke'){f.s.revokeMandate(f.owner.actor.id,f.grant);assert.throws(()=>f.r.authority('wiki-search',input.work,{query:'Digul'}),/mandate|changed|participation/i);assert.throws(()=>f.r.authority('web-call',input.work,{tool:'web_search',requestKey:key()}))}
   if(change==='expire'){f.s.run('UPDATE resident_jobs SET lease_until=? WHERE id=?',f.s.clock()-1,input.work.jobId);assert.throws(()=>f.r.authority('wiki-search',input.work,{query:'Digul'}),/lease/i)}
   return {text:'A reply.',model:'synthetic',questionReceipt:receipt(input)}
  })
  try{const {job}=f.ask();await f.r.run(job)
   assert.throws(()=>f.r.authority('wiki-search',work!,{query:'Digul'}),Error,change)
   assert.throws(()=>f.r.authority('web-call',work!,{tool:'web_fetch',requestKey:key()}),Error,change)
   assert.throws(()=>f.r.authority('wiki-search',{...work!,ticket:'x'.repeat(43)},{query:'Digul'}),/Invalid runtime work capability/,change)
   assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM resident_tool_calls')!.n,0,change)
  }finally{f.s.close()}
 }
})

test('only Wiki pages and web pages actually read in this job stay as citations; invented and search-only links are removed',async()=>{
 const f=await fixture((input,f)=>{
  const wiki=f.r.authority('wiki-search',input.work,{query:'Digul'}) as {results:{url:string}[]}
  const search=key();f.r.authority('web-call',input.work,{tool:'web_search',requestKey:search})
  assert.throws(()=>f.r.authority('web-call',input.work,{tool:'web_search',requestKey:search}),/uncertain/)
  assert.throws(()=>f.r.authority('web-read',input.work,{requestKey:search,page:{url:'https://found.example.net/x',finalUrl:'https://found.example.net/x',status:200}}),/Unknown or completed/)
  const read=key();f.r.authority('web-call',input.work,{tool:'web_fetch',requestKey:read})
  f.r.authority('web-read',input.work,{requestKey:read,page:{url:'https://read.example.net/article#top',finalUrl:'https://read.example.net/article',status:200,title:'A read page'}})
  assert.throws(()=>f.r.authority('web-read',input.work,{requestKey:read,page:{url:'https://other.example.net/',finalUrl:'https://other.example.net/',status:200}}),/Unknown or completed/)
  const missing=key();f.r.authority('web-call',input.work,{tool:'web_fetch',requestKey:missing});f.r.authority('web-read',input.work,{requestKey:missing,page:{url:'https://gone.example.net/',finalUrl:'https://gone.example.net/',status:404}})
  return {text:`Menurut Wiki ETNOS (${wiki.results[0].url}), sungai ini penting. Dari web: https://read.example.net/article. Lainnya https://found.example.net/x dan https://invented.example.net/fake serta https://gone.example.net/.`,model:'synthetic',questionReceipt:receipt(input)}
 })
 try{const {job}=f.ask(),result=await f.r.run(job);assert.equal(result.state,'succeeded',JSON.stringify(result))
  const reply=f.s.get<{text:string}>('SELECT text FROM posts WHERE author_id=?',f.a.agent_id)!.text,wikiUrl=f.s.base+'/wiki/'+f.page.id
  assert.ok(reply.includes('Menurut Wiki ETNOS ('+wikiUrl+')'));assert.ok(reply.includes('Dari web: https://read.example.net/article.'))
  for(const removed of ['found.example.net','invented.example.net','gone.example.net'])assert.equal(reply.includes(removed),false,removed)
  assert.match(reply,/Sumber:\nhttps:\/\/source\.example\.org\/report/);assert.ok(reply.includes('Wiki ETNOS (sudah ditinjau):\n'+wikiUrl));assert.ok(reply.includes('Dari web (belum ditinjau ETNOS):\nhttps://read.example.net/article'))
 }finally{f.s.close()}
})

test('web tools are thread-reply only and bounded per job; citations from another job do not carry over',async()=>{
 let editorialRefused=false;const f=await fixture((input,f)=>{
  if(input.skill!=='thread-reply'){assert.throws(()=>f.r.authority('web-call',input.work,{tool:'web_search',requestKey:key()}),/only available for thread replies/);editorialRefused=true;return {text:'Digest.',model:'synthetic'}}
  if(input.question!.text.includes('first')){const k=key();f.r.authority('web-call',input.work,{tool:'web_fetch',requestKey:k});f.r.authority('web-read',input.work,{requestKey:k,page:{url:'https://first.example.net/',finalUrl:'https://first.example.net/',status:200}});return {text:'First https://first.example.net/',model:'synthetic',questionReceipt:receipt(input)}}
  // Four page reads per job, six tool calls in total (Wiki search included).
  for(let i=0;i<4;i++)f.r.authority('web-call',input.work,{tool:'web_fetch',requestKey:key()})
  assert.throws(()=>f.r.authority('web-call',input.work,{tool:'web_fetch',requestKey:key()}),/tool budget/)
  for(let i=0;i<2;i++)f.r.authority('web-call',input.work,{tool:'web_search',requestKey:key()})
  assert.throws(()=>f.r.authority('web-call',input.work,{tool:'web_search',requestKey:key()}),/tool budget/)
  assert.throws(()=>f.r.authority('wiki-search',input.work,{query:'Digul'}),/tool budget/)
  assert.throws(()=>f.r.authority('web-call',input.work,{tool:'shell',requestKey:key()}),/Unknown resident tool|tool budget/)
  return {text:'Second https://first.example.net/',model:'synthetic',questionReceipt:receipt(input)}
 })
 try{
  const digest=f.r.enqueue(f.owner.actor.id,f.room.id,'source-digest',randomUUID());assert.equal((await f.r.run(digest.id)).state,'succeeded');assert.equal(editorialRefused,true)
  const first=f.ask('@aksara first question about Digul');assert.equal((await f.r.run(first.job)).state,'succeeded')
  const second=f.ask('@aksara second question about Digul');assert.equal((await f.r.run(second.job)).state,'succeeded')
  const texts=f.s.all<{text:string;parent_id:string}>('SELECT text,parent_id FROM posts WHERE author_id=?',f.a.agent_id)
  assert.match(texts.find(t=>t.parent_id===first.post.id)!.text,/First https:\/\/first\.example\.net\//)
  assert.equal(texts.find(t=>t.parent_id===second.post.id)!.text.includes('first.example.net'),false)
 }finally{f.s.close()}
})
