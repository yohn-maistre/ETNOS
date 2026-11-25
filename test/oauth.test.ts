import {test} from 'node:test'
import assert from 'node:assert/strict'
import {BrowserAuth,OAuthRecords,providerFetch} from '../src/oauth.ts'
import {Etnos} from '../src/store.ts'
import {api} from '../src/api.ts'

import {fixture,did,origin,issuer} from './oauth-fixture.ts'
function req(path:string,options:{method?:string;cookie?:string;body?:unknown;csrf?:string}={}){
  return new Request(origin+path,{method:options.method??(options.body===undefined?'GET':'POST'),
    headers:{origin,...(options.cookie?{cookie:options.cookie}:{}),...(options.csrf?{'x-etnos-csrf':options.csrf}:{}),...(options.body===undefined?{}:{'content-type':'application/json'})},
    ...(options.body===undefined?{}:{body:JSON.stringify(options.body)})})
}
const cookiePart=(r:Response,name:string)=>r.headers.getSetCookie().find(x=>x.startsWith(name+'='))!.split(';')[0]

test('official OAuth: PKCE/PAR/DPoP, browser binding, verified enrollment, cookie session and replay protection',async()=>{
  const{s,auth,state,exchanges}=await fixture(new Etnos(':memory:',origin))
  try{
    const start=await auth.route(req('/auth/start',{body:{handle:'member.example'}}))
    assert.equal(start?.status,200,await start?.clone().text())
    const flow=cookiePart(start!,'__Host-strata_flow'),callback='/auth/callback?state='+state()+'&code=fixture&iss='+encodeURIComponent(issuer)
    const wrong=await auth.route(req(callback,{cookie:'__Host-strata_flow=wrong'}))
    assert.equal(wrong?.headers.get('location'),'/login?error=authentication_failed');assert.equal(exchanges(),0)
    const signed=await auth.route(req(callback,{cookie:flow}))
    assert.equal(signed?.headers.get('location'),'/');assert.equal(exchanges(),1)
    const session=cookiePart(signed!,'__Host-strata')
    assert.match(signed!.headers.getSetCookie().find(x=>x.startsWith('__Host-strata='))!,/Secure; HttpOnly; SameSite=Lax/)
    const me=await(await auth.route(req('/auth/me',{cookie:session})))!.json() as {actor:{id:string;did:string};csrf:string}
    assert.equal(me.actor.did,did);assert.equal(s.listCommunities().length,7)
    const database=JSON.stringify(s.all('SELECT * FROM oauth_records'))
    assert.equal(database.includes('fixture-access-token'),false);assert.equal(database.includes('fixture-refresh-token'),false)
    const handle=api(s,{principal:r=>auth.principal(r),writeGuard:r=>auth.writeGuard(r)})
    const c=s.listCommunities()[0]
    assert.equal((await handle(req('/v1/posts',{cookie:session,body:{communityId:c.id,text:'No CSRF'}}))).status,403)
    assert.equal((await handle(req('/v1/posts',{cookie:session,csrf:me.csrf,body:{communityId:c.id,text:'Authenticated'}}))).status,200)
    // A page loaded before the rename still sends the old header name.
    assert.equal((await handle(new Request(origin+'/v1/posts',{method:'POST',headers:{origin,cookie:session,'x-strata-csrf':me.csrf,'content-type':'application/json'},body:JSON.stringify({communityId:c.id,text:'Old header'})}))).status,200)
    await auth.route(req(callback,{cookie:flow}));assert.equal(exchanges(),1)
    assert.equal((await auth.route(req('/auth/logout',{cookie:session,csrf:me.csrf,body:{}})))?.status,200)
    assert.equal((await(await auth.route(req('/auth/me',{cookie:session})))!.json() as {actor:unknown}).actor,null)
  }finally{s.close()}
})

test('OAuth state is consumed atomically and sealed records are bound to kind/key',async()=>{
  const s=new Etnos(':memory:',origin)
  try{
    const records=new OAuthRecords(s,Buffer.alloc(32,3).toString('base64url'))
    await records.set('state','a',{secret:'fixture'})
    const [a,b]=await Promise.all([records.get('state','a',true),records.get('state','a',true)])
    assert.equal([a,b].filter(Boolean).length,1)
    await records.set('state','a',{secret:'fixture'})
    s.run("UPDATE oauth_records SET key='b' WHERE key='a'")
    await assert.rejects(records.get('state','b'))
    assert.equal(JSON.stringify(s.all('SELECT * FROM oauth_records')).includes('fixture'),false)
  }finally{s.close()}
})

