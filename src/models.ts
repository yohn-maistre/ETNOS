/**
 * The node's language models.
 *
 * Keyless by default: Workers AI Gemma 4 through the node's own `AI` binding.
 * An operator may add one OpenAI-compatible provider (base URL, model names and
 * a key kept as a Worker secret). Google AI Studio works this way through
 * `https://generativelanguage.googleapis.com/v1beta/openai`. When the keyed
 * provider is rate limited or down, the call falls back to Workers AI once, and
 * the reply names the model that actually answered.
 *
 * Free hosted models may keep prompts. Callers send public material only.
 */

export const keylessModel='@cf/google/gemma-4-26b-a4b-it'
export type ModelPurpose='fast'|'synthesis'
export type ChatMessage={role:'system'|'user'|'assistant'|'tool';content:string|null;tool_calls?:ToolCall[];tool_call_id?:string;name?:string}
export type ToolCall={id:string;type:'function';function:{name:string;arguments:string}}
export type ChatRequest={purpose:ModelPurpose;messages:ChatMessage[];tools?:unknown[];maxTokens:number;temperature?:number;signal?:AbortSignal}
export type ChatReply={text:string;toolCalls?:ToolCall[];model:string;route:'key'|'keyless';inputTokens:number;outputTokens:number}
export type ModelEnv={AI?:{run:(model:string,input:unknown,options?:unknown)=>Promise<unknown>};ETNOS_MODEL_BASE_URL?:string;ETNOS_MODEL_KEY?:string;ETNOS_MODEL_FAST?:string;ETNOS_MODEL_SYNTHESIS?:string;ETNOS_MODEL_REASONING?:string}
export class ModelError extends Error{readonly code:'model-unavailable'|'model-output'|'model-config';constructor(code:'model-unavailable'|'model-output'|'model-config',message:string){super(message);this.code=code}}

type Keyed={baseUrl:string;key:string;fast:string;synthesis:string;reasoning?:string}
const MAX_REPLY=65536

/** Reads the keyed provider from the environment. Incomplete or non-HTTPS settings are ignored, never half-used. */
export function keyedProvider(env:ModelEnv):Keyed|undefined{
 const key=env.ETNOS_MODEL_KEY?.trim(),base=env.ETNOS_MODEL_BASE_URL?.trim(),fast=env.ETNOS_MODEL_FAST?.trim()
 if(!key||!base||!fast)return undefined
 let url:URL;try{url=new URL(base)}catch{return undefined}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)return undefined
 const reasoning=env.ETNOS_MODEL_REASONING?.trim()
 return {baseUrl:url.href.replace(/\/+$/,''),key,fast,synthesis:env.ETNOS_MODEL_SYNTHESIS?.trim()||fast,...(reasoning&&/^[a-z]{1,12}$/.test(reasoning)?{reasoning}:{})}
}

/** Which route a node would use, without the key. Safe for an operator page. */
export function modelRoute(env:ModelEnv){
 const keyed=keyedProvider(env)
 return {keyless:env.AI?keylessModel:null,keyed:keyed?{host:new URL(keyed.baseUrl).host,fast:keyed.fast,synthesis:keyed.synthesis}:null}
}

export type Models={chat:(request:ChatRequest)=>Promise<ChatReply>}

export function nodeModels(env:ModelEnv,fetcher:typeof fetch=fetch):Models|undefined{
 const keyed=keyedProvider(env),ai=env.AI
 if(!keyed&&!ai)return undefined
 return {async chat(request){
  if(keyed){
   try{return await keyedChat(keyed,request,fetcher)}
   catch(error){if(!ai||!(error instanceof ModelError)||error.code!=='model-unavailable'||request.signal?.aborted)throw error}
  }
  return keylessChat(ai!,request)
 }}
}

