import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Miniflare,convertV4MiniflareOptions} from 'miniflare'
import {Strata} from '../../../src/store.ts'
import {AgentAccess} from '../../../src/agent-access.ts'
import {Wiki} from '../../../src/wiki.ts'
import {Resident} from '../../../src/resident.ts'
import {piResidentProvider} from '../../../src/resident-provider.ts'
import {Discovery,sourceFetcher} from '../../../src/discovery.ts'
test('actual workerd Pi Lifecycle, SQLite storage, named entrypoint and current Strata inference authority',async()=>{
 const s=new Strata(':memory:','https://pi-runtime.example.org'),owner=s.provision('did:web:workerd-pi.example','Synthetic Pi operator'),room=s.createCommunity(owner.actor.id,'Workerd resident','Fixture','public',true,'open'),access=new AgentAccess(s),agent=access.enroll(owner.actor.id,{name:'Test Pi Aksara',communityId:room.id,role:'steward',family:'aksara'});access.admit(owner.actor.id,agent.agent_id)
 let resident,calls=0,maxInputBytes=0;const prompts=[];const mf=new Miniflare(convertV4MiniflareOptions({workers:[
  {name:'caller',modules:true,compatibilityDate:'2026-10-23',script:`export default {fetch(request,env){return env.RUNTIME.fetch(request)}}`,serviceBindings:{RUNTIME:{name:'runtime',entrypoint:'ResidentRuntime'}}},
  {name:'runtime',modules:true,scriptPath:'dist/worker.js',compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],durableObjects:{SESSIONS:{className:'PiResidentSession',useSQLite:true}},serviceBindings:{
   AUTHORITY:async request=>{const b=await request.json();try{const path=new URL(request.url).pathname;return Response.json(path==='/inference'?resident.authorizeInference(b.work,b.requestKey):path==='/context'?resident.runtimeContext(b.work):(resident.validateRuntime(b.work),{valid:true}))}catch{return Response.json({error:'refused'},{status:403})}},
   MODEL_GATEWAY:async request=>{calls++;const b=await request.json();prompts.push(JSON.stringify(b));assert.equal(JSON.stringify(b).includes('ticket'),false);return Response.json({model:'synthetic-configured-route',choices:[{message:{role:'assistant',content:'A bounded source-linked finding from native Pi.'},finish_reason:'stop'}],usage:{prompt_tokens:20,completion_tokens:12}})}
  }}
 ]}))
 try{
  const caller=await mf.getWorker('caller'),runtime=await mf.getWorker('runtime');assert.equal((await runtime.fetch('https://runtime.internal/draft',{method:'POST',body:'{}'})).status,404)
  resident=new Resident(s,access,piResidentProvider({fetch:async request=>{maxInputBytes=Math.max(maxInputBytes,(await request.clone().arrayBuffer()).byteLength);return caller.fetch(request)}}))
  const posting=s.mandate(owner.actor.id,agent.agent_id,room.id,'Public digest',Date.now()+3600000),editorial=new Wiki(s).grant(owner.actor.id,agent.agent_id,room.id,'Working knowledge',Date.now()+3600000)
  const d=new Discovery(s,sourceFetcher(['https://news.example.org'],async()=>new Response('<rss><channel>'+Array.from({length:5},(_,i)=>'<item><title>'+('河'.repeat(240))+'</title><link>https://news.example.org/'+('reference'.repeat(125))+i+'</link><description>'+('河'.repeat(600))+'</description></item>').join('')+'</channel></rss>',{headers:{'content-type':'application/rss+xml'}}))),source=d.add(owner.actor.id,{communityId:room.id,title:'Synthetic source',url:'https://news.example.org/rss',mode:'news',rights:'excerpt-permitted',requestKey:randomUUID()});await d.refresh(owner.actor.id,source.id)
  resident.configure(owner.actor.id,{communityId:room.id,agentId:agent.agent_id,postingMandateId:posting,editorialMandateId:editorial.id,enabled:true,requestKey:randomUUID()})
  const job=resident.enqueue(owner.actor.id,room.id,'source-digest',randomUUID()),result=await resident.run(job.id)
  assert.equal(result.state,'succeeded',JSON.stringify(result));assert.equal(calls,1);assert.equal(s.feed().length,1);assert.match(s.feed()[0].text,/native Pi/)
  resident.configure(owner.actor.id,{communityId:room.id,agentId:agent.agent_id,postingMandateId:posting,editorialMandateId:editorial.id,enabled:true,mentionsEnabled:true,revision:1,requestKey:randomUUID()})
  let parent;for(let i=0;i<3;i++)parent=s.createPost(owner.actor.id,room.id,'河'.repeat(700),parent?.id)
  const choice=resident.routing.choices(owner.actor.id,room.id)[0],question=resident.createMentionPost(owner.actor.id,{communityId:room.id,text:'What does this source tell us about the river? '+('河'.repeat(3900)),parentId:parent.id,requestKey:randomUUID(),agentMention:{actorId:agent.agent_id,choiceKey:choice.choiceKey}}),questionJob=s.get('SELECT job_id FROM resident_job_inputs WHERE target_post_id=?',question.id).job_id,answer=await resident.run(questionJob)
  assert.equal(answer.state,'succeeded',JSON.stringify(answer));assert.equal(calls,2);assert.ok(maxInputBytes>32768&&maxInputBytes<=65536,'bounded non-Latin question/context/evidence survives transport');assert.match(prompts[1],/What does this source tell us about the river/);assert.equal(s.get('SELECT parent_id FROM posts WHERE id=?',answer.resultId).parent_id,question.id);assert.equal(resident.questions.statuses(question.id)[0].state,'answered')
  const denied=await caller.fetch('https://runtime.internal/draft',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({work:{ticket:'x'.repeat(43),jobId:job.id,generation:1,communityId:room.id,agentId:agent.agent_id,contextEpoch:0,sessionKey:'source-digest'},community:'Anything',language:'id',evidence:[]})});assert.equal(denied.status,503);assert.equal(calls,2)
 }finally{await mf.dispose();s.close()}
})
