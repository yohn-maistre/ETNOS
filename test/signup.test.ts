import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {Strata} from '../src/store.ts'
import {api} from '../src/api.ts'
import {fixture,did,origin,issuer,pds} from './oauth-fixture.ts'

const newcomer='did:plc:zzzzzzzzzzzzzzzzzzzzzzzz'
function req(path:string,body?:unknown,cookie='',csrf=''){
 return new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{origin,...(cookie?{cookie}:{}),...(csrf?{'x-strata-csrf':csrf}:{}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})})
}
const cookiePart=(r:Response,name='__Host-strata_flow')=>r.headers.getSetCookie().find(x=>x.startsWith(name+'='))!.split(';')[0]
async function setup(mode:'open'|'invite'|'closed'='open'){
 const s=new Strata(':memory:',origin),owner=s.provision(did,'Steward')
 const f=await fixture(s,{enrollmentMode:mode},newcomer,'friend.bsky.social',newcomer)
 const sid='s'.repeat(43),csrf='fixture-csrf'
 s.run('INSERT INTO browser_sessions VALUES(?,?,?,?,?,0)',createHash('sha256').update(sid).digest('hex'),owner.actor.id,csrf,s.clock(),s.clock()+86400000)
 const stewardCookie='__Host-strata='+sid
 const invite=async()=>{
  const r=(await f.auth.route(req('/auth/enrollment-invites',{days:7},stewardCookie,csrf)))!
  assert.equal(r.status,200,await r.clone().text());return await r.json() as {id:string;invitation:string}
 }
 return{...f,owner,invite,stewardCookie,csrf}
}
function callback(state:string){return '/auth/callback?state='+state+'&code=fixture&iss='+encodeURIComponent(issuer)}

test('open provider-started signup: no handle, real SDK PAR/PKCE/DPoP, verified session and zero community grants',async()=>{
 const f=await setup(),{s,auth}=f
 try{
  const hidden=s.createCommunity(f.owner.actor.id,'Protected language','Never discoverable','hidden-private')
  const secret=s.createPost(f.owner.actor.id,hidden.id,'Private language data')
  const start=(await auth.route(req('/auth/start',{mode:'signup',returnTo:'/communities?welcome=1'})))!
  assert.equal(start.status,200,await start.clone().text())
  assert.equal(f.parameters().has('login_hint'),false)
  assert.equal(f.parameters().get('scope'),'atproto')
  const saved=await auth.records.get<{appState:string}>('state',f.state())
  assert.equal(JSON.parse(saved!.appState).enroll,'open')
  const signed=(await auth.route(req(callback(f.state()),undefined,cookiePart(start))))!
  assert.equal(signed.headers.get('location'),'/communities?welcome=1')
  const cookie=cookiePart(signed,'__Host-strata')
  const me=await(await auth.route(req('/auth/me',undefined,cookie)))!.json() as {actor:{id:string;did:string};csrf:string;steward:boolean}
  assert.equal(me.actor.did,newcomer);assert.equal(me.steward,false)
  assert.equal(s.all('SELECT * FROM memberships WHERE actor_id=?',me.actor.id).length,0)
  const handler=api(s,{authMode:'atproto',enrollmentMode:'open',principal:r=>auth.principal(r),writeGuard:r=>auth.writeGuard(r)})
  const capabilities=await(await handler(req('/v1/capabilities'))).json() as {auth:{remoteSignup:boolean;hostedAccounts:boolean}}
  assert.equal(capabilities.auth.remoteSignup,true);assert.equal(capabilities.auth.hostedAccounts,false)
  const health=await(await handler(req('/health'))).json() as {auth:string;enrollment:string}
  assert.equal(health.auth,'atproto-oauth');assert.equal(health.enrollment,'open')
  assert.equal((await handler(req('/v1/posts/'+secret.id,undefined,cookie))).status,404)
  assert.equal(JSON.stringify(await(await handler(req('/v1/communities',undefined,cookie))).json()).includes(hidden.id),false)
  assert.equal((await handler(req('/v1/posts',{communityId:hidden.id,text:'Forbidden'},cookie,me.csrf))).status,404)
  assert.ok(s.get('SELECT 1 FROM enrollment_allowlist WHERE did=?',newcomer))
  const replay=await auth.route(req(callback(f.state()),undefined,cookiePart(start)))
  assert.equal(replay?.headers.get('location'),'/login?error=authentication_failed');assert.equal(f.exchanges(),1)
 }finally{s.close()}
})

