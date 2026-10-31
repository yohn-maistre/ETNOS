import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Agent } from '@atproto/api'
import { AtprotoPublisher } from '../src/atproto-publisher.ts'
import { COLLECTION, type PublicRecord } from '../src/transport.ts'

const did='did:web:sandbox.example'
const cid='bafyreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku'
const record:PublicRecord={$type:COLLECTION,text:'Synthetic public fixture',community:'https://example.org/community/music',createdAt:'2026-10-31T00:00:00.000Z',actorKind:'human'}
test('official AT SDK uses create-only CAS and CID-bound deletion; default writes are disabled',async()=>{
  const calls:{url:string;body:Record<string,unknown>}[]=[]
  const agent=new Agent({did,fetchHandler:async(url,init)=>{
    calls.push({url:String(url),body:init?.body ? JSON.parse(typeof init.body === 'string' ? init.body : Buffer.from(init.body as Uint8Array).toString('utf8')) : {}})
    return new Response(JSON.stringify(String(url).includes('putRecord') ? {uri:`at://${did}/${COLLECTION}/fixture`,cid} : {}),{headers:{'content-type':'application/json'}})
  }})
  await assert.rejects(new AtprotoPublisher(did,agent).put('fixture',record),/disabled/)
  assert.equal(calls.length,0)
  const publisher=new AtprotoPublisher(did,agent,{sandboxWrites:true})
  assert.equal((await publisher.put('fixture',record)).cid,cid)
  assert.equal(calls[0].body.swapRecord,null)
  assert.equal(calls[0].body.repo,did)
  assert.equal(calls[0].body.collection,COLLECTION)
  await publisher.remove('fixture',cid)
  assert.equal(calls[1].body.swapRecord,cid)
  await assert.rejects(new AtprotoPublisher('did:web:other.example',agent,{sandboxWrites:true}).put('fixture',record),/mismatch/)
})
test('AT record-not-found is distinct from upstream/network failure',async()=>{
  let unavailable=false
  const agent=new Agent({did,fetchHandler:async()=>new Response(JSON.stringify(unavailable ? {error:'UpstreamFailure'} : {error:'RecordNotFound'}),{status:unavailable ? 503 : 400,headers:{'content-type':'application/json'}})})
  const publisher=new AtprotoPublisher(did,agent)
  assert.equal(await publisher.read('fixture'),null)
  unavailable=true
  await assert.rejects(publisher.read('fixture'))
})
