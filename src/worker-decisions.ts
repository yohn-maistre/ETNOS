import {publicNews,type NewsFeed} from './news.ts'
import {decisionModel,type DecisionProvider} from './decisions.ts'
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
