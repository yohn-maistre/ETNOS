import {publicNews,type NewsFeed} from './news.ts'
import {decisionModel,type DecisionProvider} from './decisions.ts'
import {type DeskModel} from './desk.ts'
import {nodeModels,ModelError,type ModelEnv} from './models.ts'
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
/** The desk writes with the node's models: Workers AI Gemma 4 unless the operator set a keyed provider.
 * Low temperature, thinking off: the job is copying and retelling. */
export function workerDesk(env:Cloudflare.Env):DeskModel|undefined{
 const models=nodeModels(env as unknown as ModelEnv)
 if(!models)return undefined
 return async(messages,maxTokens)=>{
  let reply
  try{reply=await models.chat({purpose:'synthesis',messages,maxTokens:Math.min(maxTokens,2000),temperature:0.2})}
  catch(error){throw Error((error instanceof ModelError?error.code:'model-call')+': '+(error instanceof Error?error.message:'unknown').replace(/[^\w .:,()@/-]/g,' ').slice(0,160))}
  if(!reply.text.trim())throw Error('model-empty: no text')
  return {text:reply.text,inputTokens:reply.inputTokens,outputTokens:reply.outputTokens,model:reply.model}
 }
}
