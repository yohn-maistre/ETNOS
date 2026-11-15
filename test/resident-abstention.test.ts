import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Strata} from '../src/store.ts'
import {Resident,residentAbstentionText,type ResidentInput,type ResidentProvider} from '../src/resident.ts'
import {ResidentFailure} from '../src/resident-failure.ts'
import {AgentAccess} from '../src/agent-access.ts'
import {Forum} from '../src/forum.ts'
import {api} from '../src/api.ts'

const asked='@Aksara Bisa ceritakan soal salib merah di Merauke? Kalau tidak tau, bikin pantun tentang hubungan manusia Papua dengan tanah, laut, langit, api.'
/** A public room with a mention-enabled resident and no configured sources. */
function fixture(provider?:ResidentProvider,hourlyLimit=5){
 const s=new Strata(':memory:','https://abstain.example.org'),owner=s.provision('did:web:abstain-owner.example','Synthetic operator'),person=s.provision('did:web:abstain-person.example','Synthetic neighbor'),room=s.createCommunity(owner.actor.id,'Public questions','Synthetic','public',true,'open'),access=new AgentAccess(s,{stewardDid:owner.actor.did}),r=new Resident(s,access,provider),a=access.enroll(owner.actor.id,{communityId:room.id,name:'Synthetic Aksara',role:'steward',family:'aksara'});access.admit(owner.actor.id,a.agent_id);s.join(person.actor.id,room.id)
 const grant=s.mandate(owner.actor.id,a.agent_id,room.id,'Public conversation',s.clock()+86400000,hourlyLimit);r.configure(owner.actor.id,{communityId:room.id,agentId:a.agent_id,postingMandateId:grant,enabled:true,mentionsEnabled:true,dailyLimit:5,requestKey:randomUUID()})
 const choice=r.routing.choices(person.actor.id,room.id)[0],body=(text=asked)=>({communityId:room.id,text,requestKey:randomUUID(),agentMention:{actorId:choice.actor.id,choiceKey:choice.choiceKey}})
 const ask=(payload=body())=>{const post=r.createMentionPost(person.actor.id,payload);return {post,job:s.get<{job_id:string}>('SELECT job_id FROM resident_job_inputs WHERE target_post_id=?',post.id)!.job_id}}
 const replies=()=>s.all<{id:string;parent_id:string;text:string}>('SELECT id,parent_id,text FROM posts WHERE author_id=?',a.agent_id)
 return {s,owner,person,room,access,r,a,grant,body,ask,replies}
}
function gated(){
 let release!:()=>void,started!:(input:ResidentInput)=>void
 const gate=new Promise<void>(resolve=>release=resolve),entered=new Promise<ResidentInput>(resolve=>started=resolve)
 const provider:ResidentProvider={label:'synthetic:gated-abstain',researchTools:true,draft:async input=>{started(input);await gate;throw new ResidentFailure('runtime-abstained')}}
 return {provider,release:()=>release(),entered}
}

test('a thread question with no current source gets one fixed, labelled abstention reply that never quotes the question',async()=>{
 const f=fixture();try{
  const payload=f.body(),{post,job}=f.ask(payload)
  const result=await f.r.run(job);assert.equal(result.state,'abstained',JSON.stringify(result))
  const replies=f.replies();assert.equal(replies.length,1);assert.equal(replies[0].parent_id,post.id);assert.equal(replies[0].text,residentAbstentionText)
  for(const quoted of ['salib','Merauke','pantun','tanah, laut',asked.slice(0,30)])assert.equal(replies[0].text.includes(quoted),false,quoted)
  const view=f.r.job(f.owner.actor.id,job);assert.equal(view.state,'abstained');assert.equal(view.result_kind,'abstention-reply');assert.equal(view.result_id,replies[0].id);assert.match(view.error??'',/No current public source evidence/)
  assert.deepEqual(f.r.questions.statuses(post.id),[{postId:post.id,agentId:f.a.agent_id,state:'answered',replyId:replies[0].id}])
  // Replay: the job, the scheduler and the exact request cannot publish another note.
  await assert.rejects(f.r.run(job),/not queued/);f.r.recover();await f.r.tick()
  const handler=api(f.s,{agentAccess:f.access}),repost=await handler(new Request(f.s.base+'/v1/posts',{method:'POST',headers:{'content-type':'application/json',origin:f.s.base,authorization:'Bearer '+f.person.token},body:JSON.stringify(payload)}))
  assert.equal(repost.status,200);assert.equal(f.s.all('SELECT id FROM resident_jobs').length,1);assert.equal(f.replies().length,1)
 }finally{f.s.close()}
})

