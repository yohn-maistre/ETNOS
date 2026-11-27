import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {Etnos} from '../src/store.ts'
import {api} from '../src/api.ts'
import {fixture,did,origin,issuer,pds} from './oauth-fixture.ts'
import {readGrant} from '../packages/pds/src/host/link-grant.ts'

// Private alpha (W1): one invitation link for both ways in, and a request queue only the operator reads.
const linkKey=Buffer.alloc(32,5).toString('base64url')
const newcomer='did:plc:zzzzzzzzzzzzzzzzzzzzzzzz'
function req(path:string,body?:unknown,cookie='',csrf='',ip=''){
 return new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{origin,...(cookie?{cookie}:{}),...(csrf?{'x-etnos-csrf':csrf}:{}),...(ip?{'cf-connecting-ip':ip}:{}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})})
}
const cookiePart=(r:Response,name='__Host-strata_flow')=>r.headers.getSetCookie().find(x=>x.startsWith(name+'='))!.split(';')[0]
const callback=(state:string)=>'/auth/callback?state='+state+'&code=fixture&iss='+encodeURIComponent(issuer)
async function setup(extra:Record<string,unknown>={}){
 const s=new Etnos(':memory:',origin),owner=s.provision(did,'Steward')
 const f=await fixture(s,{enrollmentMode:'invite',...extra},newcomer,'friend.bsky.social',newcomer)
 const sid='s'.repeat(43),csrf='fixture-csrf'
 s.run('INSERT INTO browser_sessions VALUES(?,?,?,?,?,0)',createHash('sha256').update(sid).digest('hex'),owner.actor.id,csrf,s.clock(),s.clock()+86400000)
 const steward='__Host-strata='+sid
 const invite=async(body:Record<string,unknown>={days:7})=>{
  const r=(await f.auth.route(req('/auth/enrollment-invites',body,steward,csrf)))!
  assert.equal(r.status,200,await r.clone().text());return await r.json() as {id:string;invitation:string;url:string;maxUses:number}
 }
 return{...f,owner,steward,csrf,invite}
}

test('invite mode: an outsider without a code cannot enrol through Bluesky, an existing handle or the identity host',async()=>{
 const f=await setup({accountHost:pds,hostLinkKey:linkKey})
 try{
  for(const body of [{mode:'signup'},{mode:'signup',handle:'friend.bsky.social'},{mode:'signup',provider:'host'},{mode:'signup',invitation:'x'.repeat(43)},{mode:'signup',invitation:'short'}]){
   const r=(await f.auth.route(req('/auth/start',body)))!
   assert.equal(r.status,403,JSON.stringify(body))
  }
  // Signing in with an account elsewhere does not enrol it; only accounts on the node's own host do (they used a code there).
  const other=await fixture(f.s,{enrollmentMode:'invite',accountHost:'https://pds2.example',allowedHosts:['bsky.social','plc.directory','issuer.example','pds.example','pds2.example']},newcomer,'friend.bsky.social',newcomer)
  assert.equal((await other.auth.route(req('/auth/start',{mode:'login',handle:'friend.bsky.social'})))!.status,403)
  assert.equal(f.s.get('SELECT 1 FROM enrollment_allowlist WHERE did=?',newcomer),undefined)
 }finally{f.s.close()}
})

test('one link, n uses: each use enrols one person, then the link stops; expired and revoked links fail',async()=>{
 const f=await setup()
 try{
  const link=await f.invite({days:7,uses:2})
  assert.equal(link.maxUses,2);assert.ok(link.url.startsWith(origin+'/gabung?kode='))
  assert.equal(new URL(link.url).searchParams.get('kode'),link.invitation)
  assert.equal(JSON.stringify(f.s.all('SELECT * FROM enrollment_invitations')).includes(link.invitation),false)
  const people=['did:plc:aaaaaaaaaaaaaaaaaaaaaaab','did:plc:aaaaaaaaaaaaaaaaaaaaaaac','did:plc:aaaaaaaaaaaaaaaaaaaaaaad']
  const results:string[]=[]
  for(const person of people){
   const g=await fixture(f.s,{...f.config},person,'p.bsky.social',person)
   const start=(await g.auth.route(req('/auth/start',{mode:'signup',invitation:link.invitation})))!
   if(start.status!==200){results.push('refused '+start.status);continue}
   const signed=(await g.auth.route(req(callback(g.state()),undefined,cookiePart(start))))!
   results.push(signed.headers.get('location')!)
  }
  assert.deepEqual(results,['/','/','refused 403'])
  assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM enrollment_invitation_uses')!.n,2)
  const check=async(invitation:string)=>await(await f.auth.route(req('/auth/invite-check',{invitation})))!.json() as {valid:boolean}
  assert.equal((await check(link.invitation)).valid,false)
  for(const uses of [0,21,1.5])assert.equal((await f.auth.route(req('/auth/enrollment-invites',{days:7,uses},f.steward,f.csrf)))!.status,400)
  const expired=await f.invite();f.s.run('UPDATE enrollment_invitations SET expires=? WHERE id=?',f.s.clock()-1,expired.id)
  assert.equal((await check(expired.invitation)).valid,false)
  assert.equal((await f.auth.route(req('/auth/start',{mode:'signup',invitation:expired.invitation})))!.status,403)
  const revoked=await f.invite()
  assert.equal((await check(revoked.invitation)).valid,true)
  assert.equal((await f.auth.route(req('/auth/enrollment-invites/'+revoked.id+'/revoke',{},f.steward,f.csrf)))!.status,200)
  assert.equal((await f.auth.route(req('/auth/start',{mode:'signup',invitation:revoked.invitation})))!.status,403)
  const listed=await(await f.auth.route(req('/auth/enrollment-invites',undefined,f.steward,f.csrf)))!.text()
  assert.equal(listed.includes('hash'),false);assert.equal(listed.includes(link.invitation),false)
  assert.match(listed,/"uses":2,"maxUses":2/)
 }finally{f.s.close()}
})

