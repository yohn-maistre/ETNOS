import { DurableObject,WorkerEntrypoint } from 'cloudflare:workers'
import { CloudflareDatabase } from './cloudflare-database.ts'
import { Meter, routeShape } from './usage.ts'
import { StrataCore, Fault } from './core.ts'
import { api, json,body } from './api.ts'
import {workerDecisions,workerDesk} from './worker-decisions.ts'
import {AgentAccess} from './agent-access.ts'
import {agentRoutes} from './agent-mcp.ts'
import {BrowserAuth} from './oauth.ts'
import {Discovery,sourceFetcher} from './discovery.ts'
import {Resident,parseResidentWork,residentBudget,type ResidentWork} from './resident.ts'
import {piResidentProvider} from './resident-provider.ts'
import {defaultModel,effectiveEnv,keyedProvider,listingEnv,modelGateway,modelRoute,nodeModels,providerModels,validKeyInput,validModelChoice,type ModelChoice,type ModelEnv,type StoredKey} from './models.ts'

export class StrataNode extends DurableObject<Cloudflare.Env> {
  private handle!: (request: Request) => Promise<Response>
  private resident?:Resident
  private discovery?:Discovery
  private sourceOperatorAllowed:(id:string)=>boolean=()=>false
  private operatorOf:(request:Request)=>boolean=()=>false
  private writeGuard:(request:Request)=>void=()=>{throw new Fault(403,'Not allowed')}
  /** Shared by both resident instances, so a key added in Studio raises the ceiling without a restart. */
  private budget={modelCalls:10,toolCalls:60}
  private meter:Meter
  protected database:CloudflareDatabase
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx,env)
    const database=this.database=new CloudflareDatabase(ctx.storage)
    this.meter=new Meter(database.usage,ctx.storage.kv,()=>Date.now())
    ctx.blockConcurrencyWhile(async()=>{
      const core=new StrataCore(database,env.STRATA_ORIGIN,()=>Date.now(),{collection:env.STRATA_COLLECTION})
      const sourceOrigins=(env.STRATA_SOURCE_ORIGINS??'').split(',').map(x=>x.trim()).filter(Boolean)
      const acquire=sourceOrigins.length?sourceFetcher(sourceOrigins):undefined
      const residentProvider=env.RESIDENT_PI?piResidentProvider(env.RESIDENT_PI,env.STRATA_RESIDENT_RESEARCH==='on'):undefined
      // A node with its own model key may let Aksara do more each day; the keyless route keeps the small default.
      const stored=await ctx.storage.get<StoredKey>('model-key')
      const budget=this.budget;Object.assign(budget,residentBudget(env as {STRATA_RESIDENT_DAILY_CALLS?:string},!!keyedProvider(effectiveEnv(listingEnv(env as unknown as ModelEnv),stored,null))))
      core.recoverInterrupted()
      if(env.STRATA_AUTH_MODE==='atproto'){
        if(!env.STRATA_OAUTH_JWK || !env.STRATA_AUTH_SEAL_KEY){
          const publicApi=api(core,{runtime:'cloudflare-durable-object',catalogue:env.STRATA_CATALOGUE,principal:()=>undefined,writeGuard:()=>{throw new Fault(503,'Enrollment unavailable')}})
          const routes=agentRoutes(core,new AgentAccess(core,{operatorAllowed:()=>false}))
          this.handle=async request=>(await routes(request))??(new URL(request.url).pathname.startsWith('/auth/')?json(503,{error:'Sign-in is being configured'}):publicApi(request))
        }else{
          const enrollmentMode=env.STRATA_ENROLLMENT_MODE==='open'?'open':env.STRATA_ENROLLMENT_MODE==='closed'?'closed':'invite'
          const auth=await BrowserAuth.create(core,{origin:env.STRATA_ORIGIN,privateJwk:env.STRATA_OAUTH_JWK,sealKey:env.STRATA_AUTH_SEAL_KEY,
            stewardDid:env.STRATA_STEWARD_DID,allowedHosts:env.STRATA_OAUTH_HOSTS.split(',').map(x=>x.trim()).filter(Boolean),
            collection:env.STRATA_COLLECTION,publishingEnabled:env.STRATA_PUBLISHING_ENABLED==='true',
            enrollmentMode,clientName:env.STRATA_CLIENT_NAME,accountHost:(env as {STRATA_ACCOUNT_HOST?:string}).STRATA_ACCOUNT_HOST||undefined})
          const access=new AgentAccess(core,{stewardDid:env.STRATA_STEWARD_DID,operatorAllowed:id=>auth.operatorAllowed(id)}),routes=agentRoutes(core,access,{desk:workerDesk(env)})
          this.resident=new Resident(core,access,residentProvider);this.resident.budget=budget
          this.discovery=acquire?new Discovery(core,acquire):undefined
          this.sourceOperatorAllowed=id=>auth.operatorAllowed(id)
          this.operatorOf=r=>{const p=auth.principal(r);return !!p&&auth.operatorAllowed(p.id)}
          this.writeGuard=r=>auth.writeGuard(r)
          const handler=api(core,{sourceFetcher:acquire,residentProvider,residentBudget:budget,modelRoute:modelRoute(env as unknown as ModelEnv),agentAccess:access,decisions:workerDecisions(env),runtime:'cloudflare-durable-object',catalogue:env.STRATA_CATALOGUE,authMode:'atproto',enrollmentMode,stewardDid:env.STRATA_STEWARD_DID,principal:r=>auth.principal(r),writeGuard:r=>auth.writeGuard(r)})
          this.handle=async request=>(await routes(request))??(await auth.route(request))??handler(request)
        }
      }else {const access=new AgentAccess(core),routes=agentRoutes(core,access),handler=api(core,{sourceFetcher:acquire,residentProvider,residentBudget:budget,modelRoute:modelRoute(env as unknown as ModelEnv),agentAccess:access,runtime:'cloudflare-durable-object',catalogue:env.STRATA_CATALOGUE});this.resident=new Resident(core,access,residentProvider);this.resident.budget=budget;this.discovery=acquire?new Discovery(core,acquire):undefined;this.sourceOperatorAllowed=()=>true;this.operatorOf=()=>true;this.writeGuard=()=>{};this.handle=async r=>(await routes(r))??handler(r)}
    })
  }
  private alarmUpdates:Promise<void>=Promise.resolve()
  /** The alarm time last written (null: none). Each setAlarm is a storage write,
   * so an unchanged schedule is not written again on every request. */
  private armed:number|null|undefined
  private arm(){
    const update=this.alarmUpdates.then(async()=>{
      const candidates=[this.resident?.nextWake(),this.discovery?.nextWake()].filter((n):n is number=>typeof n==='number')
      const next=candidates.length?Math.min(...candidates):null
      if(next===null){if(this.armed!==null){await this.ctx.storage.deleteAlarm();this.armed=null}return}
      const at=Math.max(Date.now()+1000,next)
      // An alarm already due in the future, no later than needed, fires and re-arms itself.
      if(typeof this.armed==='number'&&this.armed>Date.now()&&this.armed<=at)return
      await this.ctx.storage.setAlarm(at);this.armed=at
    })
    this.alarmUpdates=update.catch(()=>{})
    return update
  }
  /** The operator's model choice, read by the model gateway before each call. */
  async modelChoice():Promise<ModelChoice|null>{return validModelChoice(await this.ctx.storage.get('model-choice'))}
  /** For the model gateway (a binding, never a public route): the Studio key and the model choice. */
  async modelSettings():Promise<{stored:StoredKey|null;choice:ModelChoice|null}>{return {stored:(await this.ctx.storage.get<StoredKey>('model-key'))??null,choice:await this.modelChoice()}}
  private async modelState(){const {stored,choice}=await this.modelSettings();return {stored,choice,env:effectiveEnv(this.env as unknown as ModelEnv,stored,choice)}}
  async request(request: Request): Promise<Response> {
    const url=new URL(request.url)
    if(url.pathname==='/v1/ops/usage'&&request.method==='GET')return this.operatorOf(request)?json(200,{...this.meter.report(),models:modelRoute((await this.modelState()).env)}):json(404,{error:'Not found'})
    // The operator picks the keyed provider's model from its own list. Stored in this node's storage, not in a deploy.
    if(url.pathname==='/v1/ops/models'&&request.method==='GET'){
      if(!this.operatorOf(request))return json(404,{error:'Not found'})
      const {stored,choice,env}=await this.modelState()
      const key=stored?{source:'studio',last4:stored.key.slice(-4),added:stored.added}:(this.env as unknown as ModelEnv).STRATA_MODEL_KEY?{source:'github',last4:null,added:null}:null
      return json(200,{route:modelRoute(env),choice,key,available:key?await providerModels(listingEnv(env)):null})
    }
    if(url.pathname==='/v1/ops/model'&&request.method==='POST'){
      if(!this.operatorOf(request))return json(404,{error:'Not found'})
      try{this.writeGuard(request)}catch(error){return json(error instanceof Fault?error.status:403,{error:error instanceof Fault?error.message:'Not allowed'})}
      const {env}=await this.modelState()
      if(!env.STRATA_MODEL_KEY)return json(409,{error:'Belum ada kunci model. Tambahkan kunci lebih dulu.'})
      let body:unknown;try{body=await request.json()}catch{return json(400,{error:'Invalid JSON'})}
      if((body as {reset?:unknown})?.reset===true){await this.ctx.storage.delete('model-choice');return json(200,{choice:null})}
      const choice=validModelChoice(body);if(!choice)return json(400,{error:'Nama model tidak valid'})
      const available=await providerModels(listingEnv(env))
      if(available&&(!available.includes(choice.fast)||(choice.synthesis&&!available.includes(choice.synthesis))))return json(400,{error:'Model ini tidak ada di daftar penyedia'})
      await this.ctx.storage.put('model-choice',choice)
      return json(200,{choice})
    }
    // The operator adds the provider key here instead of in a deploy. It is checked against the provider first,
    // kept in this node's storage, and never returned; the browser sees only its last four characters.
    if(url.pathname==='/v1/ops/model-key'&&request.method==='POST'){
      if(!this.operatorOf(request))return json(404,{error:'Not found'})
      try{this.writeGuard(request)}catch(error){return json(error instanceof Fault?error.status:403,{error:error instanceof Fault?error.message:'Not allowed'})}
      let body:unknown;try{body=await request.json()}catch{return json(400,{error:'Invalid JSON'})}
      if((body as {remove?:unknown})?.remove===true){
        await this.ctx.storage.delete('model-key')
        Object.assign(this.budget,residentBudget(this.env as {STRATA_RESIDENT_DAILY_CALLS?:string},!!(this.env as unknown as ModelEnv).STRATA_MODEL_KEY))
        return json(200,{removed:true})
      }
      const input=validKeyInput(body);if(!input)return json(400,{error:'Kunci atau alamat penyedia tidak valid'})
      const stored:StoredKey={...input,added:Date.now()}
      const available=await providerModels(listingEnv(effectiveEnv(this.env as unknown as ModelEnv,stored,null)))
      if(!available)return json(400,{error:'Penyedia menolak kunci ini atau tidak dapat dihubungi. Periksa kuncinya dan coba lagi.'})
      await this.ctx.storage.put('model-key',stored)
      let choice=await this.modelChoice()
      if(!choice||!available.includes(choice.fast)){const first=defaultModel(available);choice=first?{fast:first}:null;if(choice)await this.ctx.storage.put('model-choice',choice);else await this.ctx.storage.delete('model-choice')}
      Object.assign(this.budget,residentBudget(this.env as {STRATA_RESIDENT_DAILY_CALLS?:string},true))
      return json(200,{last4:stored.key.slice(-4),choice,available:available.length})
    }
    const mark=this.meter.start()
    let status=500
    try{const response=await this.handle(request);status=response.status;await this.arm();return response}
    finally{this.meter.finish(mark,request.method,routeShape(url.pathname),status)}
  }
  async residentAuthority(work:ResidentWork,operation:string,input:Record<string,unknown>={}){
    if(!this.resident)throw new Fault(503,'Resident authority is unavailable')
    return this.resident.authority(operation,work,input)
  }
  async alarm(){
    // Persist a recovery wake before network work; an exception cannot strand jobs.
    this.armed=Date.now()+60000
    await this.ctx.storage.setAlarm(this.armed)
    const mark=this.meter.start()
    try{await this.discovery?.tick(this.sourceOperatorAllowed);await this.resident?.tick()}finally{this.meter.finish(mark,'ALARM','alarm',200);await this.arm()}
  }
}

