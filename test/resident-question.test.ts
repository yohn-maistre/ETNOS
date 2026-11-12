import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Strata,LocalDatabase} from '../src/store.ts'
import {migrations,migrate,schemaVersion} from '../src/schema.ts'
import {Resident,type ResidentInput,type ResidentOutput,type ResidentProvider} from '../src/resident.ts'
import {AgentAccess} from '../src/agent-access.ts'
import {Discovery,sourceFetcher} from '../src/discovery.ts'
import {Forum} from '../src/forum.ts'
import {api} from '../src/api.ts'
import {Media} from '../src/media.ts'
import {image} from './media-fixture.ts'
async function fixture(provider?:ResidentProvider){
 const s=new Strata(':memory:','https://commons.example.org'),owner=s.provision('did:web:question-owner.example','Synthetic operator'),person=s.provision('did:web:question-person.example','Synthetic neighbor'),room=s.createCommunity(owner.actor.id,'Public questions','Synthetic','public',true,'open'),hidden=s.createCommunity(owner.actor.id,'Protected questions','Synthetic','hidden-private',true),access=new AgentAccess(s,{stewardDid:owner.actor.did}),r=new Resident(s,access,provider),a=access.enroll(owner.actor.id,{communityId:room.id,name:'Synthetic Aksara',role:'steward',family:'aksara'});access.admit(owner.actor.id,a.agent_id);s.join(person.actor.id,room.id)
 const grant=s.mandate(owner.actor.id,a.agent_id,room.id,'Public conversation',s.clock()+86400000);r.configure(owner.actor.id,{communityId:room.id,agentId:a.agent_id,postingMandateId:grant,enabled:true,mentionsEnabled:true,dailyLimit:5,requestKey:randomUUID()})
 const d=new Discovery(s,sourceFetcher(['https://source.example.org'],async()=>new Response('<rss><channel><item><title>Public reference</title><link>https://source.example.org/report</link><description>A permitted public excerpt for this synthetic question.</description></item></channel></rss>',{headers:{'content-type':'application/rss+xml'}}))),source=d.add(owner.actor.id,{communityId:room.id,title:'Synthetic reference',url:'https://source.example.org/rss',rights:'excerpt-permitted',mode:'review',requestKey:randomUUID()});await d.refresh(owner.actor.id,source.id);const item=d.items(owner.actor.id,room.id,true)[0];d.decide(owner.actor.id,item.id,{state:'published',revision:item.revision,requestKey:randomUUID()})
 const choice=r.routing.choices(person.actor.id,room.id)[0],handler=api(s,{agentAccess:access,residentProvider:provider}),body=(text='@aksara Can you explain this source?')=>({communityId:room.id,text,requestKey:randomUUID(),agentMention:{actorId:choice.actor.id,choiceKey:choice.choiceKey}}),call=(path:string,payload?:unknown,token:string|null=person.token)=>handler(new Request(s.base+path,{method:payload?'POST':'GET',headers:{...(payload?{'content-type':'application/json',origin:s.base}:{}),...(token?{authorization:'Bearer '+token}:{})},...(payload?{body:JSON.stringify(payload)}:{})}))
 return {s,owner,person,room,hidden,access,r,a,d,source,body,call,grant}
}
function answer(input:ResidentInput):ResidentOutput{return {text:'Synthetic source-backed answer. https://unapproved.example.net/not-a-citation',model:'synthetic:question',questionReceipt:input.question?{postId:input.question.postId,revision:input.question.revision}:undefined}}
test('schema 26 resident jobs and inference foreign keys survive additive question migration with honest budget backfill',()=>{
 const db=new LocalDatabase();try{
  db.exec('CREATE TABLE strata_migrations(version INTEGER PRIMARY KEY)')
  for(let i=0;i<26;i++){db.exec(migrations[i]);db.run('INSERT INTO strata_migrations VALUES(?)',i+1)}
  db.run("INSERT INTO actors(id,did,name,kind) VALUES('owner','did:web:migration-owner.example','Synthetic owner','human')");db.run("INSERT INTO actors(id,did,name,kind,operator_id) VALUES('agent','did:web:migration-agent.example','Synthetic agent','agent','owner')");db.run("INSERT INTO communities(id,title,description,visibility) VALUES('home','Synthetic home','Synthetic','public')")
  for(const [id,model] of [['hosted','pi:old'],['index','model-free:source-index'],['queued',null]])db.run("INSERT INTO resident_jobs(id,community_id,agent_id,operator_id,config_revision,skill,request_key,state,generation,checkpoint,evidence,created,updated,model) VALUES(?,'home','agent','owner',1,'source-digest',?,'queued',0,'queued','[]',1,1,?)",id,id,model)
  db.run("INSERT INTO resident_inference_calls VALUES('receipt','hosted',1,'once',1,'reserved')")
  migrate(db);assert.equal(db.get<{n:number}>('SELECT MAX(version) n FROM strata_migrations')!.n,schemaVersion);assert.deepEqual(db.all<{id:string;inference_started:number;work_kind:string}>('SELECT id,inference_started,work_kind FROM resident_jobs ORDER BY id').map(r=>[r.id,r.inference_started,r.work_kind]),[['hosted',1,'editorial'],['index',0,'editorial'],['queued',0,'editorial']]);assert.equal(db.all('PRAGMA foreign_key_check').length,0);assert.equal(db.get<{n:number}>('SELECT count(*) n FROM resident_inference_calls')!.n,1)
  assert.throws(()=>db.run("DELETE FROM resident_jobs WHERE id='hosted'"),/FOREIGN KEY/);assert.throws(()=>db.run("UPDATE resident_jobs SET skill='thread-reply' WHERE id='queued'"),/CHECK/)
 }finally{db.close()}
})
test('an explicitly resolved mention commits one question/job and produces one actual sourced child reply; literal strings do not trigger',async()=>{
 let calls=0,received:ResidentInput|undefined;const f=await fixture({label:'synthetic:question',draft:async input=>{calls++;received=input;return answer(input)}})
 try{const root=f.s.createPost(f.owner.actor.id,f.room.id,'Synthetic parent context'),body={...f.body(),parentId:root.id},response=await f.call('/v1/posts',body);assert.equal(response.status,200);const question=await response.json() as {id:string};assert.equal((await f.call('/v1/posts',body)).status,200);assert.equal(f.s.all('SELECT * FROM resident_jobs').length,1)
  const job=f.s.get<{job_id:string}>('SELECT job_id FROM resident_job_inputs WHERE target_post_id=?',question.id)!.job_id;assert.equal(f.r.job(f.owner.actor.id,job).skill,'thread-reply');assert.equal((await f.r.run(job)).state,'succeeded');assert.equal(calls,1);assert.equal(received!.skill,'thread-reply');assert.equal(received!.question!.postId,question.id);assert.equal(received!.question!.context[0].text,'Synthetic parent context');assert.equal(received!.work.sessionKey,question.id)
  const reply=f.s.get<{id:string;parent_id:string;text:string;author_id:string}>('SELECT id,parent_id,text,author_id FROM posts WHERE author_id=?',f.a.agent_id)!;assert.equal(reply.parent_id,question.id);assert.match(reply.text,/https:\/\/source.example.org\/report/);assert.doesNotMatch(reply.text,/unapproved.example/)
  assert.equal((await f.call('/v1/posts',body)).status,200);assert.equal(calls,1);assert.equal((await f.call('/v1/posts',{...body,agentMention:{...body.agentMention,choiceKey:'0'.repeat(64)}})).status,409)
  const statuses=await (await f.call('/v1/resident/requests?post='+root.id,undefined,null)).json() as object[];assert.deepEqual(statuses,[{postId:question.id,agentId:f.a.agent_id,state:'answered',replyId:reply.id}]);assert.doesNotMatch(JSON.stringify(statuses),/runtime_ticket|posting_mandate|snapshot|operator_id/)
  const literal=f.body('A quoted @aksara is ordinary text.');delete (literal as Partial<typeof literal>).agentMention;assert.equal((await f.call('/v1/posts',literal)).status,200);assert.equal(f.s.all('SELECT * FROM resident_jobs').length,1)
  await assert.rejects(f.r.run(job),/not queued/)
 }finally{f.s.close()}
})
test('invalid private, warning, agent and stale-choice requests cannot leave a post or job behind',async()=>{
 const f=await fixture();try{
  const n=f.s.all('SELECT id FROM posts').length
  for(const body of [{...f.body(),communityId:f.hidden.id},{...f.body(),content:{warning:'Do not send to an assistant'}},{...f.body(),agentMention:{actorId:f.a.agent_id,choiceKey:'0'.repeat(64)}}]){const response=await f.call('/v1/posts',body);assert.ok(response.status>=400);assert.equal(f.s.all('SELECT id FROM posts').length,n);assert.equal(f.s.all('SELECT id FROM resident_jobs').length,0)}
  assert.equal((await f.call('/v1/resident/choices?community='+f.hidden.id,undefined,f.owner.token)).status,404)
  assert.throws(()=>f.r.createMentionPost(f.a.agent_id,f.body()),/human/i)
  const pending=f.r.createMentionPost(f.person.actor.id,f.body()),sameAgent=f.body('A second question while this identity is busy');assert.equal((await f.call('/v1/posts',sameAgent)).status,409);assert.equal(f.s.all('SELECT id FROM posts').length,n+1);assert.ok(pending.id)
 }finally{f.s.close()}
})
test('question edits, requester removal, source withdrawal and destination shutdown fence an in-flight reply',async()=>{
 for(const change of ['edit','requester','source','automation','grant','agent','parent'] as const){
  let finish!:(value:ResidentOutput)=>void,started!:(input:ResidentInput)=>void;const entered=new Promise<ResidentInput>(resolve=>started=resolve),f=await fixture({label:'synthetic:delayed-question',draft:async input=>{started(input);return new Promise(resolve=>finish=resolve)}})
  try{const parent=change==='parent'?f.s.createPost(f.owner.actor.id,f.room.id,'Earlier public context'):null,p=f.r.createMentionPost(f.person.actor.id,{...f.body(),...(parent?{parentId:parent.id}:{})}),id=f.s.get<{job_id:string}>('SELECT job_id FROM resident_job_inputs WHERE target_post_id=?',p.id)!.job_id,run=f.r.run(id),input=await entered
   if(change==='edit')new Forum(f.s).edit(f.person.actor.id,p.id,{revision:1,text:'A changed question',content:{}})
   if(change==='requester')f.s.setMember(f.owner.actor.id,f.room.id,f.person.actor.id,false)
   if(change==='source')f.d.state(f.owner.actor.id,f.source.id,{revision:1,state:'withdrawn',requestKey:randomUUID()})
   if(change==='automation')f.s.run('UPDATE communities SET automation=0 WHERE id=?',f.room.id)
   if(change==='grant')f.s.revokeMandate(f.owner.actor.id,f.grant)
   if(change==='agent')f.access.suspend(f.owner.actor.id,f.a.agent_id)
   if(change==='parent')new Forum(f.s).edit(f.owner.actor.id,parent!.id,{revision:1,text:'Changed public context',content:{}})
   finish(answer(input));await run;assert.equal(f.r.job(f.owner.actor.id,id).state,'abstained',change);assert.equal(f.s.all('SELECT id FROM posts WHERE author_id=?',f.a.agent_id).length,0,change)
  }finally{f.s.close()}
 }
})
test('per-person question limits roll back a fourth post and model-free source replies do not consume inference budget',async()=>{
 const f=await fixture();try{
  for(let i=0;i<3;i++){const question=f.r.createMentionPost(f.person.actor.id,f.body('A synthetic public question '+i)),id=f.s.get<{job_id:string}>('SELECT job_id FROM resident_job_inputs WHERE target_post_id=?',question.id)!.job_id;assert.equal((await f.r.run(id)).state,'succeeded');const status=f.r.questions.statuses(question.id)[0];assert.equal(status.state,'answered');f.s.hidePost(f.owner.actor.id,status.replyId!);assert.deepEqual(f.r.questions.statuses(question.id)[0],{postId:question.id,agentId:f.a.agent_id,state:'unavailable',replyId:null})}
  const before=f.s.all('SELECT id FROM posts').length;assert.throws(()=>f.r.createMentionPost(f.person.actor.id,f.body('A fourth question')),/tiga pertanyaan/);assert.equal(f.s.all('SELECT id FROM posts').length,before);assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM resident_jobs WHERE inference_started=1')!.n,0)
 }finally{f.s.close()}
})
test('a recently attempted model job consumes budget even when it was queued more than a day ago',async()=>{
 let calls=0;const f=await fixture({label:'synthetic-budget',draft:async input=>{calls++;return answer(input)}})
 try{const q=f.r.createMentionPost(f.person.actor.id,f.body()),id=f.s.get<{job_id:string}>('SELECT job_id FROM resident_job_inputs WHERE target_post_id=?',q.id)!.job_id
  for(let i=0;i<10;i++)f.s.run("INSERT INTO resident_jobs(id,community_id,agent_id,operator_id,config_revision,skill,request_key,state,generation,checkpoint,evidence,created,updated,model,inference_started,inference_started_at) VALUES(?,?,?,?,1,'source-digest',?,'failed',1,'stopped','[]',?,?,'synthetic-prior',1,?)",randomUUID(),f.room.id,f.a.agent_id,f.owner.actor.id,randomUUID(),f.s.clock()-2*86400000,f.s.clock(),f.s.clock())
  const result=await f.r.run(id);assert.equal(result.state,'abstained');assert.equal(calls,0);assert.equal(f.s.all('SELECT id FROM posts WHERE author_id=?',f.a.agent_id).length,0)
 }finally{f.s.close()}
})
test('an old runtime without a question receipt cannot publish an apparently successful answer',async()=>{
 const f=await fixture({label:'synthetic:old-runtime',draft:async()=>({text:'Not actually given the question',model:'synthetic:old-runtime'})});try{const p=f.r.createMentionPost(f.person.actor.id,f.body()),id=f.s.get<{job_id:string}>('SELECT job_id FROM resident_job_inputs WHERE target_post_id=?',p.id)!.job_id;assert.equal((await f.r.run(id)).state,'abstained');assert.equal(f.s.all('SELECT id FROM posts WHERE author_id=?',f.a.agent_id).length,0)}finally{f.s.close()}
})

