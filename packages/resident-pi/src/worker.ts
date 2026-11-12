import {DurableObject,WorkerEntrypoint} from 'cloudflare:workers'
import {createModels} from '@earendil-works/pi-ai/models'
import {Harness} from '@earendil-works/pi-durable'
import {PiHarness} from 'agents/harness/pi'
import {Lifecycle} from 'agents/lifecycle'
import type {ResidentInput,ResidentWork} from '../../../src/resident-contract.ts'
import {redactPublicModelText} from '../../../src/redaction.ts'
import {residentPromptContext} from '../../../src/resident-prompt.ts'
import {ResidentFailure,residentFailureCode,type ResidentFailureCode} from '../../../src/resident-failure.ts'
import type {ProtocolSignature} from './protocol-replay.ts'
import {authority,type ServicePort} from './authority.ts'
import {jobProvider,type UsageReceipt} from './gateway-models.ts'
import {residentRegistry} from './extensions.ts'
interface RuntimeEnv{AUTHORITY:Fetcher;MODEL_GATEWAY:Fetcher;SESSIONS:DurableObjectNamespace<PiResidentSession>}
type StoredWork={id:string;work:string;digest:string;model:string;input_tokens:number;output_tokens:number}
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}})
async function digest(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function parse(request:Request){
 const reader=request.body?.getReader();if(!reader)throw Error();let n=0;const parts:Uint8Array[]=[]
 try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>65536)throw Error();parts.push(r.value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 const bytes=new Uint8Array(n);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length}const input=JSON.parse(new TextDecoder().decode(bytes)) as ResidentInput,w=input.work
 if(!w||typeof w.ticket!=='string'||w.ticket.length!==43||typeof w.jobId!=='string'||!Number.isSafeInteger(w.generation)||!Number.isSafeInteger(w.contextEpoch)||typeof w.communityId!=='string'||typeof w.agentId!=='string'||typeof w.sessionKey!=='string'||w.sessionKey.length>100||typeof input.community!=='string'||!Array.isArray(input.evidence)||input.evidence.length>5)throw Error()
 if(!['source-digest','research-question','knowledge-draft','thread-reply'].includes(input.skill))throw Error()
 if(input.skill==='thread-reply'){
  const q=input.question
  if(!q||typeof q.postId!=='string'||q.postId.length>100||!Number.isSafeInteger(q.revision)||q.revision<1||typeof q.text!=='string'||q.text.length>4000||typeof q.title!=='string'||q.title.length>180||!Array.isArray(q.context)||q.context.length>3||q.context.some(p=>typeof p.postId!=='string'||p.postId.length>100||!Number.isSafeInteger(p.revision)||p.revision<1||typeof p.text!=='string'||p.text.length>700))throw Error()
 }else if(input.question!==undefined)throw Error()
 return input
}
/** Runtime storage is separate from forum authority. No public HTTP route, shell,
 * filesystem, arbitrary network, private MCP or automatic agent-creation tools. */
