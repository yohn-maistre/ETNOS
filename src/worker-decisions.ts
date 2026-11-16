import {publicNews,type NewsFeed} from './news.ts'
import {decisionModel,type DecisionProvider} from './decisions.ts'
import {deskModel,type DeskModel} from './desk.ts'
/** Fixed AI binding and public-news service. No caller-selected model, URL or credentials. */
export function workerDecisions(env:Cloudflare.Env):DecisionProvider|undefined{
 if(env.STRATA_DECISIONS_ENABLED!=='true'||!env.AI)return undefined
 return {
  async news(){
   if(!env.WATCH_NEWS)throw Error('Public news unavailable')
   const upstream:typeof fetch=async(input,options)=>{const target=new URL(String(input));return env.WATCH_NEWS.fetch(new Request('https://watch.internal'+target.pathname.replace(/^\/api/,'')+target.search,{headers:{accept:'application/json'},signal:options?.signal}))}
   const result=await publicNews(upstream,new URLSearchParams({limit:'20',desk:'focus'}))
   if(!result.ok)throw Error('Public news unavailable')
   return ((await result.json()) as NewsFeed).items.map(({id,title,publishedAt})=>({id,title,publishedAt}))
  },
  async run(input){return env.AI.run(decisionModel,input,{signal:AbortSignal.timeout(10000),tags:['etnos:public-suggestions']})},
 }
}
/** Fixed free-tier writing model for the desk. Thinking stays off: the job is copying and retelling. */
export function workerDesk(env:Cloudflare.Env):DeskModel|undefined{
 if(!env.AI)return undefined
 return async(messages,maxTokens)=>{
  type Reply={response?:unknown;choices?:{message?:{content?:unknown};finish_reason?:unknown}[];usage?:{prompt_tokens?:number;completion_tokens?:number}}
  let raw:Reply
  try{raw=await (env.AI.run as (model:string,input:unknown,options?:unknown)=>Promise<unknown>)(deskModel,{messages,max_completion_tokens:Math.min(maxTokens,2000),temperature:0.2,chat_template_kwargs:{enable_thinking:false}},{signal:AbortSignal.timeout(90000)}) as Reply}
  catch(error){throw Error('model-call: '+(error instanceof Error?error.name+' '+error.message:'unknown').replace(/[^\w .:,()@/-]/g,' ').slice(0,160))}
  const text=typeof raw?.response==='string'?raw.response:typeof raw?.choices?.[0]?.message?.content==='string'?raw.choices[0].message.content:''
  if(!text.trim())throw Error('model-empty: keys '+Object.keys(raw??{}).join(',').slice(0,80)+' finish '+String(raw?.choices?.[0]?.finish_reason??'').slice(0,20))
  return {text,inputTokens:Number(raw.usage?.prompt_tokens??0),outputTokens:Number(raw.usage?.completion_tokens??0)}
 }
}