test('late question-input failure rolls back post, receipt and image attachment, with a safe exact retry',async()=>{
 const f=await fixture();try{const media=new Media(f.s),draft=media.upload(f.person.actor.id,f.room.id,image,'Synthetic question image'),body={...f.body(),mediaIds:[draft.id]}
  f.s.db.exec("CREATE TRIGGER synthetic_question_failure BEFORE INSERT ON resident_job_inputs BEGIN SELECT RAISE(ABORT,'Synthetic late failure'); END")
  assert.equal((await f.call('/v1/posts',body)).status,500);assert.equal(f.s.all('SELECT id FROM posts').length,0);assert.equal(f.s.all('SELECT id FROM resident_jobs').length,0);assert.equal(f.s.all('SELECT * FROM post_requests').length,0);assert.equal(f.s.get<{post_id:string|null}>('SELECT post_id FROM media WHERE id=?',draft.id)!.post_id,null);assert.throws(()=>media.response(undefined,draft.id),/Not found/)
  f.s.db.exec('DROP TRIGGER synthetic_question_failure');assert.equal((await f.call('/v1/posts',body)).status,200);assert.equal((await f.call('/v1/posts',body)).status,200);assert.equal(f.s.all('SELECT id FROM posts').length,1);assert.equal(f.s.all('SELECT id FROM resident_jobs').length,1)
 }finally{f.s.close()}
})
test('one real sitewide identity can answer in an explicitly admitted destination using approved home references',async()=>{
 let received:ResidentInput|undefined;const f=await fixture({label:'synthetic:sitewide',draft:async input=>{received=input;assert.throws(()=>f.r.validateRuntime({...input.work,sessionKey:'another-thread'}),/Stale/);return answer(input)}})
 try{const target=f.s.createCommunity(f.owner.actor.id,'Another public destination','Synthetic','public',true,'open');f.s.join(f.person.actor.id,target.id);f.s.setMember(f.owner.actor.id,target.id,f.a.agent_id,true)
  f.r.routing.setGlobal(f.owner.actor.id,{agentId:f.a.agent_id,homeCommunityId:f.room.id,coverage:[f.room.id],enabled:true,revision:0,requestKey:randomUUID()})
  f.r.routing.setDestination(f.owner.actor.id,{agentId:f.a.agent_id,communityId:target.id,issueGrant:true,durationHours:1,hourlyLimit:2,enabled:true,revision:0,requestKey:randomUUID()})
  const choice=f.r.routing.choices(f.person.actor.id,target.id)[0];assert.equal(choice.scope,'sitewide');assert.equal(choice.available,true)
  const p=f.r.createMentionPost(f.person.actor.id,{...f.body(),communityId:target.id,agentMention:{actorId:choice.actor.id,choiceKey:choice.choiceKey}}),id=f.s.get<{job_id:string}>('SELECT job_id FROM resident_job_inputs WHERE target_post_id=?',p.id)!.job_id
  assert.equal((await f.r.run(id)).state,'succeeded');assert.equal(received!.community,target.title);assert.equal(received!.work.communityId,target.id);assert.equal(received!.evidence[0].title,'Public reference');assert.equal(f.s.get<{parent_id:string;community_id:string}>('SELECT parent_id,community_id FROM posts WHERE author_id=?',f.a.agent_id)!.parent_id,p.id)
  f.r.routing.setDestination(f.owner.actor.id,{agentId:f.a.agent_id,communityId:target.id,enabled:false,revision:1,requestKey:randomUUID()});assert.equal(f.r.routing.choices(f.person.actor.id,target.id)[0].available,false)
 }finally{f.s.close()}
})
