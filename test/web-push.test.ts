import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {Periksa} from '../src/periksa.ts'
import {PushCenter,pushInput,PUSH_SUBSCRIPTION_DAYS} from '../src/push.ts'
import {b64u,encryptPayload,pushEndpointAllowed,sendPush,unb64u,vapidAuthorization,vapidKeys,type VapidKeys} from '../src/web-push.ts'

// Web push (W1): RFC 8291 encryption, VAPID, the endpoint allowlist, and the queue's access and privacy rules.
const did=(c:string)=>'did:plc:'+c.repeat(24)
const te=new TextEncoder(),td=new TextDecoder()
type Bytes=Uint8Array<ArrayBuffer>

test('RFC 8291 Appendix A: the encrypted body matches the published test vector',async()=>{
 const asPublic='BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'
 const point=unb64u(asPublic)
 const jwk={kty:'EC',crv:'P-256',x:b64u(point.slice(1,33)),y:b64u(point.slice(33)),d:'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw'}
 const privateKey=await crypto.subtle.importKey('jwk',jwk,{name:'ECDH',namedCurve:'P-256'},true,['deriveBits'])
 const publicKey=await crypto.subtle.importKey('raw',point,{name:'ECDH',namedCurve:'P-256'},true,[])
 const body=await encryptPayload(te.encode('When I grow up, I want to be a watermelon'),'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4','BTBZMqHH6r4Tts7J_aSIgg',unb64u('DGv6ra1nlYgDCS1FRnbzlw'),{privateKey,publicKey})
 assert.equal(b64u(body),'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN')
})

async function keys():Promise<VapidKeys>{
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']) as CryptoKeyPair
 const publicKey=b64u(new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey))),privateKey=(await crypto.subtle.exportKey('jwk',pair.privateKey)).d!
 return vapidKeys({ETNOS_VAPID_PUBLIC_KEY:publicKey,ETNOS_VAPID_PRIVATE_KEY:privateKey,ETNOS_ORIGIN:'https://etnos.example'})!
}
/** A browser's side of a subscription, able to decrypt what the node sends. */
async function device(endpoint:string){
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']) as CryptoKeyPair
 const ua=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey)),secret=crypto.getRandomValues(new Uint8Array(16))
 const hmac=async(k:Bytes,d:Bytes)=>new Uint8Array(await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',k,{name:'HMAC',hash:'SHA-256'},false,['sign']),d))
 const cat=(...p:Bytes[]):Bytes=>{const o=new Uint8Array(p.reduce((n,x)=>n+x.length,0));let i=0;for(const x of p){o.set(x,i);i+=x.length}return o}
 return {subscription:{endpoint,expirationTime:null,keys:{p256dh:b64u(ua),auth:b64u(secret)}},
  async open(body:Bytes){
   const salt=body.slice(0,16),idlen=body[20],as=body.slice(21,21+idlen),cipher=body.slice(21+idlen)
   const asKey=await crypto.subtle.importKey('raw',as,{name:'ECDH',namedCurve:'P-256'},false,[])
   const ecdh=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:asKey},pair.privateKey,256))
   const ikm=await hmac(await hmac(secret,ecdh),cat(te.encode('WebPush: info\0'),ua,as,new Uint8Array([1])))
   const prk=await hmac(salt,ikm)
   const cek=(await hmac(prk,cat(te.encode('Content-Encoding: aes128gcm\0'),new Uint8Array([1])))).slice(0,16),nonce=(await hmac(prk,cat(te.encode('Content-Encoding: nonce\0'),new Uint8Array([1])))).slice(0,12)
   const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['decrypt']),cipher))
   assert.equal(plain[plain.length-1],2)
   return JSON.parse(td.decode(plain.slice(0,-1)))
  }}
}

test('VAPID: the token is signed by the configured key for the push service origin; incomplete keys keep push off',async()=>{
 const k=await keys()
 const header=await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc',k,Date.UTC(2026,10,27))
 const m=/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header)!
 assert.equal(m[4],k.publicKey)
 const claims=JSON.parse(td.decode(unb64u(m[2])))
 assert.deepEqual(claims,{aud:'https://fcm.googleapis.com',exp:Date.UTC(2026,10,27)/1000+43200,sub:'https://etnos.example'})
 const pub=await crypto.subtle.importKey('raw',unb64u(k.publicKey),{name:'ECDSA',namedCurve:'P-256'},false,['verify'])
 assert.ok(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},pub,unb64u(m[3]),te.encode(m[1]+'.'+m[2])))
 assert.equal(vapidKeys({ETNOS_VAPID_PUBLIC_KEY:k.publicKey}),null)
 assert.equal(vapidKeys({ETNOS_VAPID_PUBLIC_KEY:'short',ETNOS_VAPID_PRIVATE_KEY:k.privateKey,ETNOS_ORIGIN:'https://etnos.example'}),null)
 assert.equal(vapidKeys({ETNOS_VAPID_PUBLIC_KEY:k.publicKey,ETNOS_VAPID_PRIVATE_KEY:k.privateKey,ETNOS_ORIGIN:'http://insecure.example'}),null)
})

