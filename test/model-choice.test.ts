import {test} from 'node:test'
import assert from 'node:assert/strict'
import {providerModels,validModelChoice,withChoice,keyedProvider,type ModelEnv} from '../src/models.ts'

const keyed:ModelEnv={ETNOS_MODEL_KEY:'k',ETNOS_MODEL_BASE_URL:'https://generativelanguage.googleapis.com/v1beta/openai',ETNOS_MODEL_FAST:'from-env'}

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

import {validKeyInput,effectiveEnv,defaultModel,listingEnv,GOOGLE_OPENAI_BASE} from '../src/models.ts'

test('a Studio key is trimmed, must look like a key, and defaults to Google AI Studio',()=>{
 assert.deepEqual(validKeyInput({key:'  AIzaSyExampleExample12345  '}),{key:'AIzaSyExampleExample12345',baseUrl:GOOGLE_OPENAI_BASE})
 assert.deepEqual(validKeyInput({key:'sk-example-1234567890',baseUrl:'https://api.example.org/v1/'}),{key:'sk-example-1234567890',baseUrl:'https://api.example.org/v1'})
 for(const bad of [null,{},{key:'short'},{key:'has space inside key'},{key:'x'.repeat(301)},{key:'validkey12345',baseUrl:'http://plain.example.org'},{key:'validkey12345',baseUrl:'https://u:p@example.org'}])assert.equal(validKeyInput(bad),null,JSON.stringify(bad))
})

test('the Studio key takes precedence over the deploy key, and the choice applies on top',()=>{
 const deployed={ETNOS_MODEL_KEY:'from-github',ETNOS_MODEL_BASE_URL:'https://deployed.example.org/v1',ETNOS_MODEL_FAST:'deployed-model'}
 const e=effectiveEnv(deployed,{key:'from-studio',baseUrl:GOOGLE_OPENAI_BASE,added:1},{fast:'picked'})
 assert.equal(e.ETNOS_MODEL_KEY,'from-studio');assert.equal(e.ETNOS_MODEL_BASE_URL,GOOGLE_OPENAI_BASE);assert.equal(e.ETNOS_MODEL_FAST,'picked')
 assert.equal(effectiveEnv(deployed,null,null),deployed)
 assert.equal((effectiveEnv({},null,{fast:'picked'}) as {ETNOS_MODEL_FAST?:string}).ETNOS_MODEL_FAST,undefined,'a choice without any key does nothing')
 assert.equal((listingEnv({}) as {ETNOS_MODEL_FAST?:string}).ETNOS_MODEL_FAST,'listing')
})

test('the first model is a general flash text model when the provider has one',()=>{
 assert.equal(defaultModel(['text-embedding-x','gemini-x-flash-lite','gemini-x-flash','gemini-x-pro']),'gemini-x-flash')
 assert.equal(defaultModel(['gemini-x-flash-image','gemini-x-flash-preview']),'gemini-x-flash-preview')
 assert.equal(defaultModel(['model-a','model-b']),'model-a')
 assert.equal(defaultModel(['text-embedding-x']),null)
})
