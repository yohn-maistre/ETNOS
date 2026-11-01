import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Strata} from '../src/store.ts'
import {Forum} from '../src/forum.ts'
import {Media} from '../src/media.ts'
import {Groups} from '../src/groups.ts'
import {api} from '../src/api.ts'
import {image} from './media-fixture.ts'
function fixture(){let now=Date.now();const s=new Strata(':memory:','https://forum.example',()=>now),f=new Forum(s),g=new Groups(s),a=s.provision('did:web:owner.example','Owner'),b=s.provision('did:web:member.example','Member'),o=s.provision('did:web:outsider.example','Outside'),c=s.createCommunity(a.actor.id,'Private','Private','hidden-private');s.setMember(a.actor.id,c.id,b.actor.id,true);return{s,f,g,a,b,o,c,advance:(n:number)=>now+=n}}
test('rich private posts stay local; creation and media/context/idempotency are atomic',()=>{
 const{s,f,g,a,b,o,c}=fixture();try{
 const m=new Media(s),draft=m.upload(a.actor.id,c.id,image,'Private image'),body={communityId:c.id,text:'',mediaIds:[draft.id],content:{title:'Mee conversation',url:'https://example.org',format:'markdown'},requestKey:'00000000-0000-4000-8000-000000000001'}
 const p=f.create(a.actor.id,body,g);assert.equal(p.media.length,1);assert.equal(f.create(a.actor.id,body,g).id,p.id);assert.equal(s.jobs(a.actor.id).length,0)
 assert.throws(()=>f.create(a.actor.id,{...body,text:'Changed'},g),/different post/)
 assert.throws(()=>s.getPost(o.actor.id,p.id),/Not found/);assert.equal(s.feed(undefined,'Mee').length,0)
 assert.throws(()=>f.create(b.actor.id,{...body,requestKey:undefined},g));assert.equal(s.all('SELECT id FROM posts').length,1)
 assert.throws(()=>f.create(a.actor.id,{communityId:c.id,text:'Rollback',contextIds:['missing']},g));assert.equal(s.all('SELECT id FROM posts').length,1)
 s.setMember(a.actor.id,c.id,b.actor.id,false);assert.throws(()=>f.create(b.actor.id,body,g))
 }finally{s.close()}
})
test('edits use revisions, deletion wipes content/media but preserves reply structure',()=>{
 const{s,f,a,b,o,c}=fixture();try{
 const m=new Media(s),draft=m.upload(a.actor.id,c.id,image,'Image'),p=s.createPost(a.actor.id,c.id,'Original',undefined,undefined,{content:{title:'Title'},mediaIds:[draft.id]}),reply=s.createPost(b.actor.id,c.id,'Reply',p.id)
 assert.throws(()=>f.edit(o.actor.id,p.id,{revision:1,text:'No'}));assert.throws(()=>f.edit(b.actor.id,p.id,{revision:1,text:'No'}),/Author/)
 const edited=f.edit(a.actor.id,p.id,{revision:1,text:'Edited',content:{title:'New'}});assert.equal(edited.revision,2);assert.throws(()=>f.edit(a.actor.id,p.id,{revision:1,text:'Stale'}),/changed/)
 const tombstone=f.delete(a.actor.id,p.id,2);assert.equal(tombstone.deleted,true);assert.equal(tombstone.text,'');assert.deepEqual(tombstone.media,[]);assert.deepEqual(tombstone.content,{});assert.equal(s.getPost(b.actor.id,reply.id).rootId,p.id);assert.throws(()=>m.response(a.actor.id,draft.id));assert.throws(()=>f.moderate(a.actor.id,p.id,{action:'restore',reason:'Cannot resurrect'}),/deleted/)
 }finally{s.close()}
})
test('polls and RSVPs require current human membership; no public voter identities; locks block replies',()=>{
 const{s,f,a,b,o,c,advance}=fixture();try{
 const p=s.createPost(a.actor.id,c.id,'Choose',undefined,undefined,{content:{poll:{options:['A','B'],closesAt:s.clock()+1000}}})
 assert.equal(f.poll(b.actor.id,p.id,0).poll!.total,1);assert.equal(f.poll(b.actor.id,p.id,1).poll!.total,1);assert.equal(s.getPost(a.actor.id,p.id).poll!.myVote,null)
 assert.throws(()=>f.poll(o.actor.id,p.id,0));s.setMember(a.actor.id,c.id,b.actor.id,false);assert.throws(()=>f.poll(b.actor.id,p.id,0));s.setMember(a.actor.id,c.id,b.actor.id,true)
 const agent=s.provision('did:web:agent.example','Agent',a.actor.id);s.setMember(a.actor.id,c.id,agent.actor.id,true);assert.throws(()=>f.poll(agent.actor.id,p.id,0),/Human/)
 advance(1001);assert.throws(()=>f.poll(b.actor.id,p.id,0),/closed/)
 const e=s.createPost(a.actor.id,c.id,'Meet',undefined,undefined,{content:{event:{startsAt:s.clock()+10000,location:'Community hall'}}});assert.equal(f.rsvp(b.actor.id,e.id,'going').event!.going,1)
 assert.throws(()=>f.moderate(b.actor.id,e.id,{action:'lock',reason:'No'}));f.moderate(a.actor.id,e.id,{action:'lock',reason:'Ended'});assert.throws(()=>s.createPost(b.actor.id,c.id,'Locked reply',e.id),/locked/);assert.throws(()=>f.rsvp(b.actor.id,e.id,'interested'),/closed/)
 f.moderate(a.actor.id,e.id,{action:'hide',reason:'Review'});assert.throws(()=>s.getPost(b.actor.id,e.id));assert.equal(f.moderation(a.actor.id,c.id).events.length,2);assert.throws(()=>f.moderation(b.actor.id,c.id));f.moderate(a.actor.id,e.id,{action:'restore',reason:'Reviewed'});assert.equal(s.getPost(b.actor.id,e.id).locked,true)
 }finally{s.close()}
})
test('HTTP accepts long posts and bounds publication floods without collapsing private access',async()=>{
 const{s,a,c}=fixture();try{const handler=api(s),send=(b:unknown)=>handler(new Request(s.base+'/v1/posts',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+a.token},body:JSON.stringify(b)}))
 assert.equal((await send({communityId:c.id,text:'x'.repeat(20000)})).status,200);assert.equal((await send({communityId:c.id,text:'x'.repeat(20001)})).status,400)
 for(let i=1;i<20;i++)assert.equal((await send({communityId:c.id,text:'Post '+i})).status,200)
 assert.equal((await send({communityId:c.id,text:'Flood'})).status,429)
 for(const content of[{url:'javascript:alert(1)'},{url:'https://user:password@example.org'},{poll:{options:['Same','same'],closesAt:s.clock()+1000}}])assert.throws(()=>s.createPost(a.actor.id,c.id,'Bad',undefined,undefined,{content}))
 }finally{s.close()}
})