test('only the browsers\' own push services are accepted as endpoints',()=>{
 for(const ok of ['https://fcm.googleapis.com/fcm/send/x','https://updates.push.services.mozilla.com/wpush/v2/x','https://web.push.apple.com/Q','https://wns2-par02p.notify.windows.com/w/?token=x'])assert.ok(pushEndpointAllowed(ok),ok)
 for(const bad of ['http://fcm.googleapis.com/x','https://fcm.googleapis.com:8443/x','https://evil.example/x','https://fcm.googleapis.com.evil.example/x','https://user:pw@fcm.googleapis.com/x','https://127.0.0.1/x','https://etnos.space/v1/ops/backups',42,'x'.repeat(1001)])assert.equal(pushEndpointAllowed(bad),false,String(bad))
 assert.throws(()=>pushInput({endpoint:'https://evil.example/x',keys:{p256dh:'A'.repeat(87),auth:'A'.repeat(22)}}))
 assert.throws(()=>pushInput({endpoint:'https://fcm.googleapis.com/x',keys:{p256dh:'A'.repeat(87),auth:'A'.repeat(22)}}),'not an uncompressed point')
})

function node(){
 const s=new Etnos(':memory:','https://etnos.example')
 const ana=s.provision(did('a'),'Ana (data uji)'),budi=s.provision(did('b'),'Budi (data uji)'),cici=s.provision(did('c'),'Cici (data uji)')
 const open=s.createCommunity(ana.actor.id,'Ruang publik (data uji)','Uji','public')
 const closed=s.createCommunity(ana.actor.id,'Ruang privat (data uji)','Uji','hidden-private')
 for(const p of [budi,cici])s.join(p.actor.id,open.id)
 return {s,ana,budi,cici,open,closed}
}
function center(s:Etnos,k:VapidKeys|null){
 const sent:{endpoint:string;body:Bytes;headers:Headers}[]=[];let status=201
 const fetcher=(async(url:string,init:RequestInit)=>{sent.push({endpoint:url,body:init.body as Bytes,headers:new Headers(init.headers)});return new Response(null,{status})}) as unknown as typeof fetch
 return {push:new PushCenter(s,()=>k,fetcher),sent,setStatus:(n:number)=>{status=n}}
}

test('replies, mentions and Kamus questions queue a generic message only for subscribed people, sent once with no post text',async()=>{
 const n=node(),k=await keys(),c=center(n.s,k)
 try{
  const anaDevice=await device('https://fcm.googleapis.com/fcm/send/ana-fixture'),budiDevice=await device('https://updates.push.services.mozilla.com/wpush/v2/budi-fixture')
  c.push.subscribe({actorId:n.ana.actor.id},pushInput(anaDevice.subscription))
  c.push.subscribe({actorId:n.budi.actor.id},pushInput(budiDevice.subscription))
  const root=n.s.createPost(n.ana.actor.id,n.open.id,'Rahasia kecil di posting (data uji)')
  n.s.createPost(n.ana.actor.id,n.open.id,'Balasan sendiri (data uji)',root.id)
  n.s.createPost(n.cici.actor.id,n.open.id,'Balasan dari Cici (data uji)',root.id)
  n.s.createPost(n.cici.actor.id,n.open.id,'Halo [Budi](/people/'+n.budi.actor.id+') dan [Cici](/people/'+n.cici.actor.id+') (data uji)')
  new Periksa(n.s).propose(n.budi.actor.id,n.open.id,{kind:'word',subject:'kata',statement:'"kata" artinya "word". (data uji)',evidence:[{text:'Rahasia kecil',postId:root.id}]})
  new Periksa(n.s).propose(n.budi.actor.id,n.open.id,{kind:'word',subject:'kata2',statement:'"kata2" (data uji)',evidence:[{text:'x',postId:root.id}]},null,'source')
  const queued=n.s.all<{actor_id:string;kind:string}>('SELECT actor_id,kind FROM push_outbox ORDER BY id')
  assert.deepEqual(queued.map(r=>[r.actor_id===n.ana.actor.id?'ana':r.actor_id===n.budi.actor.id?'budi':'?',r.kind]),[['ana','reply'],['budi','mention'],['ana','kamus']])
  assert.ok(c.push.pending())
  const result=await c.push.flush()
  assert.deepEqual(result,{sent:3,dropped:0})
  assert.equal(c.push.pending(),false,'rows leave the queue before sending')
  const messages=[]
  for(const m of c.sent){
   assert.match(m.headers.get('authorization')!,/^vapid t=/);assert.equal(m.headers.get('content-encoding'),'aes128gcm')
   assert.equal(Buffer.from(m.body).toString('latin1').includes('Rahasia'),false)
   messages.push(await (m.endpoint.includes('ana')?anaDevice:budiDevice).open(m.body))
  }
  assert.deepEqual(messages.map(m=>m.body).sort(),['Ada balasan baru untuk postinganmu.','Ada pertanyaan Kamus tentang postinganmu.','Kamu disebut dalam sebuah postingan.'])
  for(const m of messages){assert.equal(m.title,'ETNOS');assert.match(m.url,/^\/square\/[0-9a-f-]+$/);assert.equal(JSON.stringify(m).includes('data uji'),false)}
  assert.equal((await c.push.flush()).sent,0,'nothing is sent twice')
 }finally{n.s.close()}
})