export class PiResidentSession extends DurableObject<RuntimeEnv>{
 private models=createModels()
 private works=new Map<string,ResidentWork>()
 private registry=residentRegistry(id=>{const work=this.works.get(id);if(!work)throw Error('Unknown runtime work');return work},this.env.AUTHORITY)
 harness=new PiHarness({harness:async({storage,context,onWake})=>{
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS strata_pi_work(id TEXT PRIMARY KEY,work TEXT NOT NULL,digest TEXT NOT NULL,model TEXT NOT NULL,input_tokens INTEGER NOT NULL,output_tokens INTEGER NOT NULL)')
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS strata_pi_tool_replay(job_id TEXT NOT NULL,tool_call_id TEXT NOT NULL,name TEXT NOT NULL,arguments_hash TEXT NOT NULL,model TEXT NOT NULL,signature TEXT NOT NULL,PRIMARY KEY(job_id,tool_call_id))')
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS strata_pi_failures(job_id TEXT PRIMARY KEY,code TEXT NOT NULL)')
  for(const row of this.ctx.storage.sql.exec<StoredWork>('SELECT * FROM strata_pi_work ORDER BY rowid DESC LIMIT 100').toArray())this.install(JSON.parse(row.work) as ResidentWork)
  return Harness.open(storage,{models:this.models,registry:this.registry,onWake,identity:{attribution:{name:'Strata / ETNOS resident',url:'https://etnos.space'}},settings:{documentRetentionMs:0,contextRetentionMs:0,retry:{enabled:false,maxRetries:0},stream:{maxRetries:0,timeoutMs:20000},restartLimit:2,afterFailedRun:'withdraw',toolExecution:'sequential',compaction:{enabled:true,reserveTokens:2048,keepRecentTokens:2048,backgroundTokens:0}},onReport:report=>{console.warn(JSON.stringify({event:'strata.resident.runtime',kind:report.kind}))}},context)
 },defaults:{thinkingLevel:'off',maxTurns:3}})
 lifecycle=Lifecycle.install(this).use(this.harness)
 private install(work:ResidentWork){
  const p=jobProvider(work,{authority:this.env.AUTHORITY,gateway:this.env.MODEL_GATEWAY},(usage:UsageReceipt)=>{
   this.ctx.storage.sql.exec('UPDATE strata_pi_work SET model=?,input_tokens=input_tokens+?,output_tokens=output_tokens+? WHERE id=?',usage.model,Number.isSafeInteger(usage.input)?Math.max(0,usage.input):0,Number.isSafeInteger(usage.output)?Math.max(0,usage.output):0,work.jobId)
  },{
   get:id=>this.ctx.storage.sql.exec<ProtocolSignature>('SELECT tool_call_id id,name,arguments_hash argumentsHash,model,signature FROM strata_pi_tool_replay WHERE job_id=? AND tool_call_id=?',work.jobId,id).toArray()[0],
   put:row=>{
    const old=this.ctx.storage.sql.exec<{arguments_hash:string;signature:string}>('SELECT arguments_hash,signature FROM strata_pi_tool_replay WHERE job_id=? AND tool_call_id=?',work.jobId,row.id).toArray()[0]
    if(old&&(old.arguments_hash!==row.argumentsHash||old.signature!==row.signature))throw new ResidentFailure('runtime-protocol')
    if(!old&&this.ctx.storage.sql.exec<{n:number}>('SELECT count(*) n FROM strata_pi_tool_replay WHERE job_id=?',work.jobId).one().n>=6)throw new ResidentFailure('runtime-budget')
    this.ctx.storage.sql.exec('INSERT OR IGNORE INTO strata_pi_tool_replay VALUES(?,?,?,?,?,?)',work.jobId,row.id,row.name,row.argumentsHash,row.model,row.signature)
   },
  },code=>{this.ctx.storage.sql.exec('INSERT OR REPLACE INTO strata_pi_failures VALUES(?,?)',work.jobId,code)})
  this.works.set(p.id,work);this.models.setProvider(p);return p.id
 }
 async generate(input:ResidentInput){
  try{return await this.perform(input)}catch(error){
   let recorded:ResidentFailureCode|undefined
   try{recorded=residentFailureCode(this.ctx.storage.sql.exec<{code:string}>('SELECT code FROM strata_pi_failures WHERE job_id=?',input.work.jobId).toArray()[0]?.code)}catch{/* Runtime initialization may have failed before its tables exist. */}
   return {failure:residentFailureCode(error)??recorded??'runtime-unavailable' as ResidentFailureCode}
  }
 }
 private async perform(input:ResidentInput){
  // Ensures Lifecycle has opened storage before any local SQL access.
  await this.harness.pi();await authority(this.env.AUTHORITY,'work',input.work)
  const encoded=JSON.stringify(input),inputDigest=await digest(encoded),previous=this.ctx.storage.sql.exec<StoredWork>('SELECT * FROM strata_pi_work WHERE id=?',input.work.jobId).toArray()[0]
  if(previous&&previous.digest!==inputDigest)throw Error('Runtime request changed')
  if(!previous&&this.ctx.storage.sql.exec<{n:number}>('SELECT count(*) n FROM strata_pi_work').one().n>=100)throw Error('Resident thread retention limit; start a new thread')
  const session=this.harness.session()
  if(!previous){
   if(await session.busy())throw Error('Resident thread already busy')
   this.ctx.storage.sql.exec('INSERT INTO strata_pi_work VALUES(?,?,?,?,0,0)',input.work.jobId,JSON.stringify(input.work),inputDigest,'gateway:unknown')
  }
  const provider=this.install(input.work)
  if(!previous)await session.setModel({provider,id:input.skill==='knowledge-draft'?'synthesis':'fast'})
  const prompt=JSON.stringify(residentPromptContext(input))
  const result=await session.prompt(prompt,{operationId:input.work.jobId,whenBusy:'reject'})
  if(result.status!=='done'||!result.text?.trim()){
   console.warn(JSON.stringify({event:'strata.resident.stop',status:result.status,reason:typeof result.reason==='string'&&/^[a-z_]{1,50}$/.test(result.reason)?result.reason:'unspecified'}))
   const code=residentFailureCode(this.ctx.storage.sql.exec<{code:string}>('SELECT code FROM strata_pi_failures WHERE job_id=?',input.work.jobId).toArray()[0]?.code)
   throw new ResidentFailure(code??'runtime-budget')
  }
  if(result.text.trim()==='ABSTAIN')throw new ResidentFailure('runtime-abstained')
  const usage=this.ctx.storage.sql.exec<StoredWork>('SELECT * FROM strata_pi_work WHERE id=?',input.work.jobId).one()
  return {text:redactPublicModelText(result.text).text.slice(0,6000),model:'pi:'+usage.model,inputTokens:usage.input_tokens,outputTokens:usage.output_tokens,...(input.question?{questionReceipt:{postId:input.question.postId,revision:input.question.revision}}:{})}
 }
}
/** Explicit service binding only. The default Worker has no public entry route. */
export class ResidentRuntime extends WorkerEntrypoint<RuntimeEnv>{
 async fetch(request:Request){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/draft')return json({error:'Not found'},404)
  try{const input=await parse(request);await authority(this.env.AUTHORITY,'work',input.work)
   const sessionName=await digest([input.work.communityId,input.work.agentId,input.work.contextEpoch,input.work.sessionKey].join(':'))
   const result=await this.env.SESSIONS.getByName(sessionName).generate(input)
   if('failure' in result)return json({error:'Resident work stopped',code:result.failure},result.failure==='provider-quota'?429:result.failure==='runtime-abstained'?422:503)
   return json(result)
  }catch(error){return json({error:'Resident work stopped',code:residentFailureCode(error)??'runtime-unavailable'},503)}
 }
}
export default {fetch:()=>json({error:'Not found'},404)}