async function keyedChat(p:Keyed,request:ChatRequest,fetcher:typeof fetch):Promise<ChatReply>{
 const model=request.purpose==='synthesis'?p.synthesis:p.fast
 const body={model,messages:request.messages,max_tokens:request.maxTokens,...(request.temperature===undefined?{}:{temperature:request.temperature}),...(request.tools?.length?{tools:request.tools}:{}),...(p.reasoning?{reasoning_effort:p.reasoning}:{})}
 const openrouter=new URL(p.baseUrl).hostname==='openrouter.ai'
 const headers:Record<string,string>={'content-type':'application/json',authorization:'Bearer '+p.key,...(openrouter?{'HTTP-Referer':'https://etnos.space','X-Title':'ETNOS'}:{})}
 let response:Response
 try{response=await fetcher(p.baseUrl+'/chat/completions',{method:'POST',redirect:'error',headers,body:JSON.stringify(body),signal:request.signal??AbortSignal.timeout(60000)})}
 catch{throw new ModelError('model-unavailable','Keyed provider unreachable')}
 if(response.status===402||response.status===408||response.status===429||response.status>=500){await response.body?.cancel().catch(()=>{});throw new ModelError('model-unavailable','Keyed provider '+response.status)}
 // 4xx other than 402/408/429 means the request or the key is wrong. Falling back would hide it.
 if(!response.ok){await response.body?.cancel().catch(()=>{});throw new ModelError('model-config','Keyed provider refused the request ('+response.status+')')}
 return normalize(await bounded(response),model,'key')
}

async function keylessChat(ai:NonNullable<ModelEnv['AI']>,request:ChatRequest):Promise<ChatReply>{
 let raw:unknown
 // Thinking stays off: these jobs retell and choose; they do not need long reasoning.
 try{raw=await ai.run(keylessModel,{messages:request.messages,max_completion_tokens:request.maxTokens,temperature:request.temperature??0.2,...(request.tools?.length?{tools:request.tools}:{}),chat_template_kwargs:{enable_thinking:false}},{signal:request.signal??AbortSignal.timeout(90000)})}
 catch(error){throw new ModelError('model-unavailable','Workers AI: '+(error instanceof Error?error.message:'unknown').replace(/[^\w .:,()@/-]/g,' ').slice(0,160))}
 return normalize(raw,keylessModel,'keyless')
}

async function bounded(response:Response){
 const reader=response.body?.getReader();if(!reader)throw new ModelError('model-output','Empty model response')
 const parts:Uint8Array[]=[];let n=0
 try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>MAX_REPLY)throw new ModelError('model-output','Model response too large');parts.push(r.value)}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 const bytes=new Uint8Array(n);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length}
 try{return JSON.parse(new TextDecoder().decode(bytes)) as unknown}catch{throw new ModelError('model-output','Model response is not JSON')}
}

type Raw={model?:unknown;response?:unknown;tool_calls?:unknown;choices?:{message?:{content?:unknown;tool_calls?:unknown}}[];usage?:{prompt_tokens?:unknown;completion_tokens?:unknown}}
/** Accepts the OpenAI shape and the older Workers AI shape (`response`, top-level `tool_calls`). */
export function normalize(value:unknown,fallbackModel:string,route:'key'|'keyless'):ChatReply{
 if(!value||typeof value!=='object')throw new ModelError('model-output','Invalid model response')
 const raw=value as Raw,message=raw.choices?.[0]?.message
 const text=typeof message?.content==='string'?message.content:typeof raw.response==='string'?raw.response:''
 const calls=toolCalls(message?.tool_calls??raw.tool_calls)
 if(!text.trim()&&!calls)throw new ModelError('model-output','Empty model response')
 return {text,...(calls?{toolCalls:calls}:{}),model:(typeof raw.model==='string'&&raw.model?raw.model:fallbackModel).slice(0,200),route,inputTokens:Number(raw.usage?.prompt_tokens??0)||0,outputTokens:Number(raw.usage?.completion_tokens??0)||0}
}