test('access is checked again at sending: hidden posts, private rooms and rooms one left are never announced',async()=>{
 const n=node(),k=await keys(),c=center(n.s,k)
 try{
  c.push.subscribe({actorId:n.budi.actor.id},pushInput((await device('https://fcm.googleapis.com/fcm/send/budi-fixture')).subscription))
  // Budi is mentioned in a private room he is not in, and in a public post that is then hidden.
  n.s.createPost(n.ana.actor.id,n.closed.id,'[Budi](/people/'+n.budi.actor.id+') rahasia (data uji)')
  const pub=n.s.createPost(n.ana.actor.id,n.open.id,'[Budi](/people/'+n.budi.actor.id+') publik (data uji)')
  n.s.run('UPDATE posts SET hidden=1 WHERE id=?',pub.id)
  assert.equal(n.s.all('SELECT 1 FROM push_outbox').length,2)
  assert.deepEqual(await c.push.flush(),{sent:0,dropped:2})
  assert.equal(c.sent.length,0)
  // Without keys the queue drains without sending.
  const off=center(n.s,null)
  n.s.createPost(n.ana.actor.id,n.open.id,'[Budi](/people/'+n.budi.actor.id+') lagi (data uji)')
  assert.deepEqual(await off.push.flush(),{sent:0,dropped:1});assert.equal(off.sent.length,0)
 }finally{n.s.close()}
})

test('unsubscribe, expiry, gone endpoints, the device cap, and a device moving to another account',async()=>{
 let now=Date.UTC(2026,10,27)
 const n=node();n.s.clock=()=>now
 const k=await keys(),c=center(n.s,k)
 try{
  const d=await device('https://fcm.googleapis.com/fcm/send/shared-fixture')
  c.push.subscribe({actorId:n.ana.actor.id},pushInput(d.subscription))
  const row=n.s.get<{expires:number}>('SELECT expires FROM push_subscriptions')!
  assert.equal(row.expires,now+PUSH_SUBSCRIPTION_DAYS*86400000)
  // The same browser signs in as Budi: the subscription follows the account in use.
  c.push.subscribe({actorId:n.budi.actor.id},pushInput(d.subscription))
  assert.deepEqual(n.s.all<{actor_id:string}>('SELECT actor_id FROM push_subscriptions').map(r=>r.actor_id),[n.budi.actor.id])
  // Someone else cannot remove it; Budi can.
  c.push.unsubscribe(n.ana.actor.id,d.subscription.endpoint);assert.equal(n.s.all('SELECT 1 FROM push_subscriptions').length,1)
  c.push.unsubscribe(n.budi.actor.id,d.subscription.endpoint);assert.equal(n.s.all('SELECT 1 FROM push_subscriptions').length,0)
  // A browser expiry earlier than 60 days wins, and an expired subscription is removed before sending.
  c.push.subscribe({actorId:n.ana.actor.id},pushInput({...d.subscription,expirationTime:now+1000}))
  n.s.createPost(n.budi.actor.id,n.open.id,'Balasan (data uji)',n.s.createPost(n.ana.actor.id,n.open.id,'Akar (data uji)').id)
  now+=2000
  assert.deepEqual(await c.push.flush(),{sent:0,dropped:0})
  assert.equal(n.s.all('SELECT 1 FROM push_subscriptions').length,0)
  // A push service that answers 410 ends the subscription.
  c.push.subscribe({actorId:n.ana.actor.id},pushInput(d.subscription))
  n.s.createPost(n.budi.actor.id,n.open.id,'Balasan lagi (data uji)',n.s.createPost(n.ana.actor.id,n.open.id,'Akar dua (data uji)').id)
  c.setStatus(410)
  assert.deepEqual(await c.push.flush(),{sent:0,dropped:0})
  assert.equal(n.s.all('SELECT 1 FROM push_subscriptions').length,0)
  // Ten devices at most; the oldest goes.
  for(let i=0;i<12;i++){now+=1;c.push.subscribe({actorId:n.ana.actor.id},pushInput((await device('https://fcm.googleapis.com/fcm/send/dev-'+i)).subscription))}
  const left=n.s.all<{endpoint:string}>('SELECT endpoint FROM push_subscriptions ORDER BY created').map(r=>r.endpoint)
  assert.equal(left.length,10);assert.equal(left[0],'https://fcm.googleapis.com/fcm/send/dev-2')
  // An unknown push service gets nothing even if a row was planted directly.
  assert.equal(await sendPush({endpoint:'https://evil.example/x',p256dh:d.subscription.keys.p256dh,auth:d.subscription.keys.auth},{title:'ETNOS',body:'x',url:'/',tag:'x'},k,(()=>{throw new Error('no fetch')}) as unknown as typeof fetch),'gone')
 }finally{n.s.close()}
})
