import {createProvider,type Model,type ProviderStreams} from '@earendil-works/pi-ai'
import {openAICompletionsApi} from '@earendil-works/pi-ai/api/openai-completions.lazy'
import {redactPublicModelText} from '../../../src/redaction.ts'
import type {ResidentWork} from '../../../src/resident-contract.ts'
import {authority,type ServicePort} from './authority.ts'
export type UsageReceipt={model:string;input:number;output:number}
/** Each provider closure is bound to one immutable work capability. Old tasks,
 * helper conversations and compactions cannot borrow a newer job's authority. */
export function jobProvider(work:ResidentWork,ports:{authority:ServicePort;gateway:ServicePort},record:(usage:UsageReceipt)=>void){
 const providerId='strata-'+work.jobId+'-'+work.generation
 const models:Model<'openai-completions'>[]=['fast','synthesis'].map(id=>({id,name:'Configured WPW '+id+' route',api:'openai-completions',provider:providerId,baseUrl:'https://commons-model.internal/v1',reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:8192,maxTokens:600}))
 const transport:typeof fetch=async(input,init)=>{
  const request=new Request(input,init),target=new URL(request.url)
  if(target.origin!=='https://commons-model.internal'||target.pathname!=='/v1/chat/completions')throw Error('Runtime model egress refused')
  const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>32768)throw Error('Runtime context budget reached')
  const body=JSON.parse(raw),model=body.model==='synthesis'?'synthesis':'fast'
  const grant=await authority(ports.authority,'inference',work,crypto.randomUUID())
  const minimal={messages:body.messages,tools:body.tools,max_tokens:Math.min(Number(body.max_tokens??body.max_completion_tokens??500),grant.maxOutputTokens),stream:false}
  const response=await ports.gateway.fetch(new Request('https://commons-model.internal/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json','x-strata-purpose':model},body:redactPublicModelText(JSON.stringify(minimal)).text,signal:request.signal}))
  if(!response.ok){await response.body?.cancel();throw Error('Configured model route unavailable; no automatic fallback')}
  const reader=response.body?.getReader();if(!reader)throw Error('Empty model response');let n=0;const parts:Uint8Array[]=[]
  try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>65536)throw Error('Model output budget reached');parts.push(r.value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
  const bytes=new Uint8Array(n);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length}const data=JSON.parse(new TextDecoder().decode(bytes)),message=data?.choices?.[0]?.message
  if(!message||typeof message!=='object')throw Error('Invalid model response')
  const content=typeof message.content==='string'?redactPublicModelText(message.content).text:'',toolCalls=Array.isArray(message.tool_calls)?message.tool_calls:undefined
  record({model:String(data.model??'gateway:unknown').slice(0,200),input:Number(data.usage?.prompt_tokens??0),output:Number(data.usage?.completion_tokens??0)})
  // Pi's official OpenAI wire adapter receives a normalized SSE representation.
  // The trusted gateway is buffered/bounded; no hand-written agent loop is used.
  const chunk={id:crypto.randomUUID(),object:'chat.completion.chunk',created:Math.floor(Date.now()/1000),model:String(data.model??model),choices:[{index:0,delta:{role:'assistant',content,...(toolCalls?{tool_calls:toolCalls.map((t:object,i:number)=>({...t,index:i}))}:{})},finish_reason:null}]}
  const end={...chunk,choices:[{index:0,delta:{},finish_reason:toolCalls?.length?'tool_calls':'stop'}],usage:data.usage}
  return new Response('data: '+JSON.stringify(chunk)+'\n\ndata: '+JSON.stringify(end)+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}})
 }
 const wire=openAICompletionsApi(),api:ProviderStreams={stream:(m,c,o)=>wire.stream(m,c,{...o,fetch:transport,maxRetries:0,timeoutMs:20000}),streamSimple:(m,c,o)=>wire.streamSimple(m,c,{...o,fetch:transport,maxRetries:0,timeoutMs:20000})}
 return createProvider({id:providerId,name:'Strata work-scoped gateway',baseUrl:'https://commons-model.internal/v1',models,auth:{apiKey:{name:'private service binding',resolve:async()=>({auth:{apiKey:'service-binding'}})}},api})
}
