import {test} from 'node:test'
import assert from 'node:assert/strict'
import {NodeOAuthClient,JoseKey,type NodeSavedState,type NodeSavedSession} from '@atproto/oauth-client-node'
import {Strata} from '../src/store.ts'

const did='did:plc:abcdefghijklmnopqrstuvwx' as const,handle='friend.etnos.example'
function memory<T>() {const data=new Map<string,T>();return {get:(key:string)=>data.get(key),set:(key:string,value:T)=>{data.set(key,value)},del:(key:string)=>{data.delete(key)}}}
/** Resolution fixture only. All identity/network edges are injected and no OAuth
 * authorization/token request is made. Never configures a deployed handle. */
async function fixture() {
 let pds='https://provider.example',claimed=handle
 const key=await JoseKey.generate(['ES256'],'synthetic-handle-resolution')
 const client=new NodeOAuthClient({
  clientMetadata:{client_id:'https://client.example/oauth/client-metadata.json',application_type:'web',redirect_uris:['https://client.example/callback'],grant_types:['authorization_code','refresh_token'],response_types:['code'],scope:'atproto',token_endpoint_auth_method:'private_key_jwt',token_endpoint_auth_signing_alg:'ES256',jwks_uri:'https://client.example/jwks.json'},
  keyset:[key],stateStore:memory<NodeSavedState>(),sessionStore:memory<NodeSavedSession>(),
  // No credential operation is reachable in this fixture.
  requestLock:async(_name,fn)=>fn(),
  fetch:async(input,init)=>{const req=new Request(input,init),url=new URL(req.url);assert.equal(url.hostname,'plc.directory');assert.equal(decodeURIComponent(url.pathname),'/'+did);return Response.json({id:did,alsoKnownAs:['at://'+claimed],service:[{id:did+'#atproto_pds',type:'AtprotoPersonalDataServer',serviceEndpoint:pds}]})},
  handleResolver:{resolve:async value=>{assert.equal(value,handle);return did}},
 })
 return {resolve:()=>client.identityResolver.resolve(handle,{noCache:true}),move:(url:string)=>{pds=url},claim:(value:string)=>{claimed=value}}
}

test('official identity resolver requires the account to confirm an ETNOS-domain handle',async()=>{
 const f=await fixture();assert.equal((await f.resolve()).handle,handle)
 f.claim('someone-else.example')
 await assert.rejects(f.resolve(),/does not include the handle/)
})

test('fresh DID resolution follows a changed PDS while the same handle and local private-room rights persist',async()=>{
 const f=await fixture(),s=new Strata(':memory:','https://node.example')
 try {
  const first=await f.resolve(),owner=s.provision(first.did,'Synthetic portable account').actor
  const room=s.createCommunity(owner.id,'Protected fixture','Not public.','hidden-private')
  const post=s.createPost(owner.id,room.id,'Synthetic protected contribution.')
  assert.equal(first.didDoc.service?.find(x=>x.type==='AtprotoPersonalDataServer')?.serviceEndpoint,'https://provider.example')
  f.move('https://more-spacious-server.example')
  const after=await f.resolve()
  assert.equal(after.did,first.did);assert.equal(after.handle,first.handle)
  assert.equal(after.didDoc.service?.find(x=>x.type==='AtprotoPersonalDataServer')?.serviceEndpoint,'https://more-spacious-server.example')
  const same=s.get<{id:string}>('SELECT id FROM actors WHERE did=?',after.did)!
  assert.equal(same.id,owner.id)
  assert.equal(s.getPost(same.id,post.id).text,post.text)
  assert.throws(()=>s.getPost(undefined,post.id))
 }finally{s.close()}
})
