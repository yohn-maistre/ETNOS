import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Buffer} from 'node:buffer'
import {Strata} from '../src/store.ts'
import {Media,inspectWebP,MEDIA_MAX_BYTES} from '../src/media.ts'
import {api} from '../src/api.ts'
// Generated 32x16 WebP fixture, metadata removed; no real community content.
import {image} from './media-fixture.ts'
function setup(){
 let now=Date.now();const s=new Strata(':memory:','https://strata.example',()=>now),m=new Media(s)
 const a=s.provision('did:web:media-owner.example','Owner'),b=s.provision('did:web:media-member.example','Member'),o=s.provision('did:web:media-outsider.example','Outside')
 const pub=s.createCommunity(a.actor.id,'Public','Public','public'),priv=s.createCommunity(a.actor.id,'Private','Private','hidden-private')
 s.setMember(a.actor.id,priv.id,b.actor.id,true)
 return{s,m,a,b,o,pub,priv,advance:(n:number)=>now+=n}
}
test('image framing rejects malformed, animated, metadata-bearing and oversized WebP',()=>{
 const b=Buffer.from(image,'base64');assert.deepEqual(inspectWebP(b),{width:32,height:16})
 for(const bytes of[Buffer.from('<svg/>'),b.subarray(0,b.length-1),Buffer.alloc(MEDIA_MAX_BYTES+1)])assert.throws(()=>inspectWebP(bytes))
 const flags=Buffer.from(b);flags[20]|=0x02;assert.throws(()=>inspectWebP(flags),/static WebP/)
 const metadata=Buffer.concat([b,Buffer.from('EXIF\x02\0\0\0xx','binary')]);metadata.writeUInt32LE(metadata.length-8,4);assert.throws(()=>inspectWebP(metadata),/static WebP/)
 const size=Buffer.from(b);size[24]=0xff;size[25]=0xff;assert.throws(()=>inspectWebP(size),/static WebP/)
})
test('private image drafts, post metadata and bytes recheck live access and moderation',async()=>{
 const{s,m,a,b,o,priv}=setup()
 try{
 const draft=m.upload(a.actor.id,priv.id,image,'A description')
 assert.throws(()=>m.response(b.actor.id,draft.id),/unavailable/)
 assert.throws(()=>m.response(undefined,draft.id),/unavailable/)
 const post=s.createPost(a.actor.id,priv.id,'Private image');m.attach(a.actor.id,post.id,[draft.id])
 assert.equal(s.getPost(b.actor.id,post.id).media[0].alt,'A description')
 assert.deepEqual(new Uint8Array(await m.response(b.actor.id,draft.id).arrayBuffer()),new Uint8Array(Buffer.from(image,'base64')))
 assert.throws(()=>m.response(o.actor.id,draft.id),/Not found/)
 s.setMember(a.actor.id,priv.id,b.actor.id,false);assert.throws(()=>m.response(b.actor.id,draft.id),/Not found/)
 s.hidePost(a.actor.id,post.id);assert.throws(()=>m.response(a.actor.id,draft.id),/Not found/)
 assert.equal(s.jobs(a.actor.id).length,0)
 }finally{s.close()}
})
test('attachments cannot move across owners or communities, replay, escape atomic post creation or reach AT outbox',async()=>{
 const{s,m,a,b,pub,priv}=setup(),handler=api(s)
 const create=async(body:unknown)=>handler(new Request(s.base+'/v1/posts',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+a.token},body:JSON.stringify(body)}))
 try{
 const secret=m.upload(a.actor.id,priv.id,image,'Private context'),count=s.all('SELECT id FROM posts').length
 assert.equal((await create({communityId:pub.id,text:'Must roll back',mediaIds:[secret.id]})).status,404)
 assert.equal(s.all('SELECT id FROM posts').length,count)
 const foreign=m.upload(b.actor.id,priv.id,image,'Owned by member');assert.equal((await create({communityId:priv.id,text:'Wrong owner',mediaIds:[foreign.id]})).status,404)
 const res=await create({communityId:priv.id,text:'Attached',mediaIds:[secret.id]});assert.equal(res.status,200)
 const post=await res.json() as{id:string;media:{id:string}[]};assert.equal(post.media[0].id,secret.id)
 assert.equal((await create({communityId:priv.id,text:'Cannot reuse',mediaIds:[secret.id]})).status,404)
 const at=s.createCommunity(a.actor.id,'AT','Public AT','public',false,'approval','atproto')
 assert.throws(()=>m.upload(a.actor.id,at.id,image,''),/not enabled/)
 assert.equal((await create({communityId:at.id,text:'No incomplete AT intent',mediaIds:[secret.id]})).status,403)
 assert.equal(s.jobs(a.actor.id).length,0)
 }finally{s.close()}
})
test('upload admission, agent limits, expiry and node storage budget are enforced',()=>{
 const{s,m,a,b,o,pub,priv,advance}=setup()
 try{
 assert.throws(()=>m.upload(o.actor.id,pub.id,image,''))
 const agent=s.provision('did:web:media-agent.example','Agent',a.actor.id);s.setMember(a.actor.id,pub.id,agent.actor.id,true)
 assert.throws(()=>m.upload(agent.actor.id,pub.id,image,''),/Human/)
 const draft=m.upload(a.actor.id,priv.id,image,'');advance(86400001);assert.throws(()=>m.response(a.actor.id,draft.id),/unavailable/)
 const post=s.createPost(a.actor.id,priv.id,'Expired draft');assert.throws(()=>m.attach(a.actor.id,post.id,[draft.id]))
 const live=m.upload(b.actor.id,priv.id,image,'');assert.equal(s.get('SELECT id FROM media WHERE id=?',draft.id),undefined)
 s.run('UPDATE media SET size=? WHERE id=?',64*1024*1024,live.id)
 assert.throws(()=>m.upload(a.actor.id,priv.id,image,''),/storage limit/)
 }finally{s.close()}
})

test('small-image floods are bounded by draft and upload counts, not only byte quotas',()=>{
 const{s,m,a,pub}=setup()
 try{
  for(let i=0;i<16;i++)m.upload(a.actor.id,pub.id,image,'Description')
  assert.throws(()=>m.upload(a.actor.id,pub.id,image,''),/upload limit/)
  assert.equal(s.get<{n:number}>('SELECT COUNT(*) n FROM media')!.n,16)
 }finally{s.close()}
})
