import {test} from 'node:test'
import assert from 'node:assert/strict'
import {nodeModels,keyedProvider,modelRoute,modelGateway,normalize,keylessModel,type ModelEnv} from '../src/models.ts'

const studio={ETNOS_MODEL_BASE_URL:'https://generativelanguage.googleapis.com/v1beta/openai/',ETNOS_MODEL_KEY:'test-key',ETNOS_MODEL_FAST:'fast-model',ETNOS_MODEL_SYNTHESIS:'long-model'}
const ai=(reply:unknown=({response:'dari gemma',usage:{prompt_tokens:3,completion_tokens:2}}))=>{const calls:{model:string;input:any}[]=[];return {calls,AI:{run:async(model:string,input:unknown)=>{calls.push({model,input});return reply}}}}
const ok=(body:unknown)=>new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}})

test('keyless by default: Workers AI Gemma 4 with thinking off',async()=>{
 const w=ai(),models=nodeModels({AI:w.AI})!
 const r=await models.chat({purpose:'fast',messages:[{role:'user',content:'halo'}],maxTokens:100})
 assert.equal(r.text,'dari gemma');assert.equal(r.route,'keyless');assert.equal(r.model,keylessModel)
 assert.equal(w.calls[0].model,keylessModel);assert.equal(w.calls[0].input.chat_template_kwargs.enable_thinking,false)
 assert.equal(nodeModels({}),undefined)
})

test('a keyed provider is used when complete and HTTPS, with the key only in the header',async()=>{
 const seen:{url:string;init:RequestInit}[]=[]
 const fetcher=(async(url:string,init:RequestInit)=>{seen.push({url,init});return ok({model:'long-model-001',choices:[{message:{content:'dari kunci'}}],usage:{prompt_tokens:5,completion_tokens:4}})}) as unknown as typeof fetch
 const w=ai(),models=nodeModels({...studio,AI:w.AI},fetcher)!
 const r=await models.chat({purpose:'synthesis',messages:[{role:'user',content:'halo'}],maxTokens:100})
 assert.equal(r.text,'dari kunci');assert.equal(r.route,'key');assert.equal(r.model,'long-model-001')
 assert.equal(seen[0].url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions')
 assert.equal((seen[0].init.headers as Record<string,string>).authorization,'Bearer test-key')
 assert.equal(JSON.parse(String(seen[0].init.body)).model,'long-model');assert.ok(!String(seen[0].init.body).includes('test-key'))
 assert.equal(w.calls.length,0)
 // Incomplete or unsafe settings are ignored, never half-used.
 assert.equal(keyedProvider({...studio,ETNOS_MODEL_KEY:''}),undefined)
 assert.equal(keyedProvider({...studio,ETNOS_MODEL_BASE_URL:'http://example.com/v1'}),undefined)
 assert.equal(keyedProvider({...studio,ETNOS_MODEL_BASE_URL:'https://user:pw@example.com/v1'}),undefined)
 assert.equal(keyedProvider({...studio,ETNOS_MODEL_SYNTHESIS:''})!.synthesis,'fast-model')
})

test('rate limits and outages fall back to Workers AI once; a refused request does not',async()=>{
 for(const status of [429,500,503]){
  const w=ai(),models=nodeModels({...studio,AI:w.AI},(async()=>new Response('{}',{status})) as unknown as typeof fetch)!
  const r=await models.chat({purpose:'fast',messages:[{role:'user',content:'x'}],maxTokens:50})
  assert.equal(r.route,'keyless');assert.equal(w.calls.length,1)
 }
 const w=ai(),models=nodeModels({...studio,AI:w.AI},(async()=>new Response('{}',{status:401})) as unknown as typeof fetch)!
 await assert.rejects(models.chat({purpose:'fast',messages:[{role:'user',content:'x'}],maxTokens:50}),/refused/);assert.equal(w.calls.length,0)
 const unreachable=nodeModels(studio,(async()=>{throw Error('down')}) as unknown as typeof fetch)!
 await assert.rejects(unreachable.chat({purpose:'fast',messages:[{role:'user',content:'x'}],maxTokens:50}),/unreachable/)
})

test('both reply shapes normalize, tool calls included',()=>{
 const legacy=normalize({response:'',tool_calls:[{name:'search_reviewed_wiki',arguments:{query:'Mee'}}]},keylessModel,'keyless')
 assert.equal(legacy.toolCalls![0].function.name,'search_reviewed_wiki');assert.equal(legacy.toolCalls![0].function.arguments,'{"query":"Mee"}')
 const openai=normalize({choices:[{message:{content:null,tool_calls:[{id:'c1',type:'function',function:{name:'web_fetch',arguments:'{"url":"https://a.example"}'}}]}}]},'m','key')
 assert.equal(openai.toolCalls![0].id,'c1')
 assert.throws(()=>normalize({choices:[{message:{content:''}}]},'m','key'),/Empty/)
 assert.throws(()=>normalize({response:'',tool_calls:[{name:'bad name!',arguments:'{}'}]},'m','key'),/Empty/)
})

test('the gateway bounds the request and answers in the OpenAI shape',async()=>{
 const w=ai({choices:[{message:{content:'jawab'}}],usage:{prompt_tokens:1,completion_tokens:1}}),models=nodeModels({AI:w.AI})!
 const post=(body:unknown,path='/v1/chat/completions',purpose='synthesis')=>new Request('https://commons-model.internal'+path,{method:'POST',headers:{'x-etnos-purpose':purpose},body:typeof body==='string'?body:JSON.stringify(body)})
 const res=await modelGateway(post({messages:[{role:'user',content:'halo'}],max_tokens:5000}),models)
 assert.equal(res.status,200);const data=await res.json() as any
 assert.equal(data.choices[0].message.content,'jawab');assert.equal(data.choices[0].finish_reason,'stop');assert.equal(w.calls[0].input.max_completion_tokens,600)
 assert.equal((await modelGateway(post({messages:[]}),models)).status,400)
 assert.equal((await modelGateway(post({messages:[{role:'root',content:'x'}]}),models)).status,400)
 assert.equal((await modelGateway(post('x'.repeat(40000)),models)).status,413)
 assert.equal((await modelGateway(post({messages:[{role:'user',content:'x'}]},'/v1/embeddings'),models)).status,404)
 assert.equal((await modelGateway(post({messages:[{role:'user',content:'x'}]}),undefined)).status,503)
})

test('the operator view of the route never contains the key',()=>{
 const view=JSON.stringify(modelRoute({...studio,AI:ai().AI} as ModelEnv))
 assert.ok(!view.includes('test-key'));assert.ok(view.includes('generativelanguage.googleapis.com'));assert.ok(view.includes(keylessModel))
})