test('OAuth provider fetch rejects arbitrary hosts, redirects, unbounded responses and insecure URLs',async()=>{
  let calls=0
  const fetcher=providerFetch(['issuer.example'],async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://evil.example/token'}})})
  await assert.rejects(fetcher('https://evil.example/'),/not enabled/)
  await assert.rejects(fetcher('http://issuer.example/'),/not enabled/)
  assert.equal(calls,0)
  await assert.rejects(fetcher(new Request(issuer,{redirect:'error'})),/redirect rejected/)
  await assert.rejects(fetcher(issuer),/Cross-origin/)
  const large=providerFetch(['issuer.example'],async()=>new Response('x'.repeat(2*1024*1024+1)))
  await assert.rejects(large(issuer),/too large/)
})

test('verified AT identity does not bypass enrollment; callback issuer and token subject are checked',async()=>{
  const s=new Etnos(':memory:',origin)
  try{
    const denied=await fixture(s,{stewardDid:'did:plc:zzzzzzzzzzzzzzzzzzzzzzzz'})
    assert.equal((await denied.auth.route(req('/auth/start',{body:{handle:'member.example'}})))?.status,403)
    assert.equal(s.all('SELECT * FROM actors').length,0)
    const{auth,state,exchanges}=await fixture(s)
    const start=(await auth.route(req('/auth/start',{body:{handle:'member.example'}})))!
    const flow=cookiePart(start,'__Host-strata_flow')
    const wrong=await auth.route(req('/auth/callback?state='+state()+'&code=x&iss=https%3A%2F%2Fevil.example',{cookie:flow}))
    assert.equal(wrong?.headers.get('location'),'/login?error=authentication_failed')
    assert.equal(exchanges(),0);assert.equal(s.all('SELECT * FROM browser_sessions').length,0)
  }finally{s.close()}
  const other=new Etnos(':memory:',origin)
  try{
    const{auth,state}=await fixture(other,{},'did:plc:zzzzzzzzzzzzzzzzzzzzzzzz')
    const start=(await auth.route(req('/auth/start',{body:{handle:'member.example'}})))!
    const flow=cookiePart(start,'__Host-strata_flow')
    const rejected=await auth.route(req('/auth/callback?state='+state()+'&code=x&iss='+encodeURIComponent(issuer),{cookie:flow}))
    assert.equal(rejected?.headers.get('location'),'/login?error=authentication_failed')
    assert.equal(other.all('SELECT * FROM browser_sessions').length,0)
    assert.equal(other.all('SELECT * FROM actors').length,0)
  }finally{other.close()}
})

test('expired OAuth state, cross-origin login and local bearer shortcuts are rejected',async()=>{
  const s=new Etnos(':memory:',origin)
  try{
    const{auth,state,exchanges}=await fixture(s)
    const foreign=new Request(origin+'/auth/start',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify({handle:'member.example'})})
    assert.equal((await auth.route(foreign))?.status,403)
    const start=(await auth.route(req('/auth/start',{body:{handle:'member.example'}})))!
    const flow=cookiePart(start,'__Host-strata_flow');const now=s.clock();s.clock=()=>now+600001
    const expired=await auth.route(req('/auth/callback?state='+state()+'&code=x&iss='+encodeURIComponent(issuer),{cookie:flow}))
    assert.equal(expired?.headers.get('location'),'/login?error=authentication_failed');assert.equal(exchanges(),0)
    const local=s.provision('did:web:local.example','Fixture only')
    const handler=api(s,{authMode:'atproto',principal:r=>auth.principal(r),writeGuard:r=>auth.writeGuard(r)})
    assert.equal((await handler(new Request(origin+'/v1/me',{headers:{authorization:'Bearer '+local.token}}))).status,401)
  }finally{s.close()}
})

// Custom handle and PDS host are independent. This is an invited-login fixture,
// not an enabled provider-started new-account/signup implementation.
test('an invited ETNOS-domain handle completes the actual OAuth route on an external PDS',async()=>{
 const s=new Etnos(':memory:',origin),customHandle='friend.etnos.example'
 try{
  const {auth,state}=await fixture(s,{},did,customHandle)
  const start=(await auth.route(req('/auth/start',{body:{handle:customHandle}})))!
  assert.equal(start.status,200)
  const flow=cookiePart(start,'__Host-strata_flow')
  const signed=(await auth.route(req('/auth/callback?state='+state()+'&code=fixture&iss='+encodeURIComponent(issuer),{cookie:flow})))!
  assert.equal(signed.headers.get('location'),'/')
  const session=cookiePart(signed,'__Host-strata')
  const me=await (await auth.route(req('/auth/me',{cookie:session})))!.json() as {actor:{id:string;did:string;name:string}}
  assert.equal(me.actor.did,did);assert.equal(me.actor.name,customHandle)
  assert.equal(s.get<{n:number}>('SELECT count(*) n FROM actors')!.n,1)
 }finally{s.close()}
})
