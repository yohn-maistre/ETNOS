import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Etnos} from '../src/store.ts'
import {POLL_MIN_RESPONDENTS} from '../src/core.ts'
import {Forum} from '../src/forum.ts'
import {Media} from '../src/media.ts'
import {Groups} from '../src/groups.ts'
import {api} from '../src/api.ts'
import {image} from './media-fixture.ts'
function fixture(){let now=Date.now();const s=new Etnos(':memory:','https://forum.example',()=>now),f=new Forum(s),g=new Groups(s),a=s.provision('did:web:owner.example','Owner'),b=s.provision('did:web:member.example','Member'),o=s.provision('did:web:outsider.example','Outside'),c=s.createCommunity(a.actor.id,'Private','Private','hidden-private');s.setMember(a.actor.id,c.id,b.actor.id,true);return{s,f,g,a,b,o,c,advance:(n:number)=>now+=n}}
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
 assert.equal(f.poll(b.actor.id,p.id,0).poll!.myVote,0);assert.equal(f.poll(b.actor.id,p.id,1).poll!.myVote,1);assert.equal(s.getPost(a.actor.id,p.id).poll!.myVote,null)
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

test('poll results are withheld below the respondent threshold and never leak counts',()=>{
 const{s,f,a,b}=fixture();try{
 const pub=s.createCommunity(a.actor.id,'Open','Open','public');s.setMember(a.actor.id,pub.id,b.actor.id,true)
 const p=s.createPost(a.actor.id,pub.id,'Pick',undefined,undefined,{content:{poll:{options:['A','B','C'],closesAt:s.clock()+1000000}}})
 const voters=[a,b];for(let i=0;i<POLL_MIN_RESPONDENTS-1;i++){const v=s.provision('did:web:v'+i+'.example','V'+i);s.setMember(a.actor.id,pub.id,v.actor.id,true);voters.push(v)}
 const withheld=(view:ReturnType<typeof s.getPost>['poll'])=>{assert.equal(view!.results,'withheld');assert.equal(view!.total,null);assert.ok(view!.options.every(o=>o.votes===null))}
 for(let i=0;i<POLL_MIN_RESPONDENTS-1;i++){
  const mine=f.poll(voters[i].actor.id,p.id,i%2).poll!;withheld(mine);assert.equal(mine.myVote,i%2)
  withheld(s.getPost(undefined,p.id).poll);assert.equal(s.getPost(undefined,p.id).poll!.myVote,null)
  withheld(s.getPost(voters[POLL_MIN_RESPONDENTS].actor.id,p.id).poll);assert.equal(s.getPost(voters[POLL_MIN_RESPONDENTS].actor.id,p.id).poll!.myVote,null)
  withheld(s.feedPage(undefined).items.find(x=>x.id===p.id)!.poll)
 }
 // changing and withdrawing a vote below threshold leaks nothing
 withheld(f.poll(voters[0].actor.id,p.id,2).poll);assert.equal(s.getPost(voters[0].actor.id,p.id).poll!.myVote,2)
 withheld(f.poll(voters[0].actor.id,p.id,null).poll);assert.equal(s.getPost(voters[0].actor.id,p.id).poll!.myVote,null);withheld(s.getPost(undefined,p.id).poll)
 // reaching the threshold shows counts to everyone
 f.poll(voters[0].actor.id,p.id,0);f.poll(voters[POLL_MIN_RESPONDENTS-1].actor.id,p.id,0)
 const anon=s.getPost(undefined,p.id).poll!;assert.equal(anon.results,'shown');assert.equal(anon.total,POLL_MIN_RESPONDENTS);const bVotes=Math.floor((POLL_MIN_RESPONDENTS-1)/2);assert.deepEqual(anon.options.map(o=>o.votes),[POLL_MIN_RESPONDENTS-bVotes,bVotes,0]);assert.equal(anon.myVote,null)
 assert.equal(s.getPost(voters[1].actor.id,p.id).poll!.myVote,1)
 // dropping back below the threshold withholds again
 withheld(f.poll(voters[0].actor.id,p.id,null).poll)
 }finally{s.close()}
})
test('answers to agent posts: members confirm once, "wrong" and "more" are visible replies, sources are bounded',()=>{
 const{s,f,g,a,b,o}=fixture();try{
 const c=s.createCommunity(a.actor.id,'Mee Pago','Cerita','hidden-private',true);s.setMember(a.actor.id,c.id,b.actor.id,true)
 const agent=s.provision('did:web:aksara.example','Aksara',a.actor.id);s.setMember(a.actor.id,c.id,agent.actor.id,true);const m=s.mandate(a.actor.id,agent.actor.id,c.id,'Cerita pagi',s.clock()+10000,20)
 const sources=[{title:'Prihartanti & Harjito (2026), Didaktik 12(01)',url:'https://journal.example/10786',quote:'Koyeidaba lahir dari air kencing Kibiwoo.'}]
 const p=s.createPost(agent.actor.id,c.id,'Cerita Koyeidaba',undefined,m,{content:{title:'Koyeidaba',sources}})
 assert.deepEqual(p.content.sources,sources);assert.deepEqual(p.answers,{right:0,wrong:0,more:0,mine:false})
 // Bounded and checked: unknown keys, bad links, empty titles and long lists are refused.
 for(const bad of [[{title:'x',url:'javascript:alert(1)'}],[{title:''}],[{title:'x',note:'y'}],Array(9).fill({title:'x'}),'x'])assert.throws(()=>s.createPost(agent.actor.id,c.id,'Bad',undefined,m,{content:{sources:bad}}),/source|link/i)
 // "Benar": current human members only, once each, withdrawable, private to the viewer.
 assert.equal(f.confirm(b.actor.id,p.id,true).answers!.right,1);assert.equal(f.confirm(b.actor.id,p.id,true).answers!.right,1)
 assert.equal(s.getPost(b.actor.id,p.id).answers!.mine,true);assert.equal(s.getPost(a.actor.id,p.id).answers!.mine,false)
 assert.throws(()=>f.confirm(o.actor.id,p.id,true));assert.throws(()=>f.confirm(agent.actor.id,p.id,true),/Human/);assert.throws(()=>f.confirm(b.actor.id,p.id,'yes'),/Invalid/)
 const human=s.createPost(a.actor.id,c.id,'A person writes');assert.equal(human.answers,null);assert.throws(()=>f.confirm(b.actor.id,human.id,true),/agent posts/)
 s.setMember(a.actor.id,c.id,b.actor.id,false);assert.throws(()=>f.confirm(b.actor.id,p.id,false));s.setMember(a.actor.id,c.id,b.actor.id,true)
 assert.equal(f.confirm(b.actor.id,p.id,false).answers!.right,0);f.confirm(b.actor.id,p.id,true)
 // "Ada yang salah" and "Saya tahu lebih" are ordinary replies with a marker; an opening post cannot carry one.
 const wrong=f.create(b.actor.id,{communityId:c.id,parentId:p.id,text:'Di Topo ceritanya beda.',content:{answer:'wrong'}},g)
 f.create(a.actor.id,{communityId:c.id,parentId:p.id,text:'Nenek saya cerita versi lain.',content:{answer:'more',url:'https://example.org/versi'}},g)
 assert.deepEqual(s.getPost(a.actor.id,p.id).answers,{right:1,wrong:1,more:1,mine:false})
 assert.throws(()=>f.create(b.actor.id,{communityId:c.id,text:'Top',content:{answer:'more'}},g),/reply/);assert.throws(()=>f.create(b.actor.id,{communityId:c.id,parentId:p.id,text:'x',content:{answer:'maybe'}},g),/Invalid answer/)
 // An edit keeps the marker; a hidden or deleted answer stops counting.
 assert.equal(f.edit(b.actor.id,wrong.id,{revision:1,text:'Di Topo ceritanya sedikit beda.'}).content.answer,'wrong')
 f.moderate(a.actor.id,wrong.id,{action:'hide',reason:'Review'});assert.equal(s.getPost(a.actor.id,p.id).answers!.wrong,0)
 // A steward may correct an agent post's sources; deleting it removes the confirmations.
 const corrected=f.edit(a.actor.id,p.id,{revision:1,text:'Cerita Koyeidaba',content:{title:'Koyeidaba',sources:[{title:'Yobe, tesis UGM'}]}});assert.deepEqual(corrected.content.sources,[{title:'Yobe, tesis UGM'}])
 f.delete(a.actor.id,p.id,2);assert.equal(s.all('SELECT * FROM post_confirmations WHERE post_id=?',p.id).length,0)
 }finally{s.close()}
})
