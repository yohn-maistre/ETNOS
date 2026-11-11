import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Strata} from '../src/store.ts'
import {Offerings} from '../src/offerings.ts'
import {Forum} from '../src/forum.ts'
import {Groups} from '../src/groups.ts'
import {Media} from '../src/media.ts'
import {image} from './media-fixture.ts'
import {api} from '../src/api.ts'

function fixture(){let now=Date.now();const s=new Strata(':memory:','https://offers.example.org',()=>now),a=s.provision('did:web:offer-owner.example','Synthetic seller'),b=s.provision('did:web:offer-reader.example','Neighbor'),pub=s.createCommunity(a.actor.id,'Public','Public','public',true,'open'),hidden=s.createCommunity(a.actor.id,'Protected','Private','hidden-private'),o=new Offerings(s);return {s,a,b,pub,hidden,o,advance:()=>{now+=2*86400000}}}
const input=(communityId:string,patch:Record<string,unknown>={})=>({communityId,text:'Synthetic local offering.',content:{title:'Synthetic produce'},kind:'offer',price:15000,unit:'per ikat',requestKey:randomUUID(),...patch})

test('one canonical offering preserves current terms across feed/profile/read and body-bound replay; stale updates fail',async()=>{
 const f=fixture();try{
  const b=input(f.pub.id),p=f.o.create(f.a.actor.id,b);assert.equal(p.offering?.price,15000);assert.equal(p.offering?.canManage,true);assert.equal(p.offering?.currency,'IDR')
  assert.equal(f.o.create(f.a.actor.id,b).id,p.id);assert.equal(f.s.feed().length,1);assert.throws(()=>f.o.create(f.a.actor.id,{...b,price:9000}),/already used/)
  const key=randomUUID(),updated=f.o.update(f.a.actor.id,p.id,{revision:1,price:17000,requestKey:key});assert.ok('offering' in updated);assert.equal(f.s.getPost(undefined,p.id).offering?.price,17000);assert.equal(f.s.feedPage(undefined,{authorId:f.a.actor.id}).items[0].offering?.price,17000)
  assert.equal(f.o.list().items[0].offering?.price,17000);assert.throws(()=>f.o.update(f.a.actor.id,p.id,{revision:1,price:9000,requestKey:randomUUID()}),/changed/)
  const again=f.o.update(f.a.actor.id,p.id,{revision:1,price:17000,requestKey:key});assert.ok('offering' in again);assert.equal(again.offering?.revision,2)
  assert.throws(()=>f.o.update(f.b.actor.id,p.id,{revision:2,status:'fulfilled',requestKey:randomUUID()}));assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM offering_history WHERE post_id=?',p.id)!.n,2)
  const handler=api(f.s),res=await handler(new Request(f.s.base+'/v1/offerings'));assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store')
 }finally{f.s.close()}
})
test('private offerings, membership revocation, moderation, expiry, fulfillment and deletion all leave discovery appropriately',()=>{
 const f=fixture();try{
  const secret=f.o.create(f.a.actor.id,input(f.hidden.id,{text:'Protected listing content'}));assert.equal(f.o.list(f.a.actor.id).items.length,0);assert.equal(f.o.list(f.a.actor.id,{communityId:f.hidden.id}).items.length,1);assert.throws(()=>f.o.read(secret.id,f.b.actor.id));assert.throws(()=>f.o.list(f.b.actor.id,{communityId:f.hidden.id}))
  const p=f.o.create(f.a.actor.id,input(f.pub.id,{expiresAt:f.s.clock()+86400000}));assert.equal(f.o.read(p.id,f.b.actor.id).offering?.canContact,true);f.advance();assert.equal(f.o.read(p.id).offering?.status,'expired');assert.equal(f.o.list().items.length,0)
  assert.throws(()=>f.o.update(f.a.actor.id,p.id,{revision:1,status:'open',requestKey:randomUUID()}),/expiry/)
  f.o.update(f.a.actor.id,p.id,{revision:1,status:'fulfilled',requestKey:randomUUID()});assert.equal(f.o.read(p.id).offering?.status,'fulfilled');assert.equal(f.o.list(undefined,{includeClosed:true}).items.length,1)
  const live=f.o.create(f.a.actor.id,input(f.pub.id));new Forum(f.s).moderate(f.a.actor.id,live.id,{action:'hide',reason:'Synthetic moderation'});assert.equal(f.o.list().items.length,0);assert.throws(()=>f.o.read(live.id))
  const withdrawn=f.o.create(f.a.actor.id,input(f.pub.id));f.o.update(f.a.actor.id,withdrawn.id,{revision:1,status:'withdrawn',requestKey:randomUUID()});assert.throws(()=>f.o.read(withdrawn.id));assert.equal(f.s.getPost(undefined,withdrawn.id).offering,null)
  const body=input(f.hidden.id),revoked=f.o.create(f.a.actor.id,body);f.s.run('UPDATE memberships SET active=0 WHERE community_id=? AND actor_id=?',f.hidden.id,f.a.actor.id);assert.throws(()=>f.o.create(f.a.actor.id,body));assert.throws(()=>f.o.update(f.a.actor.id,revoked.id,{revision:1,price:1,requestKey:randomUUID()}))
 }finally{f.s.close()}
})
test('commercial effects are atomic with the post; generic request keys, invalid terms, agent commerce and unqualified AT export cannot bypass the domain',()=>{
 const f=fixture();try{
  const normal=input(f.pub.id);new Forum(f.s).create(f.a.actor.id,normal,new Groups(f.s));assert.throws(()=>f.o.create(f.a.actor.id,normal),/another post/)
  f.s.db.exec("CREATE TRIGGER fail_offering BEFORE INSERT ON offerings BEGIN SELECT RAISE(ABORT,'synthetic offering failure'); END")
  const before=f.s.feed().length;assert.throws(()=>f.o.create(f.a.actor.id,input(f.pub.id)));assert.equal(f.s.feed().length,before);assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM offerings')!.n,0);f.s.db.exec('DROP TRIGGER fail_offering')
  assert.throws(()=>f.o.create(f.a.actor.id,input(f.pub.id,{price:-1})));assert.throws(()=>f.o.create(f.a.actor.id,input(f.pub.id,{price:1.5})));assert.throws(()=>f.o.create(f.a.actor.id,input(f.pub.id,{currency:'USD'})));assert.throws(()=>f.o.create(f.a.actor.id,input(f.pub.id,{kind:'offer',parentId:'fake'})));assert.throws(()=>f.o.create(f.a.actor.id,input(f.pub.id,{parentId:''})));assert.throws(()=>f.o.create(f.a.actor.id,input(f.pub.id,{status:'fulfilled'})))
  const at=f.s.createCommunity(f.a.actor.id,'AT fixture','Public','public',false,'open','atproto');assert.throws(()=>f.o.create(f.a.actor.id,input(at.id)),/local-publication/)
  const agent=f.s.provision('did:web:commercial-agent.example','Synthetic agent',f.a.actor.id);f.s.run("INSERT INTO memberships(community_id,actor_id,role,active) VALUES(?,?,'member',1)",f.pub.id,agent.actor.id);assert.throws(()=>f.o.create(agent.actor.id,input(f.pub.id)),/commerce/)
 }finally{f.s.close()}
})

test('a late offering failure rolls back its post and image attachment, and cross-scope media cannot enter a listing',()=>{
 const f=fixture();try{
  const upload=new Media(f.s).upload(f.a.actor.id,f.pub.id,image,'Synthetic produce photo')
  f.s.db.exec("CREATE TRIGGER fail_offering_media BEFORE INSERT ON offerings BEGIN SELECT RAISE(ABORT,'late offering failure'); END")
  assert.throws(()=>f.o.create(f.a.actor.id,input(f.pub.id,{mediaIds:[upload.id]})));assert.equal(f.s.get<{post_id:string|null}>('SELECT post_id FROM media WHERE id=?',upload.id)!.post_id,null);assert.equal(f.s.feed().length,0)
  f.s.db.exec('DROP TRIGGER fail_offering_media');assert.throws(()=>f.o.create(f.a.actor.id,input(f.hidden.id,{mediaIds:[upload.id]})));assert.equal(f.s.get<{n:number}>('SELECT count(*) n FROM offerings')!.n,0)
 }finally{f.s.close()}
})