/** Named binding-only authority for the optional runtime. No public route. */
export class ResidentAuthority extends WorkerEntrypoint<Cloudflare.Env>{
 async fetch(request:Request){
  try{
   const path=new URL(request.url).pathname
   if(request.method!=='POST'||!['/work','/context','/inference','/wiki-search','/web-call','/web-read'].includes(path))return json(404,{error:'Not found'})
   const input=await body(request,8192),work=parseResidentWork(input.work)
   // Only these bounded fields cross the binding; the work capability is re-validated by the node.
   const fields={requestKey:input.requestKey,query:input.query,tool:input.tool,page:input.page}
   return json(200,await this.env.STRATA.getByName(this.env.STRATA_NODE).residentAuthority(work,path.slice(1),fields))
  }catch(error){return json(error instanceof Fault?error.status:503,{error:error instanceof Fault?error.message:'Resident authority unavailable'})}
 }
}

/** Binding-only model endpoint for the resident runtime: Workers AI Gemma 4, or
 * the operator's keyed provider (see models.ts). No public route. */
export class ModelGateway extends WorkerEntrypoint<Cloudflare.Env>{
 async fetch(request:Request){
  // The Studio key and model choice live in the node; reading them costs one call to it.
  const settings=await this.env.STRATA.getByName(this.env.STRATA_NODE).modelSettings().catch(()=>null)
  return modelGateway(request,nodeModels(effectiveEnv(this.env as unknown as ModelEnv,settings?.stored,settings?.choice)))
 }
}

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    try {
      const expected=new URL(env.STRATA_ORIGIN)
      if(new URL(request.url).origin!==expected.origin || expected.href!==expected.origin+'/') return json(400,{error:'Unexpected host'})
      // Fixed deployment-controlled node: untrusted host/path/query cannot select
      // another authority. A separate deployment has a separate DO namespace.
      return await env.STRATA.getByName(env.STRATA_NODE).request(request)
    } catch { return json(503,{error:'Node unavailable'}) }
  },
} satisfies ExportedHandler<Cloudflare.Env>