function toolCalls(value:unknown):ToolCall[]|undefined{
 if(!Array.isArray(value)||!value.length)return undefined
 const out:ToolCall[]=[]
 for(const item of value.slice(0,8)){
  if(!item||typeof item!=='object')continue
  const c=item as {id?:unknown;name?:unknown;arguments?:unknown;function?:{name?:unknown;arguments?:unknown}}
  const name=c.function?.name??c.name,args=c.function?.arguments??c.arguments
  if(typeof name!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(name))continue
  out.push({id:typeof c.id==='string'&&c.id?c.id.slice(0,100):'call_'+crypto.randomUUID(),type:'function',function:{name,arguments:typeof args==='string'?args:JSON.stringify(args??{})}})
 }
 return out.length?out:undefined
}

const ROLES=new Set(['system','user','assistant','tool'])
/**
 * The resident runtime's model endpoint, reached only through a service binding.
 * OpenAI-compatible request and reply. The runtime has already been granted
 * inference for its job by the node; this only bounds the shape and size.
 */
export async function modelGateway(request:Request,models:Models|undefined):Promise<Response>{
 const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}})
 if(request.method!=='POST'||new URL(request.url).pathname!=='/v1/chat/completions')return reply(404,{error:'Not found'})
 if(!models)return reply(503,{error:'No model configured'})
 const raw=await request.text()
 if(new TextEncoder().encode(raw).byteLength>32768)return reply(413,{error:'Request too large'})
 let input:{messages?:unknown;tools?:unknown;max_tokens?:unknown}
 try{input=JSON.parse(raw)}catch{return reply(400,{error:'Invalid JSON'})}
 const messages=input.messages
 if(!Array.isArray(messages)||!messages.length||messages.length>40||messages.some(m=>!m||typeof m!=='object'||!ROLES.has((m as {role?:unknown}).role as string)))return reply(400,{error:'Invalid messages'})
 const tools=Array.isArray(input.tools)?input.tools.slice(0,8):undefined
 const maxTokens=Math.max(1,Math.min(Number(input.max_tokens)||500,600))
 // x-strata-purpose: the header's name before the rename, still sent by a resident Worker deployed before it.
 const purpose:ModelPurpose=(request.headers.get('x-etnos-purpose')??request.headers.get('x-strata-purpose'))==='synthesis'?'synthesis':'fast'
 try{
  const r=await models.chat({purpose,messages:messages as ChatMessage[],...(tools?{tools}:{}),maxTokens,signal:request.signal})
  return reply(200,{id:'chatcmpl-'+crypto.randomUUID(),object:'chat.completion',model:r.model,choices:[{index:0,message:{role:'assistant',content:r.text,...(r.toolCalls?{tool_calls:r.toolCalls}:{})},finish_reason:r.toolCalls?'tool_calls':'stop'}],usage:{prompt_tokens:r.inputTokens,completion_tokens:r.outputTokens}})
 }catch(error){
  const code=error instanceof ModelError?error.code:'model-unavailable'
  return reply(code==='model-output'?502:503,{error:code})
 }
}

