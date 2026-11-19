import {test} from 'node:test'
import assert from 'node:assert/strict'
import {providerModels,validModelChoice,withChoice,keyedProvider,type ModelEnv} from '../src/models.ts'

const keyed:ModelEnv={STRATA_MODEL_KEY:'k',STRATA_MODEL_BASE_URL:'https://generativelanguage.googleapis.com/v1beta/openai',STRATA_MODEL_FAST:'from-env'}

test('a model choice must be a plain model name',()=>{
 assert.deepEqual(validModelChoice({fast:'gemini-test-flash'}),{fast:'gemini-test-flash'})
 assert.deepEqual(validModelChoice({fast:'a',synthesis:'b-1.5'}),{fast:'a',synthesis:'b-1.5'})
 assert.deepEqual(validModelChoice({fast:'a',synthesis:''}),{fast:'a'})
 for(const bad of [null,{},{fast:''},{fast:'has space'},{fast:'x'.repeat(101)},{fast:'-lead'},{fast:'a',synthesis:'bad name'},{fast:42}])assert.equal(validModelChoice(bad),null,JSON.stringify(bad))
})

test('the choice replaces the keyed model and never touches a keyless node',()=>{
 const env=withChoice(keyed,{fast:'chosen',synthesis:'longer'})
 assert.equal(keyedProvider(env)!.fast,'chosen');assert.equal(keyedProvider(env)!.synthesis,'longer')
 assert.equal(keyedProvider(withChoice(keyed,{fast:'chosen'}))!.synthesis,'chosen')
 assert.equal(withChoice(keyed,null),keyed)
 const keyless:ModelEnv={}
 assert.equal(withChoice(keyless,{fast:'chosen'}),keyless)
})

test('the provider list is read from GET /models with the key, names only, deduplicated',async()=>{
 let seen:{url:string;auth:string|null}|null=null
 const fetcher=(async(url:string,init:RequestInit)=>{seen={url,auth:new Headers(init.headers).get('authorization')};return new Response(JSON.stringify({data:[{id:'models/gemini-b'},{id:'gemini-a'},{id:'models/gemini-b'},{id:'bad name'},{nope:1}]}),{status:200})}) as unknown as typeof fetch
 assert.deepEqual(await providerModels(keyed,fetcher),['gemini-a','gemini-b'])
 assert.equal(seen!.url,'https://generativelanguage.googleapis.com/v1beta/openai/models');assert.equal(seen!.auth,'Bearer k')
 const refused=(async()=>new Response('no',{status:401})) as unknown as typeof fetch
 assert.equal(await providerModels(keyed,refused),null)
 const broken=(async()=>{throw new Error('down')}) as unknown as typeof fetch
 assert.equal(await providerModels(keyed,broken),null)
 assert.equal(await providerModels({},fetcher),null,'no key, no list')
})