test('a model ABSTAIN (failure code or bare text) publishes exactly one note even when runs race',async()=>{
 for(const mode of ['failure','text'] as const){
  let calls=0;const f=fixture({label:'synthetic:abstain-'+mode,researchTools:true,draft:async input=>{calls++;assert.equal(input.evidence.length,0);if(mode==='failure')throw new ResidentFailure('runtime-abstained');return {text:' ABSTAIN ',model:'synthetic',questionReceipt:{postId:input.question!.postId,revision:input.question!.revision}}}})
  try{const {job}=f.ask(),outcomes=await Promise.allSettled([f.r.run(job),f.r.run(job)])
   assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1,mode);assert.equal(calls,1,mode)
   const done=outcomes.find(o=>o.status==='fulfilled') as PromiseFulfilledResult<{state:string}>;assert.equal(done.value.state,'abstained')
   assert.equal(f.replies().length,1,mode);assert.equal(f.replies()[0].text,residentAbstentionText);assert.equal(f.r.job(f.owner.actor.id,job).error,'resident:runtime-abstained')
   await assert.rejects(f.r.run(job),/not queued/);assert.equal(f.replies().length,1)
  }finally{f.s.close()}
 }
})

test('revoked mandate, exhausted posting budget, locked thread or warning content leaves today\'s silent abstention',async()=>{
 for(const change of ['none','revoke','budget','lock','warning','suspend'] as const){
  const g=gated(),f=fixture(g.provider,change==='budget'?2:5)
  try{const {post,job}=f.ask(),run=f.r.run(job);await g.entered
   if(change==='revoke')f.s.revokeMandate(f.owner.actor.id,f.grant)
   if(change==='budget')for(let i=0;i<2;i++)f.s.createPost(f.a.agent_id,f.room.id,'Earlier labelled resident note '+i,undefined,f.grant)
   if(change==='lock')new Forum(f.s).moderate(f.owner.actor.id,post.id,{action:'lock',reason:'Synthetic moderation'})
   if(change==='warning')f.s.run('UPDATE posts SET content=? WHERE id=?',JSON.stringify({warning:'Sensitive'}),post.id)
   if(change==='suspend')f.access.suspend(f.owner.actor.id,f.a.agent_id)
   const before=f.replies().length;g.release();const result=await run
   assert.equal(result.state,'abstained',change)
   // Control: the same gated abstention publishes its note when nothing changed.
   if(change==='none'){assert.equal(f.replies().length,before+1);assert.equal(f.r.job(f.owner.actor.id,job).result_kind,'abstention-reply');continue}
   assert.equal(f.replies().length,before,change)
   const view=f.r.job(f.owner.actor.id,job);assert.equal(view.result_kind,null,change);assert.equal(view.result_id,null,change)
   assert.equal(f.r.questions.statuses(post.id)[0].state,'unavailable',change)
  }finally{f.s.close()}
 }
})

test('a revoked mandate before the claim publishes nothing and a scheduler sweep records the abstention',async()=>{
 const f=fixture();try{const {job}=f.ask();f.s.revokeMandate(f.owner.actor.id,f.grant)
  await assert.rejects(f.r.run(job));await f.r.tick();assert.equal(f.r.job(f.owner.actor.id,job).state,'abstained');assert.equal(f.replies().length,0)
 }finally{f.s.close()}
})

test('only the operator learns why a question got no reply, as a fixed code',async()=>{
 const provider:ResidentProvider={label:'synthetic:gateway-down',researchTools:true,draft:async()=>{throw new ResidentFailure('gateway-unconfigured')}}
 const f=fixture(provider);try{
  const {post,job}=f.ask()
  await f.r.run(job).catch(()=>{})
  const forOperator=f.r.questions.statuses(post.id,f.owner.actor.id),forMember=f.r.questions.statuses(post.id,f.person.actor.id),forVisitor=f.r.questions.statuses(post.id)
  assert.equal(forOperator[0].state,'unavailable')
  assert.equal(forOperator[0].reason,'gateway-unconfigured')
  assert.equal('reason' in forMember[0],false)
  assert.equal('reason' in forVisitor[0],false)
  assert.equal(JSON.stringify(forOperator).includes('resident:'),false)
 }finally{f.s.close()}
})