/** A model the operator chose in Studio. It replaces ETNOS_MODEL_FAST (and SYNTHESIS) for the keyed provider only. */
export type ModelChoice={fast:string;synthesis?:string}
const MODEL_NAME=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/
export function validModelChoice(raw:unknown):ModelChoice|null{
 if(!raw||typeof raw!=='object')return null
 const {fast,synthesis}=raw as {fast?:unknown;synthesis?:unknown}
 if(typeof fast!=='string'||!MODEL_NAME.test(fast))return null
 if(synthesis!==undefined&&synthesis!==null&&synthesis!==''&&(typeof synthesis!=='string'||!MODEL_NAME.test(synthesis)))return null
 return {fast,...(typeof synthesis==='string'&&synthesis?{synthesis}:{})}
}
/** The environment with the operator's choice applied. Without a keyed provider the choice has no effect. */
export function withChoice<T extends ModelEnv>(env:T,choice:ModelChoice|null|undefined):T{
 const c=validModelChoice(choice)
 if(!c||!keyedProvider(env))return env
 return {...env,ETNOS_MODEL_FAST:c.fast,ETNOS_MODEL_SYNTHESIS:c.synthesis??c.fast}
}
/** The keyed provider's model list (OpenAI-compatible GET /models), names only. Google's ids come as "models/…". */
export async function providerModels(env:ModelEnv,fetcher:typeof fetch=fetch):Promise<string[]|null>{
 const p=keyedProvider(env);if(!p)return null
 let response:Response
 try{response=await fetcher(p.baseUrl+'/models',{method:'GET',redirect:'error',headers:{authorization:'Bearer '+p.key},signal:AbortSignal.timeout(10000)})}catch{return null}
 if(!response.ok){await response.body?.cancel().catch(()=>{});return null}
 let body:unknown;try{body=JSON.parse(new TextDecoder().decode(await new Response(response.body).arrayBuffer()).slice(0,262144))}catch{return null}
 const data=(body as {data?:unknown})?.data
 if(!Array.isArray(data))return null
 const names=data.map(m=>typeof (m as {id?:unknown})?.id==='string'?((m as {id:string}).id).replace(/^models\//,''):'').filter(n=>MODEL_NAME.test(n))
 return [...new Set(names)].sort().slice(0,300)
}

/** A key the operator added in Studio. It takes precedence over ETNOS_MODEL_KEY and is never sent to a browser. */
export type StoredKey={key:string;baseUrl:string;added:number}
export const GOOGLE_OPENAI_BASE='https://generativelanguage.googleapis.com/v1beta/openai'
export const OPENROUTER_OPENAI_BASE='https://openrouter.ai/api/v1'
export function validKeyInput(raw:unknown):{key:string;baseUrl:string}|null{
 if(!raw||typeof raw!=='object')return null
 const {key,baseUrl}=raw as {key?:unknown;baseUrl?:unknown}
 if(typeof key!=='string')return null
 const k=key.trim()
 if(k.length<10||k.length>300||/\s/.test(k))return null
 let base=k.startsWith('sk-or-')?OPENROUTER_OPENAI_BASE:GOOGLE_OPENAI_BASE
 if(typeof baseUrl==='string'&&baseUrl.trim()){try{const u=new URL(baseUrl.trim());if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return null;base=u.href.replace(/\/+$/,'')}catch{return null}}
 return {key:k,baseUrl:base}
}
/** The environment the node's models run with: the Studio key (if any), then the operator's model choice. */
export function effectiveEnv<T extends ModelEnv>(env:T,stored:StoredKey|null|undefined,choice:ModelChoice|null|undefined):T{
 let e:T=env
 if(stored?.key)e={...e,ETNOS_MODEL_KEY:stored.key,ETNOS_MODEL_BASE_URL:stored.baseUrl||GOOGLE_OPENAI_BASE}
 const c=validModelChoice(choice)
 if(c&&e.ETNOS_MODEL_KEY&&e.ETNOS_MODEL_BASE_URL)e={...e,ETNOS_MODEL_FAST:c.fast,ETNOS_MODEL_SYNTHESIS:c.synthesis??c.fast}
 return e
}
/** Lists models for a key before a model is chosen (keyedProvider needs a model name to count as configured). */
export const listingEnv=(env:ModelEnv):ModelEnv=>({...env,ETNOS_MODEL_FAST:env.ETNOS_MODEL_FAST||'listing'})
/** A sensible first model: a free or general "flash" text model if the provider has one. */
export function defaultModel(names:string[]):string|null{
 const text=names.filter(n=>!/(embed|image|imagen|tts|audio|live|vision|veo|aqa|learnlm|robotics|computer-use)/i.test(n))
 const free=text.filter(n=>/:free$/i.test(n))
 if(free.length){
  return free.find(n=>/(gemini|gemma|qwen|llama)/i.test(n)&&!/thinking|r1/i.test(n))??free[0]!
 }
 return text.find(n=>/flash/i.test(n)&&!/lite|preview|exp/i.test(n))??text.find(n=>/flash/i.test(n))??text[0]??null
}

