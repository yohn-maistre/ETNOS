import {test} from 'node:test'
import assert from 'node:assert/strict'
import {SERVICES,service,serviceStatus,validServiceKey,effectiveServiceKey} from '../src/service-keys.ts'

const openalex=service('openalex')!

test('only listed services are accepted',()=>{
 assert.ok(openalex)
 for(const bad of ['x','__proto__',null,1])assert.equal(service(bad),null)
 assert.ok(SERVICES.every(s=>/^[a-z]+$/.test(s.id)&&/^https:\/\//.test(s.link)))
})

test('a key is one trimmed token of sane length',()=>{
 assert.equal(validServiceKey('  abcdefgh12 '),'abcdefgh12')
 for(const bad of ['short','has space inside','x'.repeat(301),42,null])assert.equal(validServiceKey(bad),null)
})

test('status never carries the key, only its last four characters',()=>{
 const st=serviceStatus(openalex,{key:'secret-key-9876',added:1},{})
 assert.deepEqual(st.key,{source:'studio',last4:'9876',added:1})
 assert.ok(!JSON.stringify(st).includes('secret-key'))
 assert.deepEqual(serviceStatus(openalex,null,{OPENALEX_API_KEY:'deploy-secret'}).key,{source:'github',last4:null,added:null})
 assert.ok(!JSON.stringify(serviceStatus(openalex,null,{OPENALEX_API_KEY:'deploy-secret'})).includes('deploy-secret'))
 assert.equal(serviceStatus(openalex,null,{}).key,null)
})

test('the Studio key wins over the deploy secret',()=>{
 assert.equal(effectiveServiceKey(openalex,{key:'studio-key',added:1},{OPENALEX_API_KEY:'env-key'}),'studio-key')
 assert.equal(effectiveServiceKey(openalex,null,{OPENALEX_API_KEY:'env-key'}),'env-key')
 assert.equal(effectiveServiceKey(openalex,null,{}),undefined)
})

test('a key is checked against the service before it is kept',async()=>{
 let seen=''
 const good=(async(url:string,init:RequestInit)=>{seen=String(url)+' '+(init.headers as Record<string,string>).authorization;return new Response('{}')}) as unknown as typeof fetch
 const bad=(async()=>new Response('no',{status:401})) as unknown as typeof fetch
 assert.equal(await openalex.check('k-1234567',good),true)
 assert.match(seen,/^https:\/\/api\.openalex\.org\/.* Bearer k-1234567$/)
 assert.equal(await openalex.check('k-1234567',bad),false)
 assert.equal(await openalex.check('k-1234567',(async()=>{throw new Error('down')}) as unknown as typeof fetch),false)
})
