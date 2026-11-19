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
import {residentFailureCode,ResidentFailure} from './resident-failure.ts'
import {JadwalRunner,defaultJadwal,localTime,slotRequestKey,jadwalSkills,type Jadwal} from './jadwal.ts'
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
/** `researchTools`: the runtime can look for evidence itself (reviewed Wiki,
 * and for thread replies the web) through this authority, so a thread question
 * without configured-source evidence may still reach the model. */
export type ResidentProvider={label:string;researchTools?:boolean;draft:(input:ResidentInput,signal:AbortSignal)=>Promise<ResidentOutput>}
const skills:ResidentSkill[]=[...jadwalSkills]
/** Fixed, model-free copy for an honest thread abstention. It never quotes or
 * answers the question; it only asks the community for sources. */
export const residentAbstentionText='Sa belum menemukan sumber yang bisa sa pakai untuk menjawab ini. Ada yang tahu, atau punya tulisan, rekaman, atau orang yang bisa ditanya? Ceritakan di sini.\n\n— Aksara (AI) · catatan otomatis: belum ada sumber'
const noEvidence='No current public source evidence; resident abstained'
/** Per-job and daily tool ceilings, enforced here rather than in the runtime. */
const toolLimits={job:6,daily:60,search_reviewed_wiki:3,web_search:3,web_fetch:4} as const
type ResidentTool='search_reviewed_wiki'|'web_search'|'web_fetch'
/** Canonical form for comparing a cited URL with one a tool returned. */
export function citationUrl(raw:unknown){
 if(typeof raw!=='string'||raw.length>2000)return null
 try{const u=new URL(raw.replace(/[.,;:!?'"”’]+$/,''));if((u.protocol!=='https:'&&u.protocol!=='http:')||u.username||u.password)return null;u.hash='';return u.href}catch{return null}
}
export class Resident{
 readonly store:StrataCore;readonly access:AgentAccess;readonly provider?:ResidentProvider;readonly routing:ResidentRouting;readonly questions:ResidentQuestions;readonly slots:JadwalRunner
 constructor(store:StrataCore,access=new AgentAccess(store),provider?:ResidentProvider,jadwal:Jadwal=defaultJadwal){this.store=store;this.access=access;this.provider=provider;this.slots=new JadwalRunner(store,(c,skill)=>this.current(c,skill),jadwal);this.routing=new ResidentRouting(store,access);this.questions=new ResidentQuestions(store,this.routing)}
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
  const communityId=text(b.communityId,100),includeSource=b.includeSource===true,enableAutomation=b.enableAutomation===true,mentionsEnabled=b.mentionsEnabled!==false
  if(b.consent!==true)throw new Fault(400,'Explicit resident setup consent required')
  return transition(this.store,actorId,b.requestKey,'resident.setup',{communityId,includeSource,enableAutomation,mentionsEnabled},()=>{
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
   const configured=this.configure(actorId,{communityId,agentId:agent.agent_id,enabled:true,dailyLimit:8,intervalMinutes:120,mentionsEnabled,postingMandateId:posting.id,editorialMandateId:editorial.id,requestKey:hash(key(b.requestKey))+':config'})
   emit(s,actorId,'resident.setup',{kind:'agent-job',id:communityId,revision:configured.config!.revision,communityId})
   return {agentId:agent.agent_id,expires,sourceId,...configured}
  })
 }
 configure(actorId:string,b:Record<string,unknown>){
  const communityId=text(b.communityId,100),agentId=text(b.agentId,100),dailyLimit=Number(b.dailyLimit??8),interval=Number(b.intervalMinutes??120)
  if(typeof b.enabled!=='boolean'||!Number.isInteger(dailyLimit)||dailyLimit<1||dailyLimit>24||!Number.isInteger(interval)||interval<15||interval>10080)throw new Fault(400,'Pilih 1–24 tugas per hari dan jarak tinjauan minimal 15 menit.')
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
   if(!evidence.length&&!(thread&&this.provider?.researchTools))throw new Fault(422,noEvidence)
   // A Wiki page is for what lasts. Items from news feeds alone (a price report, a meeting) never start one; a source read for review or indexing must be among the evidence.
   if(job.skill==='knowledge-draft'&&!evidence.some(e=>e.sources.some(src=>(s.get<{mode:string}>('SELECT mode FROM discovery_sources WHERE id=?',src.id)?.mode??'news')!=='news')))throw new Fault(422,'News alone does not start a Wiki page; waiting for a source that is not a news feed')
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
   const draft=text(result.text,6000)
   if(draft.trim()==='ABSTAIN')throw new ResidentFailure('runtime-abstained')
   // Only URLs a tool returned to this job generation (or pinned evidence) may
   // stay as inline thread citations. Anything else, including invented links,
   // is removed. Editorial artifacts keep Strata-attached links only.
   const evidenceUrls=new Set(evidence.map(e=>citationUrl(e.url)).filter((u):u is string=>!!u)),returned=thread?new Map(s.all<{url:string;origin:'wiki'|'web'}>('SELECT url,origin FROM resident_job_citations WHERE job_id=? AND generation=?',id,job.generation).map(r=>[r.url,r.origin])):new Map<string,'wiki'|'web'>()
   const cited={wiki:new Set<string>(),web:new Set<string>()}
   const safe=draft.replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/https?:\/\/[^\s<>\])]+/g,match=>{
    const url=citationUrl(match),tail=match.match(/[.,;:!?'"”’]+$/)?.[0]??''
    if(!thread||!url)return ''
    if(evidenceUrls.has(url))return url+tail
    const origin=returned.get(url);if(!origin)return ''
    cited[origin].add(url);return url+tail
   }).trim()
   if(!safe)throw new Fault(422,'Resident returned no usable draft')
   return s.tx(()=>{
    recheckSession();const config=this.recheck(job),references=[...new Set(evidence.map(e=>e.url))]
    // Reviewed ETNOS knowledge and unreviewed web pages stay visibly separate.
    const sections=[references.length?'Sumber:\n'+references.join('\n'):'',cited.wiki.size?'Wiki ETNOS (sudah ditinjau):\n'+[...cited.wiki].join('\n'):'',cited.web.size?'Dari web (belum ditinjau ETNOS):\n'+[...cited.web].join('\n'):''].filter(Boolean)
    const body=safe+(sections.length?'\n\n'+sections.join('\n\n'):'')
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
      const post=s.createPost(job.agent_id,job.community_id,'Draf baru di Wiki, belum ditinjau: '+note.title+'\n'+link+'\n\nBantu periksa sumbernya.',undefined,config.posting_mandate_id??undefined)
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
   if(job.work_kind==='thread-reply'&&(error instanceof Fault&&error.message===noEvidence||code==='runtime-abstained')){
    try{return this.abstentionReply(job,message,recheckSession)}catch{/* Current mandate, budget, lock, membership or question state refuses a public note; record a silent abstention as before. */}
   }
   s.tx(()=>s.run("UPDATE resident_jobs SET state=?,lease_until=NULL,error=?,checkpoint='stopped',updated=? WHERE id=? AND state='running' AND generation=?",state,message,s.clock(),id,job.generation))
   return {id,state,error:message}
  }
 }

 /** An honest "no source yet" reply, committed with the job result exactly once
  * through the ordinary post/outbox path and under the same current checks. */
 private abstentionReply(job:ResidentJob,message:string,recheckSession:()=>void){
  const s=this.store
  return s.tx(()=>{
   recheckSession();this.recheck(job);const question=this.questions.check(job)
   const post=s.createPost(job.agent_id,job.community_id,residentAbstentionText,question.question.postId,question.route.postingMandateId)
   s.run("UPDATE resident_jobs SET state='abstained',checkpoint='effect-committed',lease_until=NULL,error=?,result_kind='abstention-reply',result_id=?,updated=? WHERE id=? AND state='running' AND generation=?",message,post.id,s.clock(),job.id,job.generation)
   emit(s,job.agent_id,'resident.abstain',{kind:'agent-job',id:job.id,revision:job.generation,communityId:job.community_id})
   return {id:job.id,state:'abstained' as const,error:message,resultKind:'abstention-reply',resultId:post.id}
  })
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
 /** One dispatch for the private runtime authority entrypoint. Every operation
  * re-validates the work capability and current authorization first. */
 authority(operation:string,work:ResidentWork,input:Record<string,unknown>={}){
  if(operation==='context')return this.runtimeContext(work)
  if(operation==='inference')return this.authorizeInference(work,typeof input.requestKey==='string'?input.requestKey:'')
  if(operation==='wiki-search')return this.searchWiki(work,input.query)
  if(operation==='web-call')return this.authorizeWebTool(work,input.tool,input.requestKey)
  if(operation==='web-read')return this.recordWebRead(work,input.requestKey,input.page)
  if(operation==='work'){this.validateRuntime(work);return {valid:true}}
  throw new Fault(404,'Not found')
 }
 private toolBudget(j:ResidentJob,tool:ResidentTool){
  const s=this.store,count=(sql:string,...args:(string|number)[])=>s.get<{n:number}>(sql,...args)!.n
  if(count('SELECT count(*) n FROM resident_tool_calls WHERE job_id=?',j.id)>=toolLimits.job||count('SELECT count(*) n FROM resident_tool_calls WHERE job_id=? AND tool=?',j.id,tool)>=toolLimits[tool]||count('SELECT count(*) n FROM resident_tool_calls WHERE created>?',s.clock()-86400000)>=toolLimits.daily)throw new Fault(429,'Resident tool budget reached')
 }
 /** Accepted public Wiki revisions only; results become citable for this job. */
 searchWiki(work:ResidentWork,query:unknown){return this.store.tx(()=>{
  const s=this.store,j=this.validateRuntime(work),q=text(query,200);this.toolBudget(j,'search_reviewed_wiki')
  const callId=randomUUID(),results=new Wiki(s).searchAccepted(q,5)
  s.run("INSERT INTO resident_tool_calls VALUES(?,?,?,'search_reviewed_wiki',?,'observed',?)",callId,j.id,j.generation,callId,s.clock())
  for(const r of results){const url=citationUrl(r.url);if(url)s.run("INSERT OR IGNORE INTO resident_job_citations VALUES(?,?,?,'wiki',?,?,?)",j.id,j.generation,url,r.title.slice(0,200),callId,s.clock())}
  return {results}
 })}
 /** Reserve one outward web call before it happens. A reserved key is never
  * re-authorized: an uncertain call needs a fresh request, inside the budget. */
 authorizeWebTool(work:ResidentWork,tool:unknown,requestKey:unknown){return this.store.tx(()=>{
  const s=this.store,j=this.validateRuntime(work)
  if(j.work_kind!=='thread-reply')throw new Fault(403,'Web tools are only available for thread replies')
  if(tool!=='web_search'&&tool!=='web_fetch')throw new Fault(400,'Unknown resident tool')
  const k=key(requestKey)
  if(s.get('SELECT 1 FROM resident_tool_calls WHERE job_id=? AND generation=? AND request_key=?',j.id,j.generation,k))throw new Fault(409,'Tool outcome may be uncertain; do not replay this request')
  this.toolBudget(j,tool);const callId=randomUUID()
  s.run("INSERT INTO resident_tool_calls VALUES(?,?,?,?,?,'reserved',?)",callId,j.id,j.generation,tool,k,s.clock());return {callId}
 })}
 /** A page web_fetch actually read (2xx) becomes citable for this job generation. */
 recordWebRead(work:ResidentWork,requestKey:unknown,page:unknown){return this.store.tx(()=>{
  const s=this.store,j=this.validateRuntime(work),k=key(requestKey),call=s.get<{id:string;tool:string;state:string}>('SELECT id,tool,state FROM resident_tool_calls WHERE job_id=? AND generation=? AND request_key=?',j.id,j.generation,k)
  if(!call||call.tool!=='web_fetch'||call.state!=='reserved')throw new Fault(409,'Unknown or completed web read')
  const p=(page&&typeof page==='object'?page:{}) as Record<string,unknown>,status=Number(p.status),title=typeof p.title==='string'?p.title.slice(0,200):''
  const urls=Number.isInteger(status)&&status>=200&&status<300?[...new Set([citationUrl(p.url),citationUrl(p.finalUrl)].filter((u):u is string=>!!u))]:[]
  for(const url of urls)s.run("INSERT OR IGNORE INTO resident_job_citations VALUES(?,?,?,'web',?,?,?)",j.id,j.generation,url,title,call.id,s.clock())
  s.run("UPDATE resident_tool_calls SET state='observed' WHERE id=?",call.id);return {citable:urls.length}
 })}
 /** Alarms may replay; queued execution and effect commits remain idempotent.
  * Interrupted inference consumes its budget and requires an explicit fresh job. */
 recover(){const s=this.store;s.run("UPDATE resident_jobs SET state='failed',lease_until=NULL,error='Interrupted job; inspect its receipt before requesting another',updated=? WHERE state='running' AND lease_until<=?",s.clock(),s.clock())}
 /** Jadwal Aksara. Each due slot starts at most one job per community and local day, through the same
  * enqueue path as the interval schedule, so mandates, the daily budget and the one pending job rule apply.
  * The day's request key makes a repeated or concurrent tick a no-op once a job exists, whatever its outcome:
  * a slot that abstained or failed is not tried again that day. A pending job, the budget or a refused mandate
  * only skips quietly, and the slot is tried again on the next tick. */
 private runSlots(){
  const s=this.store,{date,slots}=this.slots.due(s.clock());if(!slots.length)return
  for(const c of s.all<ResidentConfig>('SELECT * FROM resident_configs WHERE enabled=1 ORDER BY community_id LIMIT 50'))for(const slot of slots){
   if(this.slots.job(c,slot.id,date))continue
   try{this.enqueue(c.operator_id,c.community_id,slot.skill,slotRequestKey(slot.id,date,c.community_id));break}
   catch(error){if(error instanceof Fault&&[409,429].includes(error.status))break/* pending job or budget: nothing else can start now */}
  }
 }
 /** Today's slots of every public community with an enabled resident. Names no operator, agent, ticket or evidence. */
 publicJadwal(){
  const s=this.store,now=s.clock(),t=localTime(now,this.slots.jadwal.timezone)
  const communities=s.all<ResidentConfig&{title:string}>("SELECT r.*,c.title FROM resident_configs r JOIN communities c ON c.id=r.community_id WHERE r.enabled=1 AND c.visibility='public' ORDER BY c.title,c.id LIMIT 50").map(c=>({id:c.community_id,title:c.title,slots:this.slots.day(c,now).map(({slot,state,job})=>{
   let postId:string|null=null
   if(job?.state==='succeeded')postId=job.result_kind==='post'?job.result_id:job.result_kind==='knowledge'?s.get<{post_id:string}>('SELECT post_id FROM knowledge_announcements WHERE note_id=? ORDER BY revision DESC LIMIT 1',job.result_id)?.post_id??null:null
   if(postId&&!s.get("SELECT 1 FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.id=? AND c.visibility='public' AND p.hidden=0 AND p.deleted=0",postId))postId=null
   return {id:slot.id,label:slot.label,at:slot.at,state,post:postId?{id:postId,path:'/square/'+postId}:null}
  })}))
  return {timezone:this.slots.jadwal.timezone,date:t.date,asOf:now,communities}
 }
 async tick(){
  const s=this.store;this.recover();this.runSlots()
  for(const c of s.all<ResidentConfig>('SELECT * FROM resident_configs WHERE enabled=1 AND next_run<=? ORDER BY next_run LIMIT 3',s.clock())){
   try{this.enqueue(c.operator_id,c.community_id,'knowledge-draft','schedule:'+hash({scope:c.community_id,at:c.next_run}).slice(0,40))}catch{/* Current authority and quotas can refuse scheduled work. No widening or retry inference. */}
   s.run('UPDATE resident_configs SET next_run=? WHERE community_id=? AND revision=?',s.clock()+c.interval_minutes*60000,c.community_id,c.revision)
  }
  for(const j of s.all<{id:string}>("SELECT id FROM resident_jobs WHERE state='queued' ORDER BY created LIMIT 1"))try{await this.run(j.id)}catch{ s.run("UPDATE resident_jobs SET state='abstained',error='Current authority refused scheduled work',updated=? WHERE id=? AND state='queued'",s.clock(),j.id) }
 }
 nextWake(){
  const s=this.store;const queued=s.get("SELECT 1 FROM resident_jobs WHERE state='queued'");if(queued)return s.clock()+1000
  const interval=s.get<{next:number|null}>("SELECT MIN(at) next FROM (SELECT next_run at FROM resident_configs WHERE enabled=1 UNION ALL SELECT lease_until at FROM resident_jobs WHERE state='running')")?.next??null
  const slots=s.all<ResidentConfig>('SELECT * FROM resident_configs WHERE enabled=1 LIMIT 50').map(c=>this.slots.nextWake(c,s.clock()))
  const all=[interval,...slots].filter((n):n is number=>typeof n==='number');return all.length?Math.min(...all):null
 }
}
