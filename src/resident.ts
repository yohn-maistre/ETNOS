import {randomUUID,randomBytes,timingSafeEqual} from 'node:crypto'
import {Buffer} from 'node:buffer'
import {StrataCore,Fault} from './core.ts'
import {AgentAccess} from './agent-access.ts'
import {Wiki} from './wiki.ts'
import {Discovery} from './discovery.ts'
import {Knowledge} from './knowledge.ts'
import {Forum} from './forum.ts'
import {Groups} from './groups.ts'
import {ResidentRouting} from './resident-routing.ts'
import {ResidentQuestions} from './resident-question.ts'
import {residentFailureCode} from './resident-failure.ts'
import {text,key,transition,expected,emit,hash,publicSteward,contextEpoch} from './commons.ts'
import type {ResidentSkill,ResidentEvidence,ResidentWork,ResidentInput,ResidentOutput} from './resident-contract.ts'
export type {ResidentSkill,ResidentEvidence,ResidentWork,ResidentInput,ResidentOutput} from './resident-contract.ts'
export type ResidentConfig={community_id:string;agent_id:string;operator_id:string;posting_mandate_id:string|null;editorial_mandate_id:string|null;enabled:number;revision:number;daily_limit:number;interval_minutes:number;next_run:number|null;updated:number;mentions_enabled:number;announce_knowledge:number}
export type ResidentJob={work_kind?:'editorial'|'thread-reply';id:string;community_id:string;agent_id:string;operator_id:string;config_revision:number;skill:ResidentSkill;request_key:string;state:'queued'|'running'|'succeeded'|'abstained'|'failed'|'cancelled';generation:number;lease_until:number|null;checkpoint:string;evidence:string;result_kind:string|null;result_id:string|null;error:string|null;created:number;updated:number;model:string|null;input_tokens:number;output_tokens:number;runtime_ticket_hash:string|null;context_epoch:number;trigger_post_id:string|null;requester_id:string|null}
export function parseResidentWork(value:unknown):ResidentWork{
 if(!value||typeof value!=='object')throw new Fault(400,'Runtime work envelope required')
 const b=value as Record<string,unknown>
 if(!Number.isSafeInteger(b.generation)||Number(b.generation)<1||!Number.isSafeInteger(b.contextEpoch)||Number(b.contextEpoch)<0)throw new Fault(400,'Invalid runtime generation')
 return {jobId:text(b.jobId,100),generation:Number(b.generation),ticket:text(b.ticket,100),communityId:text(b.communityId,100),agentId:text(b.agentId,100),contextEpoch:Number(b.contextEpoch),sessionKey:text(b.sessionKey,100)}
}
export type ResidentProvider={label:string;draft:(input:ResidentInput,signal:AbortSignal)=>Promise<ResidentOutput>}
const skills:ResidentSkill[]=['source-digest','research-question','knowledge-draft']
export class Resident{
 readonly store:StrataCore;readonly access:AgentAccess;readonly provider?:ResidentProvider;readonly routing:ResidentRouting;readonly questions:ResidentQuestions
 constructor(store:StrataCore,access=new AgentAccess(store),provider?:ResidentProvider){this.store=store;this.access=access;this.provider=provider;this.routing=new ResidentRouting(store,access);this.questions=new ResidentQuestions(store,this.routing)}
 /** The public question, scoped work and media/context receipt commit together. */
 createMentionPost(actorId:string,b:Record<string,unknown>,groups=new Groups(this.store)){
  return this.store.tx(()=>{
   const s=this.store;this.access.assertHumanCurrent(actorId)
   if(b.agentMention===undefined)throw new Fault(400,'Choose an Aksara identity')
   const communityId=text(b.communityId,100),room=s.community(communityId)
   if(room.visibility!=='public'||room.publication!=='local')throw new Fault(404,'Not found')
   const post=new Forum(s).create(actorId,b,groups),mention=b.agentMention as {actorId:string;choiceKey:string}
   const prior=s.get<{agent_id:string}>('SELECT j.agent_id FROM resident_job_inputs i JOIN resident_jobs j ON j.id=i.job_id WHERE i.target_post_id=?',post.id)
   if(prior){if(prior.agent_id!==mention.actorId)throw new Fault(409,'This question already addressed another identity');return post}
   const route=this.routing.resolve(mention.actorId,communityId),config=route.config
   if(route.choiceKey!==mention.choiceKey)throw new Fault(409,'Pilihan Aksara berubah. Pilih kembali sebelum mengirim.')
   const question=this.questions.snapshot(actorId,post.id)
   if(s.get<{n:number}>('SELECT count(*) n FROM resident_jobs WHERE requester_id=? AND created>?',actorId,s.clock()-86400000)!.n>=3)throw new Fault(429,'Batas tiga pertanyaan Aksara per orang per hari tercapai.')
   if(s.get<{n:number}>('SELECT count(*) n FROM resident_jobs WHERE agent_id=? AND created>?',config.agent_id,s.clock()-86400000)!.n>=config.daily_limit)throw new Fault(429,'Anggaran tugas Aksara hari ini sudah terpakai. Kirim tanpa meminta balasan atau coba nanti.')
   if(s.get("SELECT 1 FROM resident_jobs WHERE agent_id=? AND state IN ('queued','running')",config.agent_id))throw new Fault(409,'Aksara masih mengerjakan pertanyaan lain. Coba lagi sebentar.')
   const id=randomUUID(),now=s.clock()
   // work_kind is the canonical effect; legacy skill retains persisted CHECK compatibility.
   s.run("INSERT INTO resident_jobs(id,community_id,agent_id,operator_id,config_revision,skill,request_key,state,generation,checkpoint,evidence,created,updated,trigger_post_id,requester_id,work_kind) VALUES(?,?,?,?,?,'source-digest',?,'queued',0,'question-queued','[]',?,?,?,?,'thread-reply')",id,communityId,config.agent_id,config.operator_id,config.revision,hash({actorId,postId:post.id,requestKey:b.requestKey}),now,now,post.id,actorId)
   s.run('INSERT INTO resident_job_inputs VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,config.community_id,post.id,question.revision,hash(question),JSON.stringify(question),route.postingMandateId,route.globalRevision,route.routeRevision,JSON.stringify(route.coverage),now)
   emit(s,actorId,'resident.question',{kind:'agent-job',id,revision:1,communityId})
   return post
  })
 }
 private thread(job:ResidentJob){return job.work_kind==='thread-reply'?this.questions.check(job):undefined}
 private effectiveSkill(job:ResidentJob):ResidentSkill{return job.work_kind==='thread-reply'?'thread-reply':job.skill}
 private config(communityId:string){const c=this.store.get<ResidentConfig>('SELECT * FROM resident_configs WHERE community_id=?',communityId);if(!c)throw new Fault(404,'Resident is not configured');return c}
 private current(c:ResidentConfig,skill?:ResidentSkill){
  const s=this.store;this.routing.assertBase(c)
  if(skill==='knowledge-draft'){new Wiki(s).checkProposalAuthority(c.agent_id,c.community_id,c.editorial_mandate_id??'');if(c.announce_knowledge)s.checkWrite(c.agent_id,c.community_id,c.posting_mandate_id,false)}
  else if(skill)s.checkWrite(c.agent_id,c.community_id,c.posting_mandate_id,false)
 }
 get(actorId:string,communityId:string){publicSteward(this.store,actorId,communityId);const config=this.store.get<ResidentConfig>('SELECT * FROM resident_configs WHERE community_id=?',communityId)??null;let ready=false,reason:string|null=null;if(config)try{this.current(config);ready=true}catch(error){reason=error instanceof Fault?error.message:'Resident unavailable'}return {config,ready,reason,provider:this.provider?.label??'source-linked, model-free',skills}}
 /** Native installation uses the same registration, admission and grant checks
  * as external agents. No deployment key, private source or review authority. */
 setup(actorId:string,b:Record<string,unknown>){
  const communityId=text(b.communityId,100),includeSource=b.includeSource===true,enableAutomation=b.enableAutomation===true
  if(b.consent!==true)throw new Fault(400,'Explicit resident setup consent required')
  return transition(this.store,actorId,b.requestKey,'resident.setup',{communityId,includeSource,enableAutomation},()=>{
   publicSteward(this.store,actorId,communityId)
   if(!this.provider)throw new Fault(503,'The built-in resident runtime is not configured')
   if(enableAutomation&&this.store.requireSteward(actorId,communityId).role!=='owner')throw new Fault(403,'Only the community owner can enable agent participation')
   if(!this.store.community(communityId).automation&&!enableAutomation)throw new Fault(409,'Community owner consent is required to enable agent participation')
  },()=>{
   const s=this.store
   if(s.get('SELECT 1 FROM resident_configs WHERE community_id=?',communityId))throw new Fault(409,'A resident is already configured; manage its current identity and grants')
   if(!s.community(communityId).automation){s.run('UPDATE communities SET automation=1 WHERE id=?',communityId);s.invalidatePublicContext(communityId);s.audit(actorId,'community.automation.enable',communityId)}
   const agent=this.access.enroll(actorId,{communityId,name:'Aksara',family:'aksara',role:'steward'}),expires=s.clock()+86400000
   this.access.admit(actorId,agent.agent_id)
   const posting=this.access.grant(actorId,agent.agent_id,{kind:'posting',purpose:'Built-in resident: source-linked public conversation',expires,hourlyLimit:3}),editorial=this.access.grant(actorId,agent.agent_id,{kind:'editorial',purpose:'Built-in resident: working knowledge proposals; human review remains required',expires,hourlyLimit:3})
   let sourceId:string|null=null
   if(includeSource){
    const d=new Discovery(s),url='https://papua.antaranews.com/rss/terkini.xml',prior=s.get<{id:string}>('SELECT id FROM discovery_sources WHERE community_id=? AND url=? AND state!=?',communityId,url,'withdrawn')
    sourceId=prior?.id??d.add(actorId,{communityId,title:'ANTARA Papua',url,rights:'link-only',mode:'news',kind:'news',requestKey:hash(key(b.requestKey))+':source'}).id
   }
   const configured=this.configure(actorId,{communityId,agentId:agent.agent_id,enabled:true,dailyLimit:3,intervalMinutes:360,postingMandateId:posting.id,editorialMandateId:editorial.id,requestKey:hash(key(b.requestKey))+':config'})
   emit(s,actorId,'resident.setup',{kind:'agent-job',id:communityId,revision:configured.config!.revision,communityId})
   return {agentId:agent.agent_id,expires,sourceId,...configured}
  })
 }
 configure(actorId:string,b:Record<string,unknown>){
  const communityId=text(b.communityId,100),agentId=text(b.agentId,100),dailyLimit=Number(b.dailyLimit??3),interval=Number(b.intervalMinutes??360)
  if(typeof b.enabled!=='boolean'||!Number.isInteger(dailyLimit)||dailyLimit<1||dailyLimit>5||!Number.isInteger(interval)||interval<60||interval>10080)throw new Fault(400,'Choose 1–5 jobs/day and an interval of at least one hour')
  const input={communityId,agentId,enabled:b.enabled,dailyLimit,interval,postingMandateId:b.postingMandateId??null,editorialMandateId:b.editorialMandateId??null,revision:b.revision??0,mentionsEnabled:b.mentionsEnabled===true,announceKnowledge:b.announceKnowledge===true}
  return transition(this.store,actorId,b.requestKey,'resident.configure',input,()=>{publicSteward(this.store,actorId,communityId);const a=this.store.actor(agentId);if(a.operator_id!==actorId||a.kind!=='agent')throw new Fault(403,'Resident agent operator required');if(b.enabled)this.access.assertCurrent(agentId)},()=>{
   const s=this.store,prior=s.get<ResidentConfig>('SELECT * FROM resident_configs WHERE community_id=?',communityId);expected(input.revision,prior?.revision??0)
   const config:ResidentConfig={community_id:communityId,agent_id:agentId,operator_id:actorId,posting_mandate_id:input.postingMandateId?text(input.postingMandateId,100):null,editorial_mandate_id:input.editorialMandateId?text(input.editorialMandateId,100):null,enabled:Number(b.enabled),revision:(prior?.revision??0)+1,daily_limit:dailyLimit,interval_minutes:interval,next_run:b.enabled?s.clock()+interval*60000:null,updated:s.clock(),mentions_enabled:Number(input.mentionsEnabled),announce_knowledge:Number(input.announceKnowledge)}
   if(b.enabled)this.current(config)
   s.run('INSERT INTO resident_configs(community_id,agent_id,operator_id,posting_mandate_id,editorial_mandate_id,enabled,revision,daily_limit,interval_minutes,next_run,updated,mentions_enabled,announce_knowledge) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(community_id) DO UPDATE SET agent_id=excluded.agent_id,operator_id=excluded.operator_id,posting_mandate_id=excluded.posting_mandate_id,editorial_mandate_id=excluded.editorial_mandate_id,enabled=excluded.enabled,revision=excluded.revision,daily_limit=excluded.daily_limit,interval_minutes=excluded.interval_minutes,next_run=excluded.next_run,updated=excluded.updated,mentions_enabled=excluded.mentions_enabled,announce_knowledge=excluded.announce_knowledge',config.community_id,config.agent_id,config.operator_id,config.posting_mandate_id,config.editorial_mandate_id,config.enabled,config.revision,config.daily_limit,config.interval_minutes,config.next_run,config.updated,config.mentions_enabled,config.announce_knowledge)
   s.run("UPDATE resident_jobs SET state='cancelled',generation=generation+1,lease_until=NULL,error='Resident configuration changed',updated=? WHERE (community_id=? OR agent_id=? OR agent_id=?) AND state IN ('queued','running')",s.clock(),communityId,prior?.agent_id??agentId,agentId)
   emit(s,actorId,'resident.configure',{kind:'agent-job',id:communityId,revision:config.revision,communityId});return this.get(actorId,communityId)
  })
 }
 enqueue(actorId:string,communityId:string,skill:ResidentSkill,requestKey:string){
  if(!skills.includes(skill))throw new Fault(400,'Unknown resident skill')
  return transition(this.store,actorId,requestKey,'resident.enqueue',{communityId,skill},()=>{publicSteward(this.store,actorId,communityId);this.current(this.config(communityId),skill)},()=>{
   const s=this.store,c=this.config(communityId)
   if(s.get<{n:number}>('SELECT count(*) n FROM resident_jobs WHERE agent_id=? AND created>?',c.agent_id,s.clock()-86400000)!.n>=c.daily_limit)throw new Fault(429,'Resident daily budget reached')
   if(s.get("SELECT 1 FROM resident_jobs WHERE agent_id=? AND state IN ('queued','running')",c.agent_id))throw new Fault(409,'A resident job is already pending')
   const id=randomUUID(),now=s.clock();s.run("INSERT INTO resident_jobs(id,community_id,agent_id,operator_id,config_revision,skill,request_key,state,generation,checkpoint,evidence,created,updated) VALUES(?,?,?,?,?,?,?,'queued',0,'queued','[]',?,?)",id,communityId,c.agent_id,c.operator_id,c.revision,skill,key(actorId+':'+requestKey),now,now)
   emit(s,actorId,'resident.enqueue',{kind:'agent-job',id,revision:1,communityId});return this.job(actorId,id)
  })
 }
 job(actorId:string,id:string){const j=this.store.get<ResidentJob>('SELECT * FROM resident_jobs WHERE id=?',id);if(!j)throw new Fault(404,'Not found');publicSteward(this.store,actorId,j.community_id);const {runtime_ticket_hash:_ticket,...visible}=j;return {...visible,skill:this.effectiveSkill(j),evidence:JSON.parse(j.evidence) as ResidentEvidence[],artifact:{kind:'agent-job' as const,id:j.id,revision:j.generation,communityId:j.community_id}}}
 jobs(actorId:string,communityId:string){publicSteward(this.store,actorId,communityId);return this.store.all<ResidentJob>('SELECT * FROM resident_jobs WHERE community_id=? ORDER BY created DESC,id DESC LIMIT 50',communityId).map(j=>this.job(actorId,j.id))}
 cancel(actorId:string,id:string){return this.store.tx(()=>{const j=this.job(actorId,id);if(j.state==='queued'||j.state==='running'){this.store.run("UPDATE resident_jobs SET state='cancelled',generation=generation+1,lease_until=NULL,error='Cancelled by steward',updated=? WHERE id=?",this.store.clock(),id);emit(this.store,actorId,'resident.cancel',{kind:'agent-job',id,revision:j.generation+1,communityId:j.community_id})}return this.job(actorId,id)})}
 private evidence(communityId:string,coverage=[communityId]):ResidentEvidence[]{
  const d=new Discovery(this.store),result:ResidentEvidence[]=[]
  const candidates=this.store.all<{id:string}>("SELECT i.id FROM discovery_items i JOIN communities c ON c.id=i.community_id WHERE i.state='published' AND c.visibility='public' AND i.community_id IN(SELECT value FROM json_each(?)) ORDER BY i.updated DESC,i.id DESC LIMIT 20",JSON.stringify(coverage))
  for(const candidate of candidates){try{
   const i=d.item(candidate.id),sources=i.evidence.filter(e=>e.state==='active'&&e.sourceRevision===e.currentRevision)
   if(!sources.length||result.some(e=>e.url===i.url))continue
   // Never carry an excerpt whose contributing evidence is stale or no longer permits excerpts.
   const excerpt=i.evidence.every(e=>e.state==='active'&&e.sourceRevision===e.currentRevision&&['open','excerpt-permitted'].includes(e.rights))
   result.push({id:i.id,revision:i.revision,title:i.title,url:i.url,summary:excerpt?i.summary:'',sources:sources.map(e=>({id:e.sourceId,revision:e.currentRevision}))})
   if(result.length===5)break
  }catch{/* A currently withdrawn/ineligible candidate is not model input. */}}
  return result
 }
 private recheck(job:ResidentJob){
  const s=this.store,current=s.get<ResidentJob>('SELECT * FROM resident_jobs WHERE id=?',job.id)
  if(!current||current.state!=='running'||current.generation!==job.generation||!current.lease_until||current.lease_until<=s.clock())throw new Fault(409,'Resident lease is no longer current')
  const thread=this.thread(job),config=thread?.route.config??this.config(job.community_id)
  if(config.revision!==job.config_revision)throw new Fault(409,'Resident configuration changed')
  if(!thread)this.current(config,job.skill)
  if(contextEpoch(s,job.community_id)!==current.context_epoch)throw new Fault(409,'Public context changed; start a new scoped run')
  const pinned=JSON.parse(current.evidence) as ResidentEvidence[]
  for(const e of pinned){const i=new Discovery(s).item(e.id);if(!(thread?.route.coverage??[job.community_id]).includes(i.community_id)||i.revision!==e.revision||!e.sources.every(src=>i.evidence.some(x=>x.sourceId===src.id&&x.sourceRevision===src.revision&&x.currentRevision===src.revision&&x.state==='active')))throw new Fault(409,'Evidence changed during resident work')}
  return config
 }
 async run(id:string,recheckSession:()=>void=()=>{}){
  const s=this.store
  const claim=s.tx(()=>{
   recheckSession();const j=s.get<ResidentJob>('SELECT * FROM resident_jobs WHERE id=?',id);if(!j)throw new Fault(404,'Not found')
   if(j.state!=='queued')throw new Fault(409,'Job is not queued; interrupted inference is never blindly replayed')
   const thread=this.thread(j),c=thread?.route.config??this.config(j.community_id);if(!thread)this.current(c,j.skill);if(c.revision!==j.config_revision)throw new Fault(409,'Resident configuration changed')
   const evidence=this.evidence(j.community_id,thread?.route.coverage),ticket=randomBytes(32).toString('base64url');s.run("UPDATE resident_jobs SET state='running',generation=generation+1,lease_until=?,checkpoint='prepared',evidence=?,updated=?,runtime_ticket_hash=?,context_epoch=? WHERE id=?",s.clock()+90000,JSON.stringify(evidence),s.clock(),hash(ticket),contextEpoch(s,j.community_id),id)
   return {job:s.get<ResidentJob>('SELECT * FROM resident_jobs WHERE id=?',id)!,ticket}
  })
  const {job,ticket}=claim
  try{
   const evidence=JSON.parse(job.evidence) as ResidentEvidence[],community=s.community(job.community_id),thread=this.thread(job),skill=this.effectiveSkill(job)
   if(!evidence.length)throw new Fault(422,'No current public source evidence; resident abstained')
   if(job.skill==='knowledge-draft'&&s.get("SELECT 1 FROM resident_jobs j JOIN knowledge_notes n ON n.id=j.result_id WHERE j.community_id=? AND j.skill='knowledge-draft' AND j.state='succeeded' AND j.evidence=? AND n.state!='withdrawn' LIMIT 1",job.community_id,job.evidence))throw new Fault(422,'These sources already have a Wiki starting point; waiting for new evidence')
   let result:ResidentOutput
   if(this.provider){
    s.tx(()=>{this.recheck(job);if(s.get<{n:number}>('SELECT count(*) n FROM resident_jobs WHERE inference_started_at>?',s.clock()-86400000)!.n>=10)throw new Fault(429,'Daily model-call budget reached');s.run("UPDATE resident_jobs SET checkpoint='model-started',inference_started=1,inference_started_at=?,model=? WHERE id=?",s.clock(),this.provider!.label,id)})
    result=await this.provider.draft({skill,community:community.title,language:'id',evidence,...(thread?{question:thread.question}:{}),work:{jobId:id,generation:job.generation,ticket,communityId:job.community_id,agentId:job.agent_id,contextEpoch:job.context_epoch,sessionKey:job.trigger_post_id??job.skill}},AbortSignal.timeout(65000))
   }else{
    const body=evidence.map((e,i)=>`${i+1}. ${e.title}${e.summary?' — '+e.summary:''}`).join('\n')
    result={model:'model-free:source-index',text:thread?`Catatan sumber otomatis · tanpa model. Belum ada kesimpulan untuk pertanyaan ini.

${body}`:job.skill==='research-question'?`Dari kabar berikut, apa yang perlu kita pahami atau tindak lanjuti di ${community.title}?\n\n${body}`:`Catatan sumber untuk ${community.title}\n\n${body}`}
   }
   if(thread&&this.provider&&(result.questionReceipt?.postId!==thread.question.postId||result.questionReceipt?.revision!==thread.question.revision))throw new Fault(422,'Connected runtime did not acknowledge the current question')
   const draft=text(result.text,6000),safe=draft.replace(/https?:\/\/[^\s<>\])]+/g,'').replace(/<think>[\s\S]*?<\/think>/gi,'').trim()
   if(!safe)throw new Fault(422,'Resident returned no usable draft')
   return s.tx(()=>{
    recheckSession();const config=this.recheck(job),references=[...new Set(evidence.map(e=>e.url))],body=safe+'\n\nSumber:\n'+references.join('\n')
    let resultKind:string,resultId:string
    const question=this.thread(job)
    if(question){
     const post=s.createPost(job.agent_id,job.community_id,body,question.question.postId,question.route.postingMandateId)
     resultKind='post';resultId=post.id
    }else if(job.skill==='knowledge-draft'){
     const note=new Knowledge(s).create(job.agent_id,{communityId:job.community_id,title:evidence[0].title,text:safe,kind:'source-comparison',citations:references,language:'id',evidenceIds:evidence.map(e=>e.id),editorialMandateId:config.editorial_mandate_id,requestKey:'resident-note:'+id})
     if(config.announce_knowledge){
      // Note, native announcement/outbox and job result commit atomically.
      const link=s.base+'/wiki/notes/'+note.id
      const post=s.createPost(job.agent_id,job.community_id,'Halo, sa baru saja tambah catatan ini di Wiki. Mohon dicek dan dilengkapi bersama.\n\n'+note.title+'\n'+link+'\n\nDraf awal · belum ditinjau menyeluruh.',undefined,config.posting_mandate_id??undefined)
      s.run('INSERT INTO knowledge_announcements VALUES(?,?,?,?,?)',note.id,note.revision,job.community_id,post.id,s.clock())
     }
     resultKind='knowledge';resultId=note.id
    }else{
     const post=s.createPost(job.agent_id,job.community_id,body,undefined,config.posting_mandate_id??undefined)
     resultKind='post';resultId=post.id
    }
    const inputTokens=Number.isSafeInteger(result.inputTokens)&&result.inputTokens!>=0?result.inputTokens!:0,outputTokens=Number.isSafeInteger(result.outputTokens)&&result.outputTokens!>=0?result.outputTokens!:0
    s.run("UPDATE resident_jobs SET state='succeeded',checkpoint='effect-committed',lease_until=NULL,result_kind=?,result_id=?,model=?,input_tokens=?,output_tokens=?,updated=? WHERE id=?",resultKind,resultId,text(result.model,200),inputTokens,outputTokens,s.clock(),id)
    emit(s,job.agent_id,'resident.complete',{kind:'agent-job',id,revision:job.generation,communityId:job.community_id});return {id,state:'succeeded',resultKind,resultId}
   })
  }catch(error){
   const code=residentFailureCode(error),message=error instanceof Fault?error.message:code?'resident:'+code:'resident:runtime-unavailable',state=error instanceof Fault&&[403,404,409,422,429].includes(error.status)||code&&['authority-changed','provider-quota','runtime-budget','runtime-abstained'].includes(code)?'abstained':'failed'
   s.tx(()=>s.run("UPDATE resident_jobs SET state=?,lease_until=NULL,error=?,checkpoint='stopped',updated=? WHERE id=? AND state='running' AND generation=?",state,message,s.clock(),id,job.generation))
   return {id,state,error:message}
  }
 }

 /** Service-binding only. A durable per-run capability never grants publication. */
 validateRuntime(work:ResidentWork){
  const s=this.store,j=s.get<ResidentJob>('SELECT * FROM resident_jobs WHERE id=?',work.jobId)
  if(!j||!j.runtime_ticket_hash||typeof work.ticket!=='string'||work.ticket.length!==43||!timingSafeEqual(Buffer.from(j.runtime_ticket_hash,'hex'),Buffer.from(hash(work.ticket),'hex')))throw new Fault(403,'Invalid runtime work capability')
  if(j.generation!==work.generation||j.community_id!==work.communityId||j.agent_id!==work.agentId||j.context_epoch!==work.contextEpoch||work.sessionKey!==(j.trigger_post_id??j.skill))throw new Fault(409,'Stale runtime work capability')
  this.recheck(j);return j
 }
 runtimeContext(work:ResidentWork){const j=this.validateRuntime(work),thread=this.thread(j);return {skill:this.effectiveSkill(j),community:this.store.community(j.community_id).title,evidence:JSON.parse(j.evidence) as ResidentEvidence[],...(thread?{question:thread.question}:{})}}
 authorizeInference(work:ResidentWork,requestKey:string){return this.store.tx(()=>{
  const s=this.store,j=this.validateRuntime(work);key(requestKey)
  if(s.get('SELECT 1 FROM resident_inference_calls WHERE job_id=? AND generation=? AND request_key=?',j.id,j.generation,requestKey))throw new Fault(409,'Inference outcome may be uncertain; do not replay this request')
  if(s.get<{n:number}>('SELECT count(*) n FROM resident_inference_calls WHERE job_id=?',j.id)!.n>=3||s.get<{n:number}>('SELECT count(*) n FROM resident_inference_calls WHERE created>?',s.clock()-86400000)!.n>=10)throw new Fault(429,'Resident inference budget reached')
  const id=randomUUID();s.run("INSERT INTO resident_inference_calls VALUES(?,?,?,?,?,'reserved')",id,j.id,j.generation,requestKey,s.clock());return {id,maxOutputTokens:600,contextEpoch:j.context_epoch}
 })}
 /** Alarms may replay; queued execution and effect commits remain idempotent.
  * Interrupted inference consumes its budget and requires an explicit fresh job. */
 recover(){const s=this.store;s.run("UPDATE resident_jobs SET state='failed',lease_until=NULL,error='Interrupted job; inspect its receipt before requesting another',updated=? WHERE state='running' AND lease_until<=?",s.clock(),s.clock())}
 async tick(){
  const s=this.store;this.recover()
  for(const c of s.all<ResidentConfig>('SELECT * FROM resident_configs WHERE enabled=1 AND next_run<=? ORDER BY next_run LIMIT 3',s.clock())){
   try{this.enqueue(c.operator_id,c.community_id,'knowledge-draft','schedule:'+hash({scope:c.community_id,at:c.next_run}).slice(0,40))}catch{/* Current authority and quotas can refuse scheduled work. No widening or retry inference. */}
   s.run('UPDATE resident_configs SET next_run=? WHERE community_id=? AND revision=?',s.clock()+c.interval_minutes*60000,c.community_id,c.revision)
  }
  for(const j of s.all<{id:string}>("SELECT id FROM resident_jobs WHERE state='queued' ORDER BY created LIMIT 1"))try{await this.run(j.id)}catch{ s.run("UPDATE resident_jobs SET state='abstained',error='Current authority refused scheduled work',updated=? WHERE id=? AND state='queued'",s.clock(),j.id) }
 }
 nextWake(){const s=this.store;const queued=s.get("SELECT 1 FROM resident_jobs WHERE state='queued'");if(queued)return s.clock()+1000;return s.get<{next:number|null}>("SELECT MIN(at) next FROM (SELECT next_run at FROM resident_configs WHERE enabled=1 UNION ALL SELECT lease_until at FROM resident_jobs WHERE state='running')")?.next??null}
}