test('the identity host path receives a signed grant for the same link, bound to its use count; never without a valid link',async()=>{
 const f=await setup({accountHost:pds,hostLinkKey:linkKey})
 try{
  const options=await(await f.auth.route(req('/auth/options')))!.json() as {hostInvites:boolean;enrollment:string}
  assert.equal(options.hostInvites,true);assert.equal(options.enrollment,'invite')
  const link=await f.invite({days:3,uses:4})
  const start=(await f.auth.route(req('/auth/start',{mode:'signup',provider:'host',invitation:link.invitation})))!
  assert.equal(start.status,200,await start.clone().text())
  const {authorizationUrl}=await start.json() as {authorizationUrl:string}
  assert.equal(f.parameters().get('prompt'),'create')
  const grant=await readGrant(linkKey,new URL(authorizationUrl).searchParams.get('kode'),Date.now())
  assert.equal(grant?.kind,'invite')
  if(grant?.kind!=='invite')return
  assert.equal(grant.id,link.id);assert.equal(grant.slots,4)
  assert.ok(grant.expires<=Date.now()+3600000+1000)
  // A grant from another key is not one the host accepts.
  assert.equal(await readGrant(Buffer.alloc(32,1).toString('base64url'),new URL(authorizationUrl).searchParams.get('kode'),Date.now()),null)
  // Bluesky path with the same link: no grant goes to bsky.social.
  const bsky=(await f.auth.route(req('/auth/start',{mode:'signup',invitation:link.invitation})))!
  assert.equal(new URL((await bsky.json() as {authorizationUrl:string}).authorizationUrl).searchParams.has('kode'),false)
  // Without the shared key, the host path still works with a code made on the host, and no grant is made.
  const plain=await fixture(f.s,{enrollmentMode:'invite',accountHost:pds},newcomer,'friend.bsky.social',newcomer)
  assert.equal((await(await plain.auth.route(req('/auth/options')))!.json() as {hostInvites:boolean}).hostInvites,false)
  const started=(await plain.auth.route(req('/auth/start',{mode:'signup',provider:'host',invitation:link.invitation})))!
  assert.equal(new URL((await started.json() as {authorizationUrl:string}).authorizationUrl).searchParams.has('kode'),false)
 }finally{f.s.close()}
})