test('signup binds browser and issuer, rejects open redirects and cancellation without enrolling',async()=>{
 const f=await setup(),{s,auth}=f
 try{
  for(const returnTo of ['//evil.example','https://evil.example','/\\evil.example','/auth/callback','/login','/x\nlocation']){
   assert.equal((await auth.route(req('/auth/start',{mode:'signup',returnTo})))?.status,400)
  }
  const start=(await auth.route(req('/auth/start',{mode:'signup'})))!
  assert.equal(start.status,200)
  await auth.route(req(callback(f.state()),undefined,'__Host-strata_flow=wrong'))
  assert.equal(f.exchanges(),0)
  const denied=await auth.route(req('/auth/callback?state='+f.state()+'&error=access_denied&iss='+encodeURIComponent(issuer),undefined,cookiePart(start)))
  assert.equal(denied?.headers.get('location'),'/login?error=authentication_failed')
  assert.equal(f.exchanges(),0);assert.equal(s.get('SELECT 1 FROM actors WHERE did=?',newcomer),undefined)
  const next=(await auth.route(req('/auth/start',{mode:'signup'})))!
  await auth.route(req(callback(f.state()).replace(encodeURIComponent(issuer),encodeURIComponent('https://evil.example')),undefined,cookiePart(next)))
  assert.equal(f.exchanges(),0)
 }finally{s.close()}
})

test('enrollment closure and service-actor identity are rechecked before local grants',async()=>{
 for(const service of [false,true]){
  const f=await setup(),{s,auth}=f
  try{
   const start=(await auth.route(req('/auth/start',{mode:'signup'})))!
   if(service){const p=s.provision(newcomer,'Service',f.owner.actor.id);assert.equal(p.actor.kind,'agent')}
   else f.config.enrollmentMode='closed'
   const response=await auth.route(req(callback(f.state()),undefined,cookiePart(start)))
   assert.equal(response?.headers.get('location'),'/login?error=authentication_failed')
   assert.equal(s.get('SELECT 1 FROM enrollment_allowlist WHERE did=?',newcomer),undefined)
   assert.equal(s.get('SELECT 1 FROM browser_sessions b JOIN actors a ON a.id=b.actor_id WHERE a.did=?',newcomer),undefined)
   assert.equal(s.get("SELECT 1 FROM oauth_records WHERE kind='session' AND key=?",newcomer),undefined)
  }finally{s.close()}
 }
})

test('one-use invite: hash-only storage, competing flows, revocation/expiry and steward-only creation',async()=>{
 const f=await setup('invite'),{s,auth}=f
 try{
  assert.equal((await auth.route(req('/auth/start',{mode:'signup'})))?.status,403)
  assert.equal((await auth.route(req('/auth/enrollment-invites',{})))?.status,401)
  const code=await f.invite()
  assert.equal(JSON.stringify(s.all('SELECT * FROM enrollment_invitations')).includes(code.invitation),false)
  const secondDid='did:plc:yyyyyyyyyyyyyyyyyyyyyyyy'
  const second=await fixture(s,{...f.config},secondDid,'second.bsky.social',secondDid)
  const a=(await auth.route(req('/auth/start',{mode:'signup',invitation:code.invitation})))!,stateA=f.state()
  const b=(await second.auth.route(req('/auth/start',{mode:'signup',invitation:code.invitation})))!,stateB=second.state()
  const results=await Promise.all([auth.route(req(callback(stateA),undefined,cookiePart(a))),second.auth.route(req(callback(stateB),undefined,cookiePart(b)))])
  assert.equal(results.filter(r=>r?.headers.get('location')==='/').length,1)
  assert.equal(s.all('SELECT * FROM actors WHERE did!=?',did).length,1)
  assert.equal(s.all('SELECT * FROM enrollment_invitations WHERE used_by IS NOT NULL').length,1)
  assert.equal((await auth.route(req('/auth/start',{mode:'signup',invitation:code.invitation})))?.status,403)
  const revoked=await f.invite(),start=(await auth.route(req('/auth/start',{mode:'signup',invitation:revoked.invitation})))!
  assert.equal((await auth.route(req('/auth/enrollment-invites/'+revoked.id+'/revoke',{},f.stewardCookie,f.csrf)))?.status,200)
  assert.equal((await auth.route(req(callback(f.state()),undefined,cookiePart(start))))?.headers.get('location'),'/login?error=authentication_failed')
  const expired=await f.invite();s.run('UPDATE enrollment_invitations SET expires=? WHERE id=?',s.clock()-1,expired.id)
  assert.equal((await auth.route(req('/auth/start',{mode:'signup',invitation:expired.invitation})))?.status,403)
  const list=(await auth.route(req('/auth/enrollment-invites',undefined,f.stewardCookie,f.csrf)))!
  const text=await list.text();assert.equal(text.includes('hash'),false);assert.equal(text.includes(code.invitation),false)
 }finally{s.close()}
})

