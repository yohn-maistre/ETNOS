import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {api} from '../src/api.ts'

// Reports (W1): posts, profiles and communities can be reported, and every report reaches the node operator's queue.
const origin='https://etnos.example'
test('posts, profiles and communities reach the operator queue; only the operator reads it; reporters are not named',async()=>{
 const s=new Etnos(':memory:',origin)
 const operator=s.provision('did:plc:'+'o'.repeat(24),'Pengelola (data uji)'),ana=s.provision('did:plc:'+'a'.repeat(24),'Ana (data uji)'),budi=s.provision('did:plc:'+'b'.repeat(24),'Budi (data uji)')
 const handler=api(s,{stewardDid:operator.actor.did})
 const call=async(token:string,path:string,body?:unknown)=>{const r=await handler(new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token,origin,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})}));return {status:r.status,body:await r.json() as Record<string,unknown>}}
 try{
  const open=s.createCommunity(budi.actor.id,'Ruang publik (data uji)','Uji','public')
  const hidden=s.createCommunity(budi.actor.id,'Ruang tersembunyi (data uji)','Uji','hidden-private')
  s.join(ana.actor.id,open.id)
  const post=s.createPost(budi.actor.id,open.id,'Posting yang dilaporkan (data uji)')
  assert.equal((await call(ana.token,'/v1/posts/'+post.id+'/report',{reason:'Isi menyesatkan (data uji)'})).status,200)
  assert.equal((await call(ana.token,'/v1/reports',{kind:'profile',target:budi.actor.id,reason:'Akun palsu (data uji)'})).status,200)
  assert.equal((await call(ana.token,'/v1/reports',{kind:'community',target:open.id,reason:'Ruang untuk penipuan (data uji)'})).status,200)
  // Refusals: self, duplicate, empty reason, unknown kind, a hidden community one cannot see, an unknown profile.
  assert.equal((await call(ana.token,'/v1/reports',{kind:'profile',target:ana.actor.id,reason:'x'})).status,400)
  assert.equal((await call(ana.token,'/v1/reports',{kind:'profile',target:budi.actor.id,reason:'lagi'})).status,409)
  assert.equal((await call(ana.token,'/v1/reports',{kind:'profile',target:operator.actor.id,reason:'  '})).status,400)
  assert.equal((await call(ana.token,'/v1/reports',{kind:'post',target:post.id,reason:'x'})).status,400)
  assert.equal((await call(ana.token,'/v1/reports',{kind:'community',target:hidden.id,reason:'x'})).status,404)
  assert.equal((await call(ana.token,'/v1/reports',{kind:'profile',target:'tidak-ada',reason:'x'})).status,404)
  // Members of a hidden community can report it.
  assert.equal((await call(budi.token,'/v1/reports',{kind:'community',target:hidden.id,reason:'Uji anggota (data uji)'})).status,200)

  // Only the operator reads the queue.
  assert.equal((await call(ana.token,'/v1/operator/reports')).status,403)
  assert.equal((await call(budi.token,'/v1/operator/reports')).status,403)
  const queue=(await call(operator.token,'/v1/operator/reports')).body.reports as {id:string;source:string;kind:string;label:string;href:string;state:string}[]
  assert.deepEqual(queue.map(r=>r.kind).sort(),['community','community','post','profile'])
  assert.equal(JSON.stringify(queue).includes(ana.actor.id),false,'the reporter is not named')
  const postItem=queue.find(r=>r.kind==='post')!,profileItem=queue.find(r=>r.kind==='profile')!
  assert.equal(postItem.href,'/square/'+post.id);assert.equal(profileItem.href,'/people/'+budi.actor.id)
  // Deciding closes it, once; others cannot decide.
  assert.equal((await call(ana.token,'/v1/operator/reports/'+profileItem.id+'/decide',{source:'operator',state:'resolved'})).status,403)
  assert.equal((await call(operator.token,'/v1/operator/reports/'+profileItem.id+'/decide',{source:'operator',state:'resolved',decision:'Ditangani (data uji)'})).status,200)
  assert.equal((await call(operator.token,'/v1/operator/reports/'+profileItem.id+'/decide',{source:'operator',state:'dismissed'})).status,409)
  assert.equal((await call(operator.token,'/v1/operator/reports/'+postItem.id+'/decide',{source:'post',state:'dismissed'})).status,200)
  assert.equal(s.get<{state:string}>('SELECT state FROM reports WHERE id=?',postItem.id)!.state,'dismissed','the community sees the decision too')
  // Reports never appear on public paths.
  for(const path of ['/v1/communities','/v1/communities/'+open.id,'/v1/actors/'+budi.actor.id,'/v1/search?q=palsu']){
   const text=JSON.stringify((await call(budi.token,path)).body)
   assert.equal(text.includes('Akun palsu')||text.includes('penipuan'),false,path)
  }
 }finally{s.close()}
})