test('invitation requests: rate limited, operator-only, never on a public path; approval makes a working link and decline removes it',async()=>{
 const f=await setup()
 try{
  const marker='Nama Uji Permintaan (fixture)'
  const send=(ip:string,name=marker)=>f.auth.route(req('/auth/invite-requests',{name,contact:'wa 0800 (fixture)',reason:'Ingin menulis tentang bahasa Mee (data uji)'},'','',ip))
  assert.equal((await send('203.0.113.1'))!.status,200)
  assert.equal((await send('203.0.113.1','Kedua (fixture)'))!.status,200)
  assert.equal((await send('203.0.113.1','Ketiga (fixture)'))!.status,200)
  assert.equal((await send('203.0.113.1','Keempat (fixture)'))!.status,429)
  assert.equal((await send('203.0.113.2','Lain (fixture)'))!.status,200)
  assert.equal((await f.auth.route(req('/auth/invite-requests',{name:'',contact:''},'','','203.0.113.3')))!.status,400)
  const foreign=new Request(origin+'/auth/invite-requests',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify({name:'x',contact:'y'})})
  assert.equal((await f.auth.route(foreign))!.status,403)

  // Visitors, members and public reads never see a request.
  assert.equal((await f.auth.route(req('/auth/invite-requests')))!.status,401)
  const memberDid='did:plc:mmmmmmmmmmmmmmmmmmmmmmmm',member=f.s.provision(memberDid,'Member')
  f.s.run('INSERT INTO enrollment_allowlist VALUES(?,?)',memberDid,f.owner.actor.id)
  const msid='m'.repeat(43);f.s.run('INSERT INTO browser_sessions VALUES(?,?,?,?,?,0)',createHash('sha256').update(msid).digest('hex'),member.actor.id,'member-csrf',f.s.clock(),f.s.clock()+86400000)
  assert.equal((await f.auth.route(req('/auth/invite-requests',undefined,'__Host-strata='+msid,'member-csrf')))!.status,403)
  const handler=api(f.s,{authMode:'atproto',enrollmentMode:'invite',principal:r=>f.auth.principal(r),writeGuard:r=>f.auth.writeGuard(r)})
  for(const path of ['/v1/search?q=Permintaan','/v1/search?q=fixture','/v1/posts','/v1/communities','/v1/capabilities','/health','/v1/notifications']){
   for(const cookie of ['','__Host-strata='+msid]){
    const text=await(await handler(req(path,undefined,cookie))).text()
    assert.equal(text.includes(marker)||text.includes('0800'),false,path)
   }
  }

  const queue=await(await f.auth.route(req('/auth/invite-requests',undefined,f.steward,f.csrf)))!.json() as {requests:{id:string;name:string;state:string}[]}
  assert.equal(queue.requests.length,4)
  const target=queue.requests.find(r=>r.name===marker)!
  const approved=(await f.auth.route(req('/auth/invite-requests/'+target.id+'/approve',{},f.steward,f.csrf)))!
  assert.equal(approved.status,200)
  const made=await approved.json() as {url:string;invitation:string;maxUses:number}
  assert.equal(made.maxUses,1);assert.ok(made.url.includes('/gabung?kode='))
  assert.equal((await f.auth.route(req('/auth/invite-requests/'+target.id+'/approve',{},f.steward,f.csrf)))!.status,409)
  const start=(await f.auth.route(req('/auth/start',{mode:'signup',invitation:made.invitation})))!
  assert.equal(start.status,200)
  const other=queue.requests.find(r=>r.name==='Kedua (fixture)')!
  assert.equal((await f.auth.route(req('/auth/invite-requests/'+other.id+'/decline',{},f.steward,f.csrf)))!.status,200)
  assert.equal(f.s.get('SELECT 1 FROM invite_requests WHERE id=?',other.id),undefined)
  assert.equal((await f.auth.route(req('/auth/invite-requests/'+other.id+'/approve',{},'__Host-strata='+msid,'member-csrf')))!.status,403)
 }finally{f.s.close()}
})

test('open enrollment takes no requests; the queue table exists only for the operator',async()=>{
 const f=await setup({enrollmentMode:'open'})
 try{
  assert.equal((await f.auth.route(req('/auth/invite-requests',{name:'a',contact:'b'},'','','203.0.113.9')))!.status,409)
 }finally{f.s.close()}
})

test('operator reset links for the identity host: steward only, signed for one handle, never without the shared key',async()=>{
 const f=await setup({accountHost:pds,hostLinkKey:linkKey})
 try{
  assert.equal((await f.auth.route(req('/auth/host-reset-links',{handle:'dewi.etnos.example'})))!.status,401)
  const r=(await f.auth.route(req('/auth/host-reset-links',{handle:'@Dewi.etnos.example'},f.steward,f.csrf)))!
  assert.equal(r.status,200,await r.clone().text())
  const {url}=await r.json() as {url:string}
  assert.ok(url.startsWith(pds+'/akun/pulihkan?tautan=rg1.'))
  const grant=await readGrant(linkKey,new URL(url).searchParams.get('tautan'),Date.now())
  assert.equal(grant?.kind,'reset');if(grant?.kind==='reset')assert.equal(grant.handle,'dewi.etnos.example')
  assert.equal((await f.auth.route(req('/auth/host-reset-links',{handle:'no-dot'},f.steward,f.csrf)))!.status,400)
  const plain=await fixture(f.s,{enrollmentMode:'invite',accountHost:pds},newcomer,'friend.bsky.social',newcomer)
  assert.equal((await plain.auth.route(req('/auth/host-reset-links',{handle:'dewi.etnos.example'},f.steward,f.csrf)))!.status,409)
 }finally{f.s.close()}
})