test('local enrollment/session failure rolls back grants and leaves an invitation redeemable',async()=>{
 const f=await setup('invite'),{s,auth}=f
 try{
  const code=await f.invite(),start=(await auth.route(req('/auth/start',{mode:'signup',invitation:code.invitation})))!
  s.db.exec("CREATE TRIGGER reject_signup BEFORE INSERT ON browser_sessions BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END")
  const r=await auth.route(req(callback(f.state()),undefined,cookiePart(start)))
  assert.equal(r?.headers.get('location'),'/login?error=authentication_failed')
  assert.equal(s.get('SELECT 1 FROM actors WHERE did=?',newcomer),undefined)
  assert.equal(s.get('SELECT 1 FROM enrollment_allowlist WHERE did=?',newcomer),undefined)
  assert.equal(s.get<{used_by:string|null}>('SELECT used_by FROM enrollment_invitations WHERE id=?',code.id)!.used_by,null)
 }finally{s.close()}
})

test('open signup cannot restore a removed enrollment or widen the initial OAuth scope',async()=>{
 const f=await setup(),{s,auth}=f
 try{
  const start=(await auth.route(req('/auth/start',{mode:'signup',publishing:true})))!
  assert.equal(f.parameters().get('scope'),'atproto')
  await auth.route(req(callback(f.state()),undefined,cookiePart(start)))
  s.run('DELETE FROM enrollment_allowlist WHERE did=?',newcomer)
  const again=(await auth.route(req('/auth/start',{mode:'signup'})))!
  const rejected=await auth.route(req(callback(f.state()),undefined,cookiePart(again)))
  assert.equal(rejected?.headers.get('location'),'/login?error=authentication_failed')
  assert.equal(s.get('SELECT 1 FROM enrollment_allowlist WHERE did=?',newcomer),undefined)
 }finally{s.close()}
})

test('signup can target an existing handle or the configured account host, never a host from the request',async()=>{
 const s=new Strata(':memory:',origin);s.provision(did,'Steward')
 const f=await fixture(s,{enrollmentMode:'open',accountHost:pds},newcomer,'friend.bsky.social',newcomer)
 try{
  const options=await(await f.auth.route(req('/auth/options')))!.json() as {accountHost:string|null}
  assert.equal(options.accountHost,pds)
  const byHandle=(await f.auth.route(req('/auth/start',{mode:'signup',handle:'friend.bsky.social'})))!
  assert.equal(byHandle.status,200,await byHandle.clone().text())
  assert.equal(f.parameters().get('login_hint'),'friend.bsky.social')
  assert.equal(JSON.parse((await f.auth.records.get<{appState:string}>('state',f.state()))!.appState).did,newcomer)
  const byHost=(await f.auth.route(req('/auth/start',{mode:'signup',provider:'host',handle:''})))!
  assert.equal(byHost.status,200,await byHost.clone().text())
  assert.equal(f.parameters().has('login_hint'),false)
  const none=await fixture(s,{enrollmentMode:'open'},newcomer,'friend.bsky.social',newcomer)
  assert.equal((await none.auth.route(req('/auth/start',{mode:'signup',provider:'host'})))!.status,400)
  const bad=await fixture(s,{enrollmentMode:'open',accountHost:'https://not-allowed.example'},newcomer,'friend.bsky.social',newcomer)
  assert.equal((await bad.auth.route(req('/auth/options')))!.status,503)
 }finally{s.close()}
})

test('an account on the node identity host signs in and enrolls; other hosts and closed nodes still need an invitation',async()=>{
 for(const [config,allowed] of [[{enrollmentMode:'invite' as const,accountHost:pds},true],[{enrollmentMode:'invite' as const},false],[{enrollmentMode:'closed' as const,accountHost:pds},false]] as const){
  const s=new Strata(':memory:',origin);s.provision(did,'Steward')
  const f=await fixture(s,config,newcomer,'friend.bsky.social',newcomer)
  try{
   const start=(await f.auth.route(req('/auth/start',{mode:'login',handle:'friend.bsky.social'})))!
   if(!allowed){assert.equal(start.status,403);assert.equal(s.get('SELECT 1 FROM enrollment_allowlist WHERE did=?',newcomer),undefined);continue}
   assert.equal(start.status,200,await start.clone().text())
   const signed=(await f.auth.route(req(callback(f.state()),undefined,cookiePart(start))))!
   assert.ok(signed.headers.get('location')?.startsWith('/'),'signed in')
   assert.ok(s.get('SELECT 1 FROM enrollment_allowlist WHERE did=?',newcomer),'enrolled')
   // A removed enrollment does not come back by signing in again.
   s.run('DELETE FROM enrollment_allowlist WHERE did=?',newcomer)
   const again=(await f.auth.route(req('/auth/start',{mode:'login',handle:'friend.bsky.social'})))!
   const back=(await f.auth.route(req(callback(f.state()),undefined,cookiePart(again))))!
   assert.equal(back.headers.get('location'),'/login?error=authentication_failed')
   assert.equal(s.get('SELECT 1 FROM enrollment_allowlist WHERE did=?',newcomer),undefined)
  }finally{s.close()}
 }
})
