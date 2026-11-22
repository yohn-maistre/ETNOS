import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createModels} from '@earendil-works/pi-ai/models'
import {Harness,MemoryStorage,AssistantEntry} from '@earendil-works/pi-durable'
import {BACKGROUND_CONTEXT as context} from '@earendil-works/chord/context'
import {Etnos} from '../../../src/store.ts'
import {Resident,type ResidentInput,type ResidentProvider} from '../../../src/resident.ts'
import {AgentAccess} from '../../../src/agent-access.ts'
import {Wiki} from '../../../src/wiki.ts'
import {Discovery,sourceFetcher} from '../../../src/discovery.ts'
import {jobProvider} from '../src/gateway-models.ts'
import {residentRegistry} from '../src/extensions.ts'
function fixture(){const s=new Etnos(':memory:','https://pi.example.org'),owner=s.provision('did:web:pi-owner.example','Synthetic operator'),room=s.createCommunity(owner.actor.id,'Pi room','Test','public',true,'open'),access=new AgentAccess(s),agent=access.enroll(owner.actor.id,{name:'Synthetic Aksara',family:'aksara',role:'steward',communityId:room.id});access.admit(owner.actor.id,agent.agent_id);const posting=s.mandate(owner.actor.id,agent.agent_id,room.id,'Read sources',Date.now()+3600000),editorial=new Wiki(s).grant(owner.actor.id,agent.agent_id,room.id,'Knowledge proposals',Date.now()+3600000);return {s,owner,room,access,agent,posting,editorial}}
async function seeded(f:ReturnType<typeof fixture>){const d=new Discovery(f.s,sourceFetcher(['https://news.example.org'],async()=>new Response('<rss version="2.0"><channel><item><title>Permitted public source</title><link>https://news.example.org/story</link><description>Contact reader@example.org for context. No private records are included.</description></item></channel></rss>',{headers:{'content-type':'application/rss+xml'}})));const src=d.add(f.owner.actor.id,{communityId:f.room.id,title:'Synthetic sources',url:'https://news.example.org/rss',mode:'news',rights:'excerpt-permitted',requestKey:randomUUID()});await d.refresh(f.owner.actor.id,src.id)}
for(const delegate of [false,true])test(`native Pi ${delegate?'bounded subagent':'tool'} loop consumes ETNOS grants, minimizes model data and publishes once`,async()=>{
 const f=fixture();let calls=0,r!:Resident,h!:Harness;const payloads:string[]=[]
 const provider:ResidentProvider={label:'pi:test',async draft(input:ResidentInput){
  const port={fetch:async(request:Request)=>{const b=await request.json() as {work:ResidentInput['work'];requestKey:string};try{return Response.json(new URL(request.url).pathname==='/inference'?r.authorizeInference(b.work,b.requestKey):new URL(request.url).pathname==='/context'?r.runtimeContext(b.work):(r.validateRuntime(b.work),{valid:true}))}catch{return Response.json({error:'refused'},{status:403})}}}
  const gateway={fetch:async(request:Request)=>{calls++;payloads.push(await request.text());const tools=calls===1?[{id:'test-tool',type:'function',function:{name:delegate?'research_helper':'read_current_sources',arguments:delegate?JSON.stringify({task:'Compare these sources, retain uncertainty.'}):'{}'}}]:undefined;return Response.json({model:'configured-test-route',choices:[{message:{role:'assistant',content:tools?'':delegate&&calls===2?'A bounded helper finding.':'A source-backed finding for the community.',...(tools?{tool_calls:tools}:{})},finish_reason:tools?'tool_calls':'stop'}],usage:{prompt_tokens:12,completion_tokens:15}})}}
  const models=createModels(),p=jobProvider(input.work,{authority:port,gateway},()=>{});models.setProvider(p)
  h=await Harness.open(new MemoryStorage(),{models,registry:residentRegistry(id=>{assert.equal(id,p.id);return input.work},port),settings:{retry:{enabled:false,maxRetries:0},compaction:{enabled:false},stream:{maxRetries:0},documentRetentionMs:0}},context)
  const root=await h.root(context,{agent:{model:{provider:p.id,modelId:'fast'},maxTurns:3}}),settled=await(await root.submit({type:'input',content:JSON.stringify({evidence:input.evidence})},context)).wait(context)
  assert.equal(settled.status,'done');if(settled.status!=='done'||settled.type!=='input')throw Error('Pi failed')
  const answer=await root.commit(tx=>tx.entry(AssistantEntry,settled.answer),context),body=answer?.model?.flatMap(m=>m.role==='assistant'?m.content.filter(p=>p.type==='text').map(p=>p.text):[]).join('\n')??''
  assert.equal(payloads.every(p=>!p.includes(input.work.ticket)&&!p.includes('reader@example.org')),true)
  await h.close(context);return {text:body,model:'pi:configured-test-route'}
 }}
 try{await seeded(f);r=new Resident(f.s,f.access,provider);r.configure(f.owner.actor.id,{communityId:f.room.id,agentId:f.agent.agent_id,postingMandateId:f.posting,editorialMandateId:f.editorial.id,enabled:true,requestKey:randomUUID()});const job=r.enqueue(f.owner.actor.id,f.room.id,'source-digest',randomUUID()),result=await r.run(job.id);assert.equal(result.state,'succeeded',JSON.stringify(result));assert.equal(calls,delegate?3:2);assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM resident_inference_calls')!.n,calls);assert.equal(f.s.feed().length,1);await assert.rejects(r.run(job.id),/not queued/);assert.equal(f.s.feed().length,1)
 }finally{if(h)await h.close(context).catch(()=>{});f.s.close()}
})
